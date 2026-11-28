import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BREEDERS_DIRECTORY, DogRecord } from '../data/registryData';
import { supabase, SupabasePerro, searchDogInSupabase as libSearchDog } from '../lib/supabase';
import { getBreedImageByIdOrName } from '../utils/breedImages';

export { supabase };

export interface RegistryContextType {
  dogs: DogRecord[];
  breeders: typeof BREEDERS_DIRECTORY;
  isLoadingSupabase: boolean;
  supabaseConnected: boolean;
  supabaseTotalCount: number;
  addDogsFromExcel: (newDogs: DogRecord[]) => Promise<{ count: number; supabaseSaved: number }>;
  addBreedersFromExcel: (newBreeders: any[]) => { count: number };
  updateDogRecord: (regNumber: string, patch: Partial<DogRecord>) => Promise<{ success: boolean; error?: string }>;
  deleteDogRecord: (regNumber: string) => Promise<{ success: boolean; error?: string }>;
  clearAllDogs: () => Promise<{ success: boolean; error?: string }>;
  resetToDefaults: () => void;
  findDogByQuery: (query: string) => DogRecord | undefined;
  searchDogOnlineAndOffline: (query: string) => Promise<DogRecord | undefined>;
  crossReferenceDog: (dog: DogRecord) => DogRecord;
  totalCustomRecords: number;
  refreshFromSupabase: () => Promise<void>;
}

export const RegistryContext = createContext<RegistryContextType | undefined>(undefined);

const LOCAL_STORAGE_DOGS_KEY = 'inbr_registry_cache_v3';
const LEGACY_STORAGE_DOGS_KEYS = ['inbr_custom_dogs_v2', 'inbr_custom_dogs', 'inbr_excel_dogs', 'inbr_dogs'];
const LOCAL_STORAGE_BREEDERS_KEY = 'inbr_custom_breeders_v2';

import { 
  buildEightGenPedigree,
  createAncestorLookup, 
  isPlaceholderAncestor, 
  normalizePedigreeAlnum, 
  normalizePedigreeText,
  isCamadaPuppyRecord 
} from '../utils/pedigreeResolver';

function hasRealMicrochip(chip?: string | null): boolean {
  if (!chip) return false;
  const c = chip.trim().toUpperCase();
  if (!c || c === 'XXX' || c === 'N/A' || c === 'NO' || c === 'NONE' || c === 'SIN CHIP' || c.startsWith('INBR-CHIP-')) {
    return false;
  }
  return c.replace(/\D/g, '').length >= 6;
}

function mergeDogRecords(a: DogRecord, b: DogRecord): DogRecord {
  const score = (d: DogRecord) => {
    let s = 0;
    if (hasRealMicrochip(d.microchip)) s += 10;
    if (!isPlaceholderAncestor(d.sire)) s += 4;
    if (!isPlaceholderAncestor(d.dam)) s += 4;
    if (d.owner && d.owner !== 'Criadero Oficial INBR') s += 2;
    if (d.genogram?.sire?.name || d.genogram?.dam?.name) s += 5;
    if (d.regNumber && !d.regNumber.includes('*')) s += 1;
    return s;
  };
  const [primary, secondary] = score(b) > score(a) ? [b, a] : [a, b];
  return {
    ...primary,
    microchip: hasRealMicrochip(primary.microchip) ? primary.microchip : secondary.microchip,
    sire: !isPlaceholderAncestor(primary.sire) ? primary.sire : secondary.sire,
    sireReg: !isPlaceholderAncestor(primary.sireReg) ? primary.sireReg : secondary.sireReg,
    dam: !isPlaceholderAncestor(primary.dam) ? primary.dam : secondary.dam,
    damReg: !isPlaceholderAncestor(primary.damReg) ? primary.damReg : secondary.damReg,
    owner: primary.owner && primary.owner !== 'Criadero Oficial INBR' ? primary.owner : secondary.owner,
    breeder: primary.breeder && primary.breeder !== 'Criadero Oficial INBR' ? primary.breeder : secondary.breeder,
    color: primary.color && primary.color !== 'Estándar Oficial' ? primary.color : secondary.color,
    genogram: primary.genogram || secondary.genogram,
  };
}

// Helper to convert a Supabase 'perros' row into the application's DogRecord format
export function mapSupabaseToDogRecord(p: SupabasePerro): DogRecord {
  const isFemale = p.sexo?.toUpperCase().includes('HEMBRA') || p.sexo?.toUpperCase() === 'F';
  const photo = Array.isArray(p.fotos) && p.fotos.length > 0 && p.fotos[0]
    ? p.fotos[0] 
    : getBreedImageByIdOrName(p.raza || '');

  const rawSire = (p.id_padre || '').replace(/\s+/g, ' ').trim();
  const rawDam = (p.id_madre || '').replace(/\s+/g, ' ').trim();
  const sireName = !isPlaceholderAncestor(rawSire) ? rawSire : 'SIN REGISTRO';
  const damName = !isPlaceholderAncestor(rawDam) ? rawDam : 'SIN REGISTRO';

  const regTrimmed = (p.numero_registro || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  const isCamada = /^CA\d/i.test(regTrimmed) || 
                  (p.tipo_registro && p.tipo_registro.toUpperCase().includes('CAMADA'));

  // Relational distinction: Resolving conflict where puppy was erroneously named after sire
  let resolvedName = (p.nombre || 'EJEMPLAR INBR').replace(/\s+/g, ' ').trim();
  if (
    isCamada &&
    (resolvedName.toUpperCase() === sireName.toUpperCase() ||
     resolvedName.toUpperCase() === damName.toUpperCase() ||
     !resolvedName ||
     resolvedName.toUpperCase() === 'EJEMPLAR INBR')
  ) {
    resolvedName = `CACHORRO ${regTrimmed}`;
  } else if (
    isCamada &&
    resolvedName.toUpperCase() === sireName.toUpperCase() &&
    sireName !== 'SIN REGISTRO'
  ) {
    resolvedName = `CACHORRO ${regTrimmed}`;
  }

  // Owner distinction: The owner is NEVER the father or mother dog
  let resolvedOwner = (p.propietario_nombre || '').replace(/\s+/g, ' ').trim();
  if (
    !resolvedOwner ||
    resolvedOwner.toUpperCase() === 'XXX' ||
    resolvedOwner.toUpperCase() === sireName.toUpperCase() ||
    resolvedOwner.toUpperCase() === damName.toUpperCase() ||
    resolvedOwner.toUpperCase() === 'CRIADOR AFILIADO INBR'
  ) {
    resolvedOwner = 'Criadero Oficial INBR';
  }

  const extractParentReg = (val: string): string => {
    if (!val || val === 'SIN REGISTRO') return '—';
    const cleaned = val.replace(/\*/g, '').trim().toUpperCase();
    if (/^(?:INBR[-_\s]?)?(?:REG[-_A-Z0-9]+|[A-Z]{1,4}[-_\s]?\d{3,})$/i.test(cleaned)) {
      return cleaned;
    }
    const parenMatch = cleaned.match(/\(([A-Z]{1,4}[-_\s]?\d{3,}|REG[-_A-Z0-9]+)\)/i);
    if (parenMatch) {
      return parenMatch[1].replace(/\s+/g, '').toUpperCase();
    }
    return '—';
  };
  const cleanSireReg = extractParentReg(sireName);
  const cleanDamReg = extractParentReg(damName);

  const cleanChip = hasRealMicrochip(p.chip)
    ? p.chip!.trim()
    : p.chip && p.chip.trim().toUpperCase() !== 'XXX'
      ? p.chip.trim()
      : 'SIN MICROCHIP';

  return {
    regNumber: regTrimmed,
    microchip: cleanChip,
    name: resolvedName,
    breed: (p.raza || '').trim() || 'SIN ESPECIFICAR',
    variety: isCamada ? 'Camada Registrada' : 'Standard',
    gender: isFemale ? 'Hembra' : 'Macho',
    dob: p.fecha_nac || (isCamada ? '2024-01-01' : '2023-01-01'),
    color: p.color && p.color.toUpperCase() !== 'XXX' ? p.color : 'Estándar Oficial',
    owner: resolvedOwner,
    breeder: resolvedOwner || 'Criadero Registrado INBR',
    country: 'México',
    sire: sireName,
    sireReg: cleanSireReg,
    dam: damName,
    damReg: cleanDamReg,
    points: 250,
    titles: isCamada ? ['REGISTRO DE CAMADA'] : ['REGISTRO NOTARIADO'],
    imageUrl: photo,
    status: (p.estado === 'APROBADO' ? 'ACTIVE_VALIDATED' : 'ACTIVE_VALIDATED') as any,
  };
}

/**
 * RegistryProvider manages state and keeps it in sync with Supabase
 */
export const RegistryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingSupabase, setIsLoadingSupabase] = useState<boolean>(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(true);
  const [supabaseTotalCount, setSupabaseTotalCount] = useState<number>(0);

  const [dogs, setDogs] = useState<DogRecord[]>(() => {
    const map = new Map<string, DogRecord>();
    const upsertIntoMap = (d: DogRecord) => {
      if (!d || !d.regNumber) return;
      const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
      const existing = map.get(key);
      map.set(key, existing ? mergeDogRecords(existing, d) : d);
    };

    if (typeof window !== 'undefined') {
      try {
        LEGACY_STORAGE_DOGS_KEYS.forEach((legacyKey) => {
          localStorage.removeItem(legacyKey);
        });
        const saved = localStorage.getItem(LOCAL_STORAGE_DOGS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach(upsertIntoMap);
          }
        }
      } catch (e) {
        console.warn('Error reading dogs from localStorage', e);
      }
    }
    return Array.from(map.values());
  });

  const [breeders, setBreeders] = useState<typeof BREEDERS_DIRECTORY>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_BREEDERS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading breeders from localStorage', e);
      }
    }
    return BREEDERS_DIRECTORY;
  });

  // Fetch all real dogs exclusively from Supabase 'perros' table
  const refreshFromSupabase = useCallback(async () => {
    setIsLoadingSupabase(true);
    try {
      let allFetchedDogs: SupabasePerro[] = [];
      let hadFetchError = false;
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('perros')
          .select('*')
          .order('created_at', { ascending: false })
          .order('numero_registro', { ascending: true })
          .range(from, to);

        if (error) {
          console.warn('Error fetching perros chunk from Supabase:', error);
          hadFetchError = true;
          break;
        }

        if (!data || data.length === 0) {
          break;
        }

        allFetchedDogs = allFetchedDogs.concat(data as SupabasePerro[]);

        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      }

      if (!hadFetchError) {
        const mappedRecords = allFetchedDogs.map(mapSupabaseToDogRecord);
        const map = new Map<string, DogRecord>();
        const upsertIntoMap = (d: DogRecord) => {
          if (!d || !d.regNumber) return;
          const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
          const existing = map.get(key);
          map.set(key, existing ? mergeDogRecords(existing, d) : d);
        };

        mappedRecords.forEach(upsertIntoMap);
        const merged = Array.from(map.values());

        setDogs(merged);
        if (typeof window !== 'undefined') {
          try {
            if (merged.length > 0) {
              localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(merged));
            } else {
              localStorage.removeItem(LOCAL_STORAGE_DOGS_KEY);
            }
          } catch {}
        }
        setSupabaseConnected(true);
        setSupabaseTotalCount(allFetchedDogs.length);
      }
    } catch (err) {
      console.warn('Error refreshing from Supabase:', err);
    } finally {
      setIsLoadingSupabase(false);
    }
  }, []);

  useEffect(() => {
    refreshFromSupabase();

    const registryChannel = supabase
      .channel('public_perros_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'perros' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldReg = (payload.old as any)?.numero_registro;
            if (oldReg) {
              const oldAlnum = normalizePedigreeAlnum(oldReg);
              setDogs((prevDogs) =>
                prevDogs.filter((d) => normalizePedigreeAlnum(d.regNumber) !== oldAlnum)
              );
            } else {
              refreshFromSupabase();
            }
            return;
          }
          if (payload.new) {
            const mapped = mapSupabaseToDogRecord(payload.new as SupabasePerro);
            setDogs((prevDogs) => {
              const map = new Map<string, DogRecord>();
              const upsertIntoMap = (d: DogRecord) => {
                const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
                const existing = map.get(key);
                map.set(key, existing ? mergeDogRecords(existing, d) : d);
              };
              prevDogs.forEach(upsertIntoMap);
              upsertIntoMap(mapped);
              return Array.from(map.values());
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(registryChannel);
    };
  }, [refreshFromSupabase]);

  // Persist local cache or clear when empty
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (dogs.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(dogs));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_DOGS_KEY);
        }
      } catch (e) {}
    }
  }, [dogs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_BREEDERS_KEY, JSON.stringify(breeders));
      } catch (e) {}
    }
  }, [breeders]);

  const addDogsFromExcel = async (newDogs: DogRecord[]) => {
    const map = new Map<string, DogRecord>();
    dogs.forEach((d) => map.set(normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim(), d));
    
    let addedCount = 0;
    newDogs.forEach((d) => {
      if (d.regNumber) {
        const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
        map.set(key, d);
        addedCount++;
      }
    });

    const merged = Array.from(map.values());
    setDogs(merged);

    // Clean up temporary INBR-EXCEL-* ghost records when a real folio with matching microchip is uploaded
    const realChipFolioPairs = newDogs
      .filter(
        (d) =>
          d.regNumber &&
          !d.regNumber.toUpperCase().startsWith('INBR-EXCEL-') &&
          hasRealMicrochip(d.microchip)
      )
      .map((d) => ({
        chip: d.microchip.trim(),
        newReg: d.regNumber.replace(/\*/g, '').trim().toUpperCase(),
      }));

    if (realChipFolioPairs.length > 0) {
      const chipsToCheck = realChipFolioPairs.map((p) => p.chip);
      try {
        const { data: excelDupes } = await supabase
          .from('perros')
          .select('numero_registro, chip')
          .ilike('numero_registro', 'INBR-EXCEL-%')
          .in('chip', chipsToCheck);

        if (excelDupes && excelDupes.length > 0) {
          const regsToDelete = excelDupes.map((r: any) => r.numero_registro).filter(Boolean);
          if (regsToDelete.length > 0) {
            await supabase.from('perros').delete().in('numero_registro', regsToDelete);
            const deleteSet = new Set(regsToDelete.map((r: string) => normalizePedigreeAlnum(r)));
            setDogs((prev) => prev.filter((d) => !deleteSet.has(normalizePedigreeAlnum(d.regNumber))));
          }
        }
      } catch (cleanupErr) {
        console.warn('INBR-EXCEL ghost cleanup warning:', cleanupErr);
      }
    }

    const recordsToInsert = newDogs.map((d) => ({
      numero_registro: d.regNumber.replace(/\*/g, '').trim().toUpperCase(),
      nombre: d.name.trim().toUpperCase(),
      raza: d.breed,
      sexo: d.gender === 'Hembra' ? 'HEMBRA' : 'MACHO',
      color: d.color || '',
      chip: d.microchip ? d.microchip.trim() : null,
      id_padre: d.sire || null,
      id_madre: d.dam || null,
      propietario_nombre: d.owner || null,
      estado: 'APROBADO',
      tipo_registro: 'EXCEL_IMPORT',
    }));

    let supabaseSaved = 0;
    const batchSize = 100;
    try {
      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('perros')
          .upsert(batch, { onConflict: 'numero_registro' });
        if (error) {
          console.warn('Supabase batch upsert warning:', error);
        } else {
          supabaseSaved += batch.length;
        }
      }
      setSupabaseConnected(true);
      await refreshFromSupabase();
    } catch (err) {
      console.warn('Network error saving to Supabase:', err);
    }

    return { count: addedCount, supabaseSaved };
  };

  const addBreedersFromExcel = (newBreeders: any[]) => {
    const merged = [...newBreeders, ...breeders];
    setBreeders(merged);
    return { count: newBreeders.length };
  };

  const updateDogRecord = async (
    regNumber: string,
    patch: Partial<DogRecord>
  ): Promise<{ success: boolean; error?: string }> => {
    const targetReg = regNumber.replace(/\*/g, '').trim().toUpperCase();
    const targetAlnum = normalizePedigreeAlnum(targetReg);
    const nextReg = patch.regNumber
      ? patch.regNumber.replace(/\*/g, '').trim().toUpperCase()
      : targetReg;

    try {
      const dbPatch: Record<string, any> = {};
      if (nextReg && nextReg !== targetReg) dbPatch.numero_registro = nextReg;
      if (patch.name !== undefined) dbPatch.nombre = patch.name.trim().toUpperCase();
      if (patch.breed !== undefined) dbPatch.raza = patch.breed.trim();
      if (patch.gender !== undefined) dbPatch.sexo = patch.gender === 'Hembra' ? 'HEMBRA' : 'MACHO';
      if (patch.color !== undefined) dbPatch.color = patch.color.trim();
      if (patch.microchip !== undefined) dbPatch.chip = patch.microchip.trim() || null;
      if (patch.owner !== undefined) dbPatch.propietario_nombre = patch.owner.trim() || null;
      if (patch.sire !== undefined) dbPatch.id_padre = patch.sire.trim() || null;
      if (patch.dam !== undefined) dbPatch.id_madre = patch.dam.trim() || null;
      if (patch.dob !== undefined) dbPatch.fecha_nac = patch.dob.trim() || null;
      if (patch.imageUrl !== undefined && patch.imageUrl) dbPatch.fotos = [patch.imageUrl];

      const { error } = await supabase
        .from('perros')
        .update(dbPatch)
        .in('numero_registro', [targetReg, `*${targetReg}*`]);

      if (error) {
        return { success: false, error: error.message };
      }

      setDogs((prev) =>
        prev.map((d) => {
          if (normalizePedigreeAlnum(d.regNumber) === targetAlnum || d.regNumber.trim().toUpperCase() === targetReg) {
            return { ...d, ...patch, regNumber: nextReg };
          }
          return d;
        })
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al actualizar en Supabase' };
    }
  };

  const deleteDogRecord = async (
    regNumber: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetReg = regNumber.replace(/\*/g, '').trim().toUpperCase();
    const targetAlnum = normalizePedigreeAlnum(targetReg);

    try {
      const { error } = await supabase
        .from('perros')
        .delete()
        .in('numero_registro', [targetReg, `*${targetReg}*`]);

      if (error) {
        return { success: false, error: error.message };
      }

      setDogs((prev) => prev.filter((d) => normalizePedigreeAlnum(d.regNumber) !== targetAlnum));
      setSupabaseTotalCount((prev) => Math.max(0, prev - 1));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al eliminar en Supabase' };
    }
  };

  const clearAllDogs = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('perros')
        .delete()
        .not('numero_registro', 'is', null);

      if (error) {
        return { success: false, error: error.message };
      }

      setDogs([]);
      setSupabaseTotalCount(0);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_DOGS_KEY);
        LEGACY_STORAGE_DOGS_KEYS.forEach((k) => localStorage.removeItem(k));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al vaciar base de datos' };
    }
  };

  const resetToDefaults = () => {
    setDogs([]);
    setBreeders(BREEDERS_DIRECTORY);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_DOGS_KEY);
      LEGACY_STORAGE_DOGS_KEYS.forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(LOCAL_STORAGE_BREEDERS_KEY);
    }
    refreshFromSupabase();
  };

  const crossReferenceDogWithList = (dog: DogRecord, dogList: DogRecord[]): DogRecord => {
    if (!dog) return dog;
    const ped = buildEightGenPedigree(dog, dogList);
    const existingG = dog.genogram;

    return {
      ...dog,
      sire: ped.sire.name,
      sireReg: ped.sire.regNumber,
      dam: ped.dam.name,
      damReg: ped.dam.regNumber,
      genogram: {
        sire: {
          name: ped.sire.name,
          reg: ped.sire.regNumber,
          titles: ped.sire.titles?.length ? ped.sire.titles : (existingG?.sire?.titles || []),
          sire: {
            name: ped.sireSire.name,
            reg: ped.sireSire.regNumber,
            titles: ped.sireSire.titles?.length ? ped.sireSire.titles : (existingG?.sire?.sire?.titles || []),
            sire: ped.g3[0]?.name || existingG?.sire?.sire?.sire || 'SIN REGISTRO',
            dam: ped.g3[1]?.name || existingG?.sire?.sire?.dam || 'SIN REGISTRO',
          },
          dam: {
            name: ped.sireDam.name,
            reg: ped.sireDam.regNumber,
            titles: ped.sireDam.titles?.length ? ped.sireDam.titles : (existingG?.sire?.dam?.titles || []),
            sire: ped.g3[2]?.name || existingG?.sire?.dam?.sire || 'SIN REGISTRO',
            dam: ped.g3[3]?.name || existingG?.sire?.dam?.dam || 'SIN REGISTRO',
          },
        },
        dam: {
          name: ped.dam.name,
          reg: ped.dam.regNumber,
          titles: ped.dam.titles?.length ? ped.dam.titles : (existingG?.dam?.titles || []),
          sire: {
            name: ped.damSire.name,
            reg: ped.damSire.regNumber,
            titles: ped.damSire.titles?.length ? ped.damSire.titles : (existingG?.dam?.sire?.titles || []),
            sire: ped.g3[4]?.name || existingG?.dam?.sire?.sire || 'SIN REGISTRO',
            dam: ped.g3[5]?.name || existingG?.dam?.sire?.dam || 'SIN REGISTRO',
          },
          dam: {
            name: ped.damDam.name,
            reg: ped.damDam.regNumber,
            titles: ped.damDam.titles?.length ? ped.damDam.titles : (existingG?.dam?.dam?.titles || []),
            sire: ped.g3[6]?.name || existingG?.dam?.dam?.sire || 'SIN REGISTRO',
            dam: ped.g3[7]?.name || existingG?.dam?.dam?.dam || 'SIN REGISTRO',
          },
        },
      },
    };
  };

  const crossReferenceDog = (dog: DogRecord): DogRecord => {
    return crossReferenceDogWithList(dog, dogs);
  };

  const findDogByQuery = (query: string): DogRecord | undefined => {
    const raw = (query || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!raw) return undefined;
    const cleanAlnum = raw.replace(/[^A-Z0-9]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');
    const strippedInbr = raw.replace(/^(INBR|REG|CHIP|ISO)[-_\s:]*/i, '').trim();
    const strippedInbrAlnum = strippedInbr.replace(/[^A-Z0-9]/g, '');

    // 1. Strict exact registration match (supports *PA10000*, INBR- prefix, & hyphen/space normalization)
    const regMatches = dogs.filter((d) => {
      const reg = (d.regNumber || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (!reg) return false;
      const regStripped = reg.replace(/^(INBR|REG)[-_\s:]*/i, '').trim();
      const regAlnum = reg.replace(/[^A-Z0-9]/g, '');
      const regStrippedAlnum = regStripped.replace(/[^A-Z0-9]/g, '');
      return (
        reg === raw ||
        reg === strippedInbr ||
        regStripped === strippedInbr ||
        (cleanAlnum.length >= 4 && regAlnum === cleanAlnum) ||
        (strippedInbrAlnum.length >= 4 && regStrippedAlnum === strippedInbrAlnum)
      );
    });
    if (regMatches.length > 0) {
      const best = regMatches.reduce((acc, cur) => mergeDogRecords(acc, cur));
      return crossReferenceDog(best);
    }

    // 2. Exact microchip match (exact string or exact 8+ digit match)
    const chipMatches = dogs.filter((d) => {
      if (!hasRealMicrochip(d.microchip)) return false;
      const dChipRaw = (d.microchip || '').toUpperCase().trim();
      const dChipDigits = dChipRaw.replace(/\D/g, '');
      if (dChipRaw === raw || dChipRaw === strippedInbr) return true;
      if (digitsOnly.length >= 8 && dChipDigits === digitsOnly) return true;
      return false;
    });
    if (chipMatches.length > 0) {
      const best = chipMatches.reduce((acc, cur) => mergeDogRecords(acc, cur));
      return crossReferenceDog(best);
    }

    // If query looks like a registration folio or numeric microchip, do NOT guess by name
    const looksLikeCodeOrChip =
      /\d/.test(raw) ||
      /^(INBR|REG|CHIP|ISO|CA|F1)/i.test(raw);
    if (looksLikeCodeOrChip) {
      return undefined;
    }

    // 3. Exact Adult Name match
    const exactNameAdult = dogs.find((d) => {
      const name = normalizePedigreeText(d.name);
      return !isCamadaPuppyRecord(d) && (name === raw || name === strippedInbr);
    });
    if (exactNameAdult) return crossReferenceDog(exactNameAdult);

    // 4. Any exact name match
    const exactName = dogs.find((d) => {
      const name = normalizePedigreeText(d.name);
      return name === raw || name === strippedInbr;
    });
    if (exactName) return crossReferenceDog(exactName);

    // 5. Partial match ONLY on dog name for text-only searches >= 4 characters
    if (raw.length >= 4) {
      const nameMatch = dogs.find((d) => {
        const name = normalizePedigreeText(d.name);
        return !isCamadaPuppyRecord(d) && name.includes(raw);
      });
      if (nameMatch) return crossReferenceDog(nameMatch);
    }

    return undefined;
  };

  const hydrateAncestorsOnline = async (rootDog: DogRecord, baseList: DogRecord[]): Promise<DogRecord[]> => {
    const collected = new Map<string, DogRecord>();
    baseList.forEach((d) => {
      if (d?.regNumber) {
        const k = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
        collected.set(k, d);
      }
    });
    const rootKey = normalizePedigreeAlnum(rootDog.regNumber) || rootDog.regNumber.toUpperCase().trim();
    collected.set(rootKey, rootDog);

    const fetchedQueries = new Set<string>();
    let frontier: DogRecord[] = [rootDog];

    for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
      const { findAncestor } = createAncestorLookup(Array.from(collected.values()));
      const missingQueries: string[] = [];

      frontier.forEach((node) => {
        const candidates = [
          { ref: node.sireReg, alt: node.sire, side: 'sire' as const },
          { ref: node.damReg, alt: node.dam, side: 'dam' as const },
        ];
        candidates.forEach(({ ref, alt, side }) => {
          const matched = findAncestor(ref, node, undefined, side) || findAncestor(alt, node, undefined, side);
          if (!matched) {
            const q = (!isPlaceholderAncestor(ref) ? ref : !isPlaceholderAncestor(alt) ? alt : '')?.trim();
            if (q && !fetchedQueries.has(q.toUpperCase())) {
              fetchedQueries.add(q.toUpperCase());
              missingQueries.push(q);
            }
          }
        });
      });

      if (missingQueries.length === 0) break;

      const results = await Promise.all(
        missingQueries.slice(0, 12).map((q) => libSearchDog(q).catch(() => null))
      );

      const newlyAdded: DogRecord[] = [];
      results.forEach((row) => {
        if (!row) return;
        const mapped = mapSupabaseToDogRecord(row);
        const k = normalizePedigreeAlnum(mapped.regNumber) || mapped.regNumber.toUpperCase().trim();
        const existing = collected.get(k);
        const merged = existing ? mergeDogRecords(existing, mapped) : mapped;
        collected.set(k, merged);
        newlyAdded.push(merged);
      });

      // Also advance frontier along any newly hydrated or existing parents
      const nextFrontier: DogRecord[] = [];
      const updatedLookup = createAncestorLookup(Array.from(collected.values()));
      frontier.forEach((node) => {
        const sObj = updatedLookup.findAncestor(node.sireReg, node, undefined, 'sire') || updatedLookup.findAncestor(node.sire, node, undefined, 'sire');
        const dObj = updatedLookup.findAncestor(node.damReg, node, undefined, 'dam') || updatedLookup.findAncestor(node.dam, node, undefined, 'dam');
        if (sObj) nextFrontier.push(sObj);
        if (dObj) nextFrontier.push(dObj);
      });
      if (newlyAdded.length === 0 && nextFrontier.length === 0) break;
      frontier = nextFrontier;
    }

    return Array.from(collected.values());
  };

  const searchDogOnlineAndOffline = async (query: string): Promise<DogRecord | undefined> => {
    // 1. Try immediate synchronous local search
    const local = findDogByQuery(query);
    if (local) {
      if (!isLoadingSupabase) return local;
      // If full Supabase sync is still in flight, hydrate ancestors up to 4G immediately
      const expanded = await hydrateAncestorsOnline(local, dogs);
      if (expanded.length > dogs.length) {
        setDogs(expanded);
      }
      return crossReferenceDogWithList(local, expanded);
    }

    // 2. Query Supabase directly in real-time
    try {
      const livePerro = await libSearchDog(query);
      if (livePerro) {
        const mapped = mapSupabaseToDogRecord(livePerro);
        const expanded = await hydrateAncestorsOnline(mapped, dogs);

        setDogs(() => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(expanded));
            } catch {}
          }
          return expanded;
        });
        setSupabaseConnected(true);
        return crossReferenceDogWithList(mapped, expanded);
      }
    } catch (err) {
      console.warn('Error querying Supabase live:', err);
    }

    return undefined;
  };

  const totalCustomRecords = Math.max(0, dogs.length);

  return (
    <RegistryContext.Provider
      value={{
        dogs,
        breeders,
        isLoadingSupabase,
        supabaseConnected,
        supabaseTotalCount,
        addDogsFromExcel,
        addBreedersFromExcel,
        updateDogRecord,
        deleteDogRecord,
        clearAllDogs,
        resetToDefaults,
        findDogByQuery,
        searchDogOnlineAndOffline,
        crossReferenceDog,
        totalCustomRecords,
        refreshFromSupabase,
      }}
    >
      {children}
    </RegistryContext.Provider>
  );
};

/**
 * Hook to consume the RegistryContext
 */
export const useRegistry = () => {
  const context = useContext(RegistryContext);
  if (!context) {
    throw new Error('useRegistry must be used within a RegistryProvider');
  }
  return context;
};
