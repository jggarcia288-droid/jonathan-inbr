import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { 
  useDynamicContent, 
  syncTeamToSupabase, 
  ExecutiveTeamMember, 
  TeamRepresentative, 
  TeamJudge, 
  uploadCmsImage 
} from '../utils/dynamicContent';
import { 
  Users, 
  Award, 
  Shield, 
  MapPin, 
  Star, 
  Edit3, 
  Plus, 
  Settings, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Camera, 
  UploadCloud, 
  X, 
  Check 
} from 'lucide-react';

interface TeamSectionProps {
  onOpenAdminPanel?: () => void;
}

export const TeamSection: React.FC<TeamSectionProps> = ({ onOpenAdminPanel }) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();
  const [activeTab, setActiveTab] = useState<'executive' | 'representatives' | 'judges'>('executive');

  // Editable lists with automatic Supabase sync
  const [execTeam, setExecTeam] = useState<ExecutiveTeamMember[]>(content.executiveTeam || []);
  const [repList, setRepList] = useState<TeamRepresentative[]>(content.representativesList || []);
  const [judgList, setJudgList] = useState<TeamJudge[]>(content.judgesList || []);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedMemberId, setSavedMemberId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string; title: string } | null>(null);
  const autosaveTimerRef = useRef<any>(null);

  // Keep in sync when content updates from Supabase or storage
  useEffect(() => {
    if (content.executiveTeam && content.executiveTeam.length > 0) {
      setExecTeam(content.executiveTeam);
    }
    if (content.representativesList && content.representativesList.length > 0) {
      setRepList(content.representativesList);
    }
    if (content.judgesList && content.judgesList.length > 0) {
      setJudgList(content.judgesList);
    }
  }, [content.executiveTeam, content.representativesList, content.judgesList]);

  // AUTOSAVE function to Supabase
  const triggerAutosave = (
    nextExec: ExecutiveTeamMember[] = execTeam,
    nextRep: TeamRepresentative[] = repList,
    nextJudg: TeamJudge[] = judgList
  ) => {
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      const res = await syncTeamToSupabase({
        executiveTeam: nextExec,
        representativesList: nextRep,
        judgesList: nextJudg,
      });

      if (res.success) {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    }, 700);
  };

  // Manual save for a single member
  const handleSaveSingleMember = async (id: string) => {
    setSavedMemberId(id);
    setSaveStatus('saving');
    const res = await syncTeamToSupabase({
      executiveTeam: execTeam,
      representativesList: repList,
      judgesList: judgList,
    });

    if (res.success) {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => {
        setSavedMemberId(null);
        setSaveStatus('idle');
      }, 2500);
    } else {
      setSaveStatus('error');
    }
  };

  // Manual save all
  const handleSaveAll = async () => {
    setSaveStatus('saving');
    const res = await syncTeamToSupabase({
      executiveTeam: execTeam,
      representativesList: repList,
      judgesList: judgList,
    });

    if (res.success) {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 3500);
    } else {
      setSaveStatus('error');
      alert('Error al guardar en Supabase. Verifica tu conexión.');
    }
  };

  // Executive team management
  const handleAddExecutive = () => {
    const newMember: ExecutiveTeamMember = {
      id: `exec-${Date.now()}`,
      name: 'Nuevo Miembro Directivo',
      title: 'Cargo Directivo',
      badge: 'Dirección & Liderazgo',
      image: '',
    };
    const next = [...execTeam, newMember];
    setExecTeam(next);
    triggerAutosave(next, repList, judgList);
  };

  const handleUpdateExecutive = (id: string, patch: Partial<ExecutiveTeamMember>) => {
    const next = execTeam.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setExecTeam(next);
    triggerAutosave(next, repList, judgList);
  };

  const handleDeleteExecutive = (id: string) => {
    if (confirm('¿Eliminar este directivo del equipo?')) {
      const next = execTeam.filter((m) => m.id !== id);
      setExecTeam(next);
      triggerAutosave(next, repList, judgList);
    }
  };

  // Representatives management
  const handleAddRepresentative = () => {
    const newRep: TeamRepresentative = {
      id: `rep-${Date.now()}`,
      name: 'Nuevo Representante',
      country: 'México / USA',
      flag: '🇲🇽',
      role: 'Representante Oficial',
      contact: '+52 998 000 0000',
      image: '',
    };
    const next = [...repList, newRep];
    setRepList(next);
    triggerAutosave(execTeam, next, judgList);
  };

  const handleUpdateRepresentative = (id: string, patch: Partial<TeamRepresentative>) => {
    const next = repList.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRepList(next);
    triggerAutosave(execTeam, next, judgList);
  };

  const handleDeleteRepresentative = (id: string) => {
    if (confirm('¿Eliminar este representante?')) {
      const next = repList.filter((r) => r.id !== id);
      setRepList(next);
      triggerAutosave(execTeam, next, judgList);
    }
  };

  // Judges management
  const handleAddJudge = () => {
    const newJudge: TeamJudge = {
      id: `judge-${Date.now()}`,
      name: 'Nuevo Juez Calificado',
      origin: 'México',
      specialty: 'Conformación Bull & Molosos',
      experience: 'Juez Acreditado INBR',
      badge: 'Juez Licenciado INBR',
      image: '',
    };
    const next = [...judgList, newJudge];
    setJudgList(next);
    triggerAutosave(execTeam, repList, next);
  };

  const handleUpdateJudge = (id: string, patch: Partial<TeamJudge>) => {
    const next = judgList.map((j) => (j.id === id ? { ...j, ...patch } : j));
    setJudgList(next);
    triggerAutosave(execTeam, repList, next);
  };

  const handleDeleteJudge = (id: string) => {
    if (confirm('¿Eliminar este juez de la lista?')) {
      const next = judgList.filter((j) => j.id !== id);
      setJudgList(next);
      triggerAutosave(execTeam, repList, next);
    }
  };

  // Handle photo upload directly
  const handleUploadPhoto = async (type: 'exec' | 'rep' | 'judg', id: string, file: File) => {
    try {
      const url = await uploadCmsImage(file);
      if (type === 'exec') handleUpdateExecutive(id, { image: url });
      if (type === 'rep') handleUpdateRepresentative(id, { image: url });
      if (type === 'judg') handleUpdateJudge(id, { image: url });
    } catch (e) {
      console.error('Error uploading photo:', e);
    }
  };

  return (
    <section id="equipo" className="py-20 bg-[#0D0D0D] relative border-t border-b border-[#D4AF37]/20">
      {/* Modal para ver la foto en grande */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-[#14120D] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.4)] bg-black">
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.name} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white font-serif-luxury tracking-wide">
                {selectedPhoto.name}
              </h3>
              <p className="text-sm font-bold text-[#FFE885] mt-1 uppercase font-mono">
                {selectedPhoto.title}
              </p>
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#1F1910] border border-[#D4AF37]/60 text-xs font-mono text-[#E7C888]">
                INBR KENNEL CLUB OFICIAL
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="px-6 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Cerrar Vista Ampliada
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#18150f] border border-[#C9A86A]/40 mb-4 shadow-sm">
            <Users className="w-4 h-4 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {content.teamBadge || t('team.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {content.teamTitle || t('team.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg mb-6">
            {content.teamSubtitle || t('team.subtitle')}
          </p>

          {/* Action Bar: Toggle Modo Edición y Panel Maestro */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-400 text-black border-2 border-white'
                  : 'bg-gold-gradient text-black hover:scale-105 active:scale-95'
              }`}
            >
              <Edit3 className="w-4 h-4 text-black" />
              <span>{isEditMode ? '✓ Finalizar Edición de Equipo' : '✏️ Modo Edición con Botones de Guardar (Supabase)'}</span>
            </button>

            {onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#18140B] border border-[#D4AF37]/70 text-xs sm:text-sm font-bold text-[#FFE885] hover:bg-[#2A2010] transition-all cursor-pointer"
                title="Abrir Panel Maestro para configuración avanzada"
              >
                <Settings className="w-4 h-4 text-[#D4AF37]" />
                <span>Panel Maestro Completo</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA DE HERRAMIENTAS DE EDICIÓN CON AUTOGUARDADO EN SUPABASE */}
        {isEditMode && (
          <div className="mb-10 p-5 rounded-3xl bg-[#12100B] border-2 border-[#D4AF37] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h4 className="text-sm font-black text-white font-serif-luxury tracking-wide">
                  Autoguardado y Sincronización en la Nube Activa
                </h4>
              </div>
              <p className="text-xs text-neutral-300">
                Cada cambio que realices se guardará automáticamente. También puedes presionar el botón <strong>"💾 Guardar"</strong> en cada miembro.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-neutral-800 text-xs font-mono">
                {saveStatus === 'saving' && (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en Supabase...</span>
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardado {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sincronizado {lastSavedTime ? `• ${lastSavedTime}` : ''}</span>
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-rose-400">⚠️ Error al sincronizar</span>
                )}
              </div>

              {/* Botón según la pestaña activa */}
              {activeTab === 'executive' && (
                <button
                  type="button"
                  onClick={handleAddExecutive}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Agregar Directivo</span>
                </button>
              )}
              {activeTab === 'representatives' && (
                <button
                  type="button"
                  onClick={handleAddRepresentative}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Agregar Representante</span>
                </button>
              )}
              {activeTab === 'judges' && (
                <button
                  type="button"
                  onClick={handleAddJudge}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Agregar Juez</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 shadow cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Todo en Supabase</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-4 border-b border-neutral-800">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveTab('executive')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'executive'
                  ? 'bg-gold-gradient text-black shadow-lg scale-105 font-black'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-[#C9A86A]/40'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>{t('team.executive')} ({execTeam.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('representatives')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'representatives'
                  ? 'bg-gold-gradient text-black shadow-lg scale-105 font-black'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-[#C9A86A]/40'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>{t('team.representatives')} ({repList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('judges')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'judges'
                  ? 'bg-gold-gradient text-black shadow-lg scale-105 font-black'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-[#C9A86A]/40'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>{t('team.judges')} ({judgList.length})</span>
            </button>
          </div>
        </div>

        {/* 1. DIRECTIVOS (EXECUTIVE TEAM) */}
        {activeTab === 'executive' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
            {execTeam.map((member, idx) => (
              <div
                key={member.id || idx}
                className={`relative rounded-2xl bg-[#141414] border p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl ${
                  isEditMode ? 'border-[#D4AF37] bg-[#100E0A]' : 'border-[#C9A86A]/30 hover:border-[#C9A86A] hover:shadow-[0_8px_30px_rgba(201,168,106,0.3)] hover:-translate-y-1.5'
                }`}
              >
                {/* Delete button if in edit mode */}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => handleDeleteExecutive(member.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Eliminar directivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Foto con opción de ampliación o cambio */}
                <div className="relative mb-4">
                  <div 
                    className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#D4AF37] p-1 bg-[#1a1711] shadow-lg cursor-pointer"
                    onClick={() => setSelectedPhoto({ url: member.image || '/logo-inbr.jpg', name: member.name, title: member.title })}
                    title="Haz clic para ver foto ampliada"
                  >
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-neutral-600">
                        <Camera className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {isEditMode ? (
                    <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold shadow-md cursor-pointer hover:brightness-110 flex items-center gap-1 whitespace-nowrap">
                      <UploadCloud className="w-3 h-3 text-black" />
                      <span>Subir Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadPhoto('exec', member.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div 
                      onClick={() => setSelectedPhoto({ url: member.image || '/logo-inbr.jpg', name: member.name, title: member.title })}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1F1910] border border-[#C9A86A]/60 text-[10px] font-mono text-[#E7C888] whitespace-nowrap shadow cursor-pointer"
                    >
                      <span>🔍 Ver Foto</span>
                    </div>
                  )}
                </div>

                {/* Campos: Vista Normal o Modo Edición */}
                {!isEditMode ? (
                  <>
                    <h3 className="text-xl font-bold text-white font-serif-luxury mb-1 group-hover:text-[#FFE885] transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#C9A86A] uppercase tracking-wider mb-2">
                      {member.title}
                    </p>
                    <span className="text-[11px] px-3 py-1 rounded bg-[#1A160F] text-[#FFE885] border border-[#D4AF37]/40 font-mono">
                      {member.badge}
                    </span>
                  </>
                ) : (
                  <div className="w-full space-y-2.5 pt-2">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Nombre:</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleUpdateExecutive(member.id, { name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs text-center focus:border-[#D4AF37]"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Cargo:</label>
                      <input
                        type="text"
                        value={member.title}
                        onChange={(e) => handleUpdateExecutive(member.id, { title: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] text-xs text-center focus:border-[#D4AF37]"
                        placeholder="Cargo directivo"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Distintivo:</label>
                      <input
                        type="text"
                        value={member.badge}
                        onChange={(e) => handleUpdateExecutive(member.id, { badge: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-neutral-300 text-xs text-center focus:border-[#D4AF37]"
                        placeholder="Distintivo"
                      />
                    </div>

                    {/* BOTÓN INDIVIDUAL DE GUARDAR */}
                    <button
                      type="button"
                      onClick={() => handleSaveSingleMember(member.id)}
                      className={`w-full mt-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                        savedMemberId === member.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#251D0E] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savedMemberId === member.id ? '¡Guardado en Supabase!' : '💾 Guardar Este Miembro'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 2. REPRESENTANTES OFICIALES */}
        {activeTab === 'representatives' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
            {repList.map((rep, idx) => {
              const repImage = rep.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80';
              return (
                <div
                  key={rep.id || idx}
                  className={`relative rounded-2xl bg-[#141414] border p-6 flex flex-col items-center text-center transition-all duration-300 shadow-xl ${
                    isEditMode ? 'border-[#D4AF37] bg-[#100E0A]' : 'border border-[#C9A86A]/30 hover:border-[#C9A86A] hover:shadow-[0_8px_30px_rgba(201,168,106,0.3)] hover:-translate-y-1.5'
                  }`}
                >
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRepresentative(rep.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Eliminar representante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative mb-4">
                    <div 
                      className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#D4AF37] p-1 bg-[#1a1711] shadow-lg cursor-pointer"
                      onClick={() => setSelectedPhoto({ url: repImage, name: rep.name, title: rep.role })}
                      title="Haz clic para ver foto ampliada"
                    >
                      <img
                        src={repImage}
                        alt={rep.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <span className="absolute top-0 right-0 text-2xl shadow-sm">{rep.flag}</span>

                    {isEditMode ? (
                      <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold shadow-md cursor-pointer hover:brightness-110 flex items-center gap-1 whitespace-nowrap">
                        <UploadCloud className="w-3 h-3 text-black" />
                        <span>Subir Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadPhoto('rep', rep.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <div 
                        onClick={() => setSelectedPhoto({ url: repImage, name: rep.name, title: rep.role })}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1F1910] border border-[#C9A86A]/60 text-[10px] font-mono text-[#E7C888] whitespace-nowrap shadow cursor-pointer"
                      >
                        <span>🔍 Ver Foto</span>
                      </div>
                    )}
                  </div>

                  {!isEditMode ? (
                    <>
                      <h3 className="text-xl font-bold text-white font-serif-luxury mb-1 group-hover:text-[#FFE885] transition-colors">
                        {rep.name}
                      </h3>
                      <div className="text-xs font-semibold text-[#C9A86A] uppercase tracking-wider mb-2">
                        {rep.country}
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded bg-[#1A160F] text-[#FFE885] border border-[#D4AF37]/40 font-mono mb-3">
                        {rep.role}
                      </span>
                      <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-400 w-full">
                        Contacto Oficial: <span className="text-neutral-200 font-mono font-bold block mt-0.5">{rep.contact}</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full space-y-2.5 pt-2">
                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Nombre:</label>
                        <input
                          type="text"
                          value={rep.name}
                          onChange={(e) => handleUpdateRepresentative(rep.id, { name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs text-center focus:border-[#D4AF37]"
                          placeholder="Nombre del representante"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">País:</label>
                          <input
                            type="text"
                            value={rep.country}
                            onChange={(e) => handleUpdateRepresentative(rep.id, { country: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] text-xs text-center focus:border-[#D4AF37]"
                            placeholder="País"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Bandera:</label>
                          <input
                            type="text"
                            value={rep.flag}
                            onChange={(e) => handleUpdateRepresentative(rep.id, { flag: e.target.value })}
                            className="w-full px-2 py-1.5 rounded-lg bg-black border border-neutral-700 text-xs text-center focus:border-[#D4AF37]"
                            placeholder="Bandera"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 block text-left mb-0.5">Contacto:</label>
                        <input
                          type="text"
                          value={rep.contact}
                          onChange={(e) => handleUpdateRepresentative(rep.id, { contact: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-neutral-300 text-xs text-center font-mono focus:border-[#D4AF37]"
                          placeholder="+52 998..."
                        />
                      </div>

                      {/* BOTÓN INDIVIDUAL DE GUARDAR */}
                      <button
                        type="button"
                        onClick={() => handleSaveSingleMember(rep.id)}
                        className={`w-full mt-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          savedMemberId === rep.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#251D0E] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savedMemberId === rep.id ? '¡Guardado en Supabase!' : '💾 Guardar Representante'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 3. JUECES OFICIALES */}
        {activeTab === 'judges' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-[#141414] border border-[#C9A86A]/30 rounded-2xl p-6 text-center max-w-3xl mx-auto mb-8 shadow-md">
              <h3 className="text-xl font-bold text-white font-serif-luxury mb-2">
                {t('team.judges')}
              </h3>
              <p className="text-sm text-neutral-300">
                {t('team.judgesDesc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {judgList.map((judge, idx) => {
                const judgeImage = judge.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80';
                return (
                  <div
                    key={judge.id || idx}
                    className={`relative rounded-2xl bg-[#141414] border p-6 flex flex-col items-center text-center transition-all duration-300 justify-between shadow-xl ${
                      isEditMode ? 'border-[#D4AF37] bg-[#100E0A]' : 'border-[#C9A86A]/30 hover:border-[#C9A86A] hover:shadow-[0_8px_30px_rgba(201,168,106,0.3)] hover:-translate-y-1.5'
                    }`}
                  >
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleDeleteJudge(judge.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Eliminar juez"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="w-full">
                      <div className="relative mb-4 flex justify-center">
                        <div 
                          className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#D4AF37] p-1 bg-[#1a1711] shadow-lg cursor-pointer"
                          onClick={() => setSelectedPhoto({ url: judgeImage, name: judge.name, title: judge.badge })}
                          title="Haz clic para ver foto ampliada"
                        >
                          <img
                            src={judgeImage}
                            alt={judge.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>

                        {isEditMode ? (
                          <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-gold-gradient text-black text-[10px] font-bold shadow-md cursor-pointer hover:brightness-110 flex items-center gap-1 whitespace-nowrap">
                            <UploadCloud className="w-3 h-3 text-black" />
                            <span>Subir Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                handleUploadPhoto('judg', judge.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div 
                            onClick={() => setSelectedPhoto({ url: judgeImage, name: judge.name, title: judge.badge })}
                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#1F1910] border border-[#C9A86A]/60 text-[10px] font-mono text-[#E7C888] whitespace-nowrap shadow cursor-pointer"
                          >
                            <span>🔍 Ver Foto</span>
                          </div>
                        )}
                      </div>

                      {!isEditMode ? (
                        <>
                          <h3 className="text-xl font-bold text-white font-serif-luxury mb-1 group-hover:text-[#FFE885] transition-colors">
                            {judge.name}
                          </h3>
                          <div className="text-xs font-semibold text-[#C9A86A] uppercase tracking-wider mb-2">
                            {judge.origin}
                          </div>
                          <span className="text-[11px] px-3 py-1 rounded bg-[#1A160F] text-[#FFE885] border border-[#D4AF37]/40 font-mono inline-block mb-3">
                            {judge.badge}
                          </span>

                          <div className="space-y-1.5 mb-4 text-xs text-neutral-300 text-left bg-black/40 p-3 rounded-xl border border-neutral-800">
                            <p>
                              <strong className="text-[#C9A86A]">Especialidad:</strong> {judge.specialty}
                            </p>
                            <p>
                              <strong className="text-neutral-400">Trayectoria:</strong> {judge.experience}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="w-full space-y-2.5 pt-2 text-left">
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Nombre:</label>
                            <input
                              type="text"
                              value={judge.name}
                              onChange={(e) => handleUpdateJudge(judge.id, { name: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37]"
                              placeholder="Nombre del juez"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Origen / País:</label>
                            <input
                              type="text"
                              value={judge.origin}
                              onChange={(e) => handleUpdateJudge(judge.id, { origin: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-[#FFE885] text-xs focus:border-[#D4AF37]"
                              placeholder="País de origen"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Especialidad:</label>
                            <input
                              type="text"
                              value={judge.specialty}
                              onChange={(e) => handleUpdateJudge(judge.id, { specialty: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-neutral-200 text-xs focus:border-[#D4AF37]"
                              placeholder="Especialidad de raza"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Trayectoria:</label>
                            <input
                              type="text"
                              value={judge.experience}
                              onChange={(e) => handleUpdateJudge(judge.id, { experience: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-neutral-300 text-xs focus:border-[#D4AF37]"
                              placeholder="Años o experiencia"
                            />
                          </div>

                          {/* BOTÓN INDIVIDUAL DE GUARDAR */}
                          <button
                            type="button"
                            onClick={() => handleSaveSingleMember(judge.id)}
                            className={`w-full mt-2 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                              savedMemberId === judge.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#251D0E] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savedMemberId === judge.id ? '¡Guardado en Supabase!' : '💾 Guardar Juez'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditMode && (
                      <div className="w-full pt-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
                        <span>Acreditación:</span>
                        <span className="font-mono text-emerald-400 font-bold">LICENCIA ACTIVA</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
