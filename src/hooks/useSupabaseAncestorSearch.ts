import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, SupabasePerro } from '../lib/supabase';
import { useRegistry } from '../context/RegistryContext';
import { DogRecord } from '../data/registryData';

export interface AncestorSuggestion {
  id: string;
  name: string;
  regNumber: string;
  breed: string;
  gender: 'MACHO' | 'HEMBRA' | string;
  color?: string;
  microchip?: string;
  sire?: string;
  dam?: string;
  owner?: string;
  imageUrl?: string;
  source: 'SUPABASE' | 'LOCAL';
}

interface UseSupabaseAncestorSearchOptions {
  genderFilter?: 'MACHO' | 'HEMBRA' | 'ALL';
  limit?: number;
  debounceMs?: number;
}

const cache = new Map<string, AncestorSuggestion[]>();

export function useSupabaseAncestorSearch(
  query: string,
  options: UseSupabaseAncestorSearchOptions = {}
) {
  const { genderFilter = 'ALL', limit = 8, debounceMs = 200 } = options;
  const { dogs: localDogs } = useRegistry();
  const [suggestions, setSuggestions] = useState<AncestorSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<any>(null);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim();
      if (!trimmed || trimmed.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      const cacheKey = `${trimmed.toLowerCase()}_${genderFilter}_${limit}`;
      if (cache.has(cacheKey)) {
        setSuggestions(cache.get(cacheKey)!);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Search in live Supabase 'perros' table (1,219+ records)
        let queryBuilder = supabase
          .from('perros')
          .select('numero_registro, nombre, raza, sexo, color, chip, id_padre, id_madre, fotos, propietario_nombre')
          .or(`nombre.ilike.%${trimmed}%,numero_registro.ilike.%${trimmed}%`)
          .limit(limit);

        if (genderFilter !== 'ALL') {
          queryBuilder = queryBuilder.ilike('sexo', `%${genderFilter}%`);
        }

        const { data: supabaseData, error: sbError } = await queryBuilder;

        if (sbError) {
          console.warn('Supabase search warning, falling back to cached dogs:', sbError);
        }

        const resultsMap = new Map<string, AncestorSuggestion>();

        // Process Supabase matches
        if (supabaseData && Array.isArray(supabaseData)) {
          supabaseData.forEach((row: SupabasePerro) => {
            const key = (row.numero_registro || row.nombre).toUpperCase().trim();
            resultsMap.set(key, {
              id: row.numero_registro || `sb-${Math.random()}`,
              name: row.nombre || 'SIN NOMBRE',
              regNumber: row.numero_registro || 'N/A',
              breed: row.raza || 'Raza Oficial',
              gender: (row.sexo || 'MACHO').toUpperCase(),
              color: row.color || '',
              microchip: row.chip || undefined,
              sire: row.id_padre || undefined,
              dam: row.id_madre || undefined,
              owner: row.propietario_nombre || undefined,
              imageUrl: row.fotos && row.fotos.length > 0 ? row.fotos[0] : undefined,
              source: 'SUPABASE',
            });
          });
        }

        // 2. Also search in local registry dogs (merged sample & imported dogs)
        const localMatches = localDogs.filter((d) => {
          const matchText =
            d.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            d.regNumber.toLowerCase().includes(trimmed.toLowerCase()) ||
            (d.microchip && d.microchip.includes(trimmed));

          if (!matchText) return false;

          if (genderFilter === 'MACHO') {
            return !d.gender.toLowerCase().includes('h') && !d.gender.toLowerCase().includes('f');
          }
          if (genderFilter === 'HEMBRA') {
            return d.gender.toLowerCase().includes('h') || d.gender.toLowerCase().includes('f');
          }
          return true;
        });

        localMatches.slice(0, limit).forEach((d) => {
          const key = d.regNumber.toUpperCase().trim();
          if (!resultsMap.has(key)) {
            resultsMap.set(key, {
              id: d.regNumber,
              name: d.name,
              regNumber: d.regNumber,
              breed: d.breed,
              gender: d.gender.toLowerCase().includes('h') ? 'HEMBRA' : 'MACHO',
              color: d.color,
              microchip: d.microchip,
              sire: d.sire,
              dam: d.dam,
              owner: d.owner,
              imageUrl: d.imageUrl,
              source: 'LOCAL',
            });
          }
        });

        const finalResults = Array.from(resultsMap.values()).slice(0, limit);
        cache.set(cacheKey, finalResults);
        setSuggestions(finalResults);
      } catch (err: any) {
        console.error('Error during ancestor search:', err);
        setError(err.message || 'Error al consultar Supabase');
      } finally {
        setIsLoading(false);
      }
    },
    [genderFilter, limit, localDogs]
  );

  useEffect(() => {
    cache.clear();
  }, [localDogs.length]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, debounceMs, performSearch]);

  return { suggestions, isLoading, error };
}
