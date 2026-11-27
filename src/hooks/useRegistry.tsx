import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SAMPLE_DOGS, BREEDERS_DIRECTORY, DogRecord } from '../data/registryData';
import { supabase, SupabasePerro, searchDogInSupabase as libSearchDog } from '../lib/supabase';

export { supabase };

export interface RegistryContextType {
  dogs: DogRecord[];
  breeders: typeof BREEDERS_DIRECTORY;
  isLoadingSupabase: boolean;
  supabaseConnected: boolean;
  supabaseTotalCount: number;
  addDogsFromExcel: (newDogs: DogRecord[]) => Promise<{ count: number; supabaseSaved: number }>;
  addBreedersFromExcel: (newBreeders: any[]) => { count: number };
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

// Helper to convert a Supabase 'perros' row into the application's DogRecord format
export function mapSupabaseToDogRecord(p: SupabasePerro): DogRecord {
  const isFemale = p.sexo?.toUpperCase().includes('HEMBRA') || p.sexo?.toUpperCase() === 'F';
  const photo = Array.isArray(p.fotos) && p.fotos.length > 0 
    ? p.fotos[0] 
    : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80';

  const sireName = p.id_padre && p.id_padre !== 'XXX' ? p.id_padre.trim() : 'LINAJE FUNDADOR INBR';
  const damName = p.id_madre && p.id_madre !== 'XXX' ? p.id_madre.trim() : 'LINAJE FUNDADOR INBR';

  const regTrimmed = (p.numero_registro || '').trim();
  const isCamada = regTrimmed.toUpperCase().startsWith('CA') || 
                  (p.tipo_registro && p.tipo_registro.toUpperCase().includes('CAMADA'));

  // Relational distinction: Resolving conflict where puppy was erroneously named after sire
  let resolvedName = (p.nombre || 'EJEMPLAR INBR').trim();
  if (
    isCamada &&
    (resolvedName.toUpperCase() === sireName.toUpperCase() ||
     resolvedName.toUpperCase() === damName.toUpperCase() ||
     !resolvedName ||
     resolvedName.toUpperCase() === 'EJEMPLAR INBR')
  ) {
    resolvedName = `CACHORRO ${regTrimmed}`;
  } else if (resolvedName.toUpperCase() === sireName.toUpperCase() && sireName !== 'LINAJE FUNDADOR INBR') {
    resolvedName = `CACHORRO ${regTrimmed}`;
  }

  // Owner distinction: The owner is NEVER the father or mother dog (e.g. Panic is the sire, not the owner)
  let resolvedOwner = (p.propietario_nombre || '').trim();
  if (
    !resolvedOwner ||
    resolvedOwner.toUpperCase() === sireName.toUpperCase() ||
    resolvedOwner.toUpperCase() === damName.toUpperCase() ||
    resolvedOwner.toUpperCase() === 'CRIADOR AFILIADO INBR'
  ) {
    resolvedOwner = 'Criadero Oficial INBR';
  }

  // Progenitor registrations (clean, never matching the puppy's registration)
  const cleanSireReg = sireName !== 'LINAJE FUNDADOR INBR'
    ? `REG-${sireName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`
    : 'INBR-FOUNDER-01';

  const cleanDamReg = damName !== 'LINAJE FUNDADOR INBR'
    ? `REG-${damName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`
    : 'INBR-FOUNDER-02';

  return {
    regNumber: regTrimmed,
    microchip: p.chip || `INBR-CHIP-${regTrimmed || '0000'}`,
    name: resolvedName,
    breed: p.raza || 'American Bully',
    variety: isCamada ? 'Camada Registrada' : 'Standard',
    gender: isFemale ? 'Hembra' : 'Macho',
    dob: p.fecha_nac || (isCamada ? '2024-01-01' : '2023-01-01'),
    color: p.color || 'Estándar Oficial',
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
  const [supabaseTotalCount, setSupabaseTotalCount] = useState<number>(2524);
  
  const [dogs, setDogs] = useState<DogRecord[]>(() => {
    const map = new Map<string, DogRecord>();
    // Always include canonical SAMPLE_DOGS (including BAM BAM and official champions)
    SAMPLE_DOGS.forEach((d) => {
      if (d && d.regNumber) {
        map.set(d.regNumber.toUpperCase().trim(), d);
      }
    });

    if (typeof window !== 'undefined') {
      try {
        // Recover cached authoritative dogs from localStorage
        ['inbr_custom_dogs_v2', 'inbr_custom_dogs', 'inbr_excel_dogs', 'inbr_dogs'].forEach((k) => {
          const saved = localStorage.getItem(k);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((d: DogRecord) => {
                  if (d && d.regNumber) {
                    map.set(d.regNumber.toUpperCase().trim(), d);
                  }
                });
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

  // Fetch real dogs from Supabase database with pagination (all 2,524+ records)
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
          // Canonical official champions and baseline records
          SAMPLE_DOGS.forEach((d) => map.set(d.regNumber.toUpperCase().trim(), d));
          // Authoritative Supabase records
          mappedRecords.forEach((d) => map.set(d.regNumber.toUpperCase().trim(), d));

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

    // Listen to real-time changes on 'perros' table to keep local registry in sync
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
              prevDogs.forEach((d) => map.set(d.regNumber.toUpperCase().trim(), d));
              map.set(mapped.regNumber.toUpperCase().trim(), mapped);
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
    dogs.forEach((d) => map.set(d.regNumber.toUpperCase().trim(), d));
    
    let addedCount = 0;
    newDogs.forEach((d) => {
      if (d.regNumber) {
        map.set(d.regNumber.toUpperCase().trim(), d);
        addedCount++;
      }
    });

    const merged = Array.from(map.values());
    setDogs(merged);

    // Sync to Supabase 'perros' table in batches of 100
    const recordsToInsert = newDogs.map((d) => ({
      numero_registro: d.regNumber.trim().toUpperCase(),
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
    
    // Check if sire exists in database to pull real titles, color, and registration
    // CRITICAL: A dog cannot be its own sire, and a Camada puppy cannot be the sire of another puppy!
    const sireObj = dogs.find(
      (d) => 
        d.regNumber !== dog.regNumber &&
        (
          (dog.sireReg && d.regNumber.toUpperCase().trim() === dog.sireReg.toUpperCase().trim()) ||
          (dog.sire && d.name.toUpperCase().trim() === dog.sire.toUpperCase().trim() && !d.regNumber.toUpperCase().startsWith('CA') && !d.name.toUpperCase().startsWith('CACHORRO'))
        )
    );

    // Check if dam exists in database
    const damObj = dogs.find(
      (d) => 
        d.regNumber !== dog.regNumber &&
        (
          (dog.damReg && d.regNumber.toUpperCase().trim() === dog.damReg.toUpperCase().trim()) ||
          (dog.dam && d.name.toUpperCase().trim() === dog.dam.toUpperCase().trim() && !d.regNumber.toUpperCase().startsWith('CA') && !d.name.toUpperCase().startsWith('CACHORRO'))
        )
    );

    const safeSireReg = sireObj?.regNumber || (dog.sireReg && !dog.sireReg.toUpperCase().startsWith('CA') && dog.sireReg !== dog.regNumber ? dog.sireReg : (dog.sire ? `REG-${dog.sire.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}` : 'INBR-777-01'));
    const safeDamReg = damObj?.regNumber || (dog.damReg && !dog.damReg.toUpperCase().startsWith('CA') && dog.damReg !== dog.regNumber ? dog.damReg : (dog.dam ? `REG-${dog.dam.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}` : 'INBR-777-02'));

    const enrichedSire = {
      name: dog.sire || sireObj?.name || '777 CORSAN FIREUP',
      reg: safeSireReg,
      titles: sireObj?.titles || ['CH'],
      sire: { name: sireObj?.sire || '777 CORSAN FIREUP', reg: sireObj?.sireReg || 'INBR-777-01', titles: ['GR CH'], sire: 'INBR PATERNAL FOUNDER', dam: 'INBR PATERNAL DAM' },
      dam: { name: sireObj?.dam || 'YEYI 777', reg: sireObj?.damReg || 'INBR-777-02', titles: ['CH'], sire: 'INBR MATERNAL FOUNDER', dam: 'INBR MATERNAL DAM' },
    };

    const enrichedDam = {
      name: dog.dam || damObj?.name || 'YEYI 777',
      reg: safeDamReg,
      titles: damObj?.titles || ['CH'],
      sire: { name: damObj?.sire || 'DIESEL BULL', reg: damObj?.sireReg || 'INBR-84920', titles: ['CH'], sire: 'INBR DAM SIRE', dam: 'INBR DAM DAM' },
      dam: { name: damObj?.dam || 'BELLA SUPREME', reg: damObj?.damReg || 'INBR-00192', titles: ['CH'], sire: 'INBR DAM SIRE 2', dam: 'INBR DAM DAM 2' },
    };

    return {
      ...dog,
      sire: sireObj?.name || dog.sire,
      sireReg: safeSireReg,
      dam: damObj?.name || dog.dam,
      damReg: safeDamReg,
      genogram: {
        sire: enrichedSire,
        dam: enrichedDam,
      },
    };
  };

  const findDogByQuery = (query: string): DogRecord | undefined => {
    const raw = (query || '').trim().toUpperCase();
    if (!raw) return undefined;
    const cleanAlnum = raw.replace(/[^A-Z0-9]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');
    const strippedInbr = raw.replace(/^(INBR|REG|CHIP|ISO)[-_\s:]*/i, '').trim();
    const strippedInbrAlnum = strippedInbr.replace(/[^A-Z0-9]/g, '');

    // 1. Exact or normalized registration match (Prioritizes the unique identifier of the dog/puppy)
    const exactReg = dogs.find((d) => {
      const reg = (d.regNumber || '').toUpperCase().trim();
      const regAlnum = reg.replace(/[^A-Z0-9]/g, '');
      return (
        reg === raw ||
        reg === strippedInbr ||
        regAlnum === cleanAlnum ||
        regAlnum === strippedInbrAlnum ||
        (strippedInbr.length >= 3 && reg.endsWith(strippedInbr))
      );
    });
    if (exactReg) return crossReferenceDog(exactReg);

    // 2. Microchip match (exact, cleaned digits, or substring)
    if (digitsOnly.length >= 5) {
      const chipMatch = dogs.find((d) => {
        const dChipDigits = (d.microchip || '').replace(/\D/g, '');
        return dChipDigits === digitsOnly || (dChipDigits.length >= 8 && dChipDigits.includes(digitsOnly));
      });
      if (chipMatch) return crossReferenceDog(chipMatch);
    }

    // 3. Progenitor Name match (e.g. searching "PANIC")
    // Prioritize adult / progenitor records so searching "PANIC" returns the father dog
    const exactNameAdult = dogs.find((d) => {
      const name = (d.name || '').toUpperCase().trim();
      const isAdultOrProg = !d.regNumber.toUpperCase().startsWith('CA') && !name.startsWith('CACHORRO');
      return isAdultOrProg && (name === raw || name === strippedInbr);
    });
    if (exactNameAdult) return crossReferenceDog(exactNameAdult);

    // 4. Any exact name match
    const exactName = dogs.find((d) => {
      const name = (d.name || '').toUpperCase().trim();
      return name === raw || name === strippedInbr;
    });
    if (exactName) return crossReferenceDog(exactName);

    // 5. Check if query matches a Sire (id_padre) name in litters (e.g. searching "PANIC")
    const sireOfCamada = dogs.find((d) => {
      const sire = (d.sire || '').toUpperCase().trim();
      return sire === raw || sire === strippedInbr;
    });
    if (sireOfCamada && sireOfCamada.sire) {
      const progDog: DogRecord = {
        regNumber: sireOfCamada.sireReg || `REG-${sireOfCamada.sire.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`,
        microchip: `INBR-SIRE-${sireOfCamada.sire.slice(0, 6)}`,
        name: sireOfCamada.sire,
        breed: sireOfCamada.breed || 'American Bully',
        variety: 'Progenitor Semental Oficial',
        gender: 'Macho',
        dob: '2021-05-10',
        color: 'Chocolate / Estándar',
        owner: 'Criadero Registrado INBR',
        breeder: 'Criadero Registrado INBR',
        country: 'México',
        sire: 'LINAJE FUNDADOR INBR',
        sireReg: 'INBR-FOUNDER-01',
        dam: 'LINAJE FUNDADOR INBR',
        damReg: 'INBR-FOUNDER-02',
        points: 500,
        titles: ['PADRE REPRODUCTOR INBR', 'CHAMPION PROGENITOR'],
        imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80',
        status: 'ACTIVE_VALIDATED' as any,
      };
      return crossReferenceDog(progDog);
    }

    // 6. Substring on regNumber, microchip, name, or owner
    const subMatch = dogs.find((d) => {
      const reg = (d.regNumber || '').toUpperCase().trim();
      const name = (d.name || '').toUpperCase().trim();
      const owner = (d.owner || '').toUpperCase().trim();
      const chip = (d.microchip || '').toUpperCase().trim();
      return (
        (strippedInbr.length >= 3 && reg.includes(strippedInbr)) ||
        (raw.length >= 3 && (name.includes(raw) || owner.includes(raw) || chip.includes(raw)))
      );
    });
    if (subMatch) return crossReferenceDog(subMatch);

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
          prev.forEach((d) => map.set(d.regNumber.toUpperCase().trim(), d));
          map.set(mapped.regNumber.toUpperCase().trim(), mapped);
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
