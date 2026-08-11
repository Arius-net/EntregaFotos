'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function ClientAuthPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const loadingToast = toast.loading(isLogin ? 'Iniciando sesión...' : 'Creando cuenta...');

    try {
      const payload: any = { email, password, role: 'client' };
      if (!isLogin) payload.name = name;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(isLogin ? '¡Bienvenido de vuelta!' : 'Cuenta creada con éxito', { id: loadingToast });
        if (isLogin) {
          localStorage.setItem('client_token', data.token); // Usamos client_token para no chocar con el admin
          // Por ahora los clientes van al inicio. En el futuro aquí iría su perfil / mis compras.
          router.push('/');
        } else {
          // Después de registro exitoso, iniciar sesión automáticamente
          localStorage.setItem('client_token', data.token);
          router.push('/');
        }
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider dark:bg-emerald-900/30 dark:text-emerald-400">
              Portal de Clientes
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">
            {isLogin ? 'Hola de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            {isLogin 
              ? 'Inicia sesión para ver tus galerías y compras.'
              : 'Regístrate para guardar tus compras y descargas para siempre.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-emerald-200 dark:shadow-none transition-all disabled:opacity-70"
            >
              {isLoading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Registrarme'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {isLogin ? '¿No tienes cuenta? Crea una aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">¿Eres el fotógrafo administrador?</p>
            <button
              onClick={() => router.push('/auth')}
              className="text-sm text-gray-600 dark:text-gray-400 hover:underline font-medium hover:text-indigo-500"
            >
              Ir al Portal de Fotógrafo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
