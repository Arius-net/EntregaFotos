'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Photo {
  id: number;
  thumbnail_url: string;
  folder?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  freeLimit: number;
  extraPrice: number;
  galleryId: number;
  clientEmail: string;
  isDeliveryMode?: boolean;
}

export default function PhotoGrid({ photos, freeLimit, extraPrice, galleryId, clientEmail, isDeliveryMode = false }: PhotoGridProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set());
  const [freeUnlockedCount, setFreeUnlockedCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Lista de carpetas y selección (ordenadas alfabéticamente)
  const folders = Array.from(new Set(photos.map(p => p.folder || 'General'))).sort((a, b) => a.localeCompare(b));
  const [activeFolder, setActiveFolder] = useState<string>(folders[0] || 'General');

  const fetchUnlockedPhotos = async () => {
    try {
      const token = localStorage.getItem('client_token');
      // Añadimos timestamp para evitar caché agresivo de Next.js
      const res = await fetch(`${API_URL}/api/galleries/${galleryId}/unlocked?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedIds(new Set(data.unlockedIds));
        setFreeUnlockedCount(data.freeUnlockedCount || 0);
      }
    } catch (e) {
      console.error('Error fetching unlocked photos:', e);
    }
  };

  useEffect(() => {
    fetchUnlockedPhotos();
  }, [galleryId, clientEmail]);

  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Descarga manual de las fotos seleccionadas que YA ESTÁN DESBLOQUEADAS
  const handleDownloadUnlocked = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Generando URLs de descarga...');
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/downloads/free`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gallery_id: galleryId,
          selected_photo_ids: Array.from(selectedIds)
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Descarga iniciada de fotos desbloqueadas', { id: toastId });
        
        for (const item of data.urls) {
          // Usamos a y download para no tener problema con bloqueos de iframes
          const a = document.createElement('a');
          a.href = item.url;
          // Esto forzará la descarga en navegadores modernos si el Content-Disposition es attachment
          a.download = `photo_${item.photoId}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Limpiamos selección tras descargar para evitar confusión
        setSelectedIds(new Set());
        await fetchUnlockedPhotos();

      } else {
        toast.error(data.error || 'Error al procesar la descarga', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
    setIsProcessing(false);
  };

  const handlePay = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Preparando pago seguro...');
    
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/payments/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gallery_id: galleryId,
          selected_photo_ids: Array.from(selectedIds)
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Redirigiendo a OpenPay...', { id: toastId });
        window.location.href = data.init_point;
      } else {
        toast.error('Error al iniciar el pago', { id: toastId });
        setIsProcessing(false);
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Preparando descargas...');
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/downloads/${galleryId}/all-urls`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(`Iniciando la descarga de ${data.urls.length} fotos...`, { id: toastId });
        
        for (const item of data.urls) {
          const a = document.createElement('a');
          a.href = item.url;
          a.download = item.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Pausa entre descargas para que el navegador no bloquee
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } else {
        toast.error('Error al generar las descargas', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
    setIsProcessing(false);
  };

  // Cálculos de precios y límites
  const selectedCount = selectedIds.size;
  const newSelectedCount = Array.from(selectedIds).filter(id => !unlockedIds.has(id)).length;
  
  // Fotos gratuitas restantes (solo resta las que REALMENTE se desbloquearon gratis)
  const remainingFreePhotos = Math.max(0, freeLimit - freeUnlockedCount);
  const isOverLimit = newSelectedCount > remainingFreePhotos;
  const extraPhotos = isOverLimit ? newSelectedCount - remainingFreePhotos : 0;
  const totalCost = extraPhotos * extraPrice;
  const areAllSelectedAlreadyUnlocked = selectedCount > 0 && newSelectedCount === 0;

  const filteredPhotos = photos.filter(p => (p.folder || 'General') === activeFolder);

  return (
    <>
      {/* Pestañas de Carpetas (Glassmorphism Tabs) */}
      {folders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 backdrop-blur-md ${
                activeFolder === folder
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* Grid Masonry Moderno */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-32">
        {filteredPhotos.map((photo) => {
          const isSelected = selectedIds.has(photo.id);
          const isUnlocked = unlockedIds.has(photo.id);

          return (
            <div
              key={photo.id}
              onClick={() => toggleSelection(photo.id)}
              className={`relative cursor-pointer group break-inside-avoid overflow-hidden rounded-2xl transition-all duration-300 ${
                isSelected ? 'ring-4 ring-blue-500 scale-[0.98]' : 'hover:scale-[1.02] hover:shadow-2xl'
              }`}
            >
              {/* Imagen con desenfoque suave al hacer hover */}
              <img
                src={photo.thumbnail_url}
                alt={`Photo ${photo.id}`}
                className={`w-full h-auto object-cover transition-transform duration-700 ${
                  isSelected ? 'brightness-110' : 'group-hover:brightness-90 group-hover:scale-105'
                }`}
                loading="lazy"
              />

              {/* Indicadores flotantes (Candado / Check) */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                {!isUnlocked && (
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                    <span className="text-white text-xs">🔒</span>
                  </div>
                )}
                
                {isSelected && (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              
              {/* Overlay suave inferior */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar (Bottom) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 transition-all duration-500 transform">
        {isDeliveryMode ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-4 text-sm w-full">
              <div className="bg-white/10 p-3 rounded-xl border border-emerald-500/30">
                <p className="text-emerald-400 font-bold flex items-center gap-2">
                  <span>🎉</span> ¡Tus fotos están listas!
                </p>
                <p className="text-gray-300 text-xs mt-1">Descarga tu paquete completo de fotos editadas en alta resolución.</p>
              </div>
            </div>
            <div className="w-full md:w-auto">
              <button
                onClick={handleDownloadAll}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? 'Procesando...' : '⬇️ Descargar Todas las Fotos'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Info Section */}
            <div className="flex-1 flex items-center gap-4 text-sm w-full">
              <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                <p className="text-gray-400 text-xs">Seleccionadas</p>
                <p className="text-white font-bold text-lg leading-none">{selectedCount}</p>
              </div>
              
              <div className="flex-1">
                <p className="text-gray-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Fotos Gratis: <span className="font-bold text-white">{remainingFreePhotos}</span> restantes
                </p>
                {isOverLimit && !areAllSelectedAlreadyUnlocked && (
                  <p className="text-gray-400 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Extra: <span className="font-bold text-emerald-400">{extraPhotos} fotos</span> × ${extraPrice}
                  </p>
                )}
              </div>
            </div>

            {/* Acción Principal */}
            <div className="w-full md:w-auto">
              {selectedCount === 0 ? (
                <div className="bg-white/5 text-gray-500 px-6 py-3 rounded-xl font-medium text-center border border-white/5">
                  Selecciona fotos para continuar
                </div>
              ) : areAllSelectedAlreadyUnlocked ? (
                <button
                  onClick={handleDownloadUnlocked}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Descargando...' : '⬇️ Descargar'}
                </button>
              ) : !isOverLimit ? (
                <button
                  onClick={handleDownloadUnlocked}
                  disabled={isProcessing}
                  className="w-full bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Desbloquear Gratis'}
                </button>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    'Conectando...'
                  ) : (
                    <>
                      <span>Pagar</span>
                      <span className="text-xl">${totalCost}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
