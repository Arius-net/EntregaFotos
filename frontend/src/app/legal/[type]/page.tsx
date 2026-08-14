'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export default function LegalPage({ params }: { params: Promise<{ type: string }> }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const unwrappedParams = use(params);
  const type = unwrappedParams.type; // 'privacidad' o 'terminos'
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/settings/landing`)
      .then(res => res.json())
      .then(data => {
        if (type === 'privacidad') {
          setContent(data.privacy_policy || 'El aviso de privacidad no ha sido configurado.');
        } else if (type === 'terminos') {
          setContent(data.terms_conditions || 'Los términos y condiciones no han sido configurados.');
        } else {
          setContent('Página legal no encontrada.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setContent('Error al cargar la información.');
        setLoading(false);
      });
  }, [type, API_URL]);

  const title = type === 'privacidad' ? 'Aviso de Privacidad' : type === 'terminos' ? 'Términos y Condiciones' : 'Legal';

  return (
    <div className="min-h-screen bg-[#0a0c1a] text-white flex flex-col font-sans">
      <header className="border-b border-white/10 bg-[#171c54]/80 backdrop-blur-md p-6 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition" onClick={() => router.push('/')}>
          <div className="bg-white/95 p-1.5 rounded-xl shadow-lg">
            <img src="/logo_symbol.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-gray-400 text-sm font-medium">Volver al inicio</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <h1 className="text-3xl md:text-5xl font-bold mb-10 text-white border-b border-white/10 pb-6">
          {title}
        </h1>
        
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-800 rounded w-5/6"></div>
          </div>
        ) : (
          <div className="prose prose-invert prose-blue max-w-none prose-headings:text-[#8892f0] prose-a:text-blue-400">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </main>

      <footer className="bg-[#020308] py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Todos los derechos reservados.
      </footer>
    </div>
  );
}
