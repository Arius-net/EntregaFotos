'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function PaymentSuccessPage({ params }: { params: Promise<{ access_code: string }> }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const unwrappedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verificando tu pago...');
  
  const payment_id = searchParams.get('payment_id');
  const preference_id = searchParams.get('preference_id');

  useEffect(() => {
    if (!payment_id) {
      setStatus('No se encontró el ID de pago.');
      setTimeout(() => router.push(`/gallery/${unwrappedParams.access_code}`), 3000);
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id, preference_id })
        });

        if (res.ok) {
          const data = await res.json();
          setStatus('¡Pago verificado! Descargando tus fotos...');
          toast.success('Pago exitoso, iniciando descarga');
          
          // Download all urls
          data.urls.forEach((item: any) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = item.url;
            document.body.appendChild(iframe);
            setTimeout(() => document.body.removeChild(iframe), 15000);
          });

          // Redirect back to gallery
          setTimeout(() => {
            router.push(`/gallery/${unwrappedParams.access_code}`);
          }, 3000);
        } else {
          setStatus('Error al verificar el pago.');
          toast.error('No se pudo verificar tu pago automáticamente');
        }
      } catch (error) {
        setStatus('Error de conexión.');
      }
    };

    verifyPayment();
  }, [payment_id, preference_id, router, unwrappedParams.access_code]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-green-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Procesando Descarga</h1>
        <p className="text-gray-400">{status}</p>
        
        <div className="mt-8 flex justify-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
