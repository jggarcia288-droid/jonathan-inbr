import { supabase } from '../lib/supabase';

export interface ActivityLogItem {
  id: string;
  timestamp: string; // ISO String
  formattedDate: string; // readable e.g. "03 Oct 2026 • 17:30:12"
  author: {
    name: string;
    role: 'MASTER' | 'REPRESENTATIVE' | 'USUARIO_AUTORIZADO' | 'SISTEMA' | 'OWNER';
    email?: string;
    region?: string;
  };
  action: string;
  category: 'CMS' | 'REPRESENTANTES' | 'CAMADAS' | 'CERTIFICADOS' | 'SEGURIDAD';
  fieldModified?: string;
  previousValue?: string;
  newValue?: string;
  details: string;
}

const STORAGE_KEY = 'inbr_activity_logs_v2';
const EVENT_KEY = 'inbr_activity_logs_updated_v2';

export const INITIAL_AUDIT_LOGS: ActivityLogItem[] = [
  {
    id: 'log-001',
    timestamp: '2026-10-03T17:10:00Z',
    formattedDate: '03 Oct 2026 • 17:10:00',
    author: {
      name: 'Jonathan García',
      role: 'MASTER',
      email: 'jggarcia288@gmail.com',
      region: 'Presidencia Internacional (Houston / CDMX)',
    },
    action: 'MODIFICACIÓN_CMS',
    category: 'CMS',
    fieldModified: 'heroTitleLine1 & heroBadge',
    previousValue: 'INBR REGISTRY',
    newValue: 'INTERNATIONAL BREEDS REGISTRY',
    details: 'Actualización notarial del título principal y denominación oficial para la temporada 2026.',
  },
  {
    id: 'log-002',
    timestamp: '2026-10-03T16:45:12Z',
    formattedDate: '03 Oct 2026 • 16:45:12',
    author: {
      name: 'Jonathan García',
      role: 'MASTER',
      email: 'jggarcia288@gmail.com',
      region: 'Presidencia Internacional',
    },
    action: 'AUTORIZACIÓN_IMPRESIÓN',
    category: 'REPRESENTANTES',
    fieldModified: 'puede_imprimir (Franquicia CDMX)',
    previousValue: 'false',
    newValue: 'true',
    details: 'Liberación de folios notariales y autorización de impresión para Carlos Mendoza (CDMX).',
  },
  {
    id: 'log-003',
    timestamp: '2026-10-03T15:30:20Z',
    formattedDate: '03 Oct 2026 • 15:30:20',
    author: {
      name: 'Carlos Mendoza',
      role: 'REPRESENTATIVE',
      email: 'rep.cdmx@inbr-registry.org',
      region: 'México Centro (CDMX)',
    },
    action: 'REGISTRO_CAMADA',
    category: 'CAMADAS',
    fieldModified: 'video_camada (INBR-CAM-9418)',
    previousValue: 'Pendiente',
    newValue: 'Validado con Cámara en Vivo (8 Cachorros)',
    details: 'Grabación de camada American Bully Pocket con madre lactando e inspección visual en tiempo real.',
  },
  {
    id: 'log-004',
    timestamp: '2026-10-03T14:15:00Z',
    formattedDate: '03 Oct 2026 • 14:15:00',
    author: {
      name: 'Alvaro Santos',
      role: 'REPRESENTATIVE',
      email: 'rep.gdl@inbr-registry.org',
      region: 'México Occidente (Guadalajara)',
    },
    action: 'EMISIÓN_CERTIFICADO',
    category: 'CERTIFICADOS',
    fieldModified: 'certificado_pedigree',
    previousValue: 'Borrador',
    newValue: 'Emitido con Marco Dorado (INBR-777-TAHONA)',
    details: 'Generación de certificado notarial con 4 generaciones validadas ante el Comité Cinológico.',
  },
  {
    id: 'log-005',
    timestamp: '2026-10-03T12:00:00Z',
    formattedDate: '03 Oct 2026 • 12:00:00',
    author: {
      name: 'Sistema Criptográfico INBR',
      role: 'SISTEMA',
      email: 'seguridad@inbr-registry.org',
      region: 'Servidor Central',
    },
    action: 'AUDITORÍA_SEGURIDAD',
    category: 'SEGURIDAD',
    fieldModified: 'permisos_descarga_publico',
    previousValue: 'Abierto',
    newValue: 'Bloqueado (Solo Consulta)',
    details: 'Restricción de descargas de certificados a clientes públicos sin autenticación oficial.',
  },
];

export function getActivityLogs(): ActivityLogItem[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading activity logs from localStorage', e);
  }
  return INITIAL_AUDIT_LOGS;
}

/**
 * Queries the Supabase 'logs' table to display a historical record of all
 * modifications made by users and representatives.
 * 
 * CRITICAL LAYER OF PROTECTION:
 * Verifies that the logged-in user possesses the 'MASTER' or 'admin' role
 * BEFORE executing any query against the Supabase 'logs' table.
 */
export async function fetchSupabaseActivityLogs(userRole: string | undefined | null): Promise<ActivityLogItem[]> {
  const isAuthorizedAdmin = userRole === 'MASTER' || userRole === 'admin';
  if (!isAuthorizedAdmin) {
    console.warn('[PROTECTION] Consulta a Supabase logs rechazada: Usuario no autorizado. Rol:', userRole);
    throw new Error('ACCESO_DENEGADO: Se requiere rol de Administrador Maestro para consultar logs en Supabase.');
  }

  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const mapped: ActivityLogItem[] = data.map((row: any) => ({
        id: row.id ? String(row.id) : `log-${Date.now()}`,
        timestamp: row.created_at || row.timestamp || new Date().toISOString(),
        formattedDate: row.formatted_date || new Date(row.created_at || Date.now()).toLocaleString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        author: {
          name: row.author_name || row.author?.name || 'Usuario Autorizado',
          role: (row.author_role || row.author?.role || 'MASTER') as any,
          email: row.author_email || row.author?.email,
          region: row.region || row.author?.region,
        },
        action: row.action || 'MODIFICACIÓN',
        category: (row.category || 'CMS') as any,
        fieldModified: row.field_modified || row.fieldModified,
        previousValue: row.previous_value || row.previousValue,
        newValue: row.new_value || row.newValue,
        details: row.details || '',
      }));
      return mapped;
    }
  } catch (err) {
    console.warn('Network or schema fallback for Supabase logs:', err);
  }

  return getActivityLogs();
}

export function addActivityLog(logData: {
  author: {
    name: string;
    role: 'MASTER' | 'REPRESENTATIVE' | 'USUARIO_AUTORIZADO' | 'SISTEMA' | 'OWNER';
    email?: string;
    region?: string;
  };
  action: string;
  category: 'CMS' | 'REPRESENTANTES' | 'CAMADAS' | 'CERTIFICADOS' | 'SEGURIDAD';
  fieldModified?: string;
  previousValue?: string;
  newValue?: string;
  details: string;
}): ActivityLogItem {
  const currentLogs = getActivityLogs();
  const now = new Date();
  
  const day = String(now.getDate()).padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const time = now.toTimeString().split(' ')[0];
  const formattedDate = `${day} ${month} ${year} • ${time}`;

  const newLog: ActivityLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    formattedDate,
    ...logData,
  };

  const updatedLogs = [newLog, ...currentLogs].slice(0, 100);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: updatedLogs }));
    } catch (e) {
      console.warn('Error saving activity log to localStorage', e);
    }
  }

  // Persist to Supabase 'logs' table in the background
  try {
    supabase
      .from('logs')
      .insert({
        author_name: logData.author.name,
        author_role: logData.author.role,
        author_email: logData.author.email || null,
        region: logData.author.region || null,
        action: logData.action,
        category: logData.category,
        field_modified: logData.fieldModified || null,
        previous_value: logData.previousValue || null,
        new_value: logData.newValue || null,
        details: logData.details,
        created_at: now.toISOString(),
        formatted_date: formattedDate,
      })
      .then(({ error }) => {
        if (error) {
          // If table doesn't exist yet, we silently catch
          console.debug('Supabase logs sync notification:', error.message);
        }
      });
  } catch (err) {
    console.debug('Supabase logs network fallback:', err);
  }

  return newLog;
}

export function clearActivityLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: INITIAL_AUDIT_LOGS }));
  }
}

