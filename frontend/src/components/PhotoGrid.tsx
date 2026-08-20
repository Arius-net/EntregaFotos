'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

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
  
  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Lista de carpetas y selección (ordenadas alfabéticamente)
  const folders = Array.from(new Set(photos.map(p => p.folder || 'General'))).sort((a, b) => a.localeCompare(b));
  const [activeFolder, setActiveFolder] = useState<string>(folders[0] || 'General');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showZipInfo, setShowZipInfo] = useState(true);

  // Reseteamos a página 1 si cambian de carpeta
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFolder]);

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

  const filteredPhotos = photos.filter(p => (p.folder || 'General') === activeFolder);
  
  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPhotos = filteredPhotos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredPhotos.length]);

  const nextPhoto = () => {
    setLightboxIndex(prev => {
      if (prev === null) return null;
      return prev < filteredPhotos.length - 1 ? prev + 1 : 0;
    });
  };

  const prevPhoto = () => {
    setLightboxIndex(prev => {
      if (prev === null) return null;
      return prev > 0 ? prev - 1 : filteredPhotos.length - 1;
    });
  };

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
        
        // Sequentially download using fetch and anchor tags
        for (let i = 0; i < data.urls.length; i++) {
          const item = data.urls[i];
          try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `EntregaFotos_${i + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
            }, 1000);
            
            if (i < data.urls.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.error('Error descargando imagen:', err);
          }
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
        toast.success('Redirigiendo a Clip...', { id: toastId });
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
      const res = await fetch(`${API_URL}/api/downloads/${galleryId}/all`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success('Iniciando descargas múltiples...', { id: toastId });
        
        // Descarga secuencial
        for (let i = 0; i < data.urls.length; i++) {
          const item = data.urls[i];
          try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `EntregaFotos_${i + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(blobUrl);
            }, 1000);
            
            if (i < data.urls.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (err) {
            console.error('Error descargando imagen:', err);
          }
        }
      } else {
        toast.error('Error al obtener URLs de descarga', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
    setIsProcessing(false);
  };

  const handleDownloadUnlockedZip = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Preparando archivo ZIP...');
    try {
      const token = localStorage.getItem('client_token');
      // Primero registramos el desbloqueo
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
        toast.success('Descarga ZIP en curso...', { id: toastId });
        
        const ids = Array.from(selectedIds).join(',');
        window.location.href = `${API_URL}/api/downloads/${galleryId}/zip?token=${token}&ids=${ids}`;

        setTimeout(() => {
          setSelectedIds(new Set());
          fetchUnlockedPhotos();
        }, 2000);
      } else {
        toast.error(data.error || 'Error al procesar la descarga', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de conexión', { id: toastId });
    }
    setIsProcessing(false);
  };

  const handleDownloadAllZip = () => {
    const token = localStorage.getItem('client_token');
    toast.success('Descargando archivo ZIP...');
    window.location.href = `${API_URL}/api/downloads/${galleryId}/zip?token=${token}`;
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

      {/* Instrucciones de Descarga ZIP */}
      {showZipInfo && (
        <div className="mb-6 relative bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-in">
          <button 
            onClick={() => setShowZipInfo(false)}
            className="absolute top-2 right-2 text-blue-300/50 hover:text-white bg-blue-500/10 hover:bg-blue-500/30 rounded-full p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="bg-blue-500/20 p-3 rounded-full flex-shrink-0 text-blue-400">
            ℹ️
          </div>
          
          <div className="flex-1 text-sm text-blue-100/90 leading-relaxed">
            <strong className="text-blue-300 text-base mb-1 block">¿Vas a descargar un ZIP?</strong>
            <p className="mb-1">
              📱 <span className="opacity-80">Si estás en celular, tu ZIP se guardará en tu app oficial de </span>
              <strong className="text-white">Archivos</strong> 
              <span className="opacity-80"> (Files). Solo búscalo ahí y tócalo para que se descomprima en una carpeta con todas tus fotos.</span>
            </p>
            <p>
              💻 <span className="opacity-80">Si estás en PC, encuéntralo en tu carpeta de </span>
              <strong className="text-white">Descargas</strong>
              <span className="opacity-80">, dale clic derecho y elige "Extraer Todo".</span>
            </p>
          </div>
        </div>
      )}

      {/* Grid de Fotos */}
      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pb-12">
        {currentPhotos.map((photo, index) => {
          const isSelected = selectedIds.has(photo.id);
          const isUnlocked = unlockedIds.has(photo.id);

          return (
            <div
              key={photo.id}
              onClick={() => setLightboxIndex(index)}
              className={`relative cursor-pointer group break-inside-avoid overflow-hidden rounded-2xl transition-all duration-300 shadow-lg border border-white/5 ${
                isSelected ? 'ring-4 ring-blue-500 scale-[0.98]' : 'hover:scale-[1.02] hover:shadow-2xl'
              }`}
            >
              {/* Imagen con desenfoque suave al hacer hover */}
              <div className="relative">
                <img
                  src={photo.thumbnail_url}
                  alt={`Photo ${photo.id}`}
                  className={`w-full h-auto object-cover transition-transform duration-700 ${
                    isSelected ? 'brightness-110' : 'group-hover:brightness-90 group-hover:scale-105'
                  }`}
                  loading="lazy"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                
                {/* Overlay Check Rápido */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(photo.id);
                  }}
                  className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isSelected 
                      ? 'bg-blue-500 ring-2 ring-white opacity-100' 
                      : 'bg-black/60 border border-white/70 backdrop-blur-md'
                  }`}>
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              </div>

              {/* Indicadores flotantes (Candado) */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-none">
                {!isUnlocked && !isSelected && (
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                    <span className="text-white text-xs">🔒</span>
                  </div>
                )}
                
                {/* Indicador persistente si ya está seleccionado pero no hovereado */}
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

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8 mb-32">
          <button 
            onClick={prevPage} 
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white/10 rounded-xl text-white disabled:opacity-50 hover:bg-white/20 transition-colors border border-white/5 shadow-lg backdrop-blur-md font-medium"
          >
            ← Anterior
          </button>
          <span className="text-gray-300 font-medium text-sm bg-black/40 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={nextPage} 
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white/10 rounded-xl text-white disabled:opacity-50 hover:bg-white/20 transition-colors border border-white/5 shadow-lg backdrop-blur-md font-medium"
          >
            Siguiente →
          </button>
        </div>
      )}

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
            <div className="w-full md:w-auto flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownloadAll}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Procesando...' : '⬇️ Descargar Individualmente'}
                </button>
                <button
                  onClick={handleDownloadAllZip}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  📦 Descargar en ZIP
                </button>
              </div>
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
                <div className="w-full md:w-auto flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleDownloadUnlocked}
                      disabled={isProcessing}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? '...' : '⬇️ Descargar Individualmente'}
                    </button>
                    <button
                      onClick={handleDownloadUnlockedZip}
                      disabled={isProcessing}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing ? 'Procesando...' : '📦 Descargar en ZIP'}
                    </button>
                  </div>
                </div>
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

      {/* VISOR LIGHTBOX */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-md">
          {/* Header Lightbox */}
          <div className="flex justify-between items-center p-4 lg:p-6 text-white absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-gray-400 text-sm font-medium">
              {lightboxIndex + 1} de {filteredPhotos.length}
            </span>
            <button onClick={() => setLightboxIndex(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Área principal */}
          <div className="flex-1 flex items-center justify-center relative w-full h-full overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
            <button 
              onClick={prevPhoto}
              className="absolute left-2 lg:left-8 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10 border border-white/10"
            >
              <ChevronLeft size={32} />
            </button>

            <div className="relative max-w-[90vw] max-h-[85vh] transition-transform duration-300">
              <img 
                src={currentPhotos[lightboxIndex].thumbnail_url} 
                className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all duration-300 ${
                  selectedIds.has(currentPhotos[lightboxIndex].id) ? 'ring-4 ring-blue-500 scale-[0.98]' : ''
                }`}
                draggable={false}
              />
              
              {!unlockedIds.has(currentPhotos[lightboxIndex].id) && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-full p-2 shadow-lg border border-white/20">
                  <span className="text-white text-xs">🔒 Bloqueada</span>
                </div>
              )}
            </div>

            <button 
              onClick={nextPhoto}
              className="absolute right-2 lg:right-8 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10 border border-white/10"
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* Footer Lightbox (Botón Selección) */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-10 bg-gradient-to-t from-black/90 to-transparent flex justify-center z-10">
            <button
              onClick={() => toggleSelection(currentPhotos[lightboxIndex].id)}
              className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 ${
                selectedIds.has(currentPhotos[lightboxIndex].id)
                  ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105'
              }`}
            >
              {selectedIds.has(currentPhotos[lightboxIndex].id) ? (
                <>
                  <X size={24} /> Quitar de la selección
                </>
              ) : (
                <>
                  <Check size={24} /> Elegir esta foto
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
