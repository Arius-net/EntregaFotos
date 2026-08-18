'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StoreSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  useEffect(() => {
    // Si no hay orden, redirigir a la tienda
    if (!orderId) {
      router.push('/store');
    }
  }, [orderId, router]);

  return (
    <div className="min-h-screen bg-[#05060d] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111322] border border-white/10 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-green-500/20 rounded-full filter blur-[60px] pointer-events-none"></div>

        <CheckCircle size={80} className="text-green-500 mx-auto mb-6 relative z-10" />
        
        <h1 className="text-3xl font-bold text-white mb-4 relative z-10">¡Pago Exitoso!</h1>
        <p className="text-gray-400 mb-8 relative z-10">
          Tu compra se ha procesado correctamente. Ya puedes descargar tus fotos en alta resolución desde la sección "Mis Pedidos".
        </p>

        <div className="space-y-4 relative z-10">
          <Link href="/store" className="block w-full bg-gradient-to-r from-[#171c54] to-[#282e70] hover:from-[#282e70] hover:to-[#38419c] text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group">
            Ir a la Tienda <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
