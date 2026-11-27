import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  UploadCloud, 
  Calendar, 
  Tag, 
  Eye, 
  Filter,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { GalleryPhotoItem, uploadCmsImage } from '../../utils/dynamicContent';

interface AdminGalleryEditorProps {
  isAdmin: boolean;
  photos: GalleryPhotoItem[];
  onChange: (updated: GalleryPhotoItem[]) => void;
}

export const AdminGalleryEditor: React.FC<AdminGalleryEditorProps> = ({
  isAdmin,
  photos,
  onChange,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form for adding a new photo
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'champions' | 'rings' | 'litters' | 'events'>('champions');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPhotos = activeCategory === 'ALL'
    ? photos
    : photos.filter((p) => p.category === activeCategory);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await uploadCmsImage(file);
      setNewImageUrl(url);
      setSuccessMsg('Fotografía subida con éxito');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al subir la fotografía.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newImageUrl.trim()) {
      alert('Por favor selecciona o sube una imagen para la fotografía.');
      return;
    }

    const newItem: GalleryPhotoItem = {
      id: `photo-${Date.now()}`,
      title: newTitle.trim() || 'Fotografía Oficial INBR',
      category: newCategory,
      imageUrl: newImageUrl.trim(),
      description: newDescription.trim() || undefined,
      date: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
    };

    onChange([newItem, ...photos]);
    setNewTitle('');
    setNewImageUrl('');
    setNewDescription('');
    setShowAddModal(false);
    setSuccessMsg('Fotografía agregada a la galería oficial.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeletePhoto = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Estás seguro de que deseas eliminar esta fotografía de la galería?')) {
      onChange(photos.filter((p) => p.id !== id));
      setSuccessMsg('Fotografía eliminada de la galería.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleReplaceImage = async (id: string, file: File) => {
    if (!isAdmin) return;
    try {
      const url = await uploadCmsImage(file);
      onChange(photos.map((p) => (p.id === id ? { ...p, imageUrl: url } : p)));
      setSuccessMsg('Imagen reemplazada con éxito.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al reemplazar la imagen.');
    }
  };

  const handleUpdatePhotoField = (id: string, patch: Partial<GalleryPhotoItem>) => {
    if (!isAdmin) return;
    onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Gestión de la Galería Oficial INBR
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Sube, categoriza y administra las fotografías de alta resolución de campeones, pistas oficiales, camadas élite y exposiciones internacionales.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Subir Foto a Galería</span>
          </button>
        ) : (
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Modo Solo Lectura (Admin Maestro Requerido)</span>
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-black/60 border border-neutral-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#D4AF37] mr-1" />
          {[
            { id: 'ALL', label: 'Todas las Fotos', count: photos.length },
            { id: 'champions', label: '🏆 Campeones', count: photos.filter((p) => p.category === 'champions').length },
            { id: 'rings', label: '🏟️ Pistas & Shows', count: photos.filter((p) => p.category === 'rings').length },
            { id: 'litters', label: '🐾 Camadas Élite', count: photos.filter((p) => p.category === 'litters').length },
            { id: 'events', label: '🌎 Eventos Mundiales', count: photos.filter((p) => p.category === 'events').length },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-gold-gradient text-black font-black shadow'
                  : 'text-neutral-400 hover:text-white bg-neutral-900/80 border border-neutral-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-neutral-400">
          Mostrando <strong className="text-[#FFE885]">{filteredPhotos.length}</strong> fotografías
        </span>
      </div>

      {/* Add photo modal / inline expander */}
      {showAddModal && isAdmin && (
        <form
          onSubmit={handleAddPhoto}
          className="p-5 rounded-2xl bg-[#0F0D09] border-2 border-[#D4AF37] shadow-2xl space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h4 className="text-sm font-bold text-white uppercase font-serif-luxury flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#FFE885]" />
              <span>Nueva Fotografía para la Galería Oficial</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-neutral-400 hover:text-white text-xs font-mono"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                Título o Nombre del Ejemplar:
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: GR CH TAHONA KONG • Mejor de Raza"
                className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                Categoría Oficial:
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
              >
                <option value="champions">🏆 Campeones Consagrados</option>
                <option value="rings">🏟️ Pistas & Juzgamiento</option>
                <option value="litters">🐾 Camadas & Cachorros Élite</option>
                <option value="events">🌎 Eventos & Exposiciones</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                URL de la Imagen o Subir Archivo:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                />
                <label className="px-3 py-2 rounded-xl bg-[#1E190E] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black cursor-pointer transition-all flex items-center gap-1.5 shrink-0">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Subiendo...' : 'Examinar'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                Descripción Corta (Opcional):
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ej: Houston World Cup 2026, primer puesto absoluto"
                className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {newImageUrl && (
            <div className="flex items-center gap-3 p-3 bg-black rounded-xl border border-neutral-800">
              <img
                src={newImageUrl}
                alt="Vista previa"
                className="w-16 h-16 rounded-lg object-cover border border-[#D4AF37]"
              />
              <span className="text-xs text-neutral-300 font-mono">
                Vista previa de la imagen cargada
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 shadow cursor-pointer"
            >
              Publicar Fotografía en Galería
            </button>
          </div>
        </form>
      )}

      {/* Grid of gallery photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="rounded-2xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] overflow-hidden flex flex-col justify-between shadow-lg transition-all group"
          >
            {/* Image container */}
            <div className="aspect-[4/3] w-full bg-neutral-900 relative overflow-hidden">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2.5 left-2.5">
                <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-[#D4AF37]/60 text-[9px] font-mono text-[#FFE885] uppercase font-bold">
                  {photo.category}
                </span>
              </div>

              {photo.date && (
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-mono text-neutral-300 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-[#D4AF37]" />
                    {photo.date}
                  </span>
                </div>
              )}
            </div>

            {/* Photo info / editing */}
            <div className="p-3.5 space-y-2.5">
              {isAdmin ? (
                <>
                  <div>
                    <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">
                      Título:
                    </label>
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) => handleUpdatePhotoField(photo.id, { title: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-white font-serif text-xs focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">
                        Categoría:
                      </label>
                      <select
                        value={photo.category}
                        onChange={(e) => handleUpdatePhotoField(photo.id, { category: e.target.value as any })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-white text-[10px] font-mono focus:border-[#D4AF37]"
                      >
                        <option value="champions">Campeones</option>
                        <option value="rings">Pistas</option>
                        <option value="litters">Camadas</option>
                        <option value="events">Eventos</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono text-neutral-500 uppercase block mb-0.5">
                        Fecha:
                      </label>
                      <input
                        type="text"
                        value={photo.date || ''}
                        onChange={(e) => handleUpdatePhotoField(photo.id, { date: e.target.value })}
                        placeholder="Ej: Mayo 2026"
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-white text-[10px] font-mono"
                      />
                    </div>
                  </div>

                  {/* Actions row: Replace image & Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
                    <label className="flex items-center gap-1 text-[10px] text-[#FFE885] hover:text-white font-mono cursor-pointer">
                      <UploadCloud className="w-3 h-3 text-[#D4AF37]" />
                      <span>Reemplazar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleReplaceImage(photo.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 text-[10px] flex items-center gap-1 font-mono transition-colors"
                      title="Eliminar foto de la galería"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h5 className="text-sm font-bold text-white font-serif-luxury truncate">
                    {photo.title}
                  </h5>
                  {photo.description && (
                    <p className="text-[11px] text-neutral-400 line-clamp-2">
                      {photo.description}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
