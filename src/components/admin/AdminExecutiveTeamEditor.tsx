import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Plus, Trash2, Camera, UploadCloud, Users, Award, Save, CheckCircle2 } from 'lucide-react';
import { ExecutiveTeamMember, uploadCmsImage, syncTeamToSupabase } from '../../utils/dynamicContent';

interface AdminExecutiveTeamEditorProps {
  isAdmin: boolean;
  members: ExecutiveTeamMember[];
  onChange: (updated: ExecutiveTeamMember[]) => void;
}

export const AdminExecutiveTeamEditor: React.FC<AdminExecutiveTeamEditorProps> = ({
  isAdmin,
  members,
  onChange,
}) => {
  const [localList, setLocalList] = useState<ExecutiveTeamMember[]>(members);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    setLocalList(members);
  }, [members]);

  const commitChanges = (updated: ExecutiveTeamMember[], immediate: boolean = false) => {
    setLocalList(updated);
    setSaveStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (immediate) {
      onChange(updated);
      syncTeamToSupabase({ executiveTeam: updated }).then((res) => {
        if (res.success) {
          setSaveStatus('saved');
          setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
        }
      });
    } else {
      debounceRef.current = setTimeout(() => {
        onChange(updated);
        syncTeamToSupabase({ executiveTeam: updated }).then((res) => {
          if (res.success) {
            setSaveStatus('saved');
            setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setTimeout(() => setSaveStatus('idle'), 3000);
          } else {
            setSaveStatus('error');
          }
        });
      }, 600);
    }
  };

  const handleAddMember = () => {
    if (!isAdmin) return;
    const newMember: ExecutiveTeamMember = {
      id: `exec-${Date.now()}`,
      name: 'Nuevo Miembro Directivo',
      title: 'Cargo Directivo',
      badge: 'Dirección & Liderazgo',
      image: '',
    };
    commitChanges([...localList, newMember], true);
  };

  const handleUpdate = (id: string, patch: Partial<ExecutiveTeamMember>) => {
    if (!isAdmin) return;
    const updated = localList.map((m) => (m.id === id ? { ...m, ...patch } : m));
    commitChanges(updated, false);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (localList.length <= 1) {
      return;
    }
    const updated = localList.filter((m) => m.id !== id);
    commitChanges(updated, true);
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (!isAdmin) return;
    try {
      const url = await uploadCmsImage(file);
      const updated = localList.map((m) => (m.id === id ? { ...m, image: url } : m));
      commitChanges(updated, true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSingleMember = async (id: string) => {
    setSavedId(id);
    setSaveStatus('saving');
    onChange(localList);
    const res = await syncTeamToSupabase({ executiveTeam: localList });
    if (res.success) {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => {
        setSavedId(null);
        setSaveStatus('idle');
      }, 2500);
    } else {
      setSaveStatus('error');
    }
  };

  const handleSaveAll = async () => {
    setSaveStatus('saving');
    onChange(localList);
    const res = await syncTeamToSupabase({ executiveTeam: localList });
    if (res.success) {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 3500);
    } else {
      setSaveStatus('error');
      alert('Error al guardar en Supabase. Verifica tu conexión.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Gestión Oficial de la Directiva Ejecutiva INBR
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Agrega o remueve directivos, cambia sus fotos oficiales, actualiza sus cargos y guarda directamente en la base de datos Supabase con autoguardado y botones de guardado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-neutral-800 text-xs font-mono">
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Guardando en Supabase...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guardado {lastSaved ? `(${lastSaved})` : ''}</span>
              </span>
            )}
            {saveStatus === 'idle' && (
              <span className="text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Supabase Activo {lastSaved ? `• ${lastSaved}` : ''}</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-400">⚠️ Error al sincronizar</span>
            )}
          </div>

          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleAddMember}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Agregar Directivo</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Todo</span>
              </button>
            </>
          ) : (
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800">
              🔒 Modo Solo Lectura (Solo Admin)
            </span>
          )}
        </div>
      </div>

      {/* Grid of executive team members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {localList.map((member) => (
          <div
            key={member.id}
            className="p-5 rounded-2xl bg-black border border-[#D4AF37]/40 hover:border-[#D4AF37] space-y-3.5 transition-all shadow-lg relative group"
          >
            {/* Top row: Badge & Delete button */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-md bg-gold-gradient text-black font-black text-[10px] font-mono shadow">
                {member.badge || 'Directiva Oficial'}
              </span>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(member.id)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Eliminar directivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Photo preview and controls */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#D4AF37] bg-neutral-900 shrink-0 shadow">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    <Camera className="w-6 h-6" />
                  </div>
                )}
              </div>

              {isAdmin ? (
                <div className="flex-1 space-y-1.5">
                  <label className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1F1A10] border border-[#D4AF37]/60 text-[#FFE885] text-[10px] font-bold hover:bg-gold-gradient hover:text-black cursor-pointer transition-all">
                    <UploadCloud className="w-3 h-3" />
                    <span>{member.image ? 'Cambiar Foto' : 'Subir Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(member.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {member.image && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(member.id, { image: '' })}
                      className="w-full text-center text-[10px] text-neutral-500 hover:text-rose-400 py-0.5 cursor-pointer"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-neutral-400 font-mono">Fotografía oficial</span>
              )}
            </div>

            {/* Form Fields: Only editable by Admin */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                  Nombre Completo:
                </label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleUpdate(member.id, { name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Ej: Jonathan Garcia"
                  />
                ) : (
                  <p className="font-bold text-white text-xs">{member.name}</p>
                )}
              </div>

              <div>
                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                  Cargo / Rol Directivo:
                </label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={member.title}
                    onChange={(e) => handleUpdate(member.id, { title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-[#FFE885] text-xs focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Ej: CEO & Fundador"
                  />
                ) : (
                  <p className="text-neutral-300 text-xs">{member.title}</p>
                )}
              </div>

              <div>
                <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                  Distintivo / Área (Badge):
                </label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={member.badge}
                    onChange={(e) => handleUpdate(member.id, { badge: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-neutral-200 text-xs focus:border-[#D4AF37] focus:outline-none"
                    placeholder="Ej: Fundación & Liderazgo"
                  />
                ) : (
                  <p className="text-neutral-400 text-xs">{member.badge}</p>
                )}
              </div>

              {isAdmin && (
                <div>
                  <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                    URL Directa de Imagen (Opcional):
                  </label>
                  <input
                    type="text"
                    value={member.image || ''}
                    onChange={(e) => handleUpdate(member.id, { image: e.target.value })}
                    placeholder="https://... o usa el botón de subir"
                    className="w-full px-3 py-1 rounded-lg bg-[#0E0E0E] border border-neutral-800 text-[11px] text-neutral-400 focus:border-[#D4AF37] focus:outline-none font-mono"
                  />
                </div>
              )}

              {/* BOTÓN INDIVIDUAL DE GUARDAR */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleSaveSingleMember(member.id)}
                  className={`w-full mt-3 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    savedId === member.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1F190E] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savedId === member.id ? '¡Guardado en Supabase!' : '💾 Guardar Directivo'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
