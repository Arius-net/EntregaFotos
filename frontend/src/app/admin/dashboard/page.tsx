'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface Gallery {
  id: number;
  name: string;
  access_code: string;
  free_limit: number;
  extra_photo_price: number;
  _count?: {
    photos: number;
  };
}

export default function AdminDashboard() {
  const [galleryName, setGalleryName] = useState('');
  const [freeLimit, setFreeLimit] = useState(10);
  const [extraPrice, setExtraPrice] = useState(5.00);
  const [maxClients, setMaxClients] = useState(0);
  const [expiresAt, setExpiresAt] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  });
  
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para la subida de fotos
  const [activeGalleryForUpload, setActiveGalleryForUpload] = useState<Gallery | null>(null);
  const [uploadFolder, setUploadFolder] = useState('General');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PHOTOGRAPHER_ID = 1; // Fotógrafo simulado

  useEffect(() => {
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/photographers/${PHOTOGRAPHER_ID}/galleries`);
      if (res.ok) {
        const data = await res.json();
        setGalleries(data.galleries);
      }
    } catch (e) {
      toast.error('Error al cargar galerías');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Creando galería...');
    
    try {
      const res = await fetch('http://127.0.0.1:3001/api/galleries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photographer_id: PHOTOGRAPHER_ID,
          name: galleryName,
          free_limit: freeLimit,
          extra_photo_price: extraPrice,
          expires_at: expiresAt,
          max_clients_allowed: maxClients
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Galería creada. Código: ${data.gallery.access_code}`, { id: loadingToast, duration: 5000 });
        setGalleryName('');
        fetchGalleries();
        
        // Automáticamente ofrecer subir fotos a la nueva galería
        setActiveGalleryForUpload(data.gallery);
      } else {
        toast.error('Error al crear la galería', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: loadingToast });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeGalleryForUpload) return;
    
    const files = Array.from(e.target.files);
    setUploading(true);
    const toastId = toast.loading(`Subiendo ${files.length} fotos a Cloudflare R2...`);

    const formData = new FormData();
    formData.append('gallery_id', activeGalleryForUpload.id.toString());
    formData.append('folder', uploadFolder);
    files.forEach(file => {
      formData.append('photos', file);
    });

    try {
      const res = await fetch('http://127.0.0.1:3001/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success(`${files.length} fotos subidas exitosamente`, { id: toastId });
        fetchGalleries(); // Refrescar conteo
        setActiveGalleryForUpload(null); // Cerrar modo subida
      } else {
        toast.error('Error al subir fotos', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de red al subir', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Panel de Fotógrafo
          </h1>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulario / Subida (Izquierda) */}
          <div className="lg:col-span-1">
            {activeGalleryForUpload ? (
              <div className="bg-gray-900 rounded-2xl shadow-xl p-6 border border-blue-500/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                
                <h2 className="text-xl font-semibold mb-2">Subir a: {activeGalleryForUpload.name}</h2>
                <div className="bg-gray-950 rounded-xl p-4 mb-6 border border-gray-800 text-center">
                  <p className="text-sm text-gray-400 mb-1">Código de acceso</p>
                  <p className="text-2xl font-mono text-blue-400 tracking-wider">{activeGalleryForUpload.access_code}</p>
                </div>

                <div className="mb-6">
                  <label className="text-sm text-gray-400 font-medium block mb-2">
                    Carpeta destino (Ej: Familia Pérez)
                  </label>
                  <input 
                    type="text" 
                    placeholder="General"
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">Si dejas esto en blanco o usas "General", se irán a la carpeta principal.</p>
                </div>

                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center cursor-pointer transition-colors
                    ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-gray-800/50'}`}
                >
                  <div className="text-4xl mb-4">{uploading ? '⏳' : '📸'}</div>
                  <p className="text-sm text-gray-300 font-medium">
                    {uploading ? 'Procesando y Subiendo...' : 'Haz clic para seleccionar fotos'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, WebP (Max 50MB)</p>
                </div>

                <button 
                  onClick={() => setActiveGalleryForUpload(null)}
                  disabled={uploading}
                  className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-xl transition-colors"
                >
                  Cancelar / Volver
                </button>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-800 sticky top-8">
                <h2 className="text-xl font-semibold mb-6">Nueva Galería</h2>
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm text-gray-400 font-medium">Nombre</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                      value={galleryName}
                      onChange={e => setGalleryName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-gray-400 font-medium">Gratis</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                        value={freeLimit}
                        onChange={e => setFreeLimit(parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-gray-400 font-medium">Precio ($)</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                        value={extraPrice}
                        onChange={e => setExtraPrice(parseFloat(e.target.value))}
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-gray-400 font-medium">Límite de Personas</label>
                      <input 
                        type="number" 
                        title="0 significa que pueden entrar un número ilimitado de personas."
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                        value={maxClients}
                        onChange={e => setMaxClients(parseInt(e.target.value))}
                        min="0"
                        required
                      />
                      <p className="text-[10px] text-gray-500">0 = Ilimitado</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-gray-400 font-medium">Expiración</label>
                      <input 
                        type="date" 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                    Crear Galería
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Lista de Galerías (Derecha) */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              Mis Galerías
              <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {galleries.length}
              </span>
            </h2>

            {isLoading ? (
              <div className="text-gray-500 text-center py-10">Cargando galerías...</div>
            ) : galleries.length === 0 ? (
              <div className="text-gray-500 text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                Aún no has creado ninguna galería.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {galleries.map(gallery => (
                  <div key={gallery.id} className={`bg-gray-900 border ${activeGalleryForUpload?.id === gallery.id ? 'border-blue-500' : 'border-gray-800'} rounded-2xl p-5 hover:border-gray-700 transition-colors`}>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg line-clamp-1">{gallery.name}</h3>
                      <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20">
                        {gallery.access_code}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-400 mb-5">
                      <div className="flex justify-between">
                        <span>Fotos subidas:</span>
                        <span className="text-gray-200">{gallery._count?.photos || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Límite gratuito:</span>
                        <span className="text-gray-200">{gallery.free_limit}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={`/gallery/${gallery.access_code}`} 
                        target="_blank"
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-center text-sm py-2 rounded-lg transition-colors border border-gray-700"
                      >
                        Ver Cliente
                      </a>
                      <button 
                        onClick={() => setActiveGalleryForUpload(gallery)}
                        className="flex-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-center text-sm py-2 rounded-lg transition-colors border border-blue-500/20"
                      >
                        Subir Fotos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
