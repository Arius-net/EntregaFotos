'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminAuthPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const endpoint = '/api/auth/login';
    const loadingToast = toast.loading('Iniciando sesión...');

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'photographer' })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('¡Bienvenido!', { id: loadingToast });
        // Guardar JWT
        localStorage.setItem('token', data.token);
        router.push('/admin/dashboard');
      } else {
        toast.error(data.error || 'Ocurrió un error', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <span className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider dark:bg-indigo-900/30 dark:text-indigo-400">
              Área de Fotógrafo
            </span>
          </div>
          <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-zinc-100 mb-8">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70"
            >
              {isLoading ? 'Cargando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">¿Eres un cliente?</p>
            <button
              onClick={() => router.push('/auth/client')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Ir al Portal de Clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
