import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { InbrNotification, BroadcastAlertInput, INITIAL_NOTIFICATIONS } from '../types/notifications';
import { playNotificationChime } from '../utils/notificationSound';
import type { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEY = 'inbr_notifications_cache_v1';
const SOUND_STORAGE_KEY = 'inbr_notifications_sound_enabled';

interface NotificationContextValue {
  notifications: InbrNotification[];
  unreadCount: number;
  isConnected: boolean;
  channelStatus: string;
  soundEnabled: boolean;
  recentToast: InbrNotification | null;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  dismissToast: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  broadcastAlert: (input: BroadcastAlertInput) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<InbrNotification[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading cached notifications:', e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SOUND_STORAGE_KEY);
        if (stored !== null) return stored === 'true';
      } catch {}
    }
    return true;
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [channelStatus, setChannelStatus] = useState<string>('CONNECTING');
  const [recentToast, setRecentToast] = useState<InbrNotification | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Sync notifications to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch (e) {
        console.warn('Error persisting notifications:', e);
      }
    }
  }, [notifications]);

  // Handle sound preference change
  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
      } catch {}
    }
  }, []);

  // Show a toast with auto-dismiss
  const triggerToast = useCallback((notif: InbrNotification) => {
    setRecentToast(notif);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setRecentToast(null);
    }, 7000);
  }, []);

  const dismissToast = useCallback(() => {
    setRecentToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  // Ingest an incoming notification (guards against duplicates)
  const handleIncomingNotification = useCallback(
    (notif: InbrNotification, playSound: boolean = true) => {
      setNotifications((prev) => {
        if (prev.some((item) => item.id === notif.id)) {
          return prev;
        }
        return [notif, ...prev];
      });

      if (playSound && soundEnabled) {
        playNotificationChime(notif.severity);
      }

      triggerToast(notif);
    },
    [soundEnabled, triggerToast]
  );

  // Supabase Realtime Subscription
  useEffect(() => {
    const channelName = 'inbr_realtime_network';
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channelRef.current = channel;

    // 1. Escuchar cambios en la base de datos de Supabase en la tabla 'perros' (Actualizaciones del Registro Oficial)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'perros',
      },
      (payload) => {
        const eventType = payload.eventType; // 'INSERT', 'UPDATE', 'DELETE'
        const newRecord = payload.new as any;

        if (eventType === 'INSERT' && newRecord) {
          const newNotif: InbrNotification = {
            id: `supabase-perro-insert-${newRecord.numero_registro || Date.now()}`,
            title: `Nuevo Ejemplar Registrado: ${newRecord.nombre || 'Canino'}`,
            message: `El ejemplar ${newRecord.nombre || 'Sin nombre'} (${newRecord.raza || 'Raza INBR'}) ha sido indexado oficialmente en la base de datos de Supabase. Registro: ${newRecord.numero_registro || 'N/A'}, Microchip: ${newRecord.chip || 'Biométrico asignado'}.`,
            category: 'REGISTRY',
            severity: 'SUCCESS',
            timestamp: new Date().toISOString(),
            read: false,
            senderName: 'Registro Central Supabase (En Vivo)',
            actionType: 'VERIFY_DOG',
            actionPayload: {
              dogReg: newRecord.numero_registro,
              microchip: newRecord.chip,
            },
          };
          handleIncomingNotification(newNotif, true);
        } else if (eventType === 'UPDATE' && newRecord) {
          const updateNotif: InbrNotification = {
            id: `supabase-perro-update-${newRecord.numero_registro || Date.now()}-${Date.now()}`,
            title: `Actualización de Registro: ${newRecord.nombre || newRecord.numero_registro}`,
            message: `Modificación de estatus o datos de microchip confirmada en el registro oficial para ${newRecord.nombre || 'el ejemplar'}.`,
            category: 'REGISTRY',
            severity: 'INFO',
            timestamp: new Date().toISOString(),
            read: false,
            senderName: 'Sistema Central Supabase',
            actionType: 'VERIFY_DOG',
            actionPayload: {
              dogReg: newRecord.numero_registro,
              microchip: newRecord.chip,
            },
          };
          handleIncomingNotification(updateNotif, true);
        }
      }
    );

    // 2. Escuchar broadcast de eventos en tiempo real (Alertas de Criadores, Próximos Eventos y Avisos)
    channel.on('broadcast', { event: 'inbr_notification' }, ({ payload }) => {
      if (payload && payload.id) {
        handleIncomingNotification(payload as InbrNotification, true);
      }
    });

    // 3. Suscripción y monitoreo de estado de conexión
    channel.subscribe((status) => {
      setChannelStatus(status);
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [handleIncomingNotification]);

  // Mark specific notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  // Delete notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Broadcast an alert via Supabase Realtime channel to all connected users
  const broadcastAlert = useCallback(
    async (input: BroadcastAlertInput): Promise<boolean> => {
      const newNotification: InbrNotification = {
        id: `notif-live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: input.title.trim(),
        message: input.message.trim(),
        category: input.category,
        severity: input.severity,
        timestamp: new Date().toISOString(),
        read: false,
        senderName: input.senderName.trim() || 'Comité Oficial INBR',
        actionType: input.actionType || 'CUSTOM',
        actionPayload: input.actionPayload,
      };

      // 1. Add locally
      setNotifications((prev) => [newNotification, ...prev]);
      if (soundEnabled) {
        playNotificationChime(newNotification.severity);
      }
      triggerToast(newNotification);

      // 2. Broadcast through Supabase Realtime channel
      try {
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'inbr_notification',
            payload: newNotification,
          });
        }
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }

      // 3. Optional persistence to 'notificaciones' table in background
      try {
        await supabase.from('notificaciones').insert([
          {
            id: newNotification.id,
            title: newNotification.title,
            message: newNotification.message,
            category: newNotification.category,
            severity: newNotification.severity,
            sender_name: newNotification.senderName,
            action_type: newNotification.actionType,
            action_payload: newNotification.actionPayload,
            created_at: newNotification.timestamp,
          },
        ]);
      } catch {
        // Table might not exist yet in schema, silent fallback
      }

      return true;
    },
    [soundEnabled, triggerToast]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    isConnected,
    channelStatus,
    soundEnabled,
    recentToast,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    dismissToast,
    setSoundEnabled,
    broadcastAlert,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
