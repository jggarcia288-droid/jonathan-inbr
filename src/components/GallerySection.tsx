import React, { useState } from 'react';
import { useDynamicContent, GalleryPhotoItem, uploadCmsImage, saveDynamicContentAsync } from '../utils/dynamicContent';
import { useAuth } from '../hooks/useAuth';
import { 
  Camera, 
  Sparkles, 
  X, 
  ZoomIn, 
  UploadCloud, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  User, 
  Image as ImageIcon 
} from 'lucide-react';

export const GallerySection: React.FC = () => {
  const { content, updateContent } = useDynamicContent();
  const { user, isAuthenticated } = useAuth();
  const [activePhotoModal, setActivePhotoModal] = useState<GalleryPhotoItem | null>(null);
  const [manageModalOpen, setManageModalOpen] = useState<boolean>(false);

  // New photo form state
  const [newTitle, setNewTitle] = useState('');
  const [newAssociate, setNewAssociate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const photos = content.galleryPhotos || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const url = await uploadCmsImage(e.target.files[0]);
        setNewImageUrl(url);
        setSaveStatus('¡Foto subida correctamente!');
        setTimeout(() => setSaveStatus(null), 3000);
      } catch (err) {
        console.error('Error uploading photo:', err);
        alert('Error al subir la imagen. Por favor intenta nuevamente.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddAssociatePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) {
      alert('Por favor selecciona o sube una imagen primero.');
      return;
    }

    const desc = [
      newAssociate.trim() ? `Asociado: ${newAssociate.trim()}` : '',
      newDescription.trim()
    ].filter(Boolean).join(' • ');

    const newPhoto: GalleryPhotoItem = {
      id: `assoc-${Date.now()}`,
      title: newTitle.trim() || (newAssociate.trim() ? `Ejemplar de ${newAssociate.trim()}` : 'Fotografía Oficial INBR'),
      category: 'litters',
      imageUrl: newImageUrl.trim(),
      description: desc || undefined,
      date: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
    };

    const updated = [newPhoto, ...photos];
    updateContent({ galleryPhotos: updated });
    saveDynamicContentAsync({ ...content, galleryPhotos: updated });

    // Reset form
    setNewTitle('');
    setNewAssociate('');
    setNewDescription('');
    setNewImageUrl('');
    setSaveStatus('¡Fotografía de asociado agregada con éxito!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleDeletePhoto = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta fotografía de la galería?')) {
      const updated = photos.filter((p) => p.id !== id);
      updateContent({ galleryPhotos: updated });
      saveDynamicContentAsync({ ...content, galleryPhotos: updated });
    }
  };

  const handleReplacePhotoFile = async (id: string, file: File) => {
    try {
      const url = await uploadCmsImage(file);
      const updated = photos.map((p) => (p.id === id ? { ...p, imageUrl: url } : p));
      updateContent({ galleryPhotos: updated });
      saveDynamicContentAsync({ ...content, galleryPhotos: updated });
      setSaveStatus('¡Fotografía reemplazada con éxito!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Error al reemplazar la imagen.');
    }
  };

  return (
    <section id="galeria" className="py-24 bg-[#080808] relative border-t border-b border-[#D4AF37]/25 overflow-hidden">
      {/* Decorative ambient gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#D4AF37]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-105 transition-transform duration-300">
            <Camera className="w-4 h-4 text-[#FFE885] animate-pulse" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              GALERÍA DE FOTOS • INBR OFICIAL
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-4 uppercase">
            Galería de Fotos
          </h2>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6">
            Registro visual y galería fotográfica oficial de los asociados y miembros de International Breeds Registry.
          </p>

          {/* Botón para administrar y subir fotos de asociados */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setManageModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gold-gradient text-black font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(212,175,55,0.35)] cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-black" />
              <span>Subir / Administrar Fotos de Asociados</span>
              <span className="px-2 py-0.5 rounded-full bg-black/20 text-black text-[11px] font-mono">
                {photos.length} fotos
              </span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhotoModal(photo)}
              className="group relative rounded-3xl overflow-hidden bg-[#110F0A] border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] shadow-xl hover:shadow-[0_0_35px_rgba(212,175,55,0.35)] transition-all duration-500 cursor-pointer flex flex-col hover:-translate-y-1.5"
            >
              {/* Image Container with Zoom effect */}
              <div className="aspect-[4/3] w-full overflow-hidden relative bg-black">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                {/* Badge: Asociado INBR */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-[#D4AF37]/60 text-[10px] font-mono font-bold text-[#FFE885] uppercase tracking-wider shadow">
                  <User className="w-3 h-3 text-[#D4AF37]" />
                  <span>ASOCIADO INBR</span>
                </div>

                {/* Magnifier Hover Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-black/80 border-2 border-[#D4AF37] text-[#FFE885] flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform">
                    <ZoomIn className="w-6 h-6" />
                  </div>
                </div>

                {photo.date && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-neutral-300 border border-neutral-700">
                    {photo.date}
                  </div>
                )}
              </div>

              {/* Card Footer Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-serif-luxury group-hover:text-[#FFE885] transition-colors leading-snug">
                    {photo.title}
                  </h3>
                  {photo.description && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {photo.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-[#D4AF37]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>REGISTRO OFICIAL INBR</span>
                  </span>
                  <span className="text-neutral-400 group-hover:text-white transition-colors">
                    Ver foto completa →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="text-center py-16 p-8 rounded-3xl bg-[#110F0A] border border-neutral-800 max-w-md mx-auto">
            <Camera className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-white font-bold text-sm">Aún no hay fotos en la galería.</p>
            <button
              onClick={() => setManageModalOpen(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-gold-gradient text-black font-bold text-xs cursor-pointer"
            >
              Subir la primera foto
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE ADMINISTRACIÓN Y SUBIDA DE FOTOS DE ASOCIADOS */}
      {manageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-4xl w-full bg-[#110F0A] border-2 border-[#D4AF37] rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(212,175,55,0.4)] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E190E] to-[#110F0A] border-b border-[#D4AF37]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#FFE885]" />
                <h4 className="text-base sm:text-lg font-black text-white font-serif-luxury">
                  Administrador de Fotos de Asociados INBR
                </h4>
              </div>
              <button
                onClick={() => setManageModalOpen(false)}
                className="p-2 rounded-xl bg-black/60 border border-neutral-700 text-neutral-300 hover:text-white hover:border-[#D4AF37] transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {saveStatus && (
                <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Formulario para Subir Nueva Foto */}
              <div className="p-5 rounded-2xl bg-black/60 border border-[#D4AF37]/40 space-y-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#D4AF37]" />
                  <h5 className="text-sm font-bold text-[#FFE885] uppercase tracking-wide">
                    Subir Nueva Foto de Asociado
                  </h5>
                </div>

                <form onSubmit={handleAddAssociatePhoto} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1">
                        Título o Nombre del Ejemplar:
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ej: KONG THE BEAST"
                        className="w-full px-3 py-2 rounded-xl bg-[#1A160D] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-300 font-medium mb-1">
                        Nombre del Asociado / Criadero:
                      </label>
                      <input
                        type="text"
                        value={newAssociate}
                        onChange={(e) => setNewAssociate(e.target.value)}
                        placeholder="Ej: Criadero Santa Fe / Carlos Otero"
                        className="w-full px-3 py-2 rounded-xl bg-[#1A160D] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-medium mb-1">
                      Descripción o Detalles Adicionales:
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Ej: Línea Americana, Monterrey, NL • Ejemplar Certificado F1"
                      className="w-full px-3 py-2 rounded-xl bg-[#1A160D] border border-neutral-700 text-white text-xs placeholder-neutral-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  {/* Subir archivo de imagen */}
                  <div>
                    <label className="block text-xs text-neutral-300 font-medium mb-1">
                      Seleccionar Archivo de Foto del Asociado:
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F190E] border-2 border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all">
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                            <span>Subiendo imagen a la nube...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Seleccionar Foto de mi Computadora / Celular</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>

                      {newImageUrl && (
                        <div className="flex items-center gap-2">
                          <img
                            src={newImageUrl}
                            alt="Previsualización"
                            className="w-12 h-12 object-cover rounded-lg border border-[#D4AF37]"
                          />
                          <span className="text-[11px] text-emerald-400 font-mono">Foto cargada lista</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUploading || !newImageUrl}
                      className="px-6 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                    >
                      Guardar Foto en la Galería
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Fotos Existentes para Editar o Borrar */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">
                  Fotos Actuales en la Galería ({photos.length}):
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                  {photos.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#16130C] border border-neutral-800 flex items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded-lg border border-neutral-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{item.description || 'Sin descripción'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <label
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-[#D4AF37] cursor-pointer transition-all"
                          title="Reemplazar archivo de imagen"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleReplacePhotoFile(item.id, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(item.id)}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-rose-400 hover:text-white hover:bg-rose-950 hover:border-rose-600 transition-all cursor-pointer"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0E0C08] border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setManageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-700 transition-all"
              >
                Cerrar Administrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-fadeIn">
          <div className="relative max-w-5xl w-full bg-[#110F0A] border-2 border-[#D4AF37] rounded-3xl overflow-hidden shadow-[0_0_70px_rgba(212,175,55,0.4)] flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#1E190E] to-[#110F0A] border-b border-[#D4AF37]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFE885]" />
                <h4 className="text-sm sm:text-base font-black text-white font-serif-luxury truncate">
                  {activePhotoModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActivePhotoModal(null)}
                className="p-2 rounded-xl bg-black/60 border border-neutral-700 text-neutral-300 hover:text-white hover:border-[#D4AF37] transition-all cursor-pointer"
                title="Cerrar vista"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
              <img
                src={activePhotoModal.imageUrl}
                alt={activePhotoModal.title}
                referrerPolicy="no-referrer"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-2xl border border-neutral-800 shadow-2xl"
              />
            </div>

            {/* Modal Info Footer */}
            <div className="p-4 sm:p-6 bg-[#0D0B07] border-t border-[#D4AF37]/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-2xl">
                <p className="text-sm font-bold text-[#FFE885]">{activePhotoModal.title}</p>
                {activePhotoModal.description && (
                  <p className="text-neutral-300 leading-relaxed">{activePhotoModal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#1A160D] border border-[#D4AF37] text-[11px] font-mono text-[#FFE885] font-bold">
                  {activePhotoModal.date || 'Temporada Oficial 2026'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
