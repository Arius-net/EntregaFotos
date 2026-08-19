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
  category: string;
}

export default function StoreEditor() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States for new item form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10.00');
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('General');
  const [editCustomCategory, setEditCustomCategory] = useState('');

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Extract all categories currently in DB
  const allCategories = Array.from(new Set(['General', ...items.map(item => item.category || 'General')]));

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const token = sessionStorage.getItem('token');
      // En el backend, si mandamos token y es admin, debería devolver todo (incluido inactivos)
      const res = await fetch(`${API_URL}/api/store?ts=${Date.now()}`, {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Debes seleccionar una foto');
      return;
    }
    if (!title || !price) {
      toast.error('Debes ponerle un título y precio antes de subir la foto');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Subiendo foto a la tienda...');

    try {
      const token = sessionStorage.getItem('token');
      const finalCategory = category === 'Nueva...' ? customCategory : category;

      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', finalCategory || 'General');

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
        setCategory('General');
        setCustomCategory('');
        setSelectedFile(null);
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
      const token = sessionStorage.getItem('token');
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
      const token = sessionStorage.getItem('token');
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
    setEditCategory(item.category || 'General');
    setEditCustomCategory('');
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    try {
      const finalCategory = editCategory === 'Nueva...' ? editCustomCategory : editCategory;
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/${editingItem.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          price: editPrice,
          category: finalCategory || 'General'
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

  const handleRenameCategory = async (oldCategory: string, newCategory: string) => {
    const trimmedNewCategory = newCategory.trim();
    if (!trimmedNewCategory) return;
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/categories/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldCategory, newCategory: trimmedNewCategory })
      });
      if (res.ok) {
        toast.success('Categoría renombrada');
        setCategoryToRename(null);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al renombrar');
      }
    } catch (e) {
      toast.error('Error de red');
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la categoría "${cat}"? Los fondos se moverán a "General".`)) return;
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/store/categories/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category: cat })
      });
      if (res.ok) {
        toast.success('Categoría eliminada');
        fetchItems();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (e) {
      toast.error('Error de red');
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulario de Subida */}
      <div className="bg-[#0a0c1a] border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Añadir Nuevo Fondo</h2>
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            Administrar Categorías
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Título del producto" 
                className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <input 
                type="number" 
                placeholder="Precio (MXN)" 
                className="bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 w-full">
              <select 
                className={`bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 ${category === 'Nueva...' ? 'w-1/3' : 'w-full'}`}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Nueva...">Nueva Categoría...</option>
              </select>
              
              {category === 'Nueva...' && (
                <input 
                  type="text" 
                  placeholder="Nombre de nueva categoría" 
                  className="w-2/3 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              )}
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

          <div className="flex flex-col justify-center gap-4">
            <input 
              type="file" 
              accept="image/jpeg, image/png, image/webp" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full min-h-[150px] border-2 border-dashed border-gray-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-amber-500 hover:bg-amber-500/5 transition-all relative overflow-hidden"
            >
              {selectedFile ? (
                <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
              ) : null}
              <span className="text-4xl mb-2 z-10">📸</span>
              <span className="z-10 text-center px-4 font-medium">{selectedFile ? selectedFile.name : 'Seleccionar Foto'}</span>
            </div>
            
            <button 
              type="button"
              disabled={uploading || !selectedFile}
              onClick={handleUpload}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {uploading ? 'Subiendo y procesando...' : 'Subir a la Tienda'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Precio (MXN)</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-sm mb-1 block">Categoría / Dispositivo</label>
                  <div className="flex gap-2">
                    <select 
                      className={`bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 ${editCategory === 'Nueva...' ? 'w-1/3' : 'w-full'}`}
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                    >
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Nueva...">Nueva...</option>
                    </select>

                    {editCategory === 'Nueva...' && (
                      <input 
                        type="text" 
                        placeholder="Nueva categoría" 
                        className="w-2/3 bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3"
                        value={editCustomCategory}
                        onChange={e => setEditCustomCategory(e.target.value)}
                      />
                    )}
                  </div>
                </div>
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

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0c1a] border border-gray-700 rounded-3xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Administrar Categorías</h3>
            <div className="space-y-4">
              {allCategories.map(cat => (
                <div key={cat} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  {categoryToRename === cat ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="text" 
                        value={renameInput}
                        onChange={e => setRenameInput(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1 flex-1"
                      />
                      <button 
                        onClick={() => handleRenameCategory(cat, renameInput)}
                        className="text-green-500 hover:text-green-400 p-1"
                      >
                        Guardar
                      </button>
                      <button 
                        onClick={() => setCategoryToRename(null)}
                        className="text-gray-400 hover:text-gray-300 p-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-gray-200 font-medium">{cat}</span>
                      <div className="flex gap-2">
                        {cat !== 'General' && (
                          <button 
                            onClick={() => {
                              setCategoryToRename(cat);
                              setRenameInput(cat);
                            }}
                            className="text-blue-500 hover:text-blue-400 text-sm"
                          >
                            Renombrar
                          </button>
                        )}
                        {cat !== 'General' && (
                          <button 
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-red-500 hover:text-red-400 text-sm"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setIsCategoryModalOpen(false)}
              className="mt-8 w-full py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
