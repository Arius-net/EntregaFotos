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
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  
  // OpenPay redirige con ?id=tr_xxx o puedes pasar otros params
  const payment_id = searchParams.get('id') || searchParams.get('payment_id');
  const transaction_id = searchParams.get('transaction_id') || searchParams.get('preference_id');

  useEffect(() => {
    if (!payment_id) {
      setStatus('No se encontró el ID de pago.');
      setIsSuccess(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const token = localStorage.getItem('client_token');
        const res = await fetch(`${API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ payment_id, transaction_id })
        });

        if (res.ok || res.status === 202) {
          if (res.status === 202) {
            setStatus('Tu pago está siendo procesado por OpenPay. Tus fotos se desbloquearán cuando se apruebe.');
            setIsSuccess(null);
            toast.info('Pago en proceso');
          } else {
            setStatus('¡Pago verificado! Tus fotos se han desbloqueado.');
            setIsSuccess(true);
            toast.success('Pago exitoso');
          }
        } else {
          setStatus('Error al verificar el pago.');
          setIsSuccess(false);
          toast.error('No se pudo verificar tu pago');
        }
      } catch (error) {
        setStatus('Error de conexión.');
        setIsSuccess(false);
      }
    };

    verifyPayment();
  }, [payment_id, transaction_id, API_URL]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center backdrop-blur-xl">
        {isSuccess === null && (
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/50">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {isSuccess === true && (
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
            <span className="text-4xl">✅</span>
          </div>
        )}

        {isSuccess === false && (
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/50">
            <span className="text-4xl">❌</span>
          </div>
        )}

        <h1 className="text-2xl font-bold text-white mb-4">
          {isSuccess === null ? 'Procesando Pago' : (isSuccess ? '¡Pago Exitoso!' : 'Error en el Pago')}
        </h1>
        <p className="text-gray-400 mb-8">{status}</p>
        
        {isSuccess !== null && (
          <button
            onClick={() => router.push(`/gallery/${unwrappedParams.access_code}`)}
            className="w-full bg-white text-black font-semibold py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-all active:scale-95"
          >
            Volver a mi Galería
          </button>
        )}
      </div>
    </div>
  );
}
