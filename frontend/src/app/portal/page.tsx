'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, ArrowRight, Image as ImageIcon } from 'lucide-react';

export default function PortalPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/galleries/${accessCode.toUpperCase()}`);
      if (res.ok) {
        router.push(`/gallery/${accessCode.toUpperCase()}`);
      } else {
        toast.error('Código de galería incorrecto o expirado.');
        setIsLoading(false);
      }
    } catch (e) {
      toast.error('Error de conexión');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c1a] text-white flex flex-col font-sans">
      
      <header className="absolute top-0 w-full z-50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => router.push('/')}>
          <div className="bg-white/95 p-1.5 rounded-xl shadow-lg">
            <img src="/logo_symbol.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-gray-400 text-sm font-medium hidden sm:block">Volver al inicio</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center relative overflow-hidden py-24">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#171c54] rounded-full filter blur-[150px] opacity-30 pointer-events-none"></div>

        <div className="max-w-md w-full mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 font-medium mb-6 backdrop-blur-md mx-auto">
            <ImageIcon size={16} />
            <span>Zona Privada</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">Tus recuerdos, listos.</h1>
          <p className="text-gray-400 mb-10 text-lg">
            Ingresa el código único que te he proporcionado para acceder a tu galería privada.
          </p>

          <div className="bg-[#171c54]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#282e70] to-[#8892f0]"></div>
            
            <form onSubmit={handleAccess} className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 font-medium block mb-3">Código de Galería</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={20} className="text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Ej: BODA-2026"
                    className="w-full bg-[#0a0c1a] border border-[#282e70] rounded-xl pl-12 pr-4 py-4 text-xl tracking-widest font-mono text-white focus:outline-none focus:border-[#8892f0] focus:ring-1 focus:ring-[#8892f0] transition-all uppercase placeholder:text-gray-600"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#171c54] to-[#282e70] hover:from-[#282e70] hover:to-[#38419c] disabled:opacity-50 border border-white/10 text-white font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                {isLoading ? 'Verificando...' : (
                  <>Acceder a mi Galería <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

    </div>
  );
}
