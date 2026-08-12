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
}

export default function PhotoGrid({ photos, freeLimit, extraPrice, galleryId, clientEmail }: PhotoGridProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSimulation, setPaymentSimulation] = useState<{ transactionId: number, amount: number } | null>(null);

  // Lista de carpetas y selección
  const folders = Array.from(new Set(photos.map(p => p.folder || 'General')));
  const [activeFolder, setActiveFolder] = useState<string>(folders[0] || 'General');

  const fetchUnlockedPhotos = async () => {
    try {
      const token = localStorage.getItem('client_token');
      const res = await fetch(`${API_URL}/api/galleries/${galleryId}/unlocked`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedIds(new Set(data.unlockedIds));
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

  const handleDownloadFree = async () => {
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
        toast.success('Descarga iniciada...', { id: toastId });

        for (const item of data.urls) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = item.url;
          document.body.appendChild(iframe);

          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 10000);

          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Refrescar fotos desbloqueadas para actualizar la UI
        await fetchUnlockedPhotos();

      } else {
        toast.error(data.error || 'Error al procesar la solicitud', { id: toastId });
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
        toast.success('Redirigiendo a Mercado Pago...', { id: toastId });
        // Redirigir al Checkout Pro
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

  const executeSimulatedPayment = async () => {
    if (!paymentSimulation) return;
    setIsProcessing(true);
    const toastId = toast.loading('Procesando pago simulado...');

    try {
      const res = await fetch('http://127.0.0.1:3001/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: paymentSimulation.transactionId,
          selected_photo_ids: Array.from(selectedIds)
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('¡Pago aprobado! Descarga iniciada...', { id: toastId });
        setPaymentSimulation(null);

        for (const item of data.urls) {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = item.url;
          document.body.appendChild(iframe);

          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 10000);

          await new Promise(resolve => setTimeout(resolve, 800));
        }

        await fetchUnlockedPhotos();
      } else {
        toast.error(data.error || 'Error al procesar el pago simulado', { id: toastId });
      }
    } catch (e) {
      toast.error('Error de red', { id: toastId });
    }
    setIsProcessing(false);
  };

  // Cálculos de precios basados en las fotos NO desbloqueadas
  const selectedCount = selectedIds.size;
  const newSelectedCount = Array.from(selectedIds).filter(id => !unlockedIds.has(id)).length;

  const remainingFreePhotos = Math.max(0, freeLimit - unlockedIds.size);
  const isOverLimit = newSelectedCount > remainingFreePhotos;
  const extraPhotos = isOverLimit ? newSelectedCount - remainingFreePhotos : 0;
  const totalCost = extraPhotos * extraPrice;

  const filteredPhotos = photos.filter(p => (p.folder || 'General') === activeFolder);

  return (
    <>
      {/* Pestañas de Carpetas */}
      {folders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 hide-scrollbar">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${activeFolder === folder
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {folder}
            </button>
          ))}
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="text-center text-gray-500 py-20">Aún no hay fotos en esta galería.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredPhotos.map(photo => {
            const isSelected = selectedIds.has(photo.id);
            const isUnlocked = unlockedIds.has(photo.id);
            return (
              <div
                key={photo.id}
                onClick={() => toggleSelection(photo.id)}
                className={`relative aspect-square cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500 scale-[0.98]' : 'hover:scale-[1.02] hover:shadow-xl'
                  }`}
              >
                <img
                  src={photo.thumbnail_url}
                  alt={`Photo ${photo.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Checkmark overlay */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-black/30 border-white/50 backdrop-blur-sm'
                  }`}>
                  {isSelected && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {isUnlocked && (
                  <div className="absolute bottom-2 left-2 bg-green-500/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium border border-green-400">
                    Desbloqueada
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Counter UI */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800/95 backdrop-blur-xl border border-gray-700 px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-50 transition-all w-[90%] md:w-auto max-w-2xl overflow-x-auto whitespace-nowrap">

        {/* Resumen de Límite Gratuito */}
        <div className="flex flex-col hidden sm:flex">
          <span className="text-sm text-gray-400">Restantes Gratis</span>
          <span className="text-lg font-bold text-gray-200">
            {remainingFreePhotos} <span className="text-gray-500 text-sm">/ {freeLimit}</span>
          </span>
        </div>

        {/* Resumen de Selección Actual */}
        <div className="flex flex-col border-l border-gray-700 pl-4 sm:pl-8">
          <span className="text-sm text-gray-400">Seleccionadas (Nuevas)</span>
          <span className="text-lg font-bold">
            <span className={isOverLimit ? 'text-blue-400' : 'text-white'}>{newSelectedCount}</span>
          </span>
        </div>

        {isOverLimit && (
          <div className="flex flex-col border-l border-gray-700 pl-8 animate-fade-in">
            <span className="text-sm text-gray-400">Total a pagar</span>
            <span className="text-lg font-bold text-green-400">${totalCost.toFixed(2)}</span>
          </div>
        )}

        <button
          className={`ml-auto md:ml-4 px-6 py-3 rounded-full font-semibold transition-all ${selectedCount > 0
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white hover:scale-105 shadow-lg'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
          disabled={selectedCount === 0 || isProcessing}
          onClick={isOverLimit ? handlePay : handleDownloadFree}
        >
          {isProcessing ? 'Procesando...' : (isOverLimit ? 'Pagar y Descargar' : 'Descargar Gratis')}
        </button>
      </div>
    </>
  );
}
