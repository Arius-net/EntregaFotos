'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, MessageCircle, ArrowRight, Image as ImageIcon, Store, ChevronRight, ChevronLeft, Lock } from 'lucide-react';

const HERO_IMAGES = [
  '/hero_wedding_1786601115161.png',
  '/hero_concert_1786601134635.png',
  '/hero_portrait_1786601277435.png'
];

export default function LandingPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  // Rotación del carrusel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % HERO_IMAGES.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);

  return (
    <div className="min-h-screen bg-[#0a0c1a] text-white selection:bg-[#282e70] selection:text-white font-sans overflow-x-hidden scroll-smooth">
      
      {/* NAVBAR (Glassmorphism) */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-[#171c54]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 cursor-pointer flex items-center" onClick={() => window.scrollTo(0,0)}>
              <img src="/logo.png" alt="Quevedo Contigo Logo" className="h-12 w-auto bg-white/90 p-1 rounded-lg" />
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#about" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Sobre Mí</a>
                <a href="#portal" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Entregas</a>
                <a href="#store" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Tienda</a>
                <a href="#contact" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Contacto</a>
              </div>
            </div>
            <div className="md:hidden flex items-center">
               <button className="text-white hover:text-gray-300 focus:outline-none">
                 <Camera size={24} />
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO CAROUSEL */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Carousel Backgrounds */}
        {HERO_IMAGES.map((img, idx) => (
          <div 
            key={img}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#171c54]/60 via-[#171c54]/40 to-[#0a0c1a] z-10" />
            <img 
              src={img} 
              alt="Hero" 
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        
        {/* Controls */}
        <button onClick={prevSlide} className="absolute left-4 md:left-10 z-20 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/10 transition text-white/70 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <button onClick={nextSlide} className="absolute right-4 md:right-10 z-20 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/10 transition text-white/70 hover:text-white">
          <ChevronRight size={24} />
        </button>

        {/* Hero Content */}
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-2xl">
            Capturando momentos, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#aab2fc] to-white">
              contando tu historia.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto drop-shadow-lg font-light">
            Especializado en fotografía premium de bodas, eventos y retratos. Cada disparo es una pieza de arte diseñada para perdurar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#portal" className="px-8 py-4 bg-white text-[#171c54] font-bold rounded-full hover:bg-gray-100 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Ver mis fotos (Entregas)
            </a>
            <a href="#store" className="px-8 py-4 bg-transparent border-2 border-white/50 text-white font-bold rounded-full hover:bg-white/10 hover:border-white transition-all flex items-center justify-center gap-2">
              <Store size={20} /> Tienda de Fondos
            </a>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 z-20 flex space-x-3 left-1/2 -translate-x-1/2">
          {HERO_IMAGES.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrentSlide(idx)}
              className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </section>

      {/* SECTION 2: ABOUT THE PHOTOGRAPHER */}
      <section id="about" className="py-24 bg-[#0a0c1a] relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#171c54] to-[#282e70] rounded-3xl opacity-50 blur-2xl"></div>
              <img 
                src="/photographer_profile_1786601309429.png" 
                alt="El Fotógrafo" 
                className="relative rounded-3xl shadow-2xl object-cover w-full h-[500px] border border-white/10"
              />
            </div>
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171c54] border border-[#282e70] text-sm text-[#aab2fc] font-medium mb-6">
                <Camera size={16} />
                <span>Detrás de la Lente</span>
              </div>
              <h3 className="text-4xl font-bold mb-6">Hola, soy el rostro detrás de Quevedo Contigo.</h3>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                Mi pasión es congelar el tiempo. Me dedico a documentar emociones genuinas, buscando siempre la luz perfecta y la composición ideal para que tus recuerdos parezcan salidos de una película.
              </p>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Desde bodas íntimas hasta conciertos vibrantes, mi objetivo es que cuando mires tus fotos en 10 años, vuelvas a sentir exactamente lo mismo que sentías en ese instante.
              </p>
              <a href="#contact" className="inline-flex items-center gap-2 text-white font-semibold hover:text-[#aab2fc] transition-colors group">
                Hablemos de tu próximo evento <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CLIENT PORTAL (ENTREGAS) */}
      <section id="portal" className="py-24 relative overflow-hidden bg-[#0d1024] scroll-mt-20">
        {/* Decoraciones de fondo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#171c54] rounded-full filter blur-[120px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#282e70] rounded-full filter blur-[120px] opacity-30"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 font-medium mb-6 backdrop-blur-md">
            <ImageIcon size={16} />
            <span>Zona Privada</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">Tus recuerdos, listos.</h3>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Ingresa el código único que te he proporcionado para acceder a tu galería privada, seleccionar tus fotos favoritas y descargarlas en alta resolución.
          </p>

          <div className="bg-[#171c54]/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden max-w-lg mx-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#282e70] to-[#8892f0]"></div>
            
            <form onSubmit={handleAccess} className="space-y-6">
              <div>
                <label className="text-sm text-gray-300 font-medium block mb-3 text-left">Código de Galería</label>
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
      </section>

      {/* SECTION 4: STORE (FONDOS DE PANTALLA) */}
      <section id="store" className="py-24 bg-[#0a0c1a] border-t border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#171c54]/30 to-black border border-white/10 rounded-3xl overflow-hidden flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 p-10 md:p-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#282e70]/30 border border-[#282e70] text-sm text-[#aab2fc] font-medium mb-6">
                <Store size={16} />
                <span>Tienda Oficial</span>
              </div>
              <h3 className="text-4xl font-bold mb-4">Lleva mi arte en tu bolsillo.</h3>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Descubre mi colección exclusiva de fotografías de naturaleza, paisajes urbanos y arte abstracto, optimizadas perfectamente como fondos de pantalla premium para tu celular.
              </p>
              <button onClick={() => window.open('#', '_blank')} className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                Explorar Colección <ArrowRight size={20} />
              </button>
            </div>
            <div className="lg:w-1/2 w-full h-full min-h-[400px] relative">
               <img 
                 src="/wallpapers_store_1786601317099.png" 
                 alt="Tienda de Fondos" 
                 className="absolute inset-0 w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500"
               />
               {/* Gradiente para difuminar el borde en mobile */}
               <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c1a] lg:from-transparent via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER & CONTACT */}
      <footer id="contact" className="bg-[#05060d] pt-20 pb-10 border-t border-white/10 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            
            {/* Brand */}
            <div>
              <img src="/logo.png" alt="Quevedo Contigo Logo" className="h-16 w-auto bg-white/90 p-1 rounded-xl mb-4" />
              <p className="text-gray-400 leading-relaxed mb-6">
                Capturando momentos inolvidables con una estética cinemática y profesional. Tu historia merece ser contada de la mejor manera.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#171c54] hover:text-white transition-colors text-gray-400 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#171c54] hover:text-white transition-colors text-gray-400 border border-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              </div>
            </div>

            {/* Enlaces */}
            <div>
              <h5 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Navegación</h5>
              <ul className="space-y-4">
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">Sobre Mí</a></li>
                <li><a href="#portal" className="text-gray-400 hover:text-white transition-colors">Portal de Entregas</a></li>
                <li><a href="#store" className="text-gray-400 hover:text-white transition-colors">Fondos de Pantalla</a></li>
                <li><a href="/admin/dashboard" className="text-[#8892f0] hover:text-white transition-colors">Acceso Fotógrafo (Admin)</a></li>
              </ul>
            </div>

            {/* Contacto Directo */}
            <div>
              <h5 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Hablemos</h5>
              <p className="text-gray-400 mb-6">
                ¿Tienes un evento en puerta o quieres agendar una sesión fotográfica? Escríbeme directamente.
              </p>
              <a 
                href="https://wa.me/521234567890" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 rounded-xl hover:bg-[#25D366] hover:text-white transition-all font-medium"
              >
                <MessageCircle size={20} />
                Enviar WhatsApp
              </a>
            </div>

          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Quevedo Contigo Fotografía. Todos los derechos reservados.
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Aviso de Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos y Condiciones</a>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
