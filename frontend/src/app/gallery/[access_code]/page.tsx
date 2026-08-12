'use client';

import { useState, useEffect, use } from 'react';
import PhotoGrid from '@/components/PhotoGrid';

interface Photo {
  id: number;
  thumbnail_url: string;
  folder: string;
}

interface Gallery {
  id: number;
  name: string;
  free_limit: number;
  extra_photo_price: number;
  photos: Photo[];
}

export default function GalleryPage({ params }: { params: Promise<{ access_code: string }> }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const unwrappedParams = use(params);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar información de la galería
    const fetchGallery = async () => {
      try {
        const res = await fetch(`${API_URL}/api/galleries/${unwrappedParams.access_code}`);
        if (res.ok) {
          const data = await res.json();
          setGallery(data.gallery);
        } else {
          console.error('Galería no encontrada');
        }
      } catch (error) {
        console.error('Error cargando galería:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [unwrappedParams.access_code]);

  useEffect(() => {
    // Si ya hay token, intentar verificar acceso directamente
    const token = localStorage.getItem('client_token');
    if (token) {
      verifyGalleryAccess(token);
    }
  }, []);

  const verifyGalleryAccess = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/api/galleries/${unwrappedParams.access_code}/access`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('client_token'); // Si falla, borrar
      }
    } catch (error) {
      console.error('Error de red al verificar acceso');
    }
  };

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/client/request-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (res.ok) {
        setStep('pin');
      } else {
        alert(data.error || 'Error solicitando PIN');
      }
    } catch (error) {
      alert('Error de red al solicitar PIN. Intenta de nuevo.');
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/client/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin })
      });
      
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('client_token', data.token);
        // Una vez tenemos el JWT del cliente, verificamos acceso a esta galería
        await verifyGalleryAccess(data.token);
      } else {
        alert(data.error || 'PIN incorrecto o expirado');
      }
    } catch (error) {
      alert('Error de red. Intenta de nuevo.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex justify-center items-center text-white">Cargando...</div>;
  }

  if (!gallery) {
    return <div className="min-h-screen bg-gray-950 flex justify-center items-center text-white">Galería no encontrada o código inválido.</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 p-10 max-w-md w-full backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
            <p className="text-gray-400">Accede a la galería: <span className="text-blue-400 font-mono">{gallery.name}</span></p>
            {step === 'pin' && (
              <p className="text-sm text-green-400 mt-4 bg-green-400/10 p-2 rounded-lg">
                Te enviamos un PIN de 4 dígitos a {email} (Revisa la consola en desarrollo)
              </p>
            )}
          </div>
          
          {step === 'email' ? (
            <form onSubmit={handleRequestPin} className="space-y-6">
              <div>
                <input 
                  type="email" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 text-center text-lg"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all active:scale-95"
              >
                Continuar
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPin} className="space-y-6">
              <div>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-white placeholder-gray-500 text-center text-3xl font-mono tracking-widest"
                  placeholder="1234"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] transition-all active:scale-95"
              >
                Entrar a la Galería
              </button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full mt-2 text-sm text-gray-500 hover:text-gray-300"
              >
                Usar otro correo
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/10 p-6 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{gallery.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cliente: <span className="text-gray-300">{email}</span>
          </p>
        </div>
        <div className="hidden sm:block">
           <div className="px-4 py-2 bg-white/10 rounded-full border border-white/5 backdrop-blur-sm text-xs font-medium text-gray-300">
             Acceso Verificado
           </div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-[1400px] mx-auto">
        <PhotoGrid 
          photos={gallery.photos} 
          freeLimit={gallery.free_limit} 
          extraPrice={gallery.extra_photo_price} 
          galleryId={gallery.id}
          clientEmail={email}
        />
      </main>
    </div>
  );
}
