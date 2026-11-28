import React, { useState } from 'react';
import { useDynamicContent, uploadCmsImage, saveDynamicContentAsync } from '../utils/dynamicContent';
import { BREED_IMAGES } from '../utils/breedImages';
import { addActivityLog } from '../utils/activityLogs';
import { useAuth } from '../hooks/useAuth';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Edit3, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  Layers, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Sliders, 
  Loader2,
  Database,
  Lock,
  LogOut,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  MapPin,
  Award
} from 'lucide-react';

interface LiveCmsInlineEditorProps {
  onOpenMasterPanel: () => void;
}

export const LiveCmsInlineEditor: React.FC<LiveCmsInlineEditorProps> = ({ onOpenMasterPanel }) => {
  const { content, updateContent, resetContent } = useDynamicContent();
  const { user, login, logout, isAuthenticated } = useAuth();
  const isMaster = user?.role === 'MASTER';

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'hero' | 'about' | 'breeds' | 'team' | 'fame' | 'events' | 'contact' | 'sections'>('hero');
  const [teamSubCategory, setTeamSubCategory] = useState<'executive' | 'representatives' | 'judges'>('executive');
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Quick Password Modal for Clients / Unauthenticated visitors
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [quickPassword, setQuickPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleOpenEditor = () => {
    if (isMaster) {
      setIsEditorOpen(true);
    } else {
      setShowPasswordModal(true);
    }
  };

  const handleQuickPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    const res = login('Jonathan Garcia', quickPassword);
    if (res.success) {
      setShowPasswordModal(false);
      setQuickPassword('');
      setIsEditorOpen(true);
      addActivityLog({
        author: {
          name: 'Jonathan García',
          role: 'MASTER',
          email: 'jggarcia288@gmail.com',
        },
        action: 'INICIO_SESIÓN',
        category: 'SEGURIDAD',
        fieldModified: 'acceso_cms_en_vivo',
        details: 'Desbloqueo de modo edición en tiempo real mediante clave de administrador.',
      });
    } else {
      setPasswordError('Contraseña incorrecta. Verifica tus credenciales de Administrador Maestro.');
    }
  };

  // Local draft state for real-time live preview while typing
  const handleFieldChange = (field: string, value: any) => {
    updateContent({ [field]: value });
  };

  const handleSectionVisibilityToggle = (sectionKey: string, visible: boolean) => {
    updateContent({
      sectionVisibility: {
        ...content.sectionVisibility,
        [sectionKey]: visible,
      },
    });
  };

  const handleImageUpload = async (field: string, file: File) => {
    setUploadingField(field);
    try {
      const url = await uploadCmsImage(file);
      updateContent({ [field]: url });
      setSaveSuccess(true);
      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
        },
        action: 'SUBIDA_IMAGEN',
        category: 'CMS',
        fieldModified: field,
        newValue: url.slice(0, 30) + '...',
        details: `Actualización de imagen para ${field}.`,
      });
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(`Error uploading image for ${field}:`, err);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploadingField(null);
    }
  };

  // Team Section Handlers
  const handleUpdateExecutiveMember = (id: string, field: string, val: string) => {
    const current = content.executiveTeam || [];
    const updated = current.map((m) => (m.id === id ? { ...m, [field]: val } : m));
    updateContent({ executiveTeam: updated });
  };

  const handleExecutiveImageUpload = async (id: string, file: File) => {
    setUploadingField(`exec-${id}`);
    try {
      const url = await uploadCmsImage(file);
      handleUpdateExecutiveMember(id, 'image', url);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error uploading executive image:', err);
      alert('Error al subir la imagen.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddExecutiveMember = () => {
    const current = content.executiveTeam || [];
    const newMember = {
      id: `exec-${Date.now()}`,
      name: 'Nuevo Directivo',
      title: 'Cargo Directivo',
      badge: 'Dirección Oficial',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    };
    updateContent({ executiveTeam: [...current, newMember] });
  };

  const handleDeleteExecutiveMember = (id: string) => {
    const current = content.executiveTeam || [];
    if (current.length <= 1) {
      alert('Debe existir al menos un directivo en el equipo.');
      return;
    }
    updateContent({ executiveTeam: current.filter((m) => m.id !== id) });
  };

  const handleUpdateRepresentative = (id: string, field: string, val: string) => {
    const current = content.representativesList || [];
    const updated = current.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    updateContent({ representativesList: updated });
  };

  const handleAddRepresentative = () => {
    const current = content.representativesList || [];
    const newRep = {
      id: `rep-${Date.now()}`,
      name: 'Nuevo Representante',
      country: 'País / Región',
      flag: '🌐',
      role: 'Representante Regional Oficial',
      contact: '+1 800 000 0000',
    };
    updateContent({ representativesList: [...current, newRep] });
  };

  const handleDeleteRepresentative = (id: string) => {
    const current = content.representativesList || [];
    updateContent({ representativesList: current.filter((r) => r.id !== id) });
  };

  const handleUpdateJudge = (id: string, field: string, val: string) => {
    const current = content.judgesList || [];
    const updated = current.map((j) => (j.id === id ? { ...j, [field]: val } : j));
    updateContent({ judgesList: updated });
  };

  const handleAddJudge = () => {
    const current = content.judgesList || [];
    const newJudge = {
      id: `judge-${Date.now()}`,
      name: 'Nuevo Juez Oficial',
      origin: 'País',
      specialty: 'Especialista Morfológico',
      experience: '10 años de trayectoria',
      badge: 'Juez Licenciado INBR',
    };
    updateContent({ judgesList: [...current, newJudge] });
  };

  const handleDeleteJudge = (id: string) => {
    const current = content.judgesList || [];
    updateContent({ judgesList: current.filter((j) => j.id !== id) });
  };

  const handleUpdateBreedItem = (id: string, field: string, value: any) => {
    const current = content.bullBreedsList || [];
    const updated = current.map((b) => (b.id === id ? { ...b, [field]: value } : b));
    updateContent({ bullBreedsList: updated });
  };

  const handleBreedImageUpload = async (id: string, file: File) => {
    try {
      setUploadingField(`breed-${id}`);
      const uploadedUrl = await uploadCmsImage(file);
      handleUpdateBreedItem(id, 'image', uploadedUrl);
    } catch (err) {
      console.error('Error uploading breed image:', err);
    } finally {
      setUploadingField(null);
    }
  };

  const handleAddBreedItem = () => {
    const current = content.bullBreedsList || [];
    const newBreed = {
      id: `breed-${Date.now()}`,
      name: 'Nueva Raza Oficial',
      category: 'bull' as const,
      subtitle: 'Subtítulo o Características',
      description: 'Descripción morfológica oficial y estándar de la raza...',
      varieties: ['Estándar Oficial'],
      image: BREED_IMAGES.americanBully,
    };
    updateContent({ bullBreedsList: [...current, newBreed] });
  };

  const handleDeleteBreedItem = (id: string) => {
    const current = content.bullBreedsList || [];
    updateContent({ bullBreedsList: current.filter((b) => b.id !== id) });
  };

  const handleSaveToSupabase = async () => {
    if (!isMaster) {
      setShowPasswordModal(true);
      return;
    }

    setIsSavingSupabase(true);
    setSaveSuccess(false);

    try {
      await saveDynamicContentAsync(content);
      setSaveSuccess(true);
      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
        },
        action: 'MODIFICACIÓN_CMS',
        category: 'CMS',
        fieldModified: 'Contenidos Dinámicos & Secciones',
        details: 'Guardado y sincronización en tiempo real con la base de datos de Supabase.',
      });
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#D4AF37', '#FFE885', '#000000'],
        });
      } catch {}
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving CMS to Supabase:', err);
      alert('Error guardando en la base de datos de Supabase.');
    } finally {
      setIsSavingSupabase(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Restablecer todos los textos e imágenes a los valores de fábrica oficiales?')) {
      resetContent();
      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
        },
        action: 'RESTABLECER_VALORES',
        category: 'CMS',
        fieldModified: 'Todos los campos CMS',
        details: 'Restablecimiento a los valores de fábrica oficiales.',
      });
      alert('Contenido restablecido exitosamente.');
    }
  };

  // Only display floating bar if user is authenticated as MASTER!
  // Normal visitors will never see bottom fixed buttons.
  if (!isAuthenticated || !isMaster) {
    return null;
  }

  return (
    <>
      {/* FLOATING MASTER CMS BAR (BOTTOM-LEFT / BOTTOM-CENTER) */}
      <aside 
        aria-label="Barra de Edición en Tiempo Real CMS" 
        className="fixed bottom-4 left-4 z-40 print:hidden transition-all duration-300"
      >
        {!isMinimized ? (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-[#18140B] via-[#0D0D0D] to-[#1F190D] border-2 border-[#D4AF37] shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(212,175,55,0.4)] backdrop-blur-md">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/60 border border-[#D4AF37]/50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-[#FFE885] font-black uppercase tracking-wider leading-none">
                  ADMIN MASTER CMS
                </span>
                <span className="text-[8px] text-neutral-400 font-mono flex items-center gap-1">
                  <Database className="w-2.5 h-2.5 text-[#D4AF37]" /> Supabase en Vivo
                </span>
              </div>
            </div>

            {/* Quick Live Editor Drawer Button */}
            <button
              onClick={handleOpenEditor}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md"
              title="Abrir editor en vivo para modificar textos, fotos y títulos en tiempo real"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar en Vivo</span>
            </button>

            {/* Direct Save to Supabase Button */}
            <button
              onClick={handleSaveToSupabase}
              disabled={isSavingSupabase}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#221A0F] border border-[#D4AF37] hover:bg-[#2F2414] active:scale-95 transition-all shadow"
              title="Guardar cambios directamente en la base de datos de Supabase"
            >
              {isSavingSupabase ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                  <span>Guardando...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Guardado en Supabase!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Guardar Supabase</span>
                </>
              )}
            </button>

            {/* Open Full Master Panel */}
            <button
              onClick={() => {
                setIsEditorOpen(false);
                onOpenMasterPanel();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-[#FFE885] bg-[#221A0F] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black transition-all shadow"
              title="Abrir el Panel Maestro completo"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panel Completo</span>
            </button>

            {/* Logout / Lock if authenticated */}
            {isAuthenticated && isMaster && (
              <button
                onClick={() => {
                  logout();
                  setIsEditorOpen(false);
                }}
                className="p-2 rounded-xl text-rose-400 hover:text-rose-200 bg-rose-950/40 border border-rose-800 transition-all"
                title="Cerrar sesión de administrador"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-black/40 border border-neutral-800 transition-all"
              title="Minimizar barra"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37] text-[#FFE885] text-xs font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:bg-gold-gradient hover:text-black transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>CMS en Vivo</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </aside>

      {/* QUICK PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0E0E0E] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white font-serif-luxury">
                    Acceso de Administrador
                  </h4>
                  <span className="text-[10px] text-[#FFE885] font-mono">
                    Protección de Contenidos INBR
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-black border border-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              Introduce la clave notarial de administrador para desbloquear la edición en vivo de textos, títulos e imágenes de la web.
            </p>

            {passwordError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleQuickPasswordSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-[#FFE885] font-bold block mb-1">
                  Contraseña de Administrador Maestro:
                </label>
                <input
                  type="password"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#D4AF37]/60 text-white font-mono text-xs focus:border-[#FFE885] focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK LIVE EDITOR MODAL / DRAWER */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#0D0D0D] border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#18140C] via-[#100E08] to-[#18140C] border-b border-[#D4AF37]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow-md">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-serif-luxury leading-tight flex items-center gap-2">
                    <span>Editor de Contenidos e Imágenes en Tiempo Real</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#20180B] border border-[#D4AF37] text-[#FFE885] font-mono">
                      SUPABASE CONECTADO
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Los cambios se actualizan en vivo en la pantalla y se guardan directamente en Supabase.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#20180B] border border-[#D4AF37]/50 hover:bg-gold-gradient hover:text-black transition-all shadow cursor-pointer"
                  title="Cerrar editor y volver al sitio público"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Volver al Sitio</span>
                </button>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white bg-black/50 border border-neutral-800 hover:border-[#D4AF37] cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 p-3 bg-[#110F0A] border-b border-neutral-800 overflow-x-auto text-xs font-bold">
              {[
                { id: 'hero', label: '1. Portada (Hero)' },
                { id: 'about', label: '2. Quiénes Somos' },
                { id: 'breeds', label: '3. Razas Oficiales (Fotos & Info)' },
                { id: 'team', label: '4. Equipo Directivo & Jueces' },
                { id: 'fame', label: '5. Salón de la Fama' },
                { id: 'events', label: '6. Eventos & Circuitos' },
                { id: 'contact', label: '7. Contacto & Notarías' },
                { id: 'sections', label: '8. Secciones Visibles' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeCategory === tab.id
                      ? 'bg-gold-gradient text-black font-black shadow'
                      : 'text-neutral-400 hover:text-white bg-black/40 border border-neutral-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-neutral-300 flex-1">
              
              {/* TAB 1: HERO */}
              {activeCategory === 'hero' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                        Título Línea 1:
                      </label>
                      <input
                        type="text"
                        value={content.heroTitleLine1}
                        onChange={(e) => handleFieldChange('heroTitleLine1', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                        Título Línea 2 (Dorado):
                      </label>
                      <input
                        type="text"
                        value={content.heroTitleLine2}
                        onChange={(e) => handleFieldChange('heroTitleLine2', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Badge Superior / Lema:
                    </label>
                    <input
                      type="text"
                      value={content.heroBadge}
                      onChange={(e) => handleFieldChange('heroBadge', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Subtítulo Descriptivo:
                    </label>
                    <textarea
                      rows={3}
                      value={content.heroSubtitle}
                      onChange={(e) => handleFieldChange('heroSubtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Aviso Notarial en Banner Superior:
                    </label>
                    <input
                      type="text"
                      value={content.bannerNotice}
                      onChange={(e) => handleFieldChange('bannerNotice', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white focus:border-[#D4AF37]"
                    />
                  </div>

                  {/* Official Site Logo Replacement */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-[#D4AF37]/50 space-y-2.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block">
                      Logotipo Oficial INBR (Encabezado y Portada):
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={content.siteLogoUrl || '/logo-inbr.jpg'}
                        alt="Logo INBR Preview"
                        className="w-20 h-20 object-cover rounded-full border-2 border-[#D4AF37] bg-black"
                        onError={(e) => {
                          e.currentTarget.src = '/logo-inbr.jpg';
                        }}
                      />
                      <div className="flex-1 space-y-2 w-full">
                        <input
                          type="text"
                          value={content.siteLogoUrl || ''}
                          onChange={(e) => handleFieldChange('siteLogoUrl', e.target.value)}
                          placeholder="URL del logotipo o sube tu archivo..."
                          className="w-full px-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs"
                        />
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 transition-all">
                          {uploadingField === 'siteLogoUrl' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Subiendo Logo...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Subir Mi Logo Original</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('siteLogoUrl', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Hero Banner Image Replacement */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 space-y-2.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block">
                      Foto / Banner Principal (Hero):
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={content.heroBannerUrl}
                        alt="Hero Banner Preview"
                        className="w-40 h-20 object-cover rounded-xl border border-[#D4AF37]"
                      />
                      <div className="flex-1 space-y-2 w-full">
                        <input
                          type="text"
                          value={content.heroBannerUrl}
                          onChange={(e) => handleFieldChange('heroBannerUrl', e.target.value)}
                          placeholder="URL de la imagen..."
                          className="w-full px-3 py-1.5 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs"
                        />
                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all">
                          {uploadingField === 'heroBannerUrl' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Subiendo a Supabase...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Subir Archivo de Imagen</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload('heroBannerUrl', e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ABOUT */}
              {activeCategory === 'about' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Título Quiénes Somos:
                    </label>
                    <input
                      type="text"
                      value={content.aboutUsTitle}
                      onChange={(e) => handleFieldChange('aboutUsTitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Subtítulo:
                    </label>
                    <input
                      type="text"
                      value={content.aboutUsSubtitle}
                      onChange={(e) => handleFieldChange('aboutUsSubtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Párrafo 1 (Misión & Origen):
                    </label>
                    <textarea
                      rows={3}
                      value={content.aboutUsParagraph1}
                      onChange={(e) => handleFieldChange('aboutUsParagraph1', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Párrafo 2 (Alcance Internacional):
                    </label>
                    <textarea
                      rows={3}
                      value={content.aboutUsParagraph2}
                      onChange={(e) => handleFieldChange('aboutUsParagraph2', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: RAZAS OFICIALES (FOTOS, NOMBRES & INFO) */}
              {activeCategory === 'breeds' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#14110A] border border-[#D4AF37]/40">
                    <div>
                      <h4 className="text-sm font-black text-white font-serif-luxury">
                        Catálogo de Razas Oficiales (Multi-Razas INBR)
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Edita los nombres, fotos oficiales y descripciones de cada raza homologada. Puedes subir fotos directas desde tu celular o computadora.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBreedItem}
                      className="px-3.5 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs flex items-center gap-1.5 shadow hover:brightness-110 active:scale-95 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Agregar Raza</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(content.bullBreedsList || []).map((breed) => (
                      <div
                        key={breed.id}
                        className="rounded-2xl bg-[#100E0A] border border-neutral-800 hover:border-[#D4AF37]/60 p-4 space-y-3 shadow-lg relative overflow-hidden"
                      >
                        {/* Fila superior: Foto y Botones de Subida */}
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-black shrink-0 relative group">
                            {breed.image ? (
                              <img
                                src={breed.image}
                                alt={breed.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            {uploadingField === `breed-${breed.id}` && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-1.5 min-w-0">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-gradient text-black font-black text-[11px] shadow cursor-pointer hover:brightness-110 active:scale-95 transition-all">
                              <UploadCloud className="w-3.5 h-3.5 text-black" />
                              <span>📷 Cambiar Foto (Celular/PC)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleBreedImageUpload(breed.id, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>

                            <input
                              type="text"
                              value={breed.image || ''}
                              onChange={(e) => handleUpdateBreedItem(breed.id, 'image', e.target.value)}
                              placeholder="O pega URL de imagen (https://...)"
                              className="w-full px-2.5 py-1 text-[10px] font-mono bg-black border border-neutral-700 rounded text-neutral-300 focus:border-[#D4AF37] focus:outline-none truncate"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteBreedItem(breed.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all cursor-pointer"
                            title="Eliminar raza"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Campos de texto */}
                        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                          <div>
                            <label className="text-[9.5px] font-mono text-[#FFE885] uppercase font-bold block mb-0.5">
                              Nombre de la Raza:
                            </label>
                            <input
                              type="text"
                              value={breed.name}
                              onChange={(e) => handleUpdateBreedItem(breed.id, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold text-white bg-black border border-neutral-700 rounded-lg focus:border-[#D4AF37] focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9.5px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Categoría:
                              </label>
                              <select
                                value={breed.category}
                                onChange={(e) => handleUpdateBreedItem(breed.id, 'category', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-black border border-neutral-700 rounded-lg text-white"
                              >
                                <option value="bull">Tipo Bull</option>
                                <option value="guard">Moloso & Guardia</option>
                                <option value="work">Trabajo & Pastor K9</option>
                                <option value="companion">Compañía</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9.5px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Subtítulo:
                              </label>
                              <input
                                type="text"
                                value={breed.subtitle}
                                onChange={(e) => handleUpdateBreedItem(breed.id, 'subtitle', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-black border border-neutral-700 rounded-lg text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9.5px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                              Descripción Oficial:
                            </label>
                            <textarea
                              rows={2}
                              value={breed.description}
                              onChange={(e) => handleUpdateBreedItem(breed.id, 'description', e.target.value)}
                              className="w-full px-2.5 py-1 text-xs bg-black border border-neutral-700 rounded-lg text-neutral-300 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: EQUIPO DIRECTIVO, REPRESENTANTES Y JUECES */}
              {activeCategory === 'team' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Encabezado General */}
                  <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                    <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                      Encabezado de la Sección de Equipo Directivo
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                          Badge Superior / Lema:
                        </label>
                        <input
                          type="text"
                          value={content.teamBadge || ''}
                          onChange={(e) => handleFieldChange('teamBadge', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                          Título Principal:
                        </label>
                        <input
                          type="text"
                          value={content.teamTitle || ''}
                          onChange={(e) => handleFieldChange('teamTitle', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                        Subtítulo Descriptivo:
                      </label>
                      <textarea
                        rows={2}
                        value={content.teamSubtitle || ''}
                        onChange={(e) => handleFieldChange('teamSubtitle', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Sub-selector: Directiva, Representantes, Jueces */}
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#14120D] border border-[#D4AF37]/40 w-fit">
                    <button
                      type="button"
                      onClick={() => setTeamSubCategory('executive')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        teamSubCategory === 'executive'
                          ? 'bg-gold-gradient text-black font-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Directiva Ejecutiva ({(content.executiveTeam || []).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamSubCategory('representatives')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        teamSubCategory === 'representatives'
                          ? 'bg-gold-gradient text-black shadow-lg font-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Representantes ({(content.representativesList || []).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamSubCategory('judges')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        teamSubCategory === 'judges'
                          ? 'bg-gold-gradient text-black shadow-lg font-black'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Jueces Oficiales ({(content.judgesList || []).length})</span>
                    </button>
                  </div>

                  {/* SUBTAB A: DIRECTIVA EJECUTIVA */}
                  {teamSubCategory === 'executive' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-bold text-white font-serif-luxury">
                            Miembros del Equipo Directivo ({content.executiveTeam?.length || 0})
                          </h5>
                          <p className="text-[11px] text-neutral-400">
                            Edita nombres, fotos, cargos o agrega nuevos directivos en tiempo real.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddExecutiveMember}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Directivo</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(content.executiveTeam || []).map((member) => (
                          <div
                            key={member.id}
                            className="p-4 rounded-2xl bg-[#090909] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all space-y-3 relative group"
                          >
                            <div className="flex items-center gap-3">
                              {/* Photo Preview & Upload */}
                              <div className="relative shrink-0">
                                <img
                                  src={member.image}
                                  alt={member.name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] bg-black shadow"
                                />
                                <label className="absolute -bottom-1 -right-1 p-1 rounded-full bg-gold-gradient text-black cursor-pointer shadow hover:scale-110 transition-transform">
                                  {uploadingField === `exec-${member.id}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <UploadCloud className="w-3 h-3" />
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                      e.target.files?.[0] && handleExecutiveImageUpload(member.id, e.target.files[0])
                                    }
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <div className="flex-1 min-w-0">
                                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                  Nombre:
                                </label>
                                <input
                                  type="text"
                                  value={member.name}
                                  onChange={(e) => handleUpdateExecutiveMember(member.id, 'name', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37]"
                                  placeholder="Nombre completo..."
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteExecutiveMember(member.id)}
                                className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 transition-all shrink-0 cursor-pointer"
                                title="Eliminar directivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                  Cargo / Título:
                                </label>
                                <input
                                  type="text"
                                  value={member.title}
                                  onChange={(e) => handleUpdateExecutiveMember(member.id, 'title', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] font-mono text-[11px] focus:border-[#D4AF37]"
                                  placeholder="ej: CEO & Fundador"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                  Insignia / Badge:
                                </label>
                                <input
                                  type="text"
                                  value={member.badge}
                                  onChange={(e) => handleUpdateExecutiveMember(member.id, 'badge', e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-mono text-[11px] focus:border-[#D4AF37]"
                                  placeholder="ej: Fundación & Liderazgo"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                URL Foto (o usa el botón de subida arriba):
                              </label>
                              <input
                                type="text"
                                value={member.image}
                                onChange={(e) => handleUpdateExecutiveMember(member.id, 'image', e.target.value)}
                                className="w-full px-2.5 py-1 rounded-lg bg-black border border-neutral-800 text-neutral-300 font-mono text-[10px] focus:border-[#D4AF37]"
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB B: REPRESENTANTES */}
                  {teamSubCategory === 'representatives' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-bold text-white font-serif-luxury">
                            Directorio de Representantes Oficiales ({content.representativesList?.length || 0})
                          </h5>
                          <p className="text-[11px] text-neutral-400">
                            Gestiona las franquicias y delegados territoriales.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddRepresentative}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Representante</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(content.representativesList || []).map((rep) => (
                          <div
                            key={rep.id}
                            className="p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 hover:border-[#D4AF37]/60 transition-all grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                          >
                            <div className="md:col-span-1 text-center">
                              <input
                                type="text"
                                value={rep.flag}
                                onChange={(e) => handleUpdateRepresentative(rep.id, 'flag', e.target.value)}
                                className="w-12 text-center text-xl bg-black border border-neutral-700 rounded-lg py-1"
                                title="Bandera emoji"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Nombre:
                              </label>
                              <input
                                type="text"
                                value={rep.name}
                                onChange={(e) => handleUpdateRepresentative(rep.id, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                País / Región:
                              </label>
                              <input
                                type="text"
                                value={rep.country}
                                onChange={(e) => handleUpdateRepresentative(rep.id, 'country', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] text-xs font-mono"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Contacto / Teléfono:
                              </label>
                              <input
                                type="text"
                                value={rep.contact}
                                onChange={(e) => handleUpdateRepresentative(rep.id, 'contact', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="md:col-span-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteRepresentative(rep.id)}
                                className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 transition-all cursor-pointer"
                                title="Eliminar representante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB C: JUECES OFICIALES */}
                  {teamSubCategory === 'judges' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-bold text-white font-serif-luxury">
                            Cuerpo de Jueces Oficiales ({content.judgesList?.length || 0})
                          </h5>
                          <p className="text-[11px] text-neutral-400">
                            Arbitraje y jueces licenciados por la confederación.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddJudge}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Juez</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(content.judgesList || []).map((judge) => (
                          <div
                            key={judge.id}
                            className="p-3.5 rounded-2xl bg-[#090909] border border-neutral-800 hover:border-[#D4AF37]/60 transition-all grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
                          >
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Nombre del Juez:
                              </label>
                              <input
                                type="text"
                                value={judge.name}
                                onChange={(e) => handleUpdateJudge(judge.id, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Origen:
                              </label>
                              <input
                                type="text"
                                value={judge.origin}
                                onChange={(e) => handleUpdateJudge(judge.id, 'origin', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] text-xs font-mono"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Especialidad:
                              </label>
                              <input
                                type="text"
                                value={judge.specialty}
                                onChange={(e) => handleUpdateJudge(judge.id, 'specialty', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-0.5">
                                Insignia / Rango:
                              </label>
                              <input
                                type="text"
                                value={judge.badge}
                                onChange={(e) => handleUpdateJudge(judge.id, 'badge', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white text-xs font-mono"
                              />
                            </div>
                            <div className="md:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteJudge(judge.id)}
                                className="p-2 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 transition-all cursor-pointer"
                                title="Eliminar juez"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SALÓN DE LA FAMA */}
              {activeCategory === 'fame' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Título Salón de la Fama:
                    </label>
                    <input
                      type="text"
                      value={content.hallOfFameTitle}
                      onChange={(e) => handleFieldChange('hallOfFameTitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Subtítulo:
                    </label>
                    <input
                      type="text"
                      value={content.hallOfFameSubtitle}
                      onChange={(e) => handleFieldChange('hallOfFameSubtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Descripción de Leyendas:
                    </label>
                    <textarea
                      rows={3}
                      value={content.hallOfFameDescription}
                      onChange={(e) => handleFieldChange('hallOfFameDescription', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-2xl bg-black border border-neutral-800 space-y-2">
                      <span className="text-[10px] font-mono text-[#FFE885] font-bold block">
                        Foto King Vulcan:
                      </span>
                      <img src={content.hallOfFamePhoto1} alt="Vulcan" className="w-full h-32 object-cover rounded-xl border border-[#D4AF37]" />
                      <label className="cursor-pointer block text-center py-1.5 px-3 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black">
                        {uploadingField === 'hallOfFamePhoto1' ? 'Subiendo...' : 'Cambiar Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('hallOfFamePhoto1', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black border border-neutral-800 space-y-2">
                      <span className="text-[10px] font-mono text-[#FFE885] font-bold block">
                        Foto Queen Bella:
                      </span>
                      <img src={content.hallOfFamePhoto2} alt="Bella" className="w-full h-32 object-cover rounded-xl border border-[#D4AF37]" />
                      <label className="cursor-pointer block text-center py-1.5 px-3 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black">
                        {uploadingField === 'hallOfFamePhoto2' ? 'Subiendo...' : 'Cambiar Foto'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('hallOfFamePhoto2', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EVENTOS & CIRCUITOS */}
              {activeCategory === 'events' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Título Calendario Eventos:
                    </label>
                    <input
                      type="text"
                      value={content.eventsTitle}
                      onChange={(e) => handleFieldChange('eventsTitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Subtítulo:
                    </label>
                    <input
                      type="text"
                      value={content.eventsSubtitle}
                      onChange={(e) => handleFieldChange('eventsSubtitle', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Anuncio Temporada 2026:
                    </label>
                    <input
                      type="text"
                      value={content.eventsNotice}
                      onChange={(e) => handleFieldChange('eventsNotice', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block">
                      Póster Oficial de Circuitos:
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={content.eventsBannerUrl}
                        alt="Circuits Banner"
                        className="w-40 h-20 object-cover rounded-xl border border-[#D4AF37]"
                      />
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-gold-gradient hover:text-black">
                        {uploadingField === 'eventsBannerUrl' ? 'Subiendo a Supabase...' : 'Subir Nuevo Póster'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload('eventsBannerUrl', e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CONTACTO */}
              {activeCategory === 'contact' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                        Teléfono Oficial:
                      </label>
                      <input
                        type="text"
                        value={content.contactPhone}
                        onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                        Correo de Presidencia:
                      </label>
                      <input
                        type="text"
                        value={content.contactEmail}
                        onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Sedes Notariales Centrales:
                    </label>
                    <input
                      type="text"
                      value={content.contactAddress}
                      onChange={(e) => handleFieldChange('contactAddress', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase font-bold text-[#FFE885] block mb-1">
                      Lema de Pie de Página (Footer):
                    </label>
                    <input
                      type="text"
                      value={content.footerMotto}
                      onChange={(e) => handleFieldChange('footerMotto', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: SECCIONES VISIBLES */}
              {activeCategory === 'sections' && (
                <div className="space-y-3 animate-fadeIn">
                  <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block">
                    Activar o Desactivar Secciones en Vivo de la Web:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { key: 'hero', label: '1. Portada (Hero)' },
                      { key: 'aboutUs', label: '2. Quiénes Somos' },
                      { key: 'threeCards', label: '3. Tarjetas Notariales' },
                      { key: 'team', label: '4. Directiva / Jueces' },
                      { key: 'bullBreeds', label: '5. Razas Oficiales' },
                      { key: 'specialEdition', label: '6. Edición Especial' },
                      { key: 'racialStandards', label: '7. Estándares' },
                      { key: 'breeders', label: '8. Criadores' },
                      { key: 'events', label: '9. Eventos 2026' },
                      { key: 'champions', label: '10. Campeones' },
                      { key: 'verification', label: '11. Verificación' },
                      { key: 'hallOfFame', label: '12. Salón de la Fama' },
                      { key: 'liveLitter', label: '13. Camada en Vivo' },
                      { key: 'forms', label: '14. Formularios' },
                      { key: 'certifications', label: '15. Certificaciones' },
                      { key: 'contact', label: '16. Contacto' },
                    ].map((item) => {
                      const isVisible = (content.sectionVisibility as any)?.[item.key] !== false;
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-black/70 border border-neutral-800 hover:border-[#D4AF37] cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => handleSectionVisibilityToggle(item.key, e.target.checked)}
                            className="w-4 h-4 accent-[#D4AF37] rounded"
                          />
                          <span className="text-xs text-neutral-200 font-medium truncate">{item.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[#110F0A] border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white"
              >
                Restablecer Fábrica
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-neutral-400 hover:text-white"
                >
                  Cerrar Ventana
                </button>

                <button
                  type="button"
                  onClick={handleSaveToSupabase}
                  disabled={isSavingSupabase}
                  className="px-6 py-2.5 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                >
                  {isSavingSupabase ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en Supabase...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Guardado con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios en Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
