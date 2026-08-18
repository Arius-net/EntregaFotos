'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, ShoppingCart, X, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface StoreItem {
  id: number;
  title: string;
  description: string;
  price: string;
  thumbnail_url: string;
}

interface CartItem extends StoreItem {
  quantity: number;
}

export default function StorePage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Shopping Cart & Modals State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<StoreItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('521234567890');

  // Auth State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState<{ id: number, email: string } | null>(null);

  useEffect(() => {
    fetchItems();
    fetchSettings();
    const storedCart = localStorage.getItem('photo_cart');
    if (storedCart) setCart(JSON.parse(storedCart));
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Decode JWT roughly (no validation, just to get user email for UI)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'client') {
          setUser(payload);
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('photo_cart', JSON.stringify(cart));
  }, [cart]);

  // Sincronizar las URLs de imágenes del carrito (que expiran) con los items recién cargados
  useEffect(() => {
    if (items.length > 0 && cart.length > 0) {
      let updated = false;
      const syncedCart = cart.map(cartItem => {
        const fresh = items.find(i => i.id === cartItem.id);
        if (fresh && fresh.thumbnail_url !== cartItem.thumbnail_url) {
          updated = true;
          return { ...cartItem, thumbnail_url: fresh.thumbnail_url, price: fresh.price, title: fresh.title };
        }
        return cartItem;
      });
      if (updated) setCart(syncedCart);
    }
  }, [items]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_URL}/api/store`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (e) {
      toast.error('Error al cargar la tienda');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/landing`);
      if (res.ok) {
        const data = await res.json();
        if (data.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      }
    } catch (e) {}
  };

  const addToCart = (item: StoreItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.title} añadido al carrito`);
    setSelectedImage(null); // Cerrar modal si estaba abierto
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  // AUTHENTICATION
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password, role: 'client' } : { email, password, role: 'client', name };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setIsAuthModalOpen(false);
        toast.success(isLogin ? 'Sesión iniciada' : 'Cuenta creada');
      } else {
        toast.error(data.error || 'Error de autenticación');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  // CHECKOUT
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('El carrito está vacío');
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const toastId = toast.loading('Preparando pago seguro...');
    try {
      const token = localStorage.getItem('token');
      const orderRes = await fetch(`${API_URL}/api/store/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(i => ({ store_item_id: i.id, quantity: i.quantity, unit_price: i.price })),
          total_amount: cartTotal,
          shipping_address: "Not required"
        })
      });

      if (!orderRes.ok) throw new Error('Error al crear orden');
      const data = await orderRes.json();
      
      // Limpiar carrito
      setCart([]);
      localStorage.removeItem('photo_cart');
      setIsCartOpen(false);

      toast.success('Redirigiendo a Clip...', { id: toastId });
      window.location.href = data.init_point;

    } catch (error) {
      toast.error('Error al procesar el pedido', { id: toastId });
    }
  };

  const loadMyOrders = async () => {
    setIsOrdersModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/orders/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data.orders);
      }
    } catch (e) {
      toast.error('Error al cargar pedidos');
    }
  };

  const handleDownload = async (orderId: number, itemId: number) => {
    const toastId = toast.loading('Generando enlace de descarga...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/download/${orderId}/${itemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('¡Descarga iniciada!', { id: toastId });
        // Simular click en enlace para forzar descarga
        const link = document.createElement('a');
        link.href = data.url;
        link.download = `foto_${itemId}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al descargar', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-[#05060d] text-white font-sans selection:bg-[#282e70] selection:text-white pb-20">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#0a0c1a]/80 backdrop-blur-md border-b border-white/10 h-20 flex items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-white p-1.5 rounded-lg shadow-lg group-hover:scale-105 transition-transform">
            <img src="/logo_symbol.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter">
            <span>Tienda</span> <span className="text-[#8892f0]">Contigo</span>
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-400">Hola, {user.email}</span>
              <button onClick={loadMyOrders} className="text-sm font-medium text-[#8892f0] hover:text-white transition-colors">Mis Pedidos</button>
            </div>
          ) : (
            <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-medium hover:text-[#8892f0] transition-colors">
              Iniciar Sesión
            </button>
          )}
          <button 
            onClick={() => setIsCartOpen(true)} 
            className="relative p-2 bg-[#171c54] hover:bg-[#282e70] rounded-full transition-colors"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#05060d]">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* HEADER */}
      <header className="py-16 text-center px-4 max-w-3xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Arte para tu pantalla y tu pared
        </h2>
        <p className="text-lg text-gray-400">
          Explora mi colección exclusiva de fotografías. Ideales como fondos de pantalla en alta resolución o para imprimir y decorar tus espacios.
        </p>
      </header>

      {/* MASONRY GRID */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-20 bg-white/5 rounded-3xl border border-white/10">
            Aún no hay fotos en la tienda. Vuelve pronto.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {items.map(item => (
              <div 
                key={item.id} 
                className="relative group break-inside-avoid rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedImage(item)}
              >
                <img 
                  src={item.thumbnail_url} 
                  alt={item.title} 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700 bg-gray-900" 
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="font-semibold text-lg text-white truncate">{item.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-amber-400 font-bold">${item.price}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                      className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold hover:scale-105 transition-transform"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* IMAGE PREVIEW MODAL */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-md">
            <X size={24} />
          </button>
          
          <div 
            className="bg-[#111322] rounded-3xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row shadow-2xl max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Foto Grande */}
            <div className="w-full md:w-2/3 bg-black flex items-center justify-center overflow-hidden">
              <img 
                src={selectedImage.thumbnail_url} 
                alt={selectedImage.title} 
                className="max-w-full max-h-[50vh] md:max-h-[90vh] object-contain"
              />
            </div>
            
            {/* Detalles */}
            <div className="w-full md:w-1/3 p-8 flex flex-col overflow-y-auto">
              <h2 className="text-3xl font-bold mb-2">{selectedImage.title}</h2>
              <p className="text-3xl font-light text-amber-500 mb-6">${selectedImage.price} <span className="text-sm text-gray-500">MXN</span></p>
              
              <div className="prose prose-invert mb-8">
                <p className="text-gray-300 leading-relaxed">{selectedImage.description || 'Sin descripción adicional.'}</p>
              </div>

              <div className="mt-auto space-y-4">
                <button 
                  onClick={() => addToCart(selectedImage)}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-colors flex justify-center items-center gap-2"
                >
                  <ShoppingCart size={20} />
                  Añadir al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHOPPING CART SLIDE-OVER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-[#0a0c1a] shadow-2xl flex flex-col border-l border-white/10 animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart size={24}/> Tu Carrito</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
                  <ShoppingCart size={64} className="mb-4 opacity-20" />
                  <p>Tu carrito está vacío</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-4 text-[#8892f0] hover:underline">Continuar comprando</button>
                </div>
              ) : (
                <ul className="space-y-6">
                  {cart.map(item => (
                    <li key={item.id} className="flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900">
                        <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
                        <p className="text-amber-500 font-bold text-sm">${item.price}</p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center bg-[#171c54] rounded-lg">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-gray-400 hover:text-white"><Minus size={14}/></button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-400 hover:text-white"><Plus size={14}/></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-400 p-1">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-[#05060d]">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-400">Total a pagar:</span>
                  <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-[#ff6600] text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,102,0,0.2)] hover:bg-[#e65c00] transition-colors"
                >
                  Pagar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsAuthModalOpen(false)}>
          <div className="bg-[#111322] w-full max-w-md p-8 rounded-3xl border border-white/10 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={20} />
            </button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
              <p className="text-gray-400 text-sm">
                Para procesar tu pedido, necesitamos que {isLogin ? 'ingreses a tu cuenta' : 'te registres'}.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Nombre Completo</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-[#8892f0] text-white" />
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Correo Electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-[#8892f0] text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-[#8892f0] text-white" />
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-[#171c54] to-[#282e70] hover:from-[#282e70] hover:to-[#38419c] text-white font-bold py-4 rounded-xl mt-4 shadow-lg transition-all">
                {isLogin ? 'Entrar y Continuar' : 'Registrarse y Continuar'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-[#8892f0] hover:underline text-sm">
                {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIS PEDIDOS MODAL */}
      {isOrdersModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsOrdersModalOpen(false)}>
          <div className="bg-[#111322] w-full max-w-2xl max-h-[80vh] flex flex-col p-6 sm:p-8 rounded-3xl border border-white/10 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOrdersModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Mis Pedidos</h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {myOrders.length === 0 ? (
                <p className="text-gray-400 text-center py-10">Aún no has realizado pedidos.</p>
              ) : (
                myOrders.map(order => (
                  <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                      <div>
                        <span className="text-sm text-gray-400">Orden #{order.id}</span>
                        <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'PAID' ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
                          {order.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                        <p className="font-bold mt-1 text-lg">${order.total_amount}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="flex gap-3 items-center">
                          <img src={item.store_item.thumbnail_url} className="w-12 h-12 rounded object-cover bg-black" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{item.store_item.title}</p>
                            <p className="text-xs text-gray-400">Cant: {item.quantity} x ${item.price_at_time}</p>
                          </div>
                          {order.status === 'PAID' && (
                            <button
                              onClick={() => handleDownload(order.id, item.store_item_id)}
                              className="ml-auto px-4 py-2 bg-[#8892f0]/20 text-[#8892f0] rounded-lg hover:bg-[#8892f0]/40 transition-colors font-medium text-sm flex items-center gap-2"
                            >
                              Descargar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
