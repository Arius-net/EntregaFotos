'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface StoreItem {
  id: number;
  title: string;
  description: string;
  price: string;
  thumbnail_url: string;
  is_active: boolean;
}

export default function StoreEditor() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for new item form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10.00');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      // En el backend, si mandamos token y es admin, debería devolver todo (incluido inactivos)
      const res = await fetch(`${API_URL}/api/store`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (e) {
      toast.error('Error al cargar la tienda');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!title || !price) {
      toast.error('Debes ponerle un título y precio antes de subir la foto');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files[0];
    setUploading(true);
    const toastId = toast.loading('Subiendo foto a la tienda...');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);

      const res = await fetch(`${API_URL}/api/store`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success('Foto añadida a la tienda', { id: toastId });
        fetchItems();
        setTitle('');
        setDescription('');
        setPrice('10.00');
      } else {
        toast.error('Error al subir foto', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de red', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchItems();
        toast.success(currentStatus ? 'Foto ocultada de la tienda' : 'Foto visible en la tienda');
      }
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta foto de la tienda permanentemente?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Foto eliminada');
        fetchItems();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const openEditModal = (item: StoreItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditPrice(item.price);
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          price: editPrice
        })
      });
      if (res.ok) {
        toast.success('Foto actualizada');
        fetchItems();
        setEditingItem(null);
      } else {
        toast.error('Error al actualizar');
      }
    } catch (error) {
      toast.error('Error de red');
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulario de Subida */}
      <div className="bg-gray-900 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold text-amber-500 mb-6 border-b border-gray-800 pb-4">Añadir a la Tienda</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Título de la Fotografía</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Atardecer en la Playa"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Precio ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Descripción corta (opcional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Cuenta la historia detrás de esta foto..."
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white h-20"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleUpload}
            />
            <button 
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full min-h-[150px] border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all"
            >
              <span className="text-4xl mb-2">{uploading ? '⏳' : '📸'}</span>
              <span>{uploading ? 'Subiendo y procesando...' : 'Seleccionar Foto y Subir'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Catálogo de la tienda */}
      <div className="bg-gray-900 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          Catálogo Actual
          <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">{items.length} fotos</span>
        </h2>

        {isLoading ? (
          <div className="text-gray-500 py-10 text-center">Cargando catálogo...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 py-10 text-center bg-gray-950 rounded-xl border border-dashed border-gray-800">
            Aún no has subido fotos a la tienda.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {items.map(item => (
              <div key={item.id} className={`bg-gray-950 rounded-xl overflow-hidden border ${item.is_active ? 'border-gray-800' : 'border-red-900/50 opacity-75'} break-inside-avoid`}>
                <div className="relative group">
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
                    <button 
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full text-xs transition-colors shadow-lg"
                      title={item.is_active ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                    >
                      {item.is_active ? '👁️' : '🙈'}
                    </button>
                    <button 
                      onClick={() => openEditModal(item)}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full text-xs transition-colors shadow-lg"
                      title="Editar foto"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full text-xs transition-colors shadow-lg"
                      title="Eliminar permanentemente"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-white truncate text-sm">{item.title}</h3>
                  <p className="text-amber-500 font-bold">${item.price}</p>
                  {!item.is_active && <span className="text-[10px] text-red-400 font-medium">Oculta (Borrador)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEditingItem(null)}>
          <div className="bg-[#111322] w-full max-w-md p-6 md:p-8 rounded-3xl border border-white/10" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-white">Editar Foto</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Título</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Precio ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Descripción</label>
                <textarea 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-[#0a0c1a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none h-24"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setEditingItem(null)}
                className="w-1/2 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEdit}
                className="w-1/2 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
