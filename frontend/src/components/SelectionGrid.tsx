'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface Photo {
  id: number;
  thumbnail_url: string;
  folder: string;
}

export default function SelectionGrid({ 
  photos, 
  selectionLimit, 
  galleryId,
  clientEmail,
  galleryStatus
}: { 
  photos: Photo[], 
  selectionLimit: number, 
  galleryId: number,
  clientEmail: string,
  galleryStatus: string
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('Todas');
  const [status, setStatus] = useState(galleryStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Paginación Infinita
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    // Extraer carpetas únicas
    const f = new Set(photos.map(p => p.folder || 'General'));
    setFolders(['Todas', ...Array.from(f)]);
    
    // Resetear paginación al cambiar fotos
    setVisibleCount(20);

    // Cargar selecciones actuales
    fetchSelections();
  }, [photos]);

  // Infinite Scroll Listener
  const handleScroll = useCallback(() => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      setVisibleCount(prev => prev + 20);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
  }, [lightboxIndex]);

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

  const fetchSelections = async () => {
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/galleries/${galleryId}/selections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedIds(data.selectedIds);
      }
    } catch (e) {}
  };

  const toggleSelection = async (photoId: number) => {
    if (status === 'SUBMITTED') return toast.error('Ya has enviado tu selección');
    
    // Optimistic UI
    const isSelected = selectedIds.includes(photoId);
    if (!isSelected && selectedIds.length >= selectionLimit) {
      return toast.error(`Límite alcanzado (${selectionLimit} fotos)`);
    }

    const newIds = isSelected 
      ? selectedIds.filter(id => id !== photoId)
      : [...selectedIds, photoId];
    
    setSelectedIds(newIds);

    // Call backend
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/galleries/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gallery_id: galleryId, photo_id: photoId })
      });
      
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Error al seleccionar');
        fetchSelections(); // Revert
      }
    } catch (error) {
      toast.error('Error de conexión');
      fetchSelections();
    }
  };

  const submitSelection = async () => {
    if (!confirm('¿Estás seguro de enviar tu selección definitiva? Ya no podrás hacer cambios.')) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/galleries/submit-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gallery_id: galleryId })
      });
      
      if (res.ok) {
        setStatus('SUBMITTED');
        toast.success('Selección enviada con éxito');
      } else {
        toast.error('Error al enviar la selección');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPhotos = activeFolder === 'Todas' 
    ? photos 
    : photos.filter(p => (p.folder || 'General') === activeFolder);

  return (
    <div>
      {/* Selector de Carpetas */}
      {folders.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => {
                setActiveFolder(folder);
                setVisibleCount(20); // Reiniciar al cambiar de pestaña
              }}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeFolder === folder 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* Grid de Fotos (Estilo Masonry / Columnas) */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {filteredPhotos.slice(0, visibleCount).map((photo, index) => {
          const isSelected = selectedIds.includes(photo.id);
          return (
            <div 
              key={photo.id} 
              className="relative group break-inside-avoid rounded-xl overflow-hidden shadow-lg border border-white/5 cursor-pointer"
              onContextMenu={(e) => e.preventDefault()} // Bloquear clic derecho
              onClick={() => setLightboxIndex(index)}
            >
              <div className="relative">
                <img 
                  src={photo.thumbnail_url} 
                  alt={`Foto ${index}`} 
                  className={`w-full h-auto block transition-all duration-300 ${isSelected ? 'scale-[0.97] rounded-lg border-2 border-purple-500' : 'group-hover:opacity-90'}`}
                  loading="lazy"
                  draggable={false} // Bloquear arrastre
                />
                
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />

                {/* BOTÓN DE SELECCIÓN RÁPIDA (Opcional, evitar bubbling si solo quieren seleccionar directo) */}
                {status !== 'SUBMITTED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(photo.id);
                    }}
                    className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center z-10"
                  >
                    <div className={`absolute top-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                      isSelected 
                        ? 'bg-purple-600 border-purple-600' 
                        : 'bg-black/40 border-white/70 opacity-0 group-hover:opacity-100 backdrop-blur-md'
                    }`}>
                      {isSelected ? (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      )}
                    </div>
                  </button>
                )}

                {status === 'SUBMITTED' && isSelected && (
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-lg z-10">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRA FLOTANTE INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 p-4 px-6 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-light text-purple-400">
            {selectedIds.length} <span className="text-lg text-gray-500">/ {selectionLimit}</span>
          </div>
          <div className="text-sm font-medium text-gray-300">
            {status === 'SUBMITTED' 
              ? 'Selección finalizada y enviada al fotógrafo.'
              : 'Fotos marcadas para edición'}
          </div>
        </div>
        
        {status !== 'SUBMITTED' && (
          <button 
            onClick={submitSelection}
            disabled={isSubmitting || selectedIds.length === 0}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar mi Selección'}
          </button>
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
            {/* Navegación Izquierda */}
            <button 
              onClick={prevPhoto}
              className="absolute left-2 lg:left-8 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10 border border-white/10"
            >
              <ChevronLeft size={32} />
            </button>

            {/* Imagen Actual */}
            <div className="relative max-w-[90vw] max-h-[85vh] transition-transform duration-300">
              <img 
                src={filteredPhotos[lightboxIndex].thumbnail_url} 
                className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all duration-300 ${
                  selectedIds.includes(filteredPhotos[lightboxIndex].id) ? 'ring-4 ring-purple-500 scale-[0.98]' : ''
                }`}
                draggable={false}
              />
              
              {/* Overlay Check */}
              {selectedIds.includes(filteredPhotos[lightboxIndex].id) && (
                <div className="absolute top-4 right-4 bg-purple-600 text-white rounded-full p-2 shadow-lg ring-2 ring-white">
                  <Check size={24} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Navegación Derecha */}
            <button 
              onClick={nextPhoto}
              className="absolute right-2 lg:right-8 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10 border border-white/10"
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* Footer Lightbox (Botón Selección) */}
          <div className="absolute bottom-0 left-0 w-full p-6 pb-10 bg-gradient-to-t from-black/90 to-transparent flex justify-center z-10">
            {status !== 'SUBMITTED' && (
              <button
                onClick={() => toggleSelection(filteredPhotos[lightboxIndex].id)}
                className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center gap-3 ${
                  selectedIds.includes(filteredPhotos[lightboxIndex].id)
                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-purple-600 text-white hover:bg-purple-500 hover:scale-105'
                }`}
              >
                {selectedIds.includes(filteredPhotos[lightboxIndex].id) ? (
                  <>
                    <X size={24} /> Quitar de la selección
                  </>
                ) : (
                  <>
                    <Check size={24} /> Elegir esta foto
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
