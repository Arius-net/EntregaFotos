'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface LandingSettings {
  brand_name: string;
  logo_image: string;
  logo_image_url?: string;

  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_images: string[];
  hero_images_urls?: string[];

  about_title: string;
  about_description_1: string;
  about_description_2: string;
  about_image: string;
  about_image_url?: string;

  portfolio_images: string[];
  portfolio_images_urls?: string[];

  whatsapp_number: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  location_text: string;

  privacy_policy: string;
  terms_conditions: string;
}

export default function LandingEditor() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<'hero' | 'about' | 'portfolio' | 'logo' | null>(null);
  const [uploadTargetState, setUploadTargetState] = useState<'hero' | 'about' | 'portfolio' | 'logo' | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings/landing`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      toast.error('Error al cargar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      // Limpiamos las urls firmadas antes de guardar para no mandar basura a la bd
      const dataToSave = { ...settings };
      delete dataToSave.hero_images_urls;
      delete dataToSave.about_image_url;
      delete dataToSave.portfolio_images_urls;
      delete dataToSave.logo_image_url;

      const res = await fetch(`${API_URL}/api/settings/landing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
      });

      if (res.ok) {
        toast.success('Configuración guardada correctamente');
        fetchSettings(); // Refrescar para tener URLs firmadas de nuevo
      } else {
        toast.error('Error al guardar la configuración');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerUpload = (target: 'hero' | 'about' | 'portfolio' | 'logo') => {
    uploadTargetRef.current = target;
    setUploadTargetState(target);
    if (fileInputRef.current) {
      if (target === 'hero' || target === 'portfolio') {
        fileInputRef.current.multiple = true;
      } else {
        fileInputRef.current.multiple = false;
      }
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = uploadTargetRef.current;
    if (!e.target.files || e.target.files.length === 0 || !target || !settings) return;

    const files = Array.from(e.target.files);
    setUploading(true);
    const toastId = toast.loading(`Subiendo ${files.length} foto(s)...`);

    try {
      const token = localStorage.getItem('token');
      const uploadedKeys: string[] = [];

      // Subimos archivo por archivo
      for (const file of files) {
        const formData = new FormData();
        formData.append('photo', file);

        const res = await fetch(`${API_URL}/api/settings/upload-landing-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          uploadedKeys.push(data.key);
        }
      }

      // Actualizar el estado local con las nuevas keys y previsualizaciones
      const newSettings = { ...settings };
      const objectUrls = files.map(file => URL.createObjectURL(file));
      
      if (target === 'hero') {
        newSettings.hero_images = [...(newSettings.hero_images || []), ...uploadedKeys];
        newSettings.hero_images_urls = [...(newSettings.hero_images_urls || []), ...objectUrls];
      } else if (target === 'portfolio') {
        newSettings.portfolio_images = [...(newSettings.portfolio_images || []), ...uploadedKeys];
        newSettings.portfolio_images_urls = [...(newSettings.portfolio_images_urls || []), ...objectUrls];
      } else if (target === 'about') {
        newSettings.about_image = uploadedKeys[0];
        newSettings.about_image_url = objectUrls[0];
      } else if (target === 'logo') {
        newSettings.logo_image = uploadedKeys[0];
        newSettings.logo_image_url = objectUrls[0];
      }

      setSettings(newSettings);
      toast.success('Fotos subidas con éxito. Recuerda Guardar Cambios.', { id: toastId });
    } catch (error) {
      toast.error('Error al subir archivos', { id: toastId });
    } finally {
      setUploading(false);
      uploadTargetRef.current = null;
      setUploadTargetState(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (target: 'hero' | 'portfolio', index: number) => {
    if (!settings) return;
    const newSettings = { ...settings };
    if (target === 'hero') {
      newSettings.hero_images.splice(index, 1);
      newSettings.hero_images_urls?.splice(index, 1);
    } else {
      newSettings.portfolio_images.splice(index, 1);
      newSettings.portfolio_images_urls?.splice(index, 1);
    }
    setSettings(newSettings);
  };

  if (isLoading) return <div className="text-gray-500 py-10">Cargando configuración...</div>;
  if (!settings) return <div className="text-red-500 py-10">No se pudo cargar la configuración.</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 bg-gray-900 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-xl">
      
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-blue-400">Diseño de Landing Page</h2>
        <button 
          type="submit"
          disabled={isSaving || uploading}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium shadow-lg disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <input 
        type="file" 
        multiple={uploadTargetState === 'hero' || uploadTargetState === 'portfolio'} 
        accept="image/jpeg, image/png, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* SECCIÓN IDENTIDAD DE MARCA */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-800 pb-2">Identidad de Marca</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Nombre de la Marca</label>
            <input 
              type="text" 
              value={settings.brand_name || ''}
              onChange={e => setSettings({...settings, brand_name: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-500 mt-2">Este nombre aparecerá en la barra de navegación y pie de página.</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Logotipo (Fondo transparente recomendado)</label>
            <div className="w-full h-[100px] bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl relative overflow-hidden flex flex-col items-center justify-center group">
              {settings.logo_image_url ? (
                <img src={settings.logo_image_url} alt="Logo" className="h-full w-auto object-contain p-2" />
              ) : (
                <span className="text-gray-500 text-sm">Sin logotipo</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <button type="button" onClick={() => triggerUpload('logo')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                  Subir Logo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN HERO */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-800 pb-2">Sección Principal (Hero)</h3>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Título</label>
            <input 
              type="text" 
              value={settings.hero_title}
              onChange={e => setSettings({...settings, hero_title: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Subtítulo (destacado)</label>
            <input 
              type="text" 
              value={settings.hero_subtitle}
              onChange={e => setSettings({...settings, hero_subtitle: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-400 block mb-1">Descripción corta</label>
            <input 
              type="text" 
              value={settings.hero_description}
              onChange={e => setSettings({...settings, hero_description: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-gray-400">Imágenes del Carrusel</label>
            <button type="button" onClick={() => triggerUpload('hero')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white border border-gray-600">
              Añadir Fotos
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar items-start">
            {settings.hero_images?.map((key, idx) => (
              <div key={key} className="relative group w-48 shrink-0 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                <img src={settings.hero_images_urls?.[idx] || ''} alt="Hero" className="w-full h-auto object-cover" />
                <button type="button" onClick={() => removeImage('hero', idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  ✕
                </button>
              </div>
            ))}
            {(!settings.hero_images || settings.hero_images.length === 0) && (
              <span className="text-xs text-gray-500 italic">No hay imágenes.</span>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN SOBRE MI */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-800 pb-2">Sección "Sobre Mí"</h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Título</label>
              <input 
                type="text" 
                value={settings.about_title}
                onChange={e => setSettings({...settings, about_title: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Párrafo 1</label>
              <textarea 
                value={settings.about_description_1}
                onChange={e => setSettings({...settings, about_description_1: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white h-20"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Párrafo 2</label>
              <textarea 
                value={settings.about_description_2}
                onChange={e => setSettings({...settings, about_description_2: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white h-20"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-1">Foto de Perfil (Se adapta a tu foto)</label>
            <div className="w-full min-h-[250px] bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl relative overflow-hidden flex flex-col items-center justify-center group">
              {settings.about_image_url ? (
                <img src={settings.about_image_url} alt="Perfil" className="w-full h-auto object-cover" />
              ) : (
                <span className="text-gray-500 text-sm">Sin imagen</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <button type="button" onClick={() => triggerUpload('about')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                  Cambiar Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN PORTAFOLIO */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
          <h3 className="text-xl font-semibold text-white">Portafolio Profesional</h3>
          <button type="button" onClick={() => triggerUpload('portfolio')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white border border-gray-600">
            Añadir Trabajos
          </button>
        </div>
        
        <div className="columns-2 md:columns-4 lg:columns-5 gap-4 space-y-4">
          {settings.portfolio_images?.map((key, idx) => (
            <div key={key} className="relative group break-inside-avoid rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
              <img src={settings.portfolio_images_urls?.[idx] || ''} alt="Portafolio" className="w-full h-auto object-cover" />
              <button type="button" onClick={() => removeImage('portfolio', idx)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                ✕
              </button>
            </div>
          ))}
          {(!settings.portfolio_images || settings.portfolio_images.length === 0) && (
            <div className="col-span-full text-sm text-gray-500 italic py-4">No has subido fotos al portafolio.</div>
          )}
        </div>
      </div>

      {/* SECCIÓN CONTACTO Y REDES */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-800 pb-2">Contacto & Redes</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">WhatsApp (Número 52...)</label>
            <input 
              type="text" 
              value={settings.whatsapp_number}
              onChange={e => setSettings({...settings, whatsapp_number: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              value={settings.email}
              onChange={e => setSettings({...settings, email: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Enlace a Instagram</label>
            <input 
              type="text" 
              value={settings.instagram_url}
              onChange={e => setSettings({...settings, instagram_url: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Enlace a Facebook</label>
            <input 
              type="text" 
              value={settings.facebook_url}
              onChange={e => setSettings({...settings, facebook_url: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Ubicación (Texto)</label>
            <input 
              type="text" 
              value={settings.location_text}
              onChange={e => setSettings({...settings, location_text: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN LEGAL */}
      <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
        <h3 className="text-xl font-semibold mb-4 text-white border-b border-gray-800 pb-2">Marco Legal</h3>
        <p className="text-sm text-gray-400 mb-6">Estos textos se mostrarán en sus respectivas páginas (ej. /legal/privacidad) y estarán enlazados en el pie de página de tu sitio.</p>
        
        <div className="space-y-6">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Aviso de Privacidad (Soporta Markdown)</label>
            <textarea 
              value={settings.privacy_policy || ''}
              onChange={e => setSettings({...settings, privacy_policy: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white h-40 font-mono text-sm"
              placeholder="# Aviso de Privacidad..."
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Términos y Condiciones (Soporta Markdown)</label>
            <textarea 
              value={settings.terms_conditions || ''}
              onChange={e => setSettings({...settings, terms_conditions: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white h-40 font-mono text-sm"
              placeholder="# Términos y Condiciones..."
            />
          </div>
        </div>
      </div>

    </form>
  );
}
