import React, { useState } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  Lock, 
  Layers, 
  Award 
} from 'lucide-react';
import { DynamicSpecialEditionItem, uploadCmsImage } from '../../utils/dynamicContent';

interface AdminSpecialEditionEditorProps {
  isAdmin: boolean;
  banner1: string;
  banner2: string;
  specialEditionList: DynamicSpecialEditionItem[];
  onBannersChange: (banner1: string, banner2: string) => void;
  onListChange: (updatedList: DynamicSpecialEditionItem[]) => void;
}

export const AdminSpecialEditionEditor: React.FC<AdminSpecialEditionEditorProps> = ({
  isAdmin,
  banner1,
  banner2,
  specialEditionList,
  onBannersChange,
  onListChange,
}) => {
  const [b1, setB1] = useState(banner1);
  const [b2, setB2] = useState(banner2);
  const [isUploadingB1, setIsUploadingB1] = useState(false);
  const [isUploadingB2, setIsUploadingB2] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBanner1Upload = async (file: File) => {
    if (!isAdmin) return;
    setIsUploadingB1(true);
    try {
      const url = await uploadCmsImage(file);
      setB1(url);
      onBannersChange(url, b2);
      setFeedback('Banner 1 de alta resolución actualizado exitosamente.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Error al subir el banner 1.');
    } finally {
      setIsUploadingB1(false);
    }
  };

  const handleBanner2Upload = async (file: File) => {
    if (!isAdmin) return;
    setIsUploadingB2(true);
    try {
      const url = await uploadCmsImage(file);
      setB2(url);
      onBannersChange(b1, url);
      setFeedback('Banner 2 de alta resolución actualizado exitosamente.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Error al subir el banner 2.');
    } finally {
      setIsUploadingB2(false);
    }
  };

  const handleAddDog = () => {
    if (!isAdmin) return;
    const newDog: DynamicSpecialEditionItem = {
      id: `sp-${Date.now()}`,
      name: 'NUEVO EJEMPLAR EDICIÓN ESPECIAL',
      category: 'Exotic Bully / Micro',
      regNumber: `INBR-SP-00${specialEditionList.length + 1}`,
      owner: 'Propietario Notariado',
      kennel: 'Kennel Internacional',
      height: '11.0 pulgadas',
      imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
      status: 'AUTORIZADO OFICIAL',
    };
    onListChange([...specialEditionList, newDog]);
    setFeedback('Nuevo ejemplar de edición especial añadido al panel.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateDog = (id: string, patch: Partial<DynamicSpecialEditionItem>) => {
    if (!isAdmin) return;
    onListChange(specialEditionList.map((dog) => (dog.id === id ? { ...dog, ...patch } : dog)));
  };

  const handleDeleteDog = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Deseas eliminar este ejemplar de la edición especial?')) {
      onListChange(specialEditionList.filter((dog) => dog.id !== id));
      setFeedback('Ejemplar removido de edición especial.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDogImageUpload = async (id: string, file: File) => {
    if (!isAdmin) return;
    try {
      const url = await uploadCmsImage(file);
      handleUpdateDog(id, { imageUrl: url });
      setFeedback('Fotografía del ejemplar actualizada.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al subir la fotografía del ejemplar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Gestión de Ejemplares Oficiales • Edición Especial
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Sube banners panorámicos de gran tamaño y cataloga los ejemplares con morfología única, fenotipos compactos y registros especiales del stud book.
          </p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={handleAddDog}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Agregar Ejemplar Especial</span>
          </button>
        ) : (
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Modo Solo Lectura (Admin Maestro)</span>
          </span>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 1: BANNERS PANORÁMICOS DE GRAN TAMAÑO (SOLO ADMINISTRADOR)        */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-[#090909] border border-[#D4AF37]/40 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <span className="text-xs font-mono font-bold text-[#FFE885] uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FFE885]" />
            <span>Banners Panorámicos en Alta Resolución (Formato Grande 1200x500)</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
            🔒 Exclusivo Panel Administrador
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Banner 1 */}
          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white font-mono uppercase">
                Banner Panorámico 1 (Izquierdo)
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">1200 x 500 px</span>
            </div>

            <div className="aspect-[21/9] w-full rounded-xl overflow-hidden bg-neutral-950 border-2 border-[#D4AF37]/50 relative group">
              <img
                src={b1 || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80'}
                alt="Banner 1"
                className="w-full h-full object-cover"
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b1}
                    onChange={(e) => {
                      setB1(e.target.value);
                      onBannersChange(e.target.value, b2);
                    }}
                    placeholder="URL directa de la imagen..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111] border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                  />
                  <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-gradient text-black font-black text-xs hover:brightness-110 cursor-pointer shadow">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingB1 ? 'Subiendo...' : 'Subir Archivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleBanner1Upload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Banner 2 */}
          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white font-mono uppercase">
                Banner Panorámico 2 (Derecho)
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">1200 x 500 px</span>
            </div>

            <div className="aspect-[21/9] w-full rounded-xl overflow-hidden bg-neutral-950 border-2 border-[#D4AF37]/50 relative group">
              <img
                src={b2 || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80'}
                alt="Banner 2"
                className="w-full h-full object-cover"
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b2}
                    onChange={(e) => {
                      setB2(e.target.value);
                      onBannersChange(b1, e.target.value);
                    }}
                    placeholder="URL directa de la imagen..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#111] border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                  />
                  <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-gradient text-black font-black text-xs hover:brightness-110 cursor-pointer shadow">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingB2 ? 'Subiendo...' : 'Subir Archivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleBanner2Upload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: EJEMPLARES DE EDICIÓN ESPECIAL                                  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#FFE885] uppercase flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FFE885]" />
            <span>Ejemplares Registrados en Edición Especial ({specialEditionList.length})</span>
          </span>
          <span className="text-xs text-neutral-400 font-mono">
            {isAdmin ? '⚡ Modifica los datos o sube nuevas fotografías oficiales' : '🔒 Solo Lectura'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {specialEditionList.map((dog) => (
            <div
              key={dog.id}
              className="p-4 rounded-2xl bg-black border border-[#D4AF37]/40 hover:border-[#D4AF37] space-y-3 transition-all shadow-lg relative group flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Photo container */}
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-neutral-900 border border-[#D4AF37]/50 relative">
                  <img
                    src={dog.imageUrl}
                    alt={dog.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 border border-[#D4AF37] text-[9px] font-mono text-[#FFE885] font-bold">
                    {dog.category}
                  </span>
                  {isAdmin && (
                    <label className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 hover:bg-gold-gradient hover:text-black border border-[#D4AF37] text-[10px] font-mono text-[#FFE885] cursor-pointer shadow flex items-center gap-1 transition-all">
                      <Camera className="w-3 h-3" />
                      <span>Cambiar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDogImageUpload(dog.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {isAdmin ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                        Nombre del Ejemplar:
                      </label>
                      <input
                        type="text"
                        value={dog.name}
                        onChange={(e) => handleUpdateDog(dog.id, { name: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-serif-luxury font-bold text-xs focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                          Categoría:
                        </label>
                        <input
                          type="text"
                          value={dog.category}
                          onChange={(e) => handleUpdateDog(dog.id, { category: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-mono text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                          Folio Especial:
                        </label>
                        <input
                          type="text"
                          value={dog.regNumber}
                          onChange={(e) => handleUpdateDog(dog.id, { regNumber: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] font-mono text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                          Propietario:
                        </label>
                        <input
                          type="text"
                          value={dog.owner}
                          onChange={(e) => handleUpdateDog(dog.id, { owner: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-[10px]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                          Estatura / Medida:
                        </label>
                        <input
                          type="text"
                          value={dog.height}
                          onChange={(e) => handleUpdateDog(dog.id, { height: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h5 className="text-base font-black text-white font-serif-luxury truncate">
                      {dog.name}
                    </h5>
                    <div className="text-[11px] font-mono text-neutral-400 space-y-0.5">
                      <div><span className="text-neutral-500">Folio:</span> <strong className="text-[#FFE885]">{dog.regNumber}</strong></div>
                      <div><span className="text-neutral-500">Propietario:</span> {dog.owner}</div>
                      <div><span className="text-neutral-500">Estatura:</span> {dog.height}</div>
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-neutral-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteDog(dog.id)}
                    className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-mono hover:bg-rose-950/40 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Ejemplar</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
