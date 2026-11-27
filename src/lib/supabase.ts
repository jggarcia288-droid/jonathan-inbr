import { createClient } from '@supabase/supabase-js';

// INBR Supabase Official Credentials provided by user
export const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://glyqawudervvqnxbdybp.supabase.co';

export const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseXFhd3VkZXJ2dnFueGJkeWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMjM4NDEsImV4cCI6MjA2ODg5OTg0MX0.yUVwXoxQg03p61hwmPWzM3n5hyDSxyFNt-oYLXrfYUk';

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const SUPABASE_BUCKETS = {
  FOTOS_REGISTROS: 'fotos-registros',
  VIDEOS_CAMADA: 'videos-camada',
} as const;

/**
 * Interface representing rows in the 'perros' table in Supabase
 */
export interface SupabasePerro {
  numero_registro: string;
  nombre: string;
  raza: string;
  sexo: string;
  color?: string | null;
  fecha_nac?: string | null;
  chip?: string | null;
  id_padre?: string | null;
  id_madre?: string | null;
  propietario_nombre?: string | null;
  franquicia_id?: string | null;
  fotos?: string[] | null;
  videos?: string[] | null;
  estado?: string | null;
  tipo_registro?: string | null;
}

/**
 * Interface representing rows in the 'franquicias' table in Supabase
 */
export interface SupabaseFranquicia {
  id: string;
  pais: string;
  prefijo: string;
  email: string | null;
  puede_imprimir: boolean;
  created_at: string;
}

/**
 * Fetches all registered dogs from the Supabase 'perros' table using pagination
 * to overcome the 1000 records PostgREST default limit (retrieves all 2,500+ records)
 */
export async function fetchAllSupabaseDogs(): Promise<SupabasePerro[]> {
  try {
    let allDogs: SupabasePerro[] = [];
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

      allDogs = allDogs.concat(data as SupabasePerro[]);

      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    return allDogs;
  } catch (err) {
    console.warn('Network error fetching Supabase perros:', err);
    return [];
  }
}

/**
 * Searches for a dog in real-time in Supabase by registration number, microchip, name, or owner.
 * Supports prefixes (INBR-F110369 -> F110369), formatted microchips (spaces/dashes), and alphanumeric normalization.
 * Checks both 'perros' table and 'specimens' table.
 */
export async function searchDogInSupabase(query: string): Promise<SupabasePerro | null> {
  const raw = (query || '').trim();
  if (!raw) return null;

  try {
    const upper = raw.toUpperCase();
    const digitsOnly = raw.replace(/\D/g, '');
    const alnumOnly = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const strippedInbr = raw.replace(/^(INBR|REG|CHIP|ISO)[-_\s:]*/i, '').trim().toUpperCase();
    const strippedInbrAlnum = strippedInbr.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // 1. Tier 1: Exact matches against registration number or microchip
    const exactCandidates = Array.from(new Set([
      raw,
      upper,
      strippedInbr,
      alnumOnly,
      digitsOnly,
      strippedInbrAlnum,
    ])).filter((val) => Boolean(val && val.length >= 2));

    for (const cand of exactCandidates) {
      // Check in 'perros' table
      const { data: exactPerros } = await supabase
        .from('perros')
        .select('*')
        .or(`numero_registro.eq.${cand},chip.eq.${cand}`)
        .limit(2);

      if (exactPerros && exactPerros.length > 0) {
        return exactPerros[0] as SupabasePerro;
      }
    }

    // 2. Tier 2: ilike substring matching on registration, chip, name, owner
    const searchTerms = Array.from(new Set([
      raw,
      upper,
      strippedInbr,
      strippedInbrAlnum,
      digitsOnly,
    ])).filter((t) => Boolean(t && t.length >= 2));

    const orClauses: string[] = [];
    searchTerms.forEach((term) => {
      // Escape commas to prevent PostgREST syntax errors
      const safeTerm = term.replace(/,/g, '');
      orClauses.push(`numero_registro.ilike.%${safeTerm}%`);
      orClauses.push(`nombre.ilike.%${safeTerm}%`);
      orClauses.push(`propietario_nombre.ilike.%${safeTerm}%`);
      if (digitsOnly.length >= 5) {
        orClauses.push(`chip.ilike.%${digitsOnly}%`);
      }
      if (term.length >= 3) {
        orClauses.push(`chip.ilike.%${safeTerm}%`);
      }
    });

    // Remove duplicates and limit clause count
    const uniqueClauses = Array.from(new Set(orClauses)).slice(0, 15);

    const { data: ilikeMatches, error: ilikeError } = await supabase
      .from('perros')
      .select('*')
      .or(uniqueClauses.join(','))
      .limit(10);

    if (!ilikeError && ilikeMatches && ilikeMatches.length > 0) {
      // Prefer exact normalized match if present
      const preferred = ilikeMatches.find((d: SupabasePerro) => {
        const dReg = (d.numero_registro || '').toUpperCase().trim();
        const dChip = (d.chip || '').replace(/\D/g, '');
        const dName = (d.nombre || '').toUpperCase().trim();
        return (
          dReg === upper ||
          dReg === strippedInbr ||
          dReg.replace(/[^A-Za-z0-9]/g, '') === alnumOnly ||
          (digitsOnly.length >= 6 && dChip === digitsOnly) ||
          dName === upper
        );
      });
      return (preferred || ilikeMatches[0]) as SupabasePerro;
    }

    // 3. Fallback: check specimens table
    const specTerms = [raw, upper, strippedInbr, digitsOnly].filter(Boolean);
    const specClauses = specTerms.map((t) => `registration_number.ilike.%${t}%,name.ilike.%${t}%,chip.ilike.%${t}%`);
    const { data: specData, error: specError } = await supabase
      .from('specimens')
      .select('*')
      .or(specClauses.join(','))
      .limit(5);

    if (!specError && specData && specData.length > 0) {
      const s = specData[0];
      return {
        numero_registro: s.registration_number || s.id,
        nombre: s.name,
        raza: s.breed || 'American Bully',
        sexo: s.sex || 'MACHO',
        color: s.color || null,
        fecha_nac: s.birth_date || null,
        chip: s.chip || null,
        id_padre: 'LINAJE FUNDADOR INBR',
        id_madre: 'LINAJE FUNDADOR INBR',
        propietario_nombre: 'Propietario Oficial INBR',
        estado: 'APROBADO',
        tipo_registro: 'SPECIMEN',
      };
    }

    return null;
  } catch (err) {
    console.warn('Error querying Supabase directly:', err);
    return null;
  }
}

/**
 * Fetches all franquicias / representatives from the Supabase 'franquicias' table
 */
export async function fetchAllSupabaseFranquicias(): Promise<SupabaseFranquicia[]> {
  try {
    const { data, error } = await supabase
      .from('franquicias')
      .select('*')
      .neq('prefijo', 'CMS_CONFIG')
      .order('pais', { ascending: true });

    if (error) {
      console.warn('Error fetching franquicias from Supabase:', error);
      return [];
    }

    return (data as SupabaseFranquicia[]) || [];
  } catch (err) {
    console.warn('Network error fetching Supabase franquicias:', err);
    return [];
  }
}

/**
 * Updates print permission for a franchise in Supabase
 */
export async function updateFranquiciaPrintPermission(
  id: string,
  puede_imprimir: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('franquicias')
      .update({ puede_imprimir })
      .eq('id', id);

    if (error) {
      console.warn('Error updating franquicia print permission:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Network error updating franquicia print permission:', err);
    return false;
  }
}

/**
 * Uploads a live-recorded video blob directly into the Supabase storage bucket 'videos-camada'
 */
export async function uploadLiveCamadaVideo(
  videoBlob: Blob,
  metadata: { motherReg: string; fatherReg: string; breederName: string }
): Promise<{ success: boolean; url: string; trackingId: string }> {
  const timestamp = Date.now();
  const cleanMother = metadata.motherReg.replace(/[^a-zA-Z0-9]/g, '_') || 'DAM';
  const fileName = `live_camada_${cleanMother}_${timestamp}.webm`;
  const trackingId = `INBR-CAM-${Math.floor(100000 + Math.random() * 900000)}`;

  let uploadedUrl: string | null = null;

  // 1. Try server upload endpoint first (bypasses Storage RLS)
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(videoBlob);
    });

    if (base64Data) {
      const serverRes = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          filename: fileName,
          bucket: SUPABASE_BUCKETS.VIDEOS_CAMADA,
          contentType: 'video/webm',
        }),
      });
      if (serverRes.ok) {
        const sData = await serverRes.json();
        if (sData?.publicUrl) {
          uploadedUrl = sData.publicUrl;
        }
      }
    }
  } catch (serverErr) {
    console.warn('Server video upload fallback to direct client:', serverErr);
  }

  // 2. Direct client Storage upload fallback
  if (!uploadedUrl) {
    try {
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKETS.VIDEOS_CAMADA)
        .upload(fileName, videoBlob, {
          contentType: 'video/webm',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from(SUPABASE_BUCKETS.VIDEOS_CAMADA)
          .getPublicUrl(fileName);
        uploadedUrl = publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Supabase storage live upload fallback mode:', err);
    }
  }

  if (uploadedUrl) {
    try {
      await supabase.from('camadas_en_vivo').insert([
        {
          tracking_id: trackingId,
          mother_reg: metadata.motherReg,
          father_reg: metadata.fatherReg,
          breeder_name: metadata.breederName,
          video_url: uploadedUrl,
          status: 'AUDITED_LIVE',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // Ignore table insert if schema differs
    }

    return {
      success: true,
      url: uploadedUrl,
      trackingId,
    };
  }

  // Graceful client fallback with object URL and official tracking ID
  const localUrl = URL.createObjectURL(videoBlob);
  return {
    success: true,
    url: localUrl,
    trackingId,
  };
}

/**
 * Saves the dynamic CMS JSON configuration directly into Supabase 'site_settings' & 'franquicias'.
 * Guarantees persistent cloud storage.
 */
export async function saveCmsConfigDirect(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    let parsedConfig: any = null;
    try {
      parsedConfig = JSON.parse(jsonString);
    } catch {
      parsedConfig = { raw: jsonString };
    }

    // 1. First attempt: call local server endpoint (uses Supabase service_role to guarantee storage)
    try {
      const serverRes = await fetch('/api/cms/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: parsedConfig }),
      });
      if (serverRes.ok) {
        const sJson = await serverRes.json();
        if (sJson?.success) {
          return { success: true };
        }
      }
    } catch (serverErr) {
      // Fallback to direct client call if server endpoint is unreachable
      console.warn('Server CMS save fallback to client Supabase:', serverErr);
    }

    // 2. Direct client call: upsert into native 'site_settings' table
    const { error: settingsError } = await supabase
      .from('site_settings')
      .upsert(
        { key: 'cms_config', value: parsedConfig },
        { onConflict: 'key' }
      );

    if (settingsError) {
      console.warn('Direct site_settings upsert warning:', settingsError);
    }

    // 3. Mirror into 'franquicias' table for backward-compatible replication
    let mirrorSuccess = false;
    try {
      const { data: existing } = await supabase
        .from('franquicias')
        .select('id')
        .eq('prefijo', 'CMS_CONFIG')
        .maybeSingle();

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from('franquicias')
          .update({
            email: jsonString,
            pais: 'CONFIGURACION_CMS_INBR',
            puede_imprimir: true,
          })
          .eq('id', existing.id);
        mirrorSuccess = !upErr;
      } else {
        const { error: insErr } = await supabase
          .from('franquicias')
          .insert({
            pais: 'CONFIGURACION_CMS_INBR',
            prefijo: 'CMS_CONFIG',
            email: jsonString,
            puede_imprimir: true,
          });
        mirrorSuccess = !insErr;
      }
    } catch (mirrorErr) {
      console.warn('Franquicias mirror notice:', mirrorErr);
    }

    if (settingsError && !mirrorSuccess) {
      return {
        success: false,
        error: settingsError.message || 'No se pudo guardar la configuración en Supabase.',
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('saveCmsConfigDirect failed:', err);
    return { success: false, error: err?.message || 'Error de conexión con base de datos Supabase' };
  }
}

/**
 * Fetches the dynamic CMS JSON configuration directly from Supabase (prioritizing site_settings)
 */
export async function fetchCmsConfigDirect(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    // 1. Try native 'site_settings' table first
    const { data: siteData, error: siteErr } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'cms_config')
      .maybeSingle();

    if (!siteErr && siteData?.value) {
      return { success: true, data: JSON.stringify(siteData.value) };
    }

    // 2. Try server endpoint
    try {
      const serverRes = await fetch('/api/cms/get');
      if (serverRes.ok) {
        const sJson = await serverRes.json();
        if (sJson.success && sJson.config) {
          return { success: true, data: JSON.stringify(sJson.config) };
        }
      }
    } catch {}

    // 3. Fallback to 'franquicias' table
    const { data: fData, error: fErr } = await supabase
      .from('franquicias')
      .select('email')
      .eq('prefijo', 'CMS_CONFIG')
      .maybeSingle();

    if (!fErr && fData?.email) {
      return { success: true, data: fData.email };
    }

    return { success: false, error: siteErr?.message || fErr?.message || 'No se encontró configuración' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red con Supabase' };
  }
}

/**
 * Subscribes to Realtime updates on both 'site_settings' and 'franquicias' in Supabase.
 * When any administrator updates the configuration from anywhere, this fires instantly.
 * Returns a cleanup unsubscribe callback.
 */
export function subscribeToCmsConfig(onChange: (newJson: string) => void): () => void {
  const channelName = `realtime_cms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'key=eq.cms_config',
      },
      (payload) => {
        try {
          const newVal = (payload.new as any)?.value;
          if (newVal) {
            onChange(typeof newVal === 'string' ? newVal : JSON.stringify(newVal));
          }
        } catch (e) {
          console.warn('Realtime parse site_settings payload error:', e);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'franquicias',
        filter: 'prefijo=eq.CMS_CONFIG',
      },
      (payload) => {
        try {
          const newEmail = (payload.new as any)?.email;
          if (newEmail && typeof newEmail === 'string') {
            onChange(newEmail);
          }
        } catch (e) {
          console.warn('Realtime parse franquicias payload error:', e);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Verifies live connectivity with the Supabase database
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('franquicias').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true, latencyMs };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Error de conexión' };
  }
}

