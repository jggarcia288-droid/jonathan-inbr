import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Camera, 
  UploadCloud, 
  Key, 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Printer, 
  FileText,
  Lock,
  Video,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Search,
  Save
} from 'lucide-react';
import { TeamRepresentative, uploadCmsImage, syncTeamToSupabase } from '../../utils/dynamicContent';

interface AdminRepresentativesEditorProps {
  isAdmin: boolean;
  representatives: TeamRepresentative[];
  onChange: (updated: TeamRepresentative[]) => void;
}

export const AdminRepresentativesEditor: React.FC<AdminRepresentativesEditorProps> = ({
  isAdmin,
  representatives,
  onChange,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localList, setLocalList] = useState<TeamRepresentative[]>(representatives);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = React.useRef<any>(null);

  useEffect(() => {
    setLocalList(representatives);
  }, [representatives]);

  const commitChanges = (updated: TeamRepresentative[], immediate: boolean = false) => {
    setLocalList(updated);
    setSaveStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      onChange(updated);
      syncTeamToSupabase({ representativesList: updated }).then((res) => {
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
        syncTeamToSupabase({ representativesList: updated }).then((res) => {
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

  const handleSaveSingleMember = async (id: string) => {
    setSavedId(id);
    setSaveStatus('saving');
    onChange(localList);
    const res = await syncTeamToSupabase({ representativesList: localList });
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
    const res = await syncTeamToSupabase({ representativesList: localList });
    if (res.success) {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 3500);
    } else {
      setSaveStatus('error');
      alert('Error al guardar en Supabase. Verifica tu conexión.');
    }
  };

  const [repSubmissions, setRepSubmissions] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('inbr_rep_submissions_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('ALL');
  const [submissionSearch, setSubmissionSearch] = useState<string>('');

  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const saved = localStorage.getItem('inbr_rep_submissions_v2');
        if (saved) setRepSubmissions(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  const handleAddRepresentative = () => {
    if (!isAdmin) return;
    const newRep: TeamRepresentative = {
      id: `rep-${Date.now()}`,
      name: 'Nuevo Representante Regional',
      country: 'País / Región',
      flag: '🌐',
      role: 'Representante Franquicia Oficial',
      contact: '+1 000 000 0000',
      username: `rep_${Date.now().toString().slice(-4)}`,
      password: `INBR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      canPrint: true,
      canUpload: true,
      isRevoked: false,
      image: '',
    };
    commitChanges([...localList, newRep], true);
  };

  const handleUpdate = (id: string, patch: Partial<TeamRepresentative>) => {
    if (!isAdmin) return;
    const updated = localList.map((r) => (r.id === id ? { ...r, ...patch } : r));
    commitChanges(updated, false);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    if (localList.length <= 1) {
      return;
    }
    const updated = localList.filter((r) => r.id !== id);
    commitChanges(updated, true);
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (!isAdmin) return;
    try {
      const url = await uploadCmsImage(file);
      const updated = localList.map((r) => (r.id === id ? { ...r, image: url } : r));
      commitChanges(updated, true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePassword = (id: string) => {
    if (!isAdmin) return;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!#$';
    let pass = 'INBR-';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const updated = localList.map((r) => (r.id === id ? { ...r, password: pass } : r));
    commitChanges(updated, true);
    navigator.clipboard?.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Gestión de Representantes, Franquicias y Permisos de Impresión
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Genera contraseñas seguras, autoriza permisos de impresión de credenciales y pedigríes oficiales, o revoca accesos de manera inmediata.
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
                onClick={handleAddRepresentative}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Agregar Representante</span>
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

      {/* Grid of representatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {localList.map((rep) => {
          const isRevoked = rep.isRevoked === true;

          return (
            <div
              key={rep.id}
              className={`p-5 rounded-2xl bg-black border ${
                isRevoked
                  ? 'border-rose-900/80 bg-gradient-to-b from-rose-950/20 to-black'
                  : 'border-[#D4AF37]/40 hover:border-[#D4AF37]'
              } space-y-4 transition-all shadow-lg relative group`}
            >
              {/* Header card: Flag + Name + Delete */}
              <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {isAdmin ? (
                    <input
                      type="text"
                      value={rep.flag}
                      onChange={(e) => handleUpdate(rep.id, { flag: e.target.value })}
                      className="w-10 h-10 text-center text-xl rounded-xl bg-[#151515] border border-neutral-700 shrink-0"
                      title="Bandera o Icono (Emoji)"
                    />
                  ) : (
                    <span className="text-2xl shrink-0">{rep.flag}</span>
                  )}

                  <div className="min-w-0">
                    {isAdmin ? (
                      <input
                        type="text"
                        value={rep.name}
                        onChange={(e) => handleUpdate(rep.id, { name: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37]"
                        placeholder="Nombre completo"
                      />
                    ) : (
                      <strong className="text-white text-sm block truncate">{rep.name}</strong>
                    )}
                    <span className="text-[10px] text-neutral-400 font-mono truncate block">
                      {rep.country}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(rep.id)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                    title="Eliminar representante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Photo & Upload Controls */}
              <div className="flex items-center gap-3 bg-[#0d0d0d] p-3 rounded-xl border border-neutral-800">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#D4AF37] bg-neutral-900 shrink-0 shadow">
                  {rep.image ? (
                    <img src={rep.image} alt={rep.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs font-mono font-bold">
                      {rep.flag}
                    </div>
                  )}
                </div>

                {isAdmin ? (
                  <div className="flex-1 space-y-1">
                    <label className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-[#1F1A10] border border-[#D4AF37]/60 text-[#FFE885] text-[10px] font-bold hover:bg-gold-gradient hover:text-black cursor-pointer transition-all">
                      <UploadCloud className="w-3 h-3" />
                      <span>{rep.image ? 'Cambiar Foto' : 'Subir Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(rep.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {rep.image && (
                      <button
                        type="button"
                        onClick={() => handleUpdate(rep.id, { image: '' })}
                        className="w-full text-center text-[9px] text-neutral-500 hover:text-rose-400 cursor-pointer"
                      >
                        Quitar foto
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-neutral-400">Fotografía autorizada</span>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">
                      País / Estado:
                    </label>
                    {isAdmin ? (
                      <input
                        type="text"
                        value={rep.country}
                        onChange={(e) => handleUpdate(rep.id, { country: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-[11px] font-mono"
                      />
                    ) : (
                      <span className="text-neutral-300 text-xs font-mono">{rep.country}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">
                      Cargo / Rol:
                    </label>
                    {isAdmin ? (
                      <input
                        type="text"
                        value={rep.role}
                        onChange={(e) => handleUpdate(rep.id, { role: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                      />
                    ) : (
                      <span className="text-neutral-300 text-xs">{rep.role}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">
                    WhatsApp / Teléfono de Contacto:
                  </label>
                  {isAdmin ? (
                    <input
                      type="text"
                      value={rep.contact}
                      onChange={(e) => handleUpdate(rep.id, { contact: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-emerald-400 font-mono text-[11px]"
                    />
                  ) : (
                    <span className="text-emerald-400 font-mono text-xs">{rep.contact}</span>
                  )}
                </div>
              </div>

              {/* Security & Password Generator Section */}
              <div className="p-3 rounded-xl bg-[#090806] border border-[#D4AF37]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-[#FFE885] uppercase font-bold flex items-center gap-1">
                    <Key className="w-3 h-3 text-[#FFE885]" />
                    <span>Clave de Acceso del Representante</span>
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleGeneratePassword(rep.id)}
                      className="text-[9px] font-bold text-black bg-gold-gradient px-2 py-0.5 rounded shadow hover:brightness-110 active:scale-95 cursor-pointer"
                      title="Generar nueva clave y copiar"
                    >
                      Generar Clave
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between bg-black px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs font-mono">
                  {isAdmin ? (
                    <input
                      type="text"
                      value={rep.password || ''}
                      onChange={(e) => handleUpdate(rep.id, { password: e.target.value })}
                      placeholder="Escribe la contraseña..."
                      className="bg-transparent text-emerald-400 font-bold focus:outline-none flex-1 text-xs font-mono"
                      title="Puedes editar o cambiar la contraseña directamente desde el Panel Maestro"
                    />
                  ) : (
                    <span className="text-emerald-400 font-bold truncate flex-1">
                      {rep.password || 'INBR-2026-OFICIAL'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(rep.password || 'INBR-2026-OFICIAL');
                      setCopiedId(rep.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer ml-2 shrink-0"
                    title="Copiar contraseña"
                  >
                    {copiedId === rep.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Permissions & Revocation Switch */}
              <div className="space-y-2 pt-1 border-t border-neutral-800/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      isRevoked
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {isRevoked ? (
                      <>
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        <span>ACCESO REVOCADO</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>REPRESENTANTE ACTIVO</span>
                      </>
                    )}
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleUpdate(rep.id, { isRevoked: !isRevoked })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isRevoked
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900'
                          : 'bg-rose-950 text-rose-300 border border-rose-700 hover:bg-rose-900'
                      }`}
                    >
                      {isRevoked ? 'Reactivar Acceso' : 'Revocar Acceso'}
                    </button>
                  )}
                </div>

                {/* Permissions Toggles: Printing and Upload */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <label className={`flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer transition-all ${
                    rep.canPrint === true
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300 font-bold'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={rep.canPrint === true}
                      onChange={(e) => handleUpdate(rep.id, { canPrint: e.target.checked })}
                      className="w-4 h-4 accent-[#D4AF37] rounded"
                    />
                    <span className="text-[10px] truncate">
                      {rep.canPrint === true ? '✓ Habilitado Imprimir' : '🔒 Impresión Bloqueada'}
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 p-2 rounded-xl bg-black/60 border border-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={rep.canUpload !== false}
                      onChange={(e) => handleUpdate(rep.id, { canUpload: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[#D4AF37] rounded"
                    />
                    <span className="text-neutral-300 text-[10px] truncate">Subir Trámites</span>
                  </label>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSaveSingleMember(rep.id)}
                    className={`w-full mt-3 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      savedId === rep.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#1F190E] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savedId === rep.id ? '¡Guardado en Supabase!' : '💾 Guardar Representante'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* AUDITORÍA Y MONITOREO EN VIVO DE TRÁMITES REALIZADOS POR REPRESENTANTES    */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-[#0F0D09] border-2 border-[#D4AF37]/50 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FFE885]" />
              <h4 className="text-base font-black text-white font-serif-luxury tracking-wide">
                Auditoría en Vivo: Todo lo que Hacen los Representantes
              </h4>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              Supervisión en tiempo real de camadas, homologaciones, transferencias y videos cargados por cada delegado regional.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Representative */}
            <div className="flex items-center gap-1.5 bg-black px-3 py-1.5 rounded-xl border border-neutral-700">
              <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-200 font-bold focus:outline-none"
              >
                <option value="ALL" className="bg-black text-white">Todos los Representantes</option>
                {representatives.map((r) => (
                  <option key={r.id} value={r.name} className="bg-black text-white">
                    {r.flag} {r.name} ({r.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-1.5 bg-black px-3 py-1.5 rounded-xl border border-neutral-700">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar trámite..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-32 sm:w-40"
              />
            </div>
          </div>
        </div>

        {/* List of Submissions */}
        {(() => {
          const filtered = repSubmissions.filter((sub) => {
            const matchesRep = selectedRepFilter === 'ALL' || sub.representativeName?.toLowerCase().includes(selectedRepFilter.toLowerCase());
            const matchesQuery = !submissionSearch || 
              sub.id?.toLowerCase().includes(submissionSearch.toLowerCase()) ||
              sub.breed?.toLowerCase().includes(submissionSearch.toLowerCase()) ||
              sub.dogName?.toLowerCase().includes(submissionSearch.toLowerCase()) ||
              sub.details?.toLowerCase().includes(submissionSearch.toLowerCase());
            return matchesRep && matchesQuery;
          });

          if (filtered.length === 0) {
            return (
              <div className="p-8 text-center bg-black/40 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                No hay trámites registrados para el filtro seleccionado.
              </div>
            );
          }

          return (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-black border border-neutral-800 hover:border-[#D4AF37]/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FFE885]">
                        {item.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900 border border-neutral-700 text-neutral-300">
                        {item.type}
                      </span>
                      <strong className="text-xs text-white">
                        {item.representativeName}
                      </strong>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        ({item.country || 'Oficial'}) • {item.date}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300">
                      {item.details}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono">
                      <span>Raza: <strong className="text-white">{item.breed}</strong></span>
                      {item.puppiesCount && (
                        <span>Cachorros: <strong className="text-[#FFE885]">{item.puppiesCount}</strong></span>
                      )}
                      {item.videoEvidence && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                          <Video className="w-3 h-3" />
                          <span>{item.videoEvidence}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for Master Admin */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {item.status === 'APROBADO' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aprobado por Master</span>
                      </span>
                    ) : item.status === 'RECHAZADO' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-rose-950 text-rose-300 border border-rose-700 text-xs font-bold">
                        Rechazado
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = repSubmissions.map((s) =>
                              s.id === item.id ? { ...s, status: 'APROBADO' } : s
                            );
                            setRepSubmissions(updated);
                            try {
                              localStorage.setItem('inbr_rep_submissions_v2', JSON.stringify(updated));
                            } catch {}
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer"
                        >
                          ✓ Aprobar Trámite
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = repSubmissions.map((s) =>
                              s.id === item.id ? { ...s, status: 'RECHAZADO' } : s
                            );
                            setRepSubmissions(updated);
                            try {
                              localStorage.setItem('inbr_rep_submissions_v2', JSON.stringify(updated));
                            } catch {}
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
