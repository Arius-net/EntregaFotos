'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Package, User, Calendar, CreditCard, ChevronDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function StoreOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/store/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders);
    } catch (e) {
      toast.error('Error al cargar órdenes de la tienda');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando órdenes...</div>;
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="text-[#8892f0]" />
            Órdenes de la Tienda
          </h2>
          <p className="text-gray-400 mt-1">Historial de compras realizadas en tu tienda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-[#111322] rounded-3xl border border-white/5">
            <Package size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-300">No hay ventas aún</h3>
            <p className="text-gray-500 mt-2">Las órdenes aparecerán aquí cuando un cliente compre algo en tu tienda.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-[#111322] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              {/* HEADER */}
              <div className="bg-[#171c54]/30 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-bold text-white">Orden #{order.id}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><User size={14} /> {order.client.name || 'Cliente'} ({order.client.email})</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${
                    order.status === 'PAID' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                    order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {order.status}
                  </span>
                  <p className="text-2xl font-black text-white mt-2">${order.total_amount}</p>
                </div>
              </div>

              {/* ITEMS */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Artículos ({order.items.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="bg-[#0a0c1a] p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-white mb-1 line-clamp-2">{item.store_item?.title || 'Artículo eliminado'}</p>
                        <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Precio pagado</span>
                        <span className="font-bold text-[#8892f0]">${item.price_at_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
