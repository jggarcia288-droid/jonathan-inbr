import React, { useState } from 'react';
import { useRegistry } from '../context/RegistryContext';
import { AncestorAutocompleteInput } from './AncestorAutocompleteInput';
import { AncestorSuggestion } from '../hooks/useSupabaseAncestorSearch';
import { 
  Dna, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Search, 
  Database, 
  Palette, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  Check,
  RefreshCw
} from 'lucide-react';

export interface AncestorEntry {
  name: string;
  color: string;
  regNumber?: string;
  isExistingInDb?: boolean;
}

export interface HomologationPedigreeData {
  // Gen 1 (2)
  sire: AncestorEntry;
  dam: AncestorEntry;
  // Gen 2 (4)
  sireSire: AncestorEntry;
  sireDam: AncestorEntry;
  damSire: AncestorEntry;
  damDam: AncestorEntry;
  // Gen 3 (8)
  g3: AncestorEntry[];
  // Gen 4 (16)
  g4: AncestorEntry[];
}

export const INITIAL_HOMOLOGATION_PEDIGREE: HomologationPedigreeData = {
  sire: { name: '', color: '', regNumber: '' },
  dam: { name: '', color: '', regNumber: '' },
  sireSire: { name: '', color: '', regNumber: '' },
  sireDam: { name: '', color: '', regNumber: '' },
  damSire: { name: '', color: '', regNumber: '' },
  damDam: { name: '', color: '', regNumber: '' },
  g3: Array.from({ length: 8 }, () => ({ name: '', color: '', regNumber: '' })),
  g4: Array.from({ length: 16 }, () => ({ name: '', color: '', regNumber: '' })),
};

const COMMON_COLORS = [
  'Champagne Tri-Color',
  'Lilac Tri-Color',
  'Blue Fawn',
  'Chocolate Tri',
  'Black Tri',
  'Blue and White',
  'White',
  'Fawn',
  'Red',
  'Brindle',
  'Ghost Tri',
  'Black Solid',
  'Platinum White',
  'Isabella',
];

interface HomologationPedigreeBuilderProps {
  value: HomologationPedigreeData;
  onChange: (data: HomologationPedigreeData) => void;
  className?: string;
}

export const HomologationPedigreeBuilder: React.FC<HomologationPedigreeBuilderProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const { findDogByQuery } = useRegistry();
  const [activeGenTab, setActiveGenTab] = useState<1 | 2 | 3 | 4>(1);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Helper to show feedback toast
  const notify = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Helper to cascade parent and grandparent lookup into Gen 3 and Gen 4
  const cascadeG3AndG4 = (
    dogObj: any,
    g3SireIdx: number,
    g3DamIdx: number,
    updated: HomologationPedigreeData
  ): number => {
    let count = 0;
    if (!dogObj) return count;

    // Resolve G3 Sire
    if (dogObj.sire) {
      const g3SireObj = findDogByQuery(dogObj.sireReg || dogObj.sire);
      updated.g3[g3SireIdx] = {
        name: dogObj.sire,
        color: g3SireObj?.color || 'Color Oficial en DB',
        regNumber: dogObj.sireReg || g3SireObj?.regNumber || '',
        isExistingInDb: !!g3SireObj,
      };
      count++;

      // Resolve G4 from G3 Sire
      if (g3SireObj?.sire) {
        const g4SS = findDogByQuery(g3SireObj.sireReg || g3SireObj.sire);
        updated.g4[g3SireIdx * 2] = {
          name: g3SireObj.sire,
          color: g4SS?.color || 'Color Oficial en DB',
          regNumber: g3SireObj.sireReg || g4SS?.regNumber || '',
          isExistingInDb: !!g4SS,
        };
        count++;
      }
      if (g3SireObj?.dam) {
        const g4SD = findDogByQuery(g3SireObj.damReg || g3SireObj.dam);
        updated.g4[g3SireIdx * 2 + 1] = {
          name: g3SireObj.dam,
          color: g4SD?.color || 'Color Oficial en DB',
          regNumber: g3SireObj.damReg || g4SD?.regNumber || '',
          isExistingInDb: !!g4SD,
        };
        count++;
      }
    }

    // Resolve G3 Dam
    if (dogObj.dam) {
      const g3DamObj = findDogByQuery(dogObj.damReg || dogObj.dam);
      updated.g3[g3DamIdx] = {
        name: dogObj.dam,
        color: g3DamObj?.color || 'Color Oficial en DB',
        regNumber: dogObj.damReg || g3DamObj?.regNumber || '',
        isExistingInDb: !!g3DamObj,
      };
      count++;

      // Resolve G4 from G3 Dam
      if (g3DamObj?.sire) {
        const g4DS = findDogByQuery(g3DamObj.sireReg || g3DamObj.sire);
        updated.g4[g3DamIdx * 2] = {
          name: g3DamObj.sire,
          color: g4DS?.color || 'Color Oficial en DB',
          regNumber: g3DamObj.sireReg || g4DS?.regNumber || '',
          isExistingInDb: !!g4DS,
        };
        count++;
      }
      if (g3DamObj?.dam) {
        const g4DD = findDogByQuery(g3DamObj.damReg || g3DamObj.dam);
        updated.g4[g3DamIdx * 2 + 1] = {
          name: g3DamObj.dam,
          color: g4DD?.color || 'Color Oficial en DB',
          regNumber: g3DamObj.damReg || g4DD?.regNumber || '',
          isExistingInDb: !!g4DD,
        };
        count++;
      }
    }

    return count;
  };

  // When an ancestor is selected from the database in Gen 1 (Sire or Dam),
  // pull their name, color, regNumber, and CASCADE to their parents/grandparents if available in DB!
  const handleSelectGen1 = (target: 'sire' | 'dam', item: AncestorSuggestion) => {
    const updated: HomologationPedigreeData = { ...value };
    
    // Set direct parent
    updated[target] = {
      name: item.name,
      color: item.color || updated[target].color || 'Color Oficial en DB',
      regNumber: item.regNumber || updated[target].regNumber,
      isExistingInDb: true,
    };

    // Attempt cascade lookup if the dog exists with sire/dam in registry
    const fullDog = findDogByQuery(item.regNumber) || findDogByQuery(item.name);
    let cascadedCount = 0;

    if (fullDog) {
      if (target === 'sire') {
        if (fullDog.sire) {
          const ssDog = findDogByQuery(fullDog.sireReg || fullDog.sire);
          updated.sireSire = {
            name: fullDog.sire,
            color: ssDog?.color || 'Color Oficial en DB',
            regNumber: fullDog.sireReg || ssDog?.regNumber || '',
            isExistingInDb: !!ssDog,
          };
          cascadedCount++;
          cascadedCount += cascadeG3AndG4(ssDog, 0, 1, updated);
        }
        if (fullDog.dam) {
          const sdDog = findDogByQuery(fullDog.damReg || fullDog.dam);
          updated.sireDam = {
            name: fullDog.dam,
            color: sdDog?.color || 'Color Oficial en DB',
            regNumber: fullDog.damReg || sdDog?.regNumber || '',
            isExistingInDb: !!sdDog,
          };
          cascadedCount++;
          cascadedCount += cascadeG3AndG4(sdDog, 2, 3, updated);
        }
      } else {
        if (fullDog.sire) {
          const dsDog = findDogByQuery(fullDog.sireReg || fullDog.sire);
          updated.damSire = {
            name: fullDog.sire,
            color: dsDog?.color || 'Color Oficial en DB',
            regNumber: fullDog.sireReg || dsDog?.regNumber || '',
            isExistingInDb: !!dsDog,
          };
          cascadedCount++;
          cascadedCount += cascadeG3AndG4(dsDog, 4, 5, updated);
        }
        if (fullDog.dam) {
          const ddDog = findDogByQuery(fullDog.damReg || fullDog.dam);
          updated.damDam = {
            name: fullDog.dam,
            color: ddDog?.color || 'Color Oficial en DB',
            regNumber: fullDog.damReg || ddDog?.regNumber || '',
            isExistingInDb: !!ddDog,
          };
          cascadedCount++;
          cascadedCount += cascadeG3AndG4(ddDog, 6, 7, updated);
        }
      }
    }

    onChange(updated);
    if (cascadedCount > 0) {
      notify(`✓ Se jalaron ${item.name} (${item.color || 'color en DB'}) y ${cascadedCount} ancestros en cascada hasta las 4 generaciones.`);
    } else {
      notify(`✓ Se jaló ${item.name} con su color y registro desde la base de datos.`);
    }
  };

  // Generic updater for any node
  const updateNode = (path: string, patch: Partial<AncestorEntry>) => {
    const updated = JSON.parse(JSON.stringify(value)) as HomologationPedigreeData;
    
    if (path.startsWith('g3.')) {
      const idx = parseInt(path.split('.')[1], 10);
      updated.g3[idx] = { ...updated.g3[idx], ...patch };
    } else if (path.startsWith('g4.')) {
      const idx = parseInt(path.split('.')[1], 10);
      updated.g4[idx] = { ...updated.g4[idx], ...patch };
    } else {
      (updated as any)[path] = { ...(updated as any)[path], ...patch };
    }

    onChange(updated);
  };

  // When an ancestor is selected from autocomplete for Gen 2, 3 or 4
  const handleSelectAnyAncestor = (path: string, item: AncestorSuggestion) => {
    updateNode(path, {
      name: item.name,
      color: item.color || 'Color Oficial en DB',
      regNumber: item.regNumber,
      isExistingInDb: true,
    });
    notify(`✓ Se jaló información de ${item.name} (${item.color || 'color registrado'}).`);
  };

  // Calculate total completed ancestors
  const countCompleted = (): number => {
    let count = 0;
    if (value.sire.name) count++;
    if (value.dam.name) count++;
    if (value.sireSire.name) count++;
    if (value.sireDam.name) count++;
    if (value.damSire.name) count++;
    if (value.damDam.name) count++;
    value.g3.forEach((a) => { if (a.name) count++; });
    value.g4.forEach((a) => { if (a.name) count++; });
    return count;
  };

  const totalFilled = countCompleted();

  return (
    <div className={`space-y-4 rounded-3xl bg-[#0B0A08] border-2 border-[#D4AF37]/50 p-4 sm:p-6 shadow-2xl text-white ${className}`}>
      {/* Top Banner explaining Database Autocomplete vs. Manual Foreign Clubs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-[#FFE885]" />
            <h4 className="text-base sm:text-lg font-bold text-white font-serif-luxury">
              Linaje & Árbol Genealógico de Homologación (4 Generaciones)
            </h4>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
            Escribe el <strong>Nombre y Color</strong> de cada ejemplar. Si el ancestro ya existe en nuestra base de datos, <strong>se jalará toda su información automáticamente</strong>. Si viene de otro club internacional (UKC, ABKC, FCI), puedes capturar su nombre y color manualmente.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-xl bg-black border border-[#D4AF37] text-[#FFE885]">
            {totalFilled} / 30 Ancestros
          </span>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Generation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/80 border border-neutral-800">
        <button
          type="button"
          onClick={() => setActiveGenTab(1)}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeGenTab === 1
              ? 'bg-gold-gradient text-black font-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-mono">1</span>
          <span>Padres (2)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGenTab(2)}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeGenTab === 2
              ? 'bg-gold-gradient text-black font-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-mono">2</span>
          <span>Abuelos (4)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGenTab(3)}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeGenTab === 3
              ? 'bg-gold-gradient text-black font-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-mono">3</span>
          <span>Bisabuelos (8)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGenTab(4)}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeGenTab === 4
              ? 'bg-gold-gradient text-black font-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center text-[10px] font-mono">4</span>
          <span>Tatarabuelos (16)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PADRES (GEN 1)                                                     */}
      {/* ========================================================================= */}
      {activeGenTab === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PADRE (SIRE) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0B1220] to-[#060A12] border border-blue-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-blue-900/40">
                <span className="text-xs font-mono font-black text-blue-400 uppercase flex items-center gap-1.5">
                  <span>♂ PADRE (SIRE) • GEN 1</span>
                </span>
                {value.sire.isExistingInDb ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
                    ✓ Jalado de Base de Datos
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-400">
                    Registro Manual / Club Externo
                  </span>
                )}
              </div>

              <div>
                <AncestorAutocompleteInput
                  label="Nombre del Padre *"
                  value={value.sire.name}
                  onChange={(val) => updateNode('sire', { name: val, isExistingInDb: false })}
                  onSelectAncestor={(anc) => handleSelectGen1('sire', anc)}
                  genderFilter="MACHO"
                  placeholder="Escribe el nombre o busca en DB..."
                  helperText="Si ya existe en la base de datos, seleccionalo para jalar color y linaje."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    <span>Color del Padre *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={value.sire.color}
                    onChange={(e) => updateNode('sire', { color: e.target.value })}
                    placeholder="Ej: Champagne Tri, Blue, Lilac"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                    N° Registro del Padre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={value.sire.regNumber || ''}
                    onChange={(e) => updateNode('sire', { regNumber: e.target.value })}
                    placeholder="Ej: UKC-88219 o INBR-..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* MADRE (DAM) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#200B14] to-[#12060B] border border-rose-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
                <span className="text-xs font-mono font-black text-rose-400 uppercase flex items-center gap-1.5">
                  <span>♀ MADRE (DAM) • GEN 1</span>
                </span>
                {value.dam.isExistingInDb ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
                    ✓ Jalado de Base de Datos
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-400">
                    Registro Manual / Club Externo
                  </span>
                )}
              </div>

              <div>
                <AncestorAutocompleteInput
                  label="Nombre de la Madre *"
                  value={value.dam.name}
                  onChange={(val) => updateNode('dam', { name: val, isExistingInDb: false })}
                  onSelectAncestor={(anc) => handleSelectGen1('dam', anc)}
                  genderFilter="HEMBRA"
                  placeholder="Escribe el nombre o busca en DB..."
                  helperText="Si ya existe en la base de datos, seleccionalo para jalar color y linaje."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-rose-400" />
                    <span>Color de la Madre *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={value.dam.color}
                    onChange={(e) => updateNode('dam', { color: e.target.value })}
                    placeholder="Ej: Chocolate Tri, Fawn, White"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                    N° Registro de la Madre (Opcional)
                  </label>
                  <input
                    type="text"
                    value={value.dam.regNumber || ''}
                    onChange={(e) => updateNode('dam', { regNumber: e.target.value })}
                    placeholder="Ej: ABKC-19283 o INBR-..."
                    className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ABUELOS (GEN 2 - 4 EJEMPLARES)                                     */}
      {/* ========================================================================= */}
      {activeGenTab === 2 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Abuelo Paterno */}
            <AncestorCardItem
              title="Abuelo Paterno (Sire's Sire)"
              gender="MACHO"
              entry={value.sireSire}
              path="sireSire"
              updateNode={updateNode}
              handleSelect={handleSelectAnyAncestor}
            />

            {/* Abuela Paterna */}
            <AncestorCardItem
              title="Abuela Paterna (Sire's Dam)"
              gender="HEMBRA"
              entry={value.sireDam}
              path="sireDam"
              updateNode={updateNode}
              handleSelect={handleSelectAnyAncestor}
            />

            {/* Abuelo Materno */}
            <AncestorCardItem
              title="Abuelo Materno (Dam's Sire)"
              gender="MACHO"
              entry={value.damSire}
              path="damSire"
              updateNode={updateNode}
              handleSelect={handleSelectAnyAncestor}
            />

            {/* Abuela Materna */}
            <AncestorCardItem
              title="Abuela Materna (Dam's Dam)"
              gender="HEMBRA"
              entry={value.damDam}
              path="damDam"
              updateNode={updateNode}
              handleSelect={handleSelectAnyAncestor}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BISABUELOS (GEN 3 - 8 EJEMPLARES)                                  */}
      {/* ========================================================================= */}
      {activeGenTab === 3 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Bisabuelo Pat. 1 (Sire Sire Sire)', gender: 'MACHO' as const },
              { label: 'Bisabuela Pat. 2 (Sire Sire Dam)', gender: 'HEMBRA' as const },
              { label: 'Bisabuelo Pat. 3 (Sire Dam Sire)', gender: 'MACHO' as const },
              { label: 'Bisabuela Pat. 4 (Sire Dam Dam)', gender: 'HEMBRA' as const },
              { label: 'Bisabuelo Mat. 1 (Dam Sire Sire)', gender: 'MACHO' as const },
              { label: 'Bisabuela Mat. 2 (Dam Sire Dam)', gender: 'HEMBRA' as const },
              { label: 'Bisabuelo Mat. 3 (Dam Dam Sire)', gender: 'MACHO' as const },
              { label: 'Bisabuela Mat. 4 (Dam Dam Dam)', gender: 'HEMBRA' as const },
            ].map((meta, idx) => (
              <AncestorCardItem
                key={idx}
                title={meta.label}
                gender={meta.gender}
                entry={value.g3[idx] || { name: '', color: '', regNumber: '' }}
                path={`g3.${idx}`}
                updateNode={updateNode}
                handleSelect={handleSelectAnyAncestor}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TATARABUELOS (GEN 4 - 16 EJEMPLARES)                               */}
      {/* ========================================================================= */}
      {activeGenTab === 4 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-3 rounded-xl bg-black/60 border border-neutral-800 text-xs text-neutral-300">
            <span>Ingresa el Nombre y Color de los 16 ancestros fundadores de 4ª Generación (UKC, ABKC, FCI o INBR). Si están en el sistema, se jalarán automáticamente.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 16 }).map((_, idx) => {
              const isSireLine = idx < 8;
              const isMale = idx % 2 === 0;
              const label = `${isSireLine ? 'Pat.' : 'Mat.'} ${isMale ? '♂ Tatarabuelo' : '♀ Tatarabuela'} #${idx + 1}`;
              return (
                <AncestorCardItem
                  key={idx}
                  title={label}
                  gender={isMale ? 'MACHO' : 'HEMBRA'}
                  entry={value.g4[idx] || { name: '', color: '', regNumber: '' }}
                  path={`g4.${idx}`}
                  updateNode={updateNode}
                  handleSelect={handleSelectAnyAncestor}
                  compact
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Color Chips Helper */}
      <div className="pt-2 border-t border-neutral-800">
        <span className="text-[10px] font-mono text-neutral-400 block mb-1">
          Colores frecuentes para rellenar rápido:
        </span>
        <div className="flex flex-wrap gap-1">
          {COMMON_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => {
                // If in Gen 1, offer to apply to sire or dam if empty
                if (activeGenTab === 1) {
                  if (!value.sire.color) updateNode('sire', { color: col });
                  else if (!value.dam.color) updateNode('dam', { color: col });
                }
              }}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-[#FFE885] hover:border-[#D4AF37] transition-all"
            >
              {col}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AncestorCardItemProps {
  title: string;
  gender: 'MACHO' | 'HEMBRA';
  entry: AncestorEntry;
  path: string;
  updateNode: (path: string, patch: Partial<AncestorEntry>) => void;
  handleSelect: (path: string, item: AncestorSuggestion) => void;
  compact?: boolean;
}

const AncestorCardItem: React.FC<AncestorCardItemProps> = ({
  title,
  gender,
  entry,
  path,
  updateNode,
  handleSelect,
  compact = false,
}) => {
  const isMale = gender === 'MACHO';
  const borderCol = isMale ? 'border-blue-500/30' : 'border-rose-500/30';
  const bgGrad = isMale ? 'bg-gradient-to-br from-[#0D1524] to-[#080B12]' : 'bg-gradient-to-br from-[#210D15] to-[#12070C]';
  const textColor = isMale ? 'text-blue-400' : 'text-rose-400';

  return (
    <div className={`p-3 rounded-2xl border ${borderCol} ${bgGrad} space-y-2`}>
      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-white/5">
        <span className={`font-mono font-bold ${textColor} truncate`}>
          {isMale ? '♂' : '♀'} {title}
        </span>
        {entry.isExistingInDb && (
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300">
            ✓ DB
          </span>
        )}
      </div>

      <div>
        <AncestorAutocompleteInput
          label={compact ? undefined : 'Nombre'}
          value={entry.name}
          onChange={(val) => updateNode(path, { name: val, isExistingInDb: false })}
          onSelectAncestor={(anc) => handleSelect(path, anc)}
          genderFilter={gender}
          placeholder={`Nombre (${isMale ? 'Macho' : 'Hembra'})...`}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <input
            type="text"
            value={entry.color}
            onChange={(e) => updateNode(path, { color: e.target.value })}
            placeholder="Color..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div>
          <input
            type="text"
            value={entry.regNumber || ''}
            onChange={(e) => updateNode(path, { regNumber: e.target.value })}
            placeholder="Registro..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>
    </div>
  );
};
