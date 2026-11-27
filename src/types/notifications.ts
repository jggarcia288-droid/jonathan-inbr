export type NotificationCategory = 'REGISTRY' | 'BREEDER_ALERT' | 'UPCOMING_EVENT';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';

export interface InbrNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  timestamp: string; // ISO string
  read: boolean;
  senderName?: string;
  actionType?: 'VERIFY_DOG' | 'VIEW_CERTIFICATE' | 'VIEW_EVENT' | 'VIEW_BREEDERS' | 'VIEW_LITTER' | 'CUSTOM';
  actionPayload?: {
    dogReg?: string;
    microchip?: string;
    eventId?: string;
    breederName?: string;
    url?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface BroadcastAlertInput {
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  senderName: string;
  actionType?: 'VERIFY_DOG' | 'VIEW_CERTIFICATE' | 'VIEW_EVENT' | 'VIEW_BREEDERS' | 'VIEW_LITTER' | 'CUSTOM';
  actionPayload?: {
    dogReg?: string;
    microchip?: string;
    eventId?: string;
    breederName?: string;
    url?: string;
  };
}

export const INITIAL_NOTIFICATIONS: InbrNotification[] = [
  {
    id: 'notif-reg-1',
    title: 'Nuevo Ejemplar Homologado: TAHONA 777',
    message: 'El ejemplar TAHONA 777 (American Bully Pocket) ha sido validado en la base de datos central de Supabase. Microchip: 981098108427777.',
    category: 'REGISTRY',
    severity: 'SUCCESS',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    read: false,
    senderName: 'Registro Central INBR',
    actionType: 'VERIFY_DOG',
    actionPayload: {
      dogReg: 'INBR-777-TAHONA',
      microchip: '981098108427777',
    },
  },
  {
    id: 'notif-brd-1',
    title: 'Alerta Sanitaria & ADN para Criadores Oficiales',
    message: 'Recordatorio oficial del Comité Veterinario: Los reportes de paneles genéticos y microchip ISO-11784 deben cargarse antes del registro de camadas de la temporada 2026.',
    category: 'BREEDER_ALERT',
    severity: 'WARNING',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(), // ~1 hr ago
    read: false,
    senderName: 'Comité Veterinario & Genético',
    actionType: 'VIEW_BREEDERS',
    actionPayload: {},
  },
  {
    id: 'notif-evt-1',
    title: 'Apertura de Pistas: INBR World Championship Houston 2026',
    message: 'Abiertas las inscripciones para el evento mundial en el NRG Center de Houston. Puntaje oficial Triple (3X) para el Ranking Internacional de Campeones.',
    category: 'UPCOMING_EVENT',
    severity: 'INFO',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hrs ago
    read: false,
    senderName: 'Dirección de Eventos INBR',
    actionType: 'VIEW_EVENT',
    actionPayload: {
      eventId: 'evt-1',
    },
  },
  {
    id: 'notif-brd-2',
    title: 'Nueva Camada Auditada en Vivo: 777 Kennels',
    message: 'El criadero 777 Kennels ha certificado una camada de 6 cachorros Pocket mediante video-auditoría biométrica en tiempo real.',
    category: 'BREEDER_ALERT',
    severity: 'SUCCESS',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hrs ago
    read: true,
    senderName: 'Auditoría de Camadas en Vivo',
    actionType: 'VIEW_LITTER',
    actionPayload: {},
  },
  {
    id: 'notif-reg-2',
    title: 'Actualización en Registro: Certificado Digital Generado',
    message: 'Pedigrí de 8 generaciones emitido y disponible con código QR de verificación instantánea para KRAKEN VULCAN (INBR-84920).',
    category: 'REGISTRY',
    severity: 'INFO',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    senderName: 'Departamento de Pedigríes Digitales',
    actionType: 'VERIFY_DOG',
    actionPayload: {
      dogReg: 'INBR-84920',
      microchip: '981098108420912',
    },
  },
  {
    id: 'notif-evt-2',
    title: 'Gran Expo Nacional Bullyz CDMX 2026: Pistas Confirmadas',
    message: 'Expo Reforma albergará las pistas oficiales de conformación los días 14 y 15 de Noviembre. Jueces internacionales de USA, Puerto Rico y México confirmados.',
    category: 'UPCOMING_EVENT',
    severity: 'INFO',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 36 hrs ago
    read: true,
    senderName: 'Comité Organizador CDMX',
    actionType: 'VIEW_EVENT',
    actionPayload: {
      eventId: 'evt-2',
    },
  },
];
