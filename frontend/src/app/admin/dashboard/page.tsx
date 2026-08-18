'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import LandingEditor from './LandingEditor';
import StoreEditor from './StoreEditor';
import StoreOrders from './StoreOrders';

interface Gallery {
  id: number;
  name: string;
  access_code: string;
  free_limit: number;
  extra_photo_price: number;
  type?: string;
  status?: string;
  selection_limit?: number;
  max_clients_allowed?: number;
  expires_at?: string;
  _count?: {
    photos: number;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [galleryName, setGalleryName] = useState('');
  const [galleryType, setGalleryType] = useState('FINAL');
  const [selectionLimit, setSelectionLimit] = useState(20);
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
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Selection Modal
  const [viewingSelectionFor, setViewingSelectionFor] = useState<Gallery | null>(null);
  const [clientSelections, setClientSelections] = useState<any[]>([]);
  const [isLoadingSelections, setIsLoadingSelections] = useState(false);

  const [activeGalleryForUpload, setActiveGalleryForUpload] = useState<Gallery | null>(null);
  const [isFinalUploadMode, setIsFinalUploadMode] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('General');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'galleries' | 'landing' | 'store' | 'orders'>('galleries');

  const PHOTOGRAPHER_ID = 1; // Fotógrafo simulado

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }
    fetchGalleries();
  }, []);

  const fetchGalleries = async () => {
    try {
      const token = sessionStorage.getItem('token');
      // Obtenemos los fotógrafos/galerias
      // El backend ahora espera que el jwt valide y devuelve las de ese user
      // No necesitamos pasar el ID manual en la URL si hacemos un endpoint 'me' o usamos el token.
      // Pero como nuestro endpoint actual es /api/photographers/:id/galleries, podemos
      // desencriptar el jwt, pero es más fácil cambiar el backend para usar req.user.id
      // Afortunadamente, ya lo cambiamos para que ignore el ID y use req.user.id
      const res = await fetch(`${API_URL}/api/photographers/0/galleries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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

  const handleCreateOrUpdateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const token = sessionStorage.getItem('token');
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/api/galleries/${editingId}` : `${API_URL}/api/galleries`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: galleryName,
          type: galleryType,
          selection_limit: selectionLimit,
          free_limit: freeLimit,
          extra_photo_price: extraPrice,
          expires_at: expiresAt,
          max_clients_allowed: maxClients
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(editingId ? 'Galería actualizada' : `Galería creada. Código: ${data.gallery?.access_code}`);
        setGalleryName('');
        setEditingId(null);
        fetchGalleries();
        
        if (!editingId && data.gallery) {
          setActiveGalleryForUpload(data.gallery);
        }
      } else {
        toast.error('Error al guardar la galería');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (gallery: Gallery) => {
    setEditingId(gallery.id);
    setGalleryName(gallery.name);
    setGalleryType(gallery.type || 'FINAL');
    setSelectionLimit(gallery.selection_limit || 20);
    setFreeLimit(gallery.free_limit);
    setExtraPrice(gallery.extra_photo_price);
    if (gallery.max_clients_allowed !== undefined) setMaxClients(gallery.max_clients_allowed);
    if (gallery.expires_at) setExpiresAt(gallery.expires_at.split('T')[0]);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSelectionModal = async (gallery: Gallery) => {
    setViewingSelectionFor(gallery);
    setIsLoadingSelections(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/galleries/${gallery.id}/selections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientSelections(data.selections);
      }
    } catch (e) {
      toast.error('Error al cargar selecciones');
    } finally {
      setIsLoadingSelections(false);
    }
  };

  const handleDeleteGallery = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta galería? Esto borrará todas las fotos y no se puede deshacer.')) return;
    
    const loadingToast = toast.loading('Eliminando galería...');
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/galleries/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Galería eliminada', { id: loadingToast });
        fetchGalleries();
      } else {
        toast.error('Error al eliminar', { id: loadingToast });
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

    try {
      const token = sessionStorage.getItem('token');
      const batchSize = 20; // Subir de 20 en 20 para evitar problemas de memoria en el servidor
      
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const formData = new FormData();
        formData.append('gallery_id', activeGalleryForUpload.id.toString());
        formData.append('folder', uploadFolder);
        formData.append('is_final', isFinalUploadMode.toString());
        batch.forEach(file => {
          formData.append('photos', file);
        });

        toast.loading(`Subiendo lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(files.length / batchSize)}...`, { id: toastId });

        const res = await fetch(`${API_URL}/api/photos/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Error en el lote ${Math.floor(i / batchSize) + 1}`);
        }
      }

      toast.success(`${files.length} fotos subidas exitosamente`, { id: toastId });
      fetchGalleries(); // Refrescar conteo
      setActiveGalleryForUpload(null); // Cerrar modo subida
    } catch (error) {
      toast.error('Error de red al subir fotos o el lote falló', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-6 gap-4">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Panel de Fotógrafo
          </h1>
          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('galleries')}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'galleries' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Galerías de Clientes
            </button>
            <button 
              onClick={() => setActiveTab('landing')}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'landing' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Diseño de Landing Page
            </button>
            <button 
              onClick={() => setActiveTab('store')}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'store' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Tienda Oficial
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              Ventas (Órdenes)
            </button>
          </div>
        </header>
        
        {activeTab === 'galleries' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulario / Subida (Izquierda) */}
          <div className="lg:col-span-1">
            {activeGalleryForUpload ? (
              <div className="bg-gray-900 rounded-2xl shadow-xl p-6 border border-blue-500/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                
                <h2 className="text-xl font-semibold mb-2">
                  {isFinalUploadMode && activeGalleryForUpload.type === 'SELECTION' ? '🚀 Subiendo Entrega Final a:' : 'Subir a:'} {activeGalleryForUpload.name}
                </h2>
                {isFinalUploadMode && activeGalleryForUpload.type === 'SELECTION' && (
                  <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3 mb-4 text-xs text-emerald-300">
                    Estás subiendo las fotos editadas finales. No se les aplicará marca de agua y el cliente será notificado para descargarlas.
                  </div>
                )}
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
                <h2 className="text-xl font-semibold mb-6">{editingId ? 'Editar Galería' : 'Nueva Galería'}</h2>
                <form onSubmit={handleCreateOrUpdateGallery} className="space-y-5">
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

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium block">Tipo de Galería</label>
                    <div className="flex bg-gray-950 border border-gray-800 rounded-xl p-1">
                      <button type="button" onClick={() => setGalleryType('FINAL')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${galleryType === 'FINAL' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        Entrega Final
                      </button>
                      <button type="button" onClick={() => setGalleryType('SELECTION')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${galleryType === 'SELECTION' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        Para Selección (Proofing)
                      </button>
                    </div>
                    <div className="mt-2 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                      {galleryType === 'FINAL' ? (
                        <p className="text-xs text-blue-300">
                          <strong className="block text-blue-400 mb-1">¿Cuándo usar Entrega Final?</strong>
                          Úsala para enviar un trabajo ya terminado. El cliente descarga gratis el límite que pongas, o puede pagar para bajar fotos extra. Ideal para bodas terminadas o ventas de fotos adicionales.
                        </p>
                      ) : (
                        <p className="text-xs text-purple-300">
                          <strong className="block text-purple-400 mb-1">¿Cuándo usar Selección?</strong>
                          Sube fotos "borrador" con marca de agua. El cliente escogerá sus favoritas y tú recibirás la lista. Luego, podrás subir las versiones finales editadas para que las descargue gratuitamente.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {galleryType === 'FINAL' ? (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-sm text-gray-400 font-medium">Fotos Gratis</label>
                        <input 
                          type="number" 
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-white"
                          value={freeLimit}
                          onChange={e => setFreeLimit(parseInt(e.target.value))}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-gray-400 font-medium">Precio extra ($)</label>
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
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-sm text-gray-400 font-medium">Límite de Selección</label>
                      <input 
                        type="number" 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-white"
                        value={selectionLimit}
                        onChange={e => setSelectionLimit(parseInt(e.target.value))}
                        required
                        placeholder="Ej: 20"
                      />
                      <p className="text-xs text-gray-500">¿Cuántas fotos de todas las subidas tiene derecho a escoger el cliente?</p>
                    </div>
                  )}

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
                    disabled={isCreating}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCreating ? 'Guardando...' : (editingId ? 'Actualizar Galería' : 'Crear Galería')}
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
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1">{gallery.name}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${gallery.type === 'SELECTION' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/30' : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'}`}>
                          {gallery.type === 'SELECTION' ? 'SELECCIÓN' : 'FINAL'}
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20">
                        {gallery.access_code}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-400 mb-5">
                      <div className="flex justify-between">
                        <span>Fotos subidas:</span>
                        <span className="text-gray-200">{gallery._count?.photos || 0}</span>
                      </div>
                      {gallery.type === 'FINAL' ? (
                        <div className="flex justify-between">
                          <span>Límite gratuito:</span>
                          <span className="text-gray-200">{gallery.free_limit}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span>Estado Selección:</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${gallery.status === 'SUBMITTED' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-amber-900/30 text-amber-400 border border-amber-500/30'}`}>
                            {gallery.status === 'SUBMITTED' ? 'ENTREGADO' : 'PENDIENTE'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <a 
                        href={`/gallery/${gallery.access_code}`} 
                        target="_blank"
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-center text-sm py-2 rounded-lg transition-colors border border-gray-700"
                      >
                        Ver
                      </a>
                      <button 
                        onClick={() => handleEditClick(gallery)}
                        className="flex-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 text-center text-sm py-2 rounded-lg transition-colors border border-amber-500/20"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteGallery(gallery.id)}
                        className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-center text-sm py-2 rounded-lg transition-colors border border-red-500/20"
                      >
                        Borrar
                      </button>
                    </div>
                    {gallery.type === 'SELECTION' && gallery.status === 'SUBMITTED' && (
                      <>
                        <button 
                          onClick={() => openSelectionModal(gallery)}
                          className="w-full mt-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-center text-sm py-2 rounded-lg transition-colors border border-purple-500/30 font-medium flex items-center justify-center gap-2"
                        >
                          ✅ Ver Fotos Seleccionadas
                        </button>
                        <button 
                          onClick={() => { setActiveGalleryForUpload(gallery); setIsFinalUploadMode(true); }}
                          className="w-full mt-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-center text-sm py-2 rounded-lg transition-colors border border-emerald-500/30 font-bold flex items-center justify-center gap-2"
                        >
                          🚀 Subir Entrega Final
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => { setActiveGalleryForUpload(gallery); setIsFinalUploadMode(gallery.type === 'FINAL'); }}
                      className="w-full mt-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-center text-sm py-2 rounded-lg transition-colors border border-blue-500/20"
                    >
                      {gallery.type === 'FINAL' ? 'Subir Fotos Finales' : 'Subir Borradores (Para Seleccionar)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        ) : activeTab === 'landing' ? (
          <LandingEditor />
        ) : activeTab === 'store' ? (
          <StoreEditor />
        ) : (
          <StoreOrders />
        )}
      </div>

      {/* MODAL DE SELECCIÓN */}
      {viewingSelectionFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingSelectionFor(null)}>
          <div className="bg-gray-900 w-full max-w-2xl p-6 rounded-3xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold">Selección de: {viewingSelectionFor.name}</h2>
              <button onClick={() => setViewingSelectionFor(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {isLoadingSelections ? (
                <div className="text-center py-10 text-gray-500">Cargando selecciones...</div>
              ) : clientSelections.length === 0 ? (
                <div className="text-center py-10 text-gray-500">El cliente envió su selección vacía o hubo un error.</div>
              ) : (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                  {clientSelections.map(s => {
                    // Extraer solo el nombre original (Remover el ID autogenerado "1234567890-")
                    const fullName = s.photo.high_res_key ? s.photo.high_res_key.split('/').pop() : `IMG_${s.id}`;
                    const displayName = fullName.replace(/^\d+-/, '');

                    return (
                      <div key={s.id} className="relative break-inside-avoid bg-black rounded-lg overflow-hidden border border-gray-800 group">
                        <img src={s.photo.thumbnail_url} className="w-full h-auto object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-white text-3xl opacity-50 drop-shadow-lg">✅</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-1.5 text-center">
                          <span className="text-[10px] text-gray-300 font-mono truncate block px-1" title={displayName}>
                            {displayName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800 text-center flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400">Total seleccionadas: <strong className="text-white">{clientSelections.length} / {viewingSelectionFor.selection_limit}</strong></p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const names = clientSelections.map(s => {
                      const fullName = s.photo.high_res_key ? s.photo.high_res_key.split('/').pop() : `IMG_${s.id}`;
                      return fullName.replace(/^\d+-/, '');
                    });
                    navigator.clipboard.writeText(names.join(', '));
                    toast.success('Lista de nombres copiada al portapapeles');
                  }} 
                  className="px-6 py-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors border border-blue-500/30"
                >
                  📋 Copiar Nombres
                </button>
                <button onClick={() => setViewingSelectionFor(null)} className="px-6 py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
