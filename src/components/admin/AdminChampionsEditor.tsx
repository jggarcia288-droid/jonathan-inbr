import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Search, 
  Sparkles, 
  Save, 
  RefreshCw 
} from 'lucide-react';
import { 
  DynamicChampionItem, 
  syncChampionsToSupabase, 
  mergeWithCanonicalChampions 
} from '../../utils/dynamicContent';

interface AdminChampionsEditorProps {
  isAdmin: boolean;
  championsList: DynamicChampionItem[];
  onChange: (updatedList: DynamicChampionItem[]) => void;
}

export const AdminChampionsEditor: React.FC<AdminChampionsEditorProps> = ({
  isAdmin,
  championsList,
  onChange,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<any>(null);

  const merged = mergeWithCanonicalChampions(championsList);

  const filtered = merged.filter(
    (c) =>
      c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (c.breed && c.breed.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const triggerAutosave = (updated: DynamicChampionItem[]) => {
    onChange(updated);
    setSaveStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await syncChampionsToSupabase(updated);
      if (res.success) {
        setSaveStatus('saved');
        setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    }, 600);
  };

  const handleAddChampion = () => {
    if (!isAdmin) return;
    const newChmp: DynamicChampionItem = {
      id: `chmp-${Date.now()}`,
      name: 'NUEVO EJEMPLAR CAMPEÓN',
      region: 'MÉXICO',
      points: 100,
      breed: 'AMERICAN BULLY',
      title: 'Puntos',
    };
    const next = [newChmp, ...merged];
    triggerAutosave(next);
    setFeedback('Ejemplar añadido. Modifica sus datos y presiona Guardar.');
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleUpdateChampion = (id: string, patch: Partial<DynamicChampionItem>) => {
    if (!isAdmin) return;
    const next = merged.map((c) => (c.id === id ? { ...c, ...patch } : c));
    triggerAutosave(next);
  };

  const handleDeleteChampion = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Eliminar este ejemplar de la tabla de campeonatos?')) {
      const next = merged.filter((c) => c.id !== id);
      triggerAutosave(next);
      setFeedback('Ejemplar removido de la tabla.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleSaveSingleRow = async (id: string) => {
    setSavedRowId(id);
    setSaveStatus('saving');
    const res = await syncChampionsToSupabase(merged);
    if (res.success) {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => {
        setSavedRowId(null);
        setSaveStatus('idle');
      }, 2500);
    } else {
      setSaveStatus('error');
    }
  };

  const handleSaveAll = async () => {
    setSaveStatus('saving');
    const res = await syncChampionsToSupabase(merged);
    if (res.success) {
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 3500);
    } else {
      setSaveStatus('error');
      alert('Error al sincronizar con Supabase. Verifica tu conexión.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Tabla Oficial de Puntajes & Campeonatos
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Sube y actualiza directamente la base de datos de campeones. Cada registro se sincroniza en vivo con Supabase y cuenta con botones de guardado individual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-neutral-800 text-xs font-mono">
            {saveStatus === 'saving' && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
              <span className="text-rose-400">⚠️ Error de sincronización</span>
            )}
          </div>

          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleAddChampion}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Agregar Ejemplar</span>
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
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-1.5 shrink-0">
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Modo Solo Lectura</span>
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-3 p-3 bg-black/60 border border-neutral-800 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar por nombre, país o región (ej: Bam Bam)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
          />
        </div>
        <span className="text-xs font-mono text-neutral-400 shrink-0">
          Total: <strong className="text-[#FFE885]">{filtered.length}</strong> ejemplares
        </span>
      </div>

      {/* Table view */}
      <div className="rounded-2xl border-2 border-[#D4AF37]/40 bg-black overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15120B] border-b border-[#D4AF37]/50 text-[#FFE885] font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Nombre del Ejemplar</th>
                <th className="py-3 px-4">Región o País</th>
                <th className="py-3 px-4">Raza Oficial</th>
                <th className="py-3 px-4 text-center">Puntos Acumulados</th>
                {isAdmin && <th className="py-3 px-4 text-right">Guardar / Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 font-mono text-neutral-300">
              {filtered.map((chmp, idx) => (
                <tr key={chmp.id || idx} className="hover:bg-[#121008] transition-colors group">
                  <td className="py-3 px-4 text-neutral-500 font-bold">{idx + 1}</td>

                  <td className="py-3 px-4 font-bold text-white">
                    {isAdmin ? (
                      <input
                        type="text"
                        value={chmp.name}
                        onChange={(e) => handleUpdateChampion(chmp.id, { name: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#0d0d0d] border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37]"
                      />
                    ) : (
                      <span className="text-sm font-serif-luxury text-[#FFE885]">{chmp.name}</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {isAdmin ? (
                      <input
                        type="text"
                        value={chmp.region}
                        onChange={(e) => handleUpdateChampion(chmp.id, { region: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#0d0d0d] border border-neutral-700 text-neutral-200 text-xs focus:border-[#D4AF37]"
                      />
                    ) : (
                      <span className="text-neutral-300">{chmp.region}</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {isAdmin ? (
                      <input
                        type="text"
                        value={chmp.breed || ''}
                        onChange={(e) => handleUpdateChampion(chmp.id, { breed: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#0d0d0d] border border-neutral-700 text-neutral-200 text-xs focus:border-[#D4AF37]"
                      />
                    ) : (
                      <span className="text-neutral-400">{chmp.breed || '—'}</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {isAdmin ? (
                      <input
                        type="number"
                        value={chmp.points}
                        onChange={(e) =>
                          handleUpdateChampion(chmp.id, { points: Number(e.target.value) || 0 })
                        }
                        className="w-24 text-center px-2 py-1 rounded bg-[#0d0d0d] border border-neutral-700 text-[#FFE885] font-black text-xs focus:border-[#D4AF37]"
                      />
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#261E0E] border border-[#D4AF37] text-[#FFE885] font-black">
                        {chmp.points} Pts
                      </span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow(chmp.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            savedRowId === chmp.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#201A10] border border-[#D4AF37]/60 text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                          }`}
                          title="Guardar fila en Supabase"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savedRowId === chmp.id ? '¡Listo!' : 'Guardar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteChampion(chmp.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-950/60 transition-all cursor-pointer"
                          title="Eliminar fila de la tabla"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-neutral-500 font-mono">
                    No se encontraron ejemplares con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
