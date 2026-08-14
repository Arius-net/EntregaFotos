'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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

  useEffect(() => {
    // Extraer carpetas únicas
    const f = new Set(photos.map(p => p.folder || 'General'));
    setFolders(['Todas', ...Array.from(f)]);
    
    // Cargar selecciones actuales
    fetchSelections();
  }, [photos]);

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
              onClick={() => setActiveFolder(folder)}
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
        {filteredPhotos.map((photo, index) => {
          const isSelected = selectedIds.includes(photo.id);
          return (
            <div 
              key={photo.id} 
              className="relative group break-inside-avoid rounded-xl overflow-hidden shadow-lg border border-white/5"
              onContextMenu={(e) => e.preventDefault()} // Bloquear clic derecho
            >
              <div className="relative">
                <img 
                  src={photo.thumbnail_url} 
                  alt={`Foto ${index}`} 
                  className={`w-full h-auto block transition-all duration-300 ${isSelected ? 'scale-[0.97] rounded-lg border-2 border-purple-500' : 'group-hover:opacity-90'}`}
                  loading="lazy"
                  draggable={false} // Bloquear arrastre
                />
                
                {/* MARCA DE AGUA CSS PROTECTORA */}
                <div className="absolute inset-0 pointer-events-none opacity-20 flex flex-wrap items-center justify-center overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }}>
                  <div className="transform -rotate-45 text-white text-2xl font-black uppercase tracking-widest text-center mix-blend-overlay break-words w-[200%]">
                    PRUEBA SIN EDITAR - PRUEBA SIN EDITAR - PRUEBA SIN EDITAR
                  </div>
                </div>

                {/* BOTÓN DE SELECCIÓN */}
                {status !== 'SUBMITTED' && (
                  <button
                    onClick={() => toggleSelection(photo.id)}
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
    </div>
  );
}
