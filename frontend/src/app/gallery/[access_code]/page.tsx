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
  const unwrappedParams = use(params);
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar información de la galería
    const fetchGallery = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:3001/api/galleries/${unwrappedParams.access_code}`);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const res = await fetch(`http://127.0.0.1:3001/api/galleries/${unwrappedParams.access_code}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        alert(data.error || 'Error verificando acceso');
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
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
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
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-4 rounded-xl shadow-lg transition-all hover:scale-105"
            >
              Ver mis fotos
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{gallery.name}</h1>
          <p className="text-sm text-gray-400">Cliente: {email}</p>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
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
