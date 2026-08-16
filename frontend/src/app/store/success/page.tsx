'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export default function StoreSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center backdrop-blur-xl">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
          <span className="text-4xl">✅</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-4">
          ¡Pago Exitoso!
        </h1>
        <p className="text-gray-400 mb-8">
          Tu pago ha sido procesado correctamente. Revisa la sección de "Mis Pedidos" en la tienda para descargar tus fotos en alta resolución o ver los detalles de tu orden.
        </p>
        
        <button
          onClick={() => router.push('/store')}
          className="w-full bg-white text-black font-semibold py-4 rounded-xl shadow-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <ArrowLeft size={20} />
          Volver a la Tienda
        </button>
      </div>
    </div>
  );
}
