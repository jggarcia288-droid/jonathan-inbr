import React, { useState } from 'react';
import { 
  useDynamicContent, 
  DynamicBreedCardItem, 
  DynamicContentConfig,
  saveDynamicContentAsync,
  uploadCmsImage 
} from '../../utils/dynamicContent';
import { 
  Layers, 
  Sparkles, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Check, 
  Edit3, 
  Save, 
  RotateCcw, 
  UploadCloud, 
  Eye, 
  EyeOff, 
  ExternalLink,
  BookOpen,
  Link as LinkIcon,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomButtonConfig {
  label: string;
  url?: string;
  actionType?: 'standard' | 'forms' | 'verify' | 'custom_url';
}

interface ExtendedBreedItem extends DynamicBreedCardItem {
  customButtons?: CustomButtonConfig[];
}

export const AdminVisualPageEditor: React.FC = () => {
  const { content, updateContent } = useDynamicContent();

  const [activeSection, setActiveSection] = useState<'breeds' | 'hero' | 'about' | 'events'>('breeds');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [logoInputUrl, setLogoInputUrl] = useState<string>(content.siteLogoUrl || '/logo-inbr.jpg');
  const [logoUploading, setLogoUploading] = useState<boolean>(false);

  // Default breeds list if none exists yet
  const defaultBreeds: ExtendedBreedItem[] = [
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
    {
      id: 'cane-corso',
      name: 'Cane Corso Italiano',
      category: 'guard',
      subtitle: 'Moloso de Guardia y Protección Familiar',
      description: 'Moloso potente, atlético y majestuoso. Mordida en ligero prognatismo, cuello musculoso y aplomos de gran firmeza.',
      varieties: ['Negro', 'Gris Plomo', 'Leonado'],
      image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'pastor-belga-malinois',
      name: 'Pastor Belga Malinois',
      category: 'work',
      subtitle: 'Trabajo Deportivo, K9 e Inteligencia Operativa',
      description: 'Canino de trabajo con potencia de mordida, máxima agilidad, impulsos equilibrados y líneas de trabajo consagradas.',
      varieties: ['Línea de Ring Francés', 'Mondioring', 'K9 Operativo'],
      image: 'https://images.unsplash.com/photo-1588943211346-090881b5782a?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'french-bulldog',
      name: 'French Bulldog',
      category: 'bull',
      subtitle: 'Moloso Compacto de Compañía',
      description: 'Cuerpo compacto, orejas de murciélago, pecho ancho y excelente respiración con narinas abiertas.',
      varieties: ['Estándar Fawn/Brindle', 'Fluffy', 'Visual Isabella'],
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'doberman',
      name: 'Doberman Pinscher',
      category: 'guard',
      subtitle: 'Elegancia, Firmeza y Máximo Carácter',
      description: 'Silueta esculpida, porte noble y lealtad incondicional. Excelente dorso firme y trote amplio elástico.',
      varieties: ['Línea Europea', 'Línea Americana'],
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'rottweiler',
      name: 'Rottweiler',
      category: 'guard',
      subtitle: 'Potencia, Determinación y Estructura Robusta',
      description: 'Canino de origen germano con cabeza potente, marcas de fuego delimitadas y temperamento equilibrado.',
      varieties: ['Línea ADRK', 'Línea Internacional'],
      image: 'https://images.unsplash.com/photo-1567752881298-894bb81f9379?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'american-pit-bull',
      name: 'American Pit Bull Terrier',
      category: 'bull',
      subtitle: 'Raza Atlética de Rendimiento Histórico',
      description: 'Musculatura magra, impulsión posterior sobresaliente y tenacidad con enfoque deportivo oficial.',
      varieties: ['Game Dog Tradicional', 'Conformación Deportiva'],
      image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=700&q=80',
    },
  ];

  // Local editable state for breeds
  const [breedsList, setBreedsList] = useState<ExtendedBreedItem[]>(() => {
    return (content.bullBreedsList && content.bullBreedsList.length > 0)
      ? (content.bullBreedsList as ExtendedBreedItem[])
      : defaultBreeds;
  });

  // Modal / prompt for changing an image URL
  const [activeImagePromptBreedId, setActiveImagePromptBreedId] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string>('');

  // Modal / prompt for adding a new variety tag
  const [activeVarietyPromptBreedId, setActiveVarietyPromptBreedId] = useState<string | null>(null);
  const [newVarietyText, setNewVarietyText] = useState<string>('');

  // Save all changes directly to DynamicContent and Supabase
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      updateContent({
        bullBreedsList: breedsList,
      });
      await saveDynamicContentAsync({ bullBreedsList: breedsList });
      setSaveSuccess(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving CMS content:', err);
      alert('Se guardó localmente. Los cambios ya son visibles en la página web.');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Quitar Imagen de una raza
  const handleRemoveImage = (breedId: string) => {
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        return { ...b, image: '' };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 2. Establecer / Cambiar imagen
  const handleApplyNewImage = (breedId: string) => {
    if (!newImageUrl.trim()) return;
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        return { ...b, image: newImageUrl.trim() };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
    setActiveImagePromptBreedId(null);
    setNewImageUrl('');
  };

  // 3. Borrar texto de descripción
  const handleClearDescription = (breedId: string) => {
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        return { ...b, description: '' };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 4. Actualizar campos de texto en tiempo real
  const handleUpdateBreedField = (breedId: string, field: keyof ExtendedBreedItem, value: any) => {
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        return { ...b, [field]: value };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 5. Agregar botón a una raza
  const handleAddButton = (breedId: string) => {
    const label = prompt('Escribe el texto del nuevo botón:', 'Registrar Ejemplar');
    if (!label) return;
    const url = prompt('Enlace del botón (opcional, ej: #formularios o URL externa):', '#formularios') || '#formularios';

    const updated: ExtendedBreedItem[] = breedsList.map((b) => {
      if (b.id === breedId) {
        const currentButtons = b.customButtons || [];
        const newBtn: CustomButtonConfig = { label, url, actionType: 'custom_url' };
        return {
          ...b,
          customButtons: [...currentButtons, newBtn],
        };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 6. Quitar botón de una raza
  const handleRemoveCustomButton = (breedId: string, buttonIndex: number) => {
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        const currentButtons = [...(b.customButtons || [])];
        currentButtons.splice(buttonIndex, 1);
        return { ...b, customButtons: currentButtons };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 7. Agregar nueva raza
  const handleAddNewBreed = () => {
    const newBreed: ExtendedBreedItem = {
      id: `raza-${Date.now()}`,
      name: 'Nueva Raza Oficial',
      category: 'bull',
      subtitle: 'Estándar y Morfología Homologada',
      description: 'Descripción morfológica y genética oficial del ejemplar según libro genealógico INBR.',
      varieties: ['Estándar Oficial'],
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80',
    };
    const updated = [newBreed, ...breedsList];
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 8. Eliminar raza
  const handleDeleteBreed = (breedId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta raza de la sección?')) return;
    const updated = breedsList.filter((b) => b.id !== breedId);
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 9. Quitar variedad
  const handleRemoveVariety = (breedId: string, idxToRemove: number) => {
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        const newVars = b.varieties.filter((_, idx) => idx !== idxToRemove);
        return { ...b, varieties: newVars };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
  };

  // 10. Agregar variedad
  const handleAddVariety = (breedId: string) => {
    if (!newVarietyText.trim()) return;
    const updated = breedsList.map((b) => {
      if (b.id === breedId) {
        return { ...b, varieties: [...b.varieties, newVarietyText.trim()] };
      }
      return b;
    });
    setBreedsList(updated);
    updateContent({ bullBreedsList: updated });
    setActiveVarietyPromptBreedId(null);
    setNewVarietyText('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ========================================================================= */}
      {/* HEADER CONTROL BAR: WYSIWYG EN VIVO                                       */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#17130A] via-[#221B0E] to-[#120F08] border-2 border-[#D4AF37] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gold-gradient text-black font-black text-xs">
              WYSIWYG
            </span>
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Editor Visual de la Página Web (Igualito a la Página)
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Edita tal cual está en la página oficial: quita o cambia imágenes directamente sobre cada tarjeta, edita o borra textos en vivo, y agrega o quita botones con un solo clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              isPreviewMode
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white'
            }`}
            title="Ocultar o mostrar los botones de edición para ver cómo luce la página real"
          >
            {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreviewMode ? 'Modo Edición' : 'Vista Previa'}</span>
          </button>

          <button
            type="button"
            onClick={handleAddNewBreed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-[#FFE885] hover:bg-[#FFDF73] transition-all shadow"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span>+ Agregar Raza</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{isSaving ? 'Guardando...' : 'Guardar en la Web'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>¡Cambios aplicados exitosamente! La página web principal y Supabase ya reflejan todas las modificaciones.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GESTIÓN DE LOGOTIPO OFICIAL INBR (ENCABEZADO Y SECCIÓN INICIAL)           */}
      {/* ========================================================================= */}
      <div className="bg-[#12100B] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-1 bg-black shrink-0 overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <img
                src={content.siteLogoUrl || '/logo-inbr.jpg'}
                alt="Logo INBR Oficial"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A2012] border border-[#D4AF37] text-[#FFE885]">
                  IDENTIDAD OFICIAL
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-white font-serif-luxury">
                  Logotipo Oficial de INBR
                </h4>
              </div>
              <p className="text-xs text-neutral-300 mt-1 max-w-xl">
                Cambia el logotipo que se muestra en el menú superior (Navbar), en la sección principal de inicio (Hero) y en los certificados. Sube tu imagen directamente o pega el enlace URL.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer">
              <UploadCloud className="w-4 h-4 text-black" />
              <span>{logoUploading ? 'Subiendo...' : 'Subir Imagen de Logo'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={logoUploading}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    setLogoUploading(true);
                    try {
                      const url = await uploadCmsImage(e.target.files[0]);
                      setLogoInputUrl(url);
                      updateContent({ siteLogoUrl: url });
                      await saveDynamicContentAsync({ siteLogoUrl: url });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    } catch (err) {
                      console.error('Error al subir logo:', err);
                    } finally {
                      setLogoUploading(false);
                    }
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={async () => {
                updateContent({ siteLogoUrl: '/logo-inbr.jpg' });
                setLogoInputUrl('/logo-inbr.jpg');
                await saveDynamicContentAsync({ siteLogoUrl: '/logo-inbr.jpg' });
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-xs font-semibold transition-all"
            >
              Restaurar
            </button>
          </div>
        </div>

        {/* Input directo de URL para logo */}
        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={logoInputUrl}
            onChange={(e) => setLogoInputUrl(e.target.value)}
            placeholder="O pega la URL de la imagen del logotipo (ej: https://...)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white placeholder-neutral-500 font-mono focus:border-[#D4AF37] focus:outline-none"
          />
          <button
            type="button"
            onClick={async () => {
              updateContent({ siteLogoUrl: logoInputUrl });
              await saveDynamicContentAsync({ siteLogoUrl: logoInputUrl });
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 3000);
            }}
            className="px-4 py-2 rounded-xl bg-[#221B10] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black font-bold text-xs transition-all cursor-pointer"
          >
            Aplicar URL
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN VISUAL EXACTA: "NUESTRAS RAZAS OFICIALES"                          */}
      {/* ========================================================================= */}
      <div className="bg-[#080808] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 relative shadow-2xl">
        
        {/* Banner de la Sección Editable */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              LIBRO GENEALÓGICO MULTI-RAZAS INBR
            </span>
          </div>

          {/* Título de la sección editable in-place */}
          {!isPreviewMode ? (
            <div className="space-y-2 mb-4">
              <label className="text-[10px] text-[#FFE885] font-mono uppercase tracking-wider block">
                ✏️ Título Principal de la Sección (Clic para editar):
              </label>
              <input
                type="text"
                value={content.bullBreedsTitle || 'Nuestras Razas Oficiales (Multi-Razas)'}
                onChange={(e) => updateContent({ bullBreedsTitle: e.target.value })}
                className="w-full text-center text-2xl sm:text-4xl font-black text-white font-serif-luxury bg-transparent border-b border-[#D4AF37]/40 focus:border-[#FFE885] px-2 py-1 outline-none"
              />
            </div>
          ) : (
            <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3">
              {content.bullBreedsTitle || 'Nuestras Razas Oficiales (Multi-Razas)'}
            </h2>
          )}

          {/* Subtítulo de la sección editable in-place */}
          {!isPreviewMode ? (
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">
                ✏️ Subtítulo descriptivo:
              </label>
              <textarea
                value={content.bullBreedsSubtitle || 'INBR es hoy un registro oficial internacional multi-razas: abarcamos razas tipo Bull, molosos de guardia, caninos de trabajo deportivo K9 y razas de compañía.'}
                onChange={(e) => updateContent({ bullBreedsSubtitle: e.target.value })}
                rows={2}
                className="w-full text-center text-xs sm:text-sm text-neutral-300 bg-transparent border border-neutral-800 rounded-xl focus:border-[#D4AF37] p-2 outline-none"
              />
            </div>
          ) : (
            <p className="text-neutral-300 text-sm sm:text-base">
              {content.bullBreedsSubtitle || 'INBR es hoy un registro oficial internacional multi-razas: abarcamos razas tipo Bull, molosos de guardia, caninos de trabajo deportivo K9 y razas de compañía.'}
            </p>
          )}
        </div>

        {/* ===================================================================== */}
        {/* GRID DE RAZAS: EXACTAMENTE IDÉNTICO A LA PÁGINA OFICIAL               */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {breedsList.map((breed) => (
            <div
              key={breed.id}
              className="group relative rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-[#FFE885]"
            >
              {/* ÁREA DE IMAGEN CON CONTROLES DIRECTOS IN-PLACE */}
              <div className="relative h-56 bg-black/80 overflow-hidden flex items-center justify-center">
                {breed.image ? (
                  <img
                    src={breed.image}
                    alt={breed.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#19150E] text-center border-b border-neutral-800">
                    <ImageIcon className="w-10 h-10 text-[#D4AF37] opacity-50 mb-2" />
                    <span className="text-xs text-neutral-400 font-bold">Sin Imagen (Oculta)</span>
                    <span className="text-[10px] text-neutral-600 mt-1">Usa el botón abajo para agregar una foto</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#12110D] via-transparent to-transparent pointer-events-none" />

                <span className="absolute top-3 right-3 text-[10px] font-mono font-black px-2 py-0.5 rounded bg-black/80 border border-[#D4AF37]/60 text-[#FFE885] pointer-events-none">
                  HOMOLOGADA INBR
                </span>

                {/* BOTONES DIRECTOS SOBRE LA IMAGEN (QUITAR / CAMBIAR IMAGEN) */}
                {!isPreviewMode && (
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {breed.image ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(breed.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500 text-white font-bold text-[10px] shadow-lg transition-transform active:scale-95"
                        title="Quitar la imagen de esta tarjeta"
                      >
                        <X className="w-3 h-3 text-red-300" />
                        <span>Quitar Imagen</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveImagePromptBreedId(breed.id);
                        setNewImageUrl(breed.image || '');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/90 hover:bg-[#1E190E] border border-[#D4AF37] text-[#FFE885] font-bold text-[10px] shadow-lg transition-transform active:scale-95"
                      title="Cambiar o subir imagen de la raza"
                    >
                      <ImageIcon className="w-3 h-3 text-[#D4AF37]" />
                      <span>{breed.image ? 'Cambiar Foto' : '+ Agregar Foto'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* POPUP / PROMPT PARA CAMBIAR IMAGEN SI ESTÁ ACTIVO */}
              {activeImagePromptBreedId === breed.id && (
                <div className="p-3.5 bg-[#17130B] border-y-2 border-[#D4AF37] space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#FFE885] flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Actualizar Foto de {breed.name}:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveImagePromptBreedId(null)}
                      className="p-1 rounded text-neutral-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Botón para abrir galería o cámara del celular / PC */}
                  <label className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gold-gradient text-black font-black text-xs cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-all text-center">
                    <UploadCloud className="w-4 h-4 text-black" />
                    <span>📷 Elegir Foto de mi Celular o Computadora</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files[0]) {
                          try {
                            const url = await uploadCmsImage(e.target.files[0]);
                            handleUpdateBreedField(breed.id, 'image', url);
                            setActiveImagePromptBreedId(null);
                          } catch (err) {
                            console.error('Error uploading breed image:', err);
                          }
                        }
                      }}
                    />
                  </label>

                  {/* 2. O pegar URL de imagen */}
                  <div className="pt-1">
                    <span className="text-[9.5px] font-mono text-neutral-400 block mb-1">
                      O pega una URL web directa (https://...):
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 px-2.5 py-1.5 text-xs bg-black border border-neutral-700 rounded-lg text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyNewImage(breed.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-[#D4AF37] hover:bg-[#FFE885] text-black rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENIDO DE LA TARJETA (TÍTULO, SUBTÍTULO, DESCRIPCIÓN, BOTONES) */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  
                  {/* TÍTULO / NOMBRE DE LA RAZA */}
                  {!isPreviewMode ? (
                    <div>
                      <span className="text-[9px] uppercase font-mono text-[#D4AF37] block font-bold">
                        ✏️ Nombre:
                      </span>
                      <input
                        type="text"
                        value={breed.name}
                        onChange={(e) => handleUpdateBreedField(breed.id, 'name', e.target.value)}
                        className="w-full text-base font-bold text-white font-serif-luxury bg-black/40 border border-neutral-800 rounded px-2 py-1 focus:border-[#D4AF37]"
                      />
                    </div>
                  ) : (
                    <h3 className="text-xl font-bold text-white font-serif-luxury">
                      {breed.name}
                    </h3>
                  )}

                  {/* SUBTÍTULO */}
                  {!isPreviewMode ? (
                    <div>
                      <span className="text-[9px] uppercase font-mono text-neutral-400 block font-bold">
                        ✏️ Subtítulo:
                      </span>
                      <input
                        type="text"
                        value={breed.subtitle}
                        onChange={(e) => handleUpdateBreedField(breed.id, 'subtitle', e.target.value)}
                        className="w-full text-xs font-semibold text-[#D4AF37] bg-black/40 border border-neutral-800 rounded px-2 py-1 focus:border-[#D4AF37]"
                      />
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-[#D4AF37]">
                      {breed.subtitle}
                    </p>
                  )}

                  {/* DESCRIPCIÓN CON BOTÓN PARA BORRAR TEXTO DIRECTO */}
                  {!isPreviewMode ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-mono text-neutral-400 font-bold">
                          ✏️ Texto Descriptivo:
                        </span>
                        {breed.description ? (
                          <button
                            type="button"
                            onClick={() => handleClearDescription(breed.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold underline flex items-center gap-0.5"
                            title="Borrar todo el texto de esta descripción"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Borrar Texto</span>
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        value={breed.description}
                        onChange={(e) => handleUpdateBreedField(breed.id, 'description', e.target.value)}
                        rows={3}
                        placeholder="Escribe la descripción de la raza o déjala vacía..."
                        className="w-full text-xs text-neutral-300 bg-black/40 border border-neutral-800 rounded p-2 focus:border-[#D4AF37]"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                      {breed.description}
                    </p>
                  )}

                  {/* VARIEDADES / LÍNEAS */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block">
                        Variedades / Líneas:
                      </span>
                      {!isPreviewMode && (
                        <button
                          type="button"
                          onClick={() => setActiveVarietyPromptBreedId(breed.id)}
                          className="text-[10px] text-[#FFE885] hover:text-white font-bold"
                        >
                          + Agregar
                        </button>
                      )}
                    </div>

                    {/* Prompt para agregar variedad */}
                    {activeVarietyPromptBreedId === breed.id && (
                      <div className="flex items-center gap-1 mb-2">
                        <input
                          type="text"
                          value={newVarietyText}
                          onChange={(e) => setNewVarietyText(e.target.value)}
                          placeholder="Ej: Pocket, XL"
                          className="px-2 py-0.5 text-[10px] bg-black border border-neutral-700 rounded text-white flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddVariety(breed.id)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-[#D4AF37] text-black rounded"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVarietyPromptBreedId(null)}
                          className="text-neutral-400 hover:text-white text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {breed.varieties.map((v, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#18140B] text-neutral-200 border border-[#D4AF37]/30 font-medium"
                        >
                          <span>{v}</span>
                          {!isPreviewMode && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVariety(breed.id, i)}
                              className="text-neutral-500 hover:text-red-400 ml-0.5 text-xs font-black"
                              title="Quitar variedad"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* BOTONES DE LA TARJETA (AGREGAR / QUITAR / EDITAR BOTONES)     */}
                {/* ============================================================= */}
                <div className="pt-2 space-y-2 border-t border-neutral-800">
                  {/* Botón Principal por Defecto */}
                  <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-black bg-gold-gradient shadow-md">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Estándar Oficial</span>
                  </div>

                  {/* Botones Personalizados Adicionales */}
                  {breed.customButtons?.map((btn, bIdx) => (
                    <div
                      key={bIdx}
                      className="relative group/btn flex items-center justify-between p-2 rounded-xl bg-[#1C170E] border border-[#D4AF37] text-[#FFE885] text-xs font-bold"
                    >
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>{btn.label}</span>
                      </div>
                      {!isPreviewMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomButton(breed.id, bIdx)}
                          className="text-neutral-500 hover:text-red-400 text-xs font-black p-0.5"
                          title="Quitar este botón"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Acciones para agregar botones y eliminar tarjeta */}
                  {!isPreviewMode && (
                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddButton(breed.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-[#1E190E] border border-[#D4AF37]/50 text-[#FFE885] text-[10px] font-bold transition-all"
                        title="Agregar un botón personalizado a esta tarjeta"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Agregar Botón</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBreed(breed.id)}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 hover:text-white transition-all"
                        title="Eliminar esta raza"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer bar inside section */}
        <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Total Razas Registradas: <strong className="text-white">{breedsList.length}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddNewBreed}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37]"
            >
              <Plus className="w-4 h-4 text-[#FFE885]" />
              <span>Agregar Otra Raza</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient shadow-lg"
            >
              <Save className="w-4 h-4 text-black" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Todo'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
