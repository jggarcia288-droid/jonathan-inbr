import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SAMPLE_DOGS, BREEDERS_DIRECTORY, DogRecord } from '../data/registryData';
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
  resetToDefaults: () => void;
  findDogByQuery: (query: string) => DogRecord | undefined;
  searchDogOnlineAndOffline: (query: string) => Promise<DogRecord | undefined>;
  crossReferenceDog: (dog: DogRecord) => DogRecord;
  totalCustomRecords: number;
  refreshFromSupabase: () => Promise<void>;
}

export const RegistryContext = createContext<RegistryContextType | undefined>(undefined);

const LOCAL_STORAGE_DOGS_KEY = 'inbr_custom_dogs_v2';
const LOCAL_STORAGE_BREEDERS_KEY = 'inbr_custom_breeders_v2';

import { 
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

  const looksLikeRegFolio = (val: string) => /^[A-Z]{1,4}[-_\s]?\d{3,}/i.test(val.replace(/\*/g, '').trim());
  const cleanSireReg = sireName !== 'SIN REGISTRO' && looksLikeRegFolio(sireName)
    ? sireName.replace(/\*/g, '').trim().toUpperCase()
    : '—';
  const cleanDamReg = damName !== 'SIN REGISTRO' && looksLikeRegFolio(damName)
    ? damName.replace(/\*/g, '').trim().toUpperCase()
    : '—';

  const cleanChip = hasRealMicrochip(p.chip)
    ? p.chip!.trim()
    : `INBR-CHIP-${regTrimmed || '0000'}`;

  return {
    regNumber: regTrimmed,
    microchip: cleanChip,
    name: resolvedName,
    breed: p.raza || 'American Bully',
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
  const [supabaseTotalCount, setSupabaseTotalCount] = useState<number>(2528);
  
  const [dogs, setDogs] = useState<DogRecord[]>(() => {
    const map = new Map<string, DogRecord>();
    const upsertIntoMap = (d: DogRecord) => {
      if (!d || !d.regNumber) return;
      const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
      const existing = map.get(key);
      map.set(key, existing ? mergeDogRecords(existing, d) : d);
    };

    SAMPLE_DOGS.forEach(upsertIntoMap);

    if (typeof window !== 'undefined') {
      try {
        ['inbr_custom_dogs_v2', 'inbr_custom_dogs', 'inbr_excel_dogs', 'inbr_dogs'].forEach((k) => {
          const saved = localStorage.getItem(k);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach(upsertIntoMap);
              }
            } catch {}
          }
        });
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

  // Fetch all real dogs from Supabase database with deterministic pagination (all 2,528+ records)
  const refreshFromSupabase = useCallback(async () => {
    setIsLoadingSupabase(true);
    try {
      let allFetchedDogs: SupabasePerro[] = [];
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

      if (allFetchedDogs.length > 0) {
        const mappedRecords = allFetchedDogs.map(mapSupabaseToDogRecord);

        setDogs(() => {
          const map = new Map<string, DogRecord>();
          const upsertIntoMap = (d: DogRecord) => {
            if (!d || !d.regNumber) return;
            const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
            const existing = map.get(key);
            map.set(key, existing ? mergeDogRecords(existing, d) : d);
          };

          SAMPLE_DOGS.forEach(upsertIntoMap);
          mappedRecords.forEach(upsertIntoMap);

          const merged = Array.from(map.values());
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(merged));
            } catch {}
          }
          return merged;
        });
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

  // Persist local changes
  useEffect(() => {
    if (typeof window !== 'undefined' && dogs.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(dogs));
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
      setSupabaseTotalCount((prev) => prev + supabaseSaved);
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

    setDogs((prev) =>
      prev.map((d) => {
        if (normalizePedigreeAlnum(d.regNumber) === targetAlnum || d.regNumber.trim().toUpperCase() === targetReg) {
          return { ...d, ...patch };
        }
        return d;
      })
    );

    try {
      const dbPatch: Record<string, any> = {};
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

  const resetToDefaults = () => {
    setDogs(SAMPLE_DOGS);
    setBreeders(BREEDERS_DIRECTORY);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_DOGS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_BREEDERS_KEY);
    }
    refreshFromSupabase();
  };

  const crossReferenceDog = (dog: DogRecord): DogRecord => {
    if (!dog) return dog;

    const { findAncestor } = createAncestorLookup(dogs);
    const rootVisited = new Set<string>();
    const rootReg = normalizePedigreeAlnum(dog.regNumber);
    if (rootReg) rootVisited.add(rootReg);

    const sireObj = findAncestor(dog.sireReg, dog, rootVisited) || findAncestor(dog.sire, dog, rootVisited);
    const damObj = findAncestor(dog.damReg, dog, rootVisited) || findAncestor(dog.dam, dog, rootVisited);

    const sireVisited = new Set(rootVisited);
    if (sireObj?.regNumber) sireVisited.add(normalizePedigreeAlnum(sireObj.regNumber));
    const damVisited = new Set(rootVisited);
    if (damObj?.regNumber) damVisited.add(normalizePedigreeAlnum(damObj.regNumber));

    const ssObj = sireObj ? (findAncestor(sireObj.sireReg, sireObj, sireVisited) || findAncestor(sireObj.sire, sireObj, sireVisited)) : undefined;
    const sdObj = sireObj ? (findAncestor(sireObj.damReg, sireObj, sireVisited) || findAncestor(sireObj.dam, sireObj, sireVisited)) : undefined;
    const dsObj = damObj ? (findAncestor(damObj.sireReg, damObj, damVisited) || findAncestor(damObj.sire, damObj, damVisited)) : undefined;
    const ddObj = damObj ? (findAncestor(damObj.damReg, damObj, damVisited) || findAncestor(damObj.dam, damObj, damVisited)) : undefined;

    const existingG = dog.genogram;

    const safeSireReg =
      sireObj?.regNumber ||
      (!isPlaceholderAncestor(dog.sireReg) && normalizePedigreeAlnum(dog.sireReg) !== rootReg ? dog.sireReg! : '') ||
      existingG?.sire?.reg ||
      '—';

    const safeDamReg =
      damObj?.regNumber ||
      (!isPlaceholderAncestor(dog.damReg) && normalizePedigreeAlnum(dog.damReg) !== rootReg ? dog.damReg! : '') ||
      existingG?.dam?.reg ||
      '—';

    const sireName =
      (!isPlaceholderAncestor(dog.sire) ? dog.sire : '') ||
      sireObj?.name ||
      existingG?.sire?.name ||
      'SIN REGISTRO';

    const damName =
      (!isPlaceholderAncestor(dog.dam) ? dog.dam : '') ||
      damObj?.name ||
      existingG?.dam?.name ||
      'SIN REGISTRO';

    const enrichedSire = {
      name: sireName,
      reg: safeSireReg,
      titles: sireObj?.titles || existingG?.sire?.titles || [],
      sire: {
        name: ssObj?.name || (!isPlaceholderAncestor(sireObj?.sire) ? sireObj!.sire! : '') || existingG?.sire?.sire?.name || 'SIN REGISTRO',
        reg: ssObj?.regNumber || (!isPlaceholderAncestor(sireObj?.sireReg) ? sireObj!.sireReg! : '') || existingG?.sire?.sire?.reg || '—',
        titles: ssObj?.titles || existingG?.sire?.sire?.titles || [],
        sire: (!isPlaceholderAncestor(ssObj?.sire) ? ssObj!.sire! : '') || existingG?.sire?.sire?.sire || 'SIN REGISTRO',
        dam: (!isPlaceholderAncestor(ssObj?.dam) ? ssObj!.dam! : '') || existingG?.sire?.sire?.dam || 'SIN REGISTRO',
      },
      dam: {
        name: sdObj?.name || (!isPlaceholderAncestor(sireObj?.dam) ? sireObj!.dam! : '') || existingG?.sire?.dam?.name || 'SIN REGISTRO',
        reg: sdObj?.regNumber || (!isPlaceholderAncestor(sireObj?.damReg) ? sireObj!.damReg! : '') || existingG?.sire?.dam?.reg || '—',
        titles: sdObj?.titles || existingG?.sire?.dam?.titles || [],
        sire: (!isPlaceholderAncestor(sdObj?.sire) ? sdObj!.sire! : '') || existingG?.sire?.dam?.sire || 'SIN REGISTRO',
        dam: (!isPlaceholderAncestor(sdObj?.dam) ? sdObj!.dam! : '') || existingG?.sire?.dam?.dam || 'SIN REGISTRO',
      },
    };

    const enrichedDam = {
      name: damName,
      reg: safeDamReg,
      titles: damObj?.titles || existingG?.dam?.titles || [],
      sire: {
        name: dsObj?.name || (!isPlaceholderAncestor(damObj?.sire) ? damObj!.sire! : '') || existingG?.dam?.sire?.name || 'SIN REGISTRO',
        reg: dsObj?.regNumber || (!isPlaceholderAncestor(damObj?.sireReg) ? damObj!.sireReg! : '') || existingG?.dam?.sire?.reg || '—',
        titles: dsObj?.titles || existingG?.dam?.sire?.titles || [],
        sire: (!isPlaceholderAncestor(dsObj?.sire) ? dsObj!.sire! : '') || existingG?.dam?.sire?.sire || 'SIN REGISTRO',
        dam: (!isPlaceholderAncestor(dsObj?.dam) ? dsObj!.dam! : '') || existingG?.dam?.sire?.dam || 'SIN REGISTRO',
      },
      dam: {
        name: ddObj?.name || (!isPlaceholderAncestor(damObj?.dam) ? damObj!.dam! : '') || existingG?.dam?.dam?.name || 'SIN REGISTRO',
        reg: ddObj?.regNumber || (!isPlaceholderAncestor(damObj?.damReg) ? damObj!.damReg! : '') || existingG?.dam?.dam?.reg || '—',
        titles: ddObj?.titles || existingG?.dam?.dam?.titles || [],
        sire: (!isPlaceholderAncestor(ddObj?.sire) ? ddObj!.sire! : '') || existingG?.dam?.dam?.sire || 'SIN REGISTRO',
        dam: (!isPlaceholderAncestor(ddObj?.dam) ? ddObj!.dam! : '') || existingG?.dam?.dam?.dam || 'SIN REGISTRO',
      },
    };

    return {
      ...dog,
      sire: sireName,
      sireReg: safeSireReg,
      dam: damName,
      damReg: safeDamReg,
      genogram: {
        sire: enrichedSire,
        dam: enrichedDam,
      },
    };
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

  const searchDogOnlineAndOffline = async (query: string): Promise<DogRecord | undefined> => {
    // 1. Try immediate synchronous local search
    const local = findDogByQuery(query);
    if (local) return local;

    // 2. Query Supabase directly in real-time
    try {
      const livePerro = await libSearchDog(query);
      if (livePerro) {
        const mapped = mapSupabaseToDogRecord(livePerro);
        setDogs((prev) => {
          const map = new Map<string, DogRecord>();
          const upsertIntoMap = (d: DogRecord) => {
            const key = normalizePedigreeAlnum(d.regNumber) || d.regNumber.toUpperCase().trim();
            const existing = map.get(key);
            map.set(key, existing ? mergeDogRecords(existing, d) : d);
          };
          prev.forEach(upsertIntoMap);
          upsertIntoMap(mapped);
          const updated = Array.from(map.values());
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_STORAGE_DOGS_KEY, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
        setSupabaseConnected(true);
        return crossReferenceDog(mapped);
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
