import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { 
  useDynamicContent, 
  CANONICAL_CHAMPIONS_LIST, 
  mergeWithCanonicalChampions, 
  syncChampionsToSupabase, 
  DynamicChampionItem 
} from '../utils/dynamicContent';
import { DogRecord } from '../data/registryData';
import { 
  Trophy, 
  Award, 
  Search, 
  Crown, 
  Star, 
  ShieldCheck, 
  MapPin, 
  ArrowLeft, 
  Lock, 
  X, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Settings, 
  SlidersHorizontal 
} from 'lucide-react';

interface ChampionsPointsSectionProps {
  onSelectDog?: (dog: DogRecord) => void;
}

export const ChampionsPointsSection: React.FC<ChampionsPointsSectionProps> = () => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  // Always merge with canonical champions so Bam Bam, Don Lee, etc. are 100% guaranteed
  const officialDynamicChampions = mergeWithCanonicalChampions(content.championsList);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [editableList, setEditableList] = useState<DynamicChampionItem[]>(officialDynamicChampions);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autosaveTimerRef = useRef<any>(null);

  // Sync editableList with incoming content
  useEffect(() => {
    setEditableList(officialDynamicChampions);
  }, [content.championsList]);

  // Normalize string for accents, case, and remove spaces/symbols for robust matching
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const cleanAlnum = (str: string) =>
    normalize(str).replace(/[^a-z0-9]/g, '');

  // Filtered list based on search term using editableList (always up to date with user edits and canonical list)
  const filteredDynamic = editableList.filter((ch) => {
    if (!searchTerm.trim()) return false;
    const q = normalize(searchTerm);
    const qAlnum = cleanAlnum(searchTerm);
    const qWords = q.split(/\s+/).filter(Boolean);
    const nameNorm = normalize(ch.name);
    const nameAlnum = cleanAlnum(ch.name);

    return (
      nameNorm.includes(q) ||
      (qAlnum.length >= 2 && nameAlnum.includes(qAlnum)) ||
      qWords.some((word) => word.length >= 2 && nameNorm.includes(word)) ||
      normalize(ch.region).includes(q) ||
      normalize(ch.breed || '').includes(q) ||
      normalize(ch.title || '').includes(q)
    );
  });

  // AUTOSAVE function to Supabase
  const triggerAutosave = (updatedList: DynamicChampionItem[]) => {
    setEditableList(updatedList);
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      const res = await syncChampionsToSupabase(updatedList);
      if (res.success) {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    }, 700);
  };

  // Manual save for single row
  const handleSaveSingleRow = async (id: string) => {
    setSavedRowId(id);
    setSaveStatus('saving');
    const res = await syncChampionsToSupabase(editableList);
    if (res.success) {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => {
        setSavedRowId(null);
        setSaveStatus('idle');
      }, 2500);
    } else {
      setSaveStatus('error');
    }
  };

  // Manual save all
  const handleSaveAll = async () => {
    setSaveStatus('saving');
    const res = await syncChampionsToSupabase(editableList);
    if (res.success) {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setSaveStatus('idle'), 3500);
    } else {
      setSaveStatus('error');
      alert('Hubo un error al guardar en Supabase. Verifica tu conexión a internet.');
    }
  };

  const handleUpdateItem = (id: string, patch: Partial<DynamicChampionItem>) => {
    const updated = editableList.map((c) => (c.id === id ? { ...c, ...patch } : c));
    triggerAutosave(updated);
  };

  const handleAddNewChampion = () => {
    const newChmp: DynamicChampionItem = {
      id: `chmp-${Date.now()}`,
      name: 'NUEVO CAMPEÓN',
      region: 'MÉXICO',
      points: 100,
      breed: 'AMERICAN BULLY',
      title: 'Puntos',
    };
    const updated = [newChmp, ...editableList];
    triggerAutosave(updated);
  };

  const handleDeleteChampion = (id: string) => {
    if (confirm('¿Eliminar este ejemplar de la base de datos de campeonatos?')) {
      const updated = editableList.filter((c) => c.id !== id);
      triggerAutosave(updated);
    }
  };

  return (
    <section id="campeones" className="py-20 bg-[#080808] relative border-t border-b border-[#D4AF37]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Return Bar */}
        <div className="flex flex-wrap items-center justify-between mb-8 pb-3 border-b border-neutral-800 gap-3">
          <a
            href="#inicio"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14120D] border border-[#D4AF37]/50 text-xs font-bold text-[#FFE885] hover:bg-[#201A0E] transition-all hover:scale-105"
            title="Regresar al Inicio"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Regresar al Inicio</span>
          </a>

          <div className="flex items-center gap-2">
            {/* Botón de Administración y Autoguardado en Supabase */}
            <button
              type="button"
              onClick={() => setIsAdminEditorOpen(!isAdminEditorOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2A2010] to-[#16120B] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:brightness-110 shadow-md transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{isAdminEditorOpen ? 'Cerrar Gestor de Campeones' : '⚙️ Editar & Agregar Campeones (Supabase)'}</span>
            </button>

            <a
              href="#salon-fama"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-all"
              title="Ver Salón de la Fama"
            >
              <span>Salón de la Fama →</span>
            </a>
          </div>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-4 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <Lock className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              CONSULTA OFICIAL & CONFIDENCIAL DE PUNTOS
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-4">
            {content.championsTitle || t('champions.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg">
            {content.championsSubtitle || 'Consulta oficial de puntajes en pista, títulos homologados y récords de conformación internacional.'}
          </p>
        </div>

        {/* PANEL DE ADMINISTRACIÓN Y AUTOGUARDADO EN SUPABASE (Para el Usuario / Jonathan García) */}
        {isAdminEditorOpen && (
          <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-[#12100B] border-2 border-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.3)] space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFE885]" />
                  <h3 className="text-xl font-black text-white font-serif-luxury">
                    Gestor Oficial de Campeonatos • Sincronización en la Nube
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 mt-1">
                  Agrega nuevos campeones, modifica puntos y guarda directamente en la base de datos de Supabase. Cuenta con autoguardado inteligente y botones de guardado individual.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-neutral-800 text-xs font-mono">
                  {saveStatus === 'saving' && (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Guardando en Supabase...</span>
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sincronizado {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                    </span>
                  )}
                  {saveStatus === 'idle' && (
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Supabase Activo {lastSavedTime ? `• Último: ${lastSavedTime}` : ''}</span>
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <span>⚠️ Error al sincronizar</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddNewChampion}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Agregar Campeón</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Todo en Supabase</span>
                </button>
              </div>
            </div>

            {/* Tabla de Edición con Botones de Guardar */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-black max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18140B] text-[#FFE885] uppercase text-[10px] font-mono sticky top-0 z-10 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Nombre del Ejemplar</th>
                    <th className="py-2.5 px-3">Raza Oficial</th>
                    <th className="py-2.5 px-3">Región / País</th>
                    <th className="py-2.5 px-3">Puntos</th>
                    <th className="py-2.5 px-3">Título Oficial</th>
                    <th className="py-2.5 px-3 text-right">Acción Guardar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-mono text-neutral-300">
                  {editableList.map((chmp, idx) => (
                    <tr key={chmp.id || idx} className="hover:bg-[#121008] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-neutral-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={chmp.name}
                          onChange={(e) => handleUpdateItem(chmp.id, { name: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-white font-bold text-xs focus:border-[#D4AF37]"
                          placeholder="Nombre del perro"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={chmp.breed || ''}
                          onChange={(e) => handleUpdateItem(chmp.id, { breed: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-neutral-300 text-xs focus:border-[#D4AF37]"
                          placeholder="Raza"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={chmp.region || ''}
                          onChange={(e) => handleUpdateItem(chmp.id, { region: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-neutral-300 text-xs focus:border-[#D4AF37]"
                          placeholder="Región"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={chmp.points}
                          onChange={(e) => handleUpdateItem(chmp.id, { points: Number(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-[#FFE885] font-black text-xs text-center focus:border-[#D4AF37]"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={chmp.title || ''}
                          onChange={(e) => handleUpdateItem(chmp.id, { title: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0E0E0E] border border-neutral-700 text-neutral-300 text-xs focus:border-[#D4AF37]"
                          placeholder="Título (CAMPEÓN, Puntos...)"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveSingleRow(chmp.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              savedRowId === chmp.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#201A10] border border-[#D4AF37]/60 text-[#FFE885] hover:bg-gold-gradient hover:text-black'
                            }`}
                            title="Guardar este campeón directamente en Supabase"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{savedRowId === chmp.id ? '¡Guardado!' : 'Guardar'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteChampion(chmp.id)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar de la lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Titles Explanation Grid (Compact) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="p-4 rounded-2xl bg-[#12110D] border border-blue-500/30 hover-card-luxury">
            <div className="flex items-center gap-2 text-blue-400 font-bold font-mono text-xs mb-1.5">
              <Award className="w-4 h-4" />
              CH - CAMPEÓN (100 PTS)
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              {t('champions.titles.ch')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#12110D] border border-purple-500/30 hover-card-luxury">
            <div className="flex items-center gap-2 text-purple-400 font-bold font-mono text-xs mb-1.5">
              <Star className="w-4 h-4" />
              GR CH - GRAN CAMPEÓN
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              {t('champions.titles.grch')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#12110D] border border-emerald-500/30 hover-card-luxury">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              NAT CH - NACIONAL
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              {t('champions.titles.natch')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#241A0E] to-[#12110D] border-2 border-[#D4AF37] hover-card-luxury">
            <div className="flex items-center gap-2 text-[#FFE885] font-bold font-mono text-xs mb-1.5">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              SUPREME CH - SUPREMO
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              {t('champions.titles.supreme')}
            </p>
          </div>
        </div>

        {/* SEARCH BOX (Buscador protegido: NINGÚN nombre público por defecto) */}
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.2)]">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white font-serif-luxury mb-1 flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
              <span>Buscador Oficial de Campeones y Puntos</span>
            </h3>
            <p className="text-xs text-neutral-300">
              Escribe el nombre del ejemplar para consultar sus puntos oficiales y título homologado.
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative mb-3">
            <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ingresa el nombre del ejemplar (ej: Bam Bam, Don Lee, Cadete...)"
              className="w-full pl-12 pr-11 py-4 rounded-2xl bg-[#080808] border-2 border-[#D4AF37]/60 text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFE885] text-sm font-mono shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick-Click Search Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <span className="text-[11px] font-mono text-neutral-400">Consultas rápidas:</span>
            {[
              { label: '🏆 Bam Bam (650 pts)', q: 'Bam Bam' },
              { label: 'Don Lee (700 pts)', q: 'Don Lee' },
              { label: 'Cadete (625 pts)', q: 'Cadete' },
              { label: 'Thanos (600 pts)', q: 'Thanos' },
              { label: 'Merlin (600 pts)', q: 'Merlin' },
              { label: 'Cianuro (600 pts)', q: 'Cianuro' },
              { label: 'Kelly (600 pts)', q: 'Kelly' },
              { label: 'Sugar Daddy (300 pts)', q: 'Sugar Daddy' },
            ].map((chip) => (
              <button
                key={chip.q}
                type="button"
                onClick={() => setSearchTerm(chip.q)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                  searchTerm.toLowerCase() === chip.q.toLowerCase()
                    ? 'bg-gold-gradient text-black font-black border-[#FFE885] scale-105 shadow-sm'
                    : 'bg-neutral-900/80 border-neutral-700 text-neutral-300 hover:border-[#D4AF37] hover:text-[#FFE885]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ESTADO 1: SIN BÚSQUEDA -> MENSAJE DE PRIVACIDAD Y PROTECCIÓN DE DATOS (SIN NOMBRES EXPUESTOS) */}
          {!searchTerm.trim() && (
            <div className="p-8 rounded-2xl bg-[#0B0A08] border border-neutral-800 text-center space-y-2.5">
              <Lock className="w-10 h-10 text-[#D4AF37] mx-auto opacity-75" />
              <h4 className="text-base font-bold text-white font-serif-luxury">
                Consulta Oficial Protegida
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-lg mx-auto">
                Para salvaguardar la privacidad y los derechos de cada ejemplar y criador, los nombres y puntajes no se listan públicamente. Ingresa el nombre del ejemplar en el campo de búsqueda o presiona uno de los botones de consulta rápida para consultar su puntaje oficial.
              </p>
            </div>
          )}

          {/* ESTADO 2: CON BÚSQUEDA -> MOSTRAR ÚNICAMENTE LOS RESULTADOS COINCIDENTES */}
          {searchTerm.trim().length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#FFE885] uppercase tracking-wider block font-bold">
                  Resultados Oficiales ({filteredDynamic.length}):
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Búsqueda: "{searchTerm}"
                </span>
              </div>

              {filteredDynamic.length > 0 ? (
                <div className="space-y-3">
                  {filteredDynamic.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-5 rounded-2xl bg-gradient-to-r from-[#18130B] via-[#0E0D0A] to-[#18130B] border-2 border-[#D4AF37] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn"
                    >
                      <div className="space-y-1.5 w-full sm:w-auto">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-gold-gradient text-black text-xs font-black font-mono flex items-center justify-center shrink-0 shadow">
                            #{idx + 1}
                          </span>
                          <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                            {item.name}
                          </h4>
                          {item.title && (
                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black font-mono uppercase tracking-wider ${
                              item.title.toLowerCase().includes('campeón') || item.title.toLowerCase().includes('campeon')
                                ? 'bg-emerald-950 border border-emerald-500/80 text-emerald-300'
                                : 'bg-[#2A2012] border border-[#D4AF37]/70 text-[#FFE885]'
                            }`}>
                              {item.title}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 font-mono sm:pl-9">
                          <span>Raza: <strong className="text-white font-semibold">{item.breed}</strong></span>
                          <span aria-hidden="true" className="text-[#D4AF37]">·</span>
                          <span className="inline-flex items-center gap-1 text-[#FFE885]">
                            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>{item.region}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                          Puntuación Oficial
                        </span>
                        <span className="px-4 py-2 rounded-xl bg-gold-gradient text-black font-black font-mono text-sm shadow-lg block">
                          {item.points} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-400 space-y-1">
                  <p className="text-neutral-300 font-medium">
                    No se localizó ningún registro para "{searchTerm}".
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Verifica la ortografía del nombre del ejemplar e intenta nuevamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
