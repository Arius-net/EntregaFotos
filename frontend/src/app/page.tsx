'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ClientPortal() {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setIsLoading(true);
    
    // Verificamos superficialmente que exista
    try {
      const res = await fetch(`http://127.0.0.1:3001/api/galleries/${accessCode.toUpperCase()}`);
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-blue-500/30 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <span className="text-4xl">📸</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Clientes</h1>
          <p className="text-gray-400">Ingresa el código que te proporcionó tu fotógrafo para acceder a tus recuerdos.</p>
        </div>

        <form onSubmit={handleAccess} className="space-y-6">
          <div>
            <label className="text-sm text-gray-400 font-medium block mb-2 text-center">Código de Acceso</label>
            <input 
              type="text" 
              placeholder="Ej: A1B2C3"
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-blue-500 transition-colors uppercase"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl shadow-lg transition-all active:scale-95"
          >
            {isLoading ? 'Buscando...' : 'Entrar a la Galería'}
          </button>
        </form>

      </div>
      <div className="mt-8 text-center text-gray-600 text-sm">
        <p>¿Eres fotógrafo? <a href="/admin/dashboard" className="text-blue-500 hover:underline">Accede a tu panel</a></p>
      </div>
    </div>
  );
}
