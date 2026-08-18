'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, MessageCircle, ArrowRight, Image as ImageIcon, Store, ChevronRight, ChevronLeft, Lock, Mail, MapPin } from 'lucide-react';



export default function LandingPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_URL}/api/settings/landing`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error(err));
  }, []);

  const currentHeroImages = settings?.hero_images_urls?.length ? settings.hero_images_urls : [];
  const currentPortfolioImages = settings?.portfolio_images_urls?.length ? settings.portfolio_images_urls : [];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % currentHeroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentHeroImages.length]);

  // Se eliminó handleAccess porque ahora vive en /portal

  const nextSlide = () => setCurrentSlide((p) => (p + 1) % currentHeroImages.length);
  const prevSlide = () => setCurrentSlide((p) => (p - 1 + currentHeroImages.length) % currentHeroImages.length);

  return (
    <div className="min-h-screen bg-[#0a0c1a] text-white selection:bg-[#282e70] selection:text-white font-sans overflow-x-hidden scroll-smooth">
      
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-[#171c54]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 cursor-pointer flex items-center gap-3" onClick={() => window.scrollTo(0,0)}>
              <div className="bg-white/95 p-1.5 rounded-xl shadow-lg h-12 w-12 flex items-center justify-center overflow-hidden">
                <img src={settings?.logo_image_url || "/logo_symbol.png"} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tighter leading-none hidden sm:block">
                <span className="text-white">{settings?.brand_name || 'Quevedo Contigo'}</span>
              </h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6">
                <a href="#about" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Sobre Mí</a>
                <a href="#portfolio" className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Portafolio</a>
                <button onClick={() => router.push('/portal')} className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Entregas</button>
                <button onClick={() => router.push('/store')} className="hover:text-[#8892f0] px-3 py-2 rounded-md text-sm font-medium transition-colors">Tienda</button>
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

      {/* HERO SECTION */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        {currentHeroImages.map((img: string, idx: number) => (
          <div 
            key={idx}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#171c54]/60 via-[#171c54]/40 to-[#0a0c1a] z-10" />
            <img src={img} alt="Hero" className="w-full h-full object-cover" />
          </div>
        ))}
        
        <button onClick={prevSlide} className="absolute left-4 md:left-10 z-20 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/10 transition text-white/70 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <button onClick={nextSlide} className="absolute right-4 md:right-10 z-20 p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/10 transition text-white/70 hover:text-white">
          <ChevronRight size={24} />
        </button>

        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-2xl">
            {settings?.hero_title || 'Capturando momentos,'} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#aab2fc] to-white">
              {settings?.hero_subtitle || 'contando tu historia.'}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto drop-shadow-lg font-light">
            {settings?.hero_description || 'Especializado en fotografía premium de bodas, eventos y retratos. Cada disparo es una pieza de arte diseñada para perdurar.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#portfolio" className="px-8 py-4 bg-white text-[#171c54] font-bold rounded-full hover:bg-gray-100 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Ver Portafolio
            </a>
            <button onClick={() => router.push('/portal')} className="px-8 py-4 bg-transparent border-2 border-white/50 text-white font-bold rounded-full hover:bg-white/10 hover:border-white transition-all">
              Zona de Clientes
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 z-20 flex space-x-3 left-1/2 -translate-x-1/2">
          {currentHeroImages.map((_: any, idx: number) => (
            <button 
              key={idx} 
              onClick={() => setCurrentSlide(idx)}
              className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 bg-[#0a0c1a] relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#171c54] to-[#282e70] rounded-3xl opacity-50 blur-2xl"></div>
              {settings?.about_image_url ? (
                <img 
                  src={settings.about_image_url}
                  alt="El Fotógrafo" 
                  className="relative rounded-3xl shadow-2xl object-cover w-full h-auto border border-white/10"
                />
              ) : (
                <div className="relative rounded-3xl shadow-2xl w-full h-[500px] border border-white/10 bg-[#171c54]/30 flex items-center justify-center">
                  <Camera size={48} className="text-gray-500 opacity-50" />
                </div>
              )}
            </div>
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171c54] border border-[#282e70] text-sm text-[#aab2fc] font-medium mb-6">
                <Camera size={16} />
                <span>Detrás de la Lente</span>
              </div>
              <h3 className="text-4xl font-bold mb-6">{settings?.about_title || 'Hola, soy el rostro detrás de Quevedo Contigo.'}</h3>
              <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                {settings?.about_description_1 || 'Mi pasión es congelar el tiempo. Me dedico a documentar emociones genuinas, buscando siempre la luz perfecta y la composición ideal para que tus recuerdos parezcan salidos de una película.'}
              </p>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                {settings?.about_description_2 || 'Desde bodas íntimas hasta conciertos vibrantes, mi objetivo es que cuando mires tus fotos en 10 años, vuelvas a sentir exactamente lo mismo que sentías en ese instante.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PORTFOLIO SECTION */}
      <section id="portfolio" className="py-24 bg-[#05060d] relative scroll-mt-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">Mis Mejores Trabajos</h3>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Una selección de mis capturas favoritas. Cada imagen es un testimonio de la dedicación y el amor por el arte fotográfico.
            </p>
          </div>
          
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {currentPortfolioImages.map((img: string, idx: number) => (
              <div key={idx} className="relative group overflow-hidden rounded-2xl break-inside-avoid shadow-lg border border-white/10">
                <img src={img} alt={`Portafolio ${idx + 1}`} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171c54]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <span className="text-white font-medium text-lg">Sesión Profesional</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENT PORTAL CTA */}
      <section className="py-24 relative overflow-hidden bg-[#0d1024]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#171c54] rounded-full filter blur-[120px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#282e70] rounded-full filter blur-[120px] opacity-30"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 font-medium mb-6 backdrop-blur-md">
            <ImageIcon size={16} />
            <span>Zona Privada</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">Tus recuerdos, listos.</h3>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Si ya tuvimos una sesión, accede a tu portal privado para seleccionar tus fotos favoritas o descargar tu galería final.
          </p>

          <button onClick={() => router.push('/portal')} className="bg-gradient-to-r from-[#171c54] to-[#282e70] hover:from-[#282e70] hover:to-[#38419c] text-white font-bold text-lg py-5 px-10 rounded-xl shadow-[0_0_30px_rgba(40,46,112,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto group">
            Entrar al Portal de Clientes <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* STORE SECTION */}
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
              <button onClick={() => router.push('/store')} className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                Explorar Colección <ArrowRight size={20} />
              </button>
            </div>
            <div className="lg:w-1/2 w-full h-full min-h-[400px] relative bg-gradient-to-tr from-[#0a0c1a] to-[#171c54]">
               {/* Decorative elements for store CTA */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <Store size={100} className="text-white/10" />
               </div>
               <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c1a] lg:from-transparent via-transparent to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-24 bg-gradient-to-b from-[#0a0c1a] to-[#05060d] border-t border-white/5 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#171c54]/20 border border-white/10 rounded-3xl p-8 md:p-16 text-center max-w-4xl mx-auto">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">¿Trabajamos juntos?</h3>
            <p className="text-gray-400 text-lg mb-10">
              Si tienes un evento especial en puerta o te interesa una sesión personalizada, estaré encantado de platicar contigo y hacer realidad tus ideas.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-12">
              <a href={`https://wa.me/${settings?.whatsapp_number || '521234567890'}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-8 py-4 bg-[#25D366] text-black font-bold rounded-xl hover:bg-[#20b858] hover:scale-105 transition-all shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                <MessageCircle size={24} />
                Enviar WhatsApp
              </a>
              <a href={`mailto:${settings?.email || 'contacto@quevedocontigo.com'}`} className="flex items-center gap-3 px-8 py-4 bg-transparent border-2 border-[#8892f0] text-white font-bold rounded-xl hover:bg-[#8892f0]/10 transition-all">
                <Mail size={24} />
                Enviar Correo
              </a>
            </div>

            <div className="flex justify-center gap-6">
              <a href={settings?.instagram_url || '#'} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white transform group-hover:scale-110 transition-all shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </div>
                <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Instagram</span>
              </a>
              <a href={settings?.facebook_url || '#'} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#1877f2] flex items-center justify-center text-white transform group-hover:scale-110 transition-all shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </div>
                <span className="text-gray-400 text-sm group-hover:text-white transition-colors">Facebook</span>
              </a>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-white shadow-lg border border-gray-700">
                  <MapPin size={24} />
                </div>
                <span className="text-gray-400 text-sm transition-colors">{settings?.location_text || 'México'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#020308] pt-16 pb-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            
            <div className="flex items-center gap-4">
              <div className="bg-white/95 p-1.5 rounded-xl shadow-lg h-14 w-14 flex items-center justify-center overflow-hidden">
                <img src={settings?.logo_image_url || "/logo_symbol.png"} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
              <h4 className="text-3xl font-bold tracking-tighter leading-none text-white">
                {settings?.brand_name || 'Quevedo Contigo'}
              </h4>
            </div>

            <ul className="flex flex-wrap justify-center gap-6 text-sm">
              <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">Sobre Mí</a></li>
              <li><a href="#portfolio" className="text-gray-400 hover:text-white transition-colors">Portafolio</a></li>
              <li><button onClick={() => router.push('/portal')} className="text-gray-400 hover:text-white transition-colors">Entregas</button></li>
              <li><button onClick={() => router.push('/store')} className="text-gray-400 hover:text-white transition-colors">Tienda</button></li>
              <li><a href="/admin/dashboard" className="text-[#8892f0] hover:text-white transition-colors font-medium">Panel Admin</a></li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} {settings?.brand_name || 'Quevedo Contigo'}. Todos los derechos reservados.
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <button onClick={() => router.push('/privacidad')} className="hover:text-white transition-colors">Aviso de Privacidad</button>
              <button onClick={() => router.push('/terminos')} className="hover:text-white transition-colors">Términos y Condiciones</button>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
