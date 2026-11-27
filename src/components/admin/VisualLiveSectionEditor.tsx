import React, { useState } from 'react';
import { useDynamicContent, uploadCmsImage, saveDynamicContentAsync, DynamicBreedCardItem } from '../../utils/dynamicContent';
import { addActivityLog } from '../../utils/activityLogs';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  UploadCloud, 
  CheckCircle2, 
  Layers, 
  X, 
  BookOpen, 
  Award, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Eye,
  Sliders,
  Dna
} from 'lucide-react';

interface VisualLiveSectionEditorProps {
  onNotify?: (msg: string) => void;
}

export const VisualLiveSectionEditor: React.FC<VisualLiveSectionEditorProps> = () => {
  const { content, updateContent } = useDynamicContent();

  const [activeSection, setActiveSection] = useState<'breeds' | 'hero' | 'about' | 'certifications'>('breeds');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imagePromptOpen, setImagePromptOpen] = useState<{ breedId: string } | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Handle Breeds List Updates
  const breedsList: DynamicBreedCardItem[] = content.bullBreedsList && content.bullBreedsList.length > 0
    ? content.bullBreedsList
    : [
        {
          id: 'american-bully',
          name: 'American Bully',
          category: 'bull',
          subtitle: 'Compañero Supremo y Estructura Muscular',
          description: 'Perro compacto, potente, con gran osamenta, temperamento afable y equilibrio biomecánico.',
          varieties: ['Pocket', 'Standard', 'Classic', 'XL'],
          image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=700&q=80',
        },
        {
          id: 'exotic-bully',
          name: 'Exotic Bully',
          category: 'bull',
          subtitle: 'Fenotipo Extremo y Agilidad Preservada',
          description: 'Evolución morfológica con máxima compactación, densidad ósea y apego al protocolo de salud INBR.',
          varieties: ['Micro', 'Clean Exotic', 'Nano'],
          image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80',
        },
      ];

  const handleUpdateBreed = (id: string, updates: Partial<DynamicBreedCardItem>) => {
    const updated = breedsList.map((b) => (b.id === id ? { ...b, ...updates } : b));
    updateContent({ bullBreedsList: updated });
  };

  const handleRemoveBreed = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta raza oficial del catálogo?')) {
      const updated = breedsList.filter((b) => b.id !== id);
      updateContent({ bullBreedsList: updated });
    }
  };

  const handleAddBreed = () => {
    const newId = `raza-${Date.now()}`;
    const newBreed: DynamicBreedCardItem = {
      id: newId,
      name: 'NUEVA RAZA OFICIAL',
      category: 'bull',
      subtitle: 'Subtítulo Descriptivo de la Raza',
      description: 'Ingresa aquí las características morfológicas, temperamento y estándar oficial de esta raza...',
      varieties: ['Estándar Oficial'],
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80',
    };
    updateContent({ bullBreedsList: [...breedsList, newBreed] });
  };

  const handleAddVariety = (breedId: string) => {
    const varName = window.prompt('Nombre de la nueva variedad o línea (ej: Pocket, Micro, Línea Europea):');
    if (varName && varName.trim()) {
      const breed = breedsList.find((b) => b.id === breedId);
      if (breed) {
        handleUpdateBreed(breedId, {
          varieties: [...breed.varieties, varName.trim()],
        });
      }
    }
  };

  const handleRemoveVariety = (breedId: string, varIndex: number) => {
    const breed = breedsList.find((b) => b.id === breedId);
    if (breed) {
      const nextVars = breed.varieties.filter((_, i) => i !== varIndex);
      handleUpdateBreed(breedId, { varieties: nextVars });
    }
  };

  const handleImageFileUpload = async (breedId: string, file: File) => {
    try {
      const uploadedUrl = await uploadCmsImage(file);
      handleUpdateBreed(breedId, { image: uploadedUrl });
    } catch (e) {
      console.error(e);
      // Fallback base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleUpdateBreed(breedId, { image: String(ev.target.result) });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveToSupabase = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveDynamicContentAsync(content);
      addActivityLog({
        author: {
          name: 'Jonathan García',
          role: 'MASTER',
          email: 'jggarcia288@gmail.com',
        },
        action: 'EDICIÓN_CMS_EN_VIVO',
        category: 'CMS',
        fieldModified: 'catalogo_razas_visual',
        details: 'Actualización en vivo del catálogo de razas oficiales y diseño visual del sitio en Supabase.',
      });
      setSaveSuccess(true);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#FFFFFF'],
        });
      } catch {}
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error al guardar en Supabase:', err);
      alert('Los cambios fueron guardados localmente y se sincronizarán al reconectar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Section Selector */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#1A160D] via-[#120F08] to-[#1A160D] border-2 border-[#D4AF37] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFE885]" />
              <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                Editor Visual en Vivo (Diseño Idéntico a la Página)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-black/60 border border-[#D4AF37]/60 text-[#FFE885] text-[10px] font-mono font-bold">
                WYSIWYG 2026
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
              Edita directamente sobre los elementos visuales tal cual se ven en la página web: escribe para modificar textos, presiona los botones para cambiar o quitar fotos, agregar nuevas razas o añadir botones.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
              <span>{isSaving ? 'Guardando en Supabase...' : 'Guardar Cambios en Supabase'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>¡Cambios guardados con éxito en la base de datos de Supabase! El sitio web ya muestra el nuevo diseño.</span>
          </div>
        )}

        {/* Section Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-neutral-800">
          <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold mr-1">
            Sección a Editar:
          </span>
          {[
            { id: 'breeds', label: '🐕 Nuestras Razas Oficiales (Multi-Razas)' },
            { id: 'hero', label: '👑 Portada & Hero Principal' },
            { id: 'about', label: '🏢 Quiénes Somos & Misión' },
            { id: 'certificaciones', label: '📜 Certificaciones Notariales' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-gold-gradient text-black font-black shadow-md scale-102'
                  : 'bg-black/60 border border-neutral-800 text-neutral-300 hover:text-white hover:border-[#D4AF37]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: NUESTRAS RAZAS OFICIALES (IGUALITO A LA PÁGINA)               */}
      {/* ========================================================================= */}
      {activeSection === 'breeds' && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-[#080808] border-2 border-[#D4AF37]/40 shadow-2xl">
          {/* Header de la sección editable */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 shadow">
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
                LIBRO GENEALÓGICO MULTI-RAZAS INBR
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                Título Principal de la Sección (Clic para editar):
              </label>
              <input
                type="text"
                value={content.bullBreedsTitle || ''}
                onChange={(e) => updateContent({ bullBreedsTitle: e.target.value })}
                placeholder="Nuestras Razas Oficiales (Multi-Razas)"
                className="w-full text-center text-2xl sm:text-4xl font-black text-white font-serif-luxury bg-transparent border-b-2 border-[#D4AF37]/40 focus:border-[#FFE885] focus:outline-none py-1"
              />

              <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold block pt-2">
                Subtítulo de la Sección:
              </label>
              <textarea
                value={content.bullBreedsSubtitle || ''}
                onChange={(e) => updateContent({ bullBreedsSubtitle: e.target.value })}
                rows={2}
                placeholder="Descripción general de las razas homologadas..."
                className="w-full text-center text-xs sm:text-sm text-neutral-300 bg-black/40 border border-neutral-800 rounded-xl p-2.5 focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleAddBreed}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4 text-black" />
                <span>+ Agregar Nueva Raza Oficial al Catálogo</span>
              </button>
            </div>
          </div>

          {/* Grid de Razas: Diseño Idéntico al Sitio con Controles Superpuestos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {breedsList.map((breed) => (
              <div
                key={breed.id}
                className="group relative rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 overflow-hidden flex flex-col justify-between shadow-2xl transition-all"
              >
                {/* Zona de Imagen con Botones de Edición Directa */}
                <div className="relative h-60 bg-black overflow-hidden group">
                  {breed.image ? (
                    <img
                      src={breed.image}
                      alt={breed.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-500 gap-2 p-4 text-center">
                      <ImageIcon className="w-10 h-10 text-neutral-600" />
                      <span className="text-xs font-bold">Sin Imagen Asignada</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#12110D] via-black/40 to-black/60 opacity-90 group-hover:opacity-95 transition-opacity" />

                  {/* Botones Flotantes Sobre la Imagen: Cambiar Foto / Quitar Foto */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5 z-10">
                    <label className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-[#D4AF37] text-white hover:text-black border border-[#D4AF37] text-[10px] font-bold transition-all shadow">
                      <UploadCloud className="w-3 h-3" />
                      <span>Cambiar Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageFileUpload(breed.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {breed.image && (
                      <button
                        type="button"
                        onClick={() => handleUpdateBreed(breed.id, { image: '' })}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-700 text-rose-200 border border-rose-500 text-[10px] font-bold transition-all shadow cursor-pointer"
                        title="Quitar imagen actual"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>

                  {/* Input rápido de URL de imagen al hacer clic */}
                  <div className="absolute bottom-2 left-2 right-2 z-10">
                    <input
                      type="text"
                      value={breed.image}
                      onChange={(e) => handleUpdateBreed(breed.id, { image: e.target.value })}
                      placeholder="O pega URL de imagen (https://...)"
                      className="w-full px-2 py-1 text-[9px] font-mono text-neutral-200 bg-black/80 border border-neutral-700 rounded-md focus:border-[#D4AF37] focus:outline-none truncate"
                    />
                  </div>
                </div>

                {/* Contenido de la Tarjeta Editable en Vivo */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Nombre de la Raza */}
                    <div>
                      <span className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                        Nombre Oficial de la Raza:
                      </span>
                      <input
                        type="text"
                        value={breed.name}
                        onChange={(e) => handleUpdateBreed(breed.id, { name: e.target.value })}
                        className="w-full font-bold text-lg text-white font-serif-luxury bg-black/50 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:border-[#FFE885] focus:outline-none"
                      />
                    </div>

                    {/* Subtítulo / Lema */}
                    <div>
                      <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold block">
                        Subtítulo / Especialidad:
                      </span>
                      <input
                        type="text"
                        value={breed.subtitle}
                        onChange={(e) => handleUpdateBreed(breed.id, { subtitle: e.target.value })}
                        className="w-full text-xs font-semibold text-[#FFE885] bg-black/50 border border-neutral-800 rounded-lg px-2.5 py-1 focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>

                    {/* Categoría de Raza */}
                    <div>
                      <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold block">
                        Categoría Oficial:
                      </span>
                      <select
                        value={breed.category}
                        onChange={(e) => handleUpdateBreed(breed.id, { category: e.target.value as any })}
                        className="w-full text-xs text-neutral-200 bg-black/50 border border-neutral-800 rounded-lg px-2.5 py-1 focus:border-[#D4AF37] focus:outline-none"
                      >
                        <option value="bull">Razas Tipo Bull</option>
                        <option value="guard">Molosos & Guardia</option>
                        <option value="work">Trabajo & Pastores K9</option>
                        <option value="companion">Compañía & Familia</option>
                      </select>
                    </div>

                    {/* Descripción de la Raza */}
                    <div>
                      <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold block">
                        Descripción Morfológica:
                      </span>
                      <textarea
                        value={breed.description}
                        onChange={(e) => handleUpdateBreed(breed.id, { description: e.target.value })}
                        rows={3}
                        className="w-full text-xs text-neutral-300 bg-black/50 border border-neutral-800 rounded-lg p-2 focus:border-[#D4AF37] focus:outline-none resize-none leading-relaxed"
                      />
                    </div>

                    {/* Variedades / Líneas con Agregar y Quitar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold">
                          Variedades / Líneas:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddVariety(breed.id)}
                          className="text-[9px] text-[#FFE885] hover:underline font-bold flex items-center gap-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Agregar</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {breed.varieties.map((v, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#18140B] text-neutral-200 border border-[#D4AF37]/40"
                          >
                            <span>{v}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariety(breed.id, idx)}
                              className="text-neutral-500 hover:text-rose-400 font-bold"
                              title="Eliminar variedad"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botón de Eliminación de la Raza */}
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRemoveBreed(breed.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/50 border border-rose-800 hover:bg-rose-900 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Eliminar Esta Raza</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Inferior para Añadir más razas */}
          <div className="text-center pt-6 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleAddBreed}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>+ Agregar Otra Raza al Catálogo Oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: PORTADA & HERO PRINCIPAL                                       */}
      {/* ========================================================================= */}
      {activeSection === 'hero' && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-[#080808] border-2 border-[#D4AF37]/40 shadow-2xl">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E170C] to-[#0A0A0A] border border-[#D4AF37] space-y-4">
            <span className="text-[10px] font-mono uppercase text-[#FFE885] font-bold">
              PORTADA PRINCIPAL EN VIVO
            </span>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Título Línea 1 (Oro):</label>
                <input
                  type="text"
                  value={content.heroTitleLine1 || ''}
                  onChange={(e) => updateContent({ heroTitleLine1: e.target.value })}
                  className="w-full text-xl sm:text-3xl font-black text-[#FFE885] font-serif-luxury bg-black/60 border border-neutral-700 rounded-xl p-3 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Título Línea 2 (Blanco):</label>
                <input
                  type="text"
                  value={content.heroTitleLine2 || ''}
                  onChange={(e) => updateContent({ heroTitleLine2: e.target.value })}
                  className="w-full text-xl sm:text-3xl font-black text-white font-serif-luxury bg-black/60 border border-neutral-700 rounded-xl p-3 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Subtítulo / Misión:</label>
                <textarea
                  value={content.heroSubtitle || ''}
                  onChange={(e) => updateContent({ heroSubtitle: e.target.value })}
                  rows={3}
                  className="w-full text-xs sm:text-sm text-neutral-200 bg-black/60 border border-neutral-700 rounded-xl p-3 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Aviso Superior Oficial:</label>
                <input
                  type="text"
                  value={content.bannerNotice || ''}
                  onChange={(e) => updateContent({ bannerNotice: e.target.value })}
                  className="w-full text-xs text-neutral-300 bg-black/60 border border-neutral-700 rounded-xl p-2.5 focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 3: QUIÉNES SOMOS & MISIÓN                                         */}
      {/* ========================================================================= */}
      {activeSection === 'about' && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-[#080808] border-2 border-[#D4AF37]/40 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-300 block">Título Quiénes Somos:</label>
              <input
                type="text"
                value={content.aboutUsTitle || ''}
                onChange={(e) => updateContent({ aboutUsTitle: e.target.value })}
                className="w-full text-lg font-bold text-white bg-black/60 border border-neutral-700 rounded-xl p-3"
              />

              <label className="text-xs font-bold text-neutral-300 block pt-2">Subtítulo Quiénes Somos:</label>
              <input
                type="text"
                value={content.aboutUsSubtitle || ''}
                onChange={(e) => updateContent({ aboutUsSubtitle: e.target.value })}
                className="w-full text-xs text-[#FFE885] bg-black/60 border border-neutral-700 rounded-xl p-2.5"
              />

              <label className="text-xs font-bold text-neutral-300 block pt-2">Párrafo 1 (Misión):</label>
              <textarea
                value={content.aboutUsParagraph1 || ''}
                onChange={(e) => updateContent({ aboutUsParagraph1: e.target.value })}
                rows={4}
                className="w-full text-xs text-neutral-300 bg-black/60 border border-neutral-700 rounded-xl p-3"
              />

              <label className="text-xs font-bold text-neutral-300 block pt-2">Párrafo 2 (Trayectoria):</label>
              <textarea
                value={content.aboutUsParagraph2 || ''}
                onChange={(e) => updateContent({ aboutUsParagraph2: e.target.value })}
                rows={4}
                className="w-full text-xs text-neutral-300 bg-black/60 border border-neutral-700 rounded-xl p-3"
              />
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-2">Foto de la Directiva:</label>
                <div className="h-64 rounded-2xl overflow-hidden border-2 border-[#D4AF37] relative group bg-black">
                  {content.aboutUsPhoto ? (
                    <img src={content.aboutUsPhoto} alt="About Us" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">Sin foto</div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <label className="flex-1 cursor-pointer py-2.5 rounded-xl bg-[#1E190E] border border-[#D4AF37] text-center text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all">
                    <span>Subir Nueva Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const url = await uploadCmsImage(e.target.files[0]);
                            updateContent({ aboutUsPhoto: url });
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                  </label>

                  {content.aboutUsPhoto && (
                    <button
                      type="button"
                      onClick={() => updateContent({ aboutUsPhoto: '' })}
                      className="px-3 py-2.5 rounded-xl bg-rose-950 border border-rose-800 text-xs font-bold text-rose-300 hover:bg-rose-900"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 4: CERTIFICACIONES NOTARIALES                                     */}
      {/* ========================================================================= */}
      {activeSection === 'certifications' && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-[#080808] border-2 border-[#D4AF37]/40 shadow-2xl">
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-300 block">Título de Certificaciones:</label>
            <input
              type="text"
              value={content.certificationsTitle || ''}
              onChange={(e) => updateContent({ certificationsTitle: e.target.value })}
              className="w-full text-lg font-bold text-white bg-black/60 border border-neutral-700 rounded-xl p-3"
            />

            <label className="text-xs font-bold text-neutral-300 block pt-2">Subtítulo de Certificaciones:</label>
            <textarea
              value={content.certificationsSubtitle || ''}
              onChange={(e) => updateContent({ certificationsSubtitle: e.target.value })}
              rows={3}
              className="w-full text-xs text-neutral-300 bg-black/60 border border-neutral-700 rounded-xl p-3"
            />
          </div>
        </div>
      )}
    </div>
  );
};
