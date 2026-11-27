import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Send, 
  Trash2, 
  Check, 
  ExternalLink, 
  PlusCircle, 
  Sparkles,
  Info,
  Dna,
  Trophy,
  Filter
} from 'lucide-react';
import { 
  NotificationCategory, 
  NotificationSeverity, 
  BroadcastAlertInput, 
  InbrNotification 
} from '../types/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (actionType?: string, actionPayload?: any) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onAction,
}) => {
  const {
    notifications,
    unreadCount,
    isConnected,
    channelStatus,
    soundEnabled,
    setSoundEnabled,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    broadcastAlert,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'ALL' | NotificationCategory | 'UNREAD'>('ALL');
  const [showComposer, setShowComposer] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Broadcaster form state
  const [formCategory, setFormCategory] = useState<NotificationCategory>('BREEDER_ALERT');
  const [formSeverity, setFormSeverity] = useState<NotificationSeverity>('WARNING');
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSender, setFormSender] = useState('Criador Oficial INBR');
  const [formActionType, setFormActionType] = useState<string>('VIEW_BREEDERS');
  const [formTargetCode, setFormTargetCode] = useState('');

  if (!isOpen) return null;

  // Filtered notifications
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'UNREAD') return !item.read;
    return item.category === activeTab;
  });

  const countOfficial = notifications.filter((n) => n.category === 'REGISTRY').length;
  const countBreeders = notifications.filter((n) => n.category === 'BREEDER_ALERT').length;
  const countEvents = notifications.filter((n) => n.category === 'UPCOMING_EVENT').length;

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) return;

    setIsBroadcasting(true);
    const input: BroadcastAlertInput = {
      title: formTitle.trim(),
      message: formMessage.trim(),
      category: formCategory,
      severity: formSeverity,
      senderName: formSender.trim() || 'Comité INBR',
      actionType: formActionType as any,
      actionPayload: formTargetCode ? { dogReg: formTargetCode, microchip: formTargetCode } : {},
    };

    try {
      await broadcastAlert(input);
      setBroadcastSuccess(true);
      setTimeout(() => {
        setBroadcastSuccess(false);
        setShowComposer(false);
        setFormTitle('');
        setFormMessage('');
        setFormTargetCode('');
      }, 1500);
    } catch (err) {
      console.error('Error broadcasting notification:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleNotificationClick = (item: InbrNotification) => {
    markAsRead(item.id);
    if (item.actionType && onAction) {
      onAction(item.actionType, item.actionPayload);
      onClose();
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'Hace unos segundos';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return `Hace ${diffDays} d`;
    } catch {
      return 'Reciente';
    }
  };

  const getCategoryDetails = (category: NotificationCategory) => {
    switch (category) {
      case 'REGISTRY':
        return {
          label: 'Registro Oficial',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          pillClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        };
      case 'BREEDER_ALERT':
        return {
          label: 'Alerta de Criador',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          pillClass: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        };
      case 'UPCOMING_EVENT':
        return {
          label: 'Próximo Evento',
          icon: <Calendar className="w-4 h-4 text-blue-400" />,
          pillClass: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
        };
    }
  };

  const getSeverityStyle = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'URGENT':
        return 'bg-red-950/80 text-red-300 border-red-500 animate-pulse font-black';
      case 'WARNING':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50 font-bold';
      case 'SUCCESS':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 font-bold';
      default:
        return 'bg-neutral-900 text-neutral-300 border-neutral-700 font-medium';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0A0A0A] border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.35)] overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#141008] via-[#1E170A] to-[#141008] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-black flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              <Bell className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black font-serif-luxury text-gold-gradient">
                  Centro de Notificaciones en Tiempo Real
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#FFE885]">
                  INBR LIVE
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {/* Supabase Realtime Status Pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  <span>
                    {isConnected ? 'Supabase Realtime: Conectado (glyqawudervvqnxbdybp)' : `Supabase: ${channelStatus}`}
                  </span>
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-[#18150F] border-[#D4AF37]/60 text-[#FFDF73] hover:bg-[#251E11]'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              title={soundEnabled ? 'Sonido de alertas activado' : 'Sonido silenciado'}
              aria-label="Alternar sonido"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 transition-all"
                title="Marcar todas las notificaciones como leídas"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Marcar Todo Leído</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all"
              aria-label="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Ribbon: Emit Live Alert Button & Quick Filters */}
        <div className="p-3 sm:px-6 bg-[#0E0E0E] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-gold-gradient text-black font-black shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-current">
                {notifications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('REGISTRY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'REGISTRY'
                  ? 'bg-emerald-600 text-white font-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registro Oficial</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-current">
                {countOfficial}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('BREEDER_ALERT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'BREEDER_ALERT'
                  ? 'bg-amber-600 text-white font-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Alertas Criadores</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-current">
                {countBreeders}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('UPCOMING_EVENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'UPCOMING_EVENT'
                  ? 'bg-blue-600 text-white font-black shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Próximos Eventos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-current">
                {countEvents}
              </span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => setActiveTab('UNREAD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'UNREAD'
                    ? 'bg-red-600 text-white font-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                <span>No Leídas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-current">
                  {unreadCount}
                </span>
              </button>
            )}
          </div>

          {/* Broadcaster Trigger Button */}
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#D4AF37] to-[#FFE885] text-black hover:brightness-110 active:scale-95 transition-all shadow"
          >
            <PlusCircle className="w-4 h-4 text-black" />
            <span>{showComposer ? 'Ocultar Emisor' : 'Emitir Alerta en Vivo'}</span>
          </button>
        </div>

        {/* Broadcaster Form (Collapsed/Expanded) */}
        {showComposer && (
          <form 
            onSubmit={handleBroadcastSubmit}
            className="p-4 sm:p-6 bg-[#120F09] border-b-2 border-[#D4AF37]/50 text-neutral-200 shrink-0 animate-fadeIn"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                <h4 className="text-sm font-bold text-[#FFE885] uppercase tracking-wider font-mono">
                  Transmisión en Vivo vía Supabase Realtime (Red Central INBR)
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">
                Se difundirá instantáneamente a todos los criadores y usuarios activos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Categoría
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as NotificationCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="BREEDER_ALERT">Alerta de Criador (Genética / Camada / Cruza)</option>
                  <option value="UPCOMING_EVENT">Próximo Evento (Campeonato / Pistas / Expo)</option>
                  <option value="REGISTRY">Registro Oficial (Pedigrí / Microchip / Homologación)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Prioridad / Urgencia
                </label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as NotificationSeverity)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="INFO">Informativa (Azul / Normal)</option>
                  <option value="SUCCESS">Confirmación / Éxito (Verde)</option>
                  <option value="WARNING">Advertencia Importante (Ámbar)</option>
                  <option value="URGENT">Urgente / Inmediata (Rojo Parpadeante)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Emisor Oficial
                </label>
                <input
                  type="text"
                  value={formSender}
                  onChange={(e) => setFormSender(e.target.value)}
                  placeholder="ej. Comité Veterinario, 777 Kennels"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Título de la Notificación
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ej. Apertura de Pistas Especiales / Alerta de Camada Registrada"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                    Acción Rápida
                  </label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="VIEW_BREEDERS">Ver Criadores</option>
                    <option value="VIEW_EVENT">Ver Próximo Evento</option>
                    <option value="VERIFY_DOG">Verificar Microchip</option>
                    <option value="VIEW_LITTER">Ver Camadas en Vivo</option>
                    <option value="CUSTOM">Solo Aviso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                    Código / ID Destino
                  </label>
                  <input
                    type="text"
                    value={formTargetCode}
                    onChange={(e) => setFormTargetCode(e.target.value)}
                    placeholder="ej. INBR-84920"
                    className="w-full px-2 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                Contenido del Mensaje
              </label>
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                rows={2}
                placeholder="Detalla la alerta o actualización oficial para que todos los usuarios de INBR estén informados en tiempo real..."
                className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[11px] text-neutral-400">
                {broadcastSuccess ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    ¡Alerta transmitida con éxito a toda la red Supabase!
                  </span>
                ) : (
                  <span>Canal WebSocket activo: inbr_realtime_network</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gold-gradient text-black hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow"
                >
                  <Send className="w-3.5 h-3.5 text-black" />
                  <span>{isBroadcasting ? 'Transmitiendo...' : 'Transmitir en Tiempo Real'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
                <Bell className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-neutral-300 mb-1">
                No hay notificaciones en esta categoría
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Los eventos en vivo, registros en Supabase y alertas de criadores aparecerán aquí automáticamente en tiempo real.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const catDetails = getCategoryDetails(item.category);
              const severityBadge = getSeverityStyle(item.severity);

              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border transition-all p-4 ${
                    item.read
                      ? 'bg-[#0E0E0E] border-neutral-800/80 hover:border-neutral-700'
                      : 'bg-gradient-to-r from-[#17130A] to-[#0E0E0E] border-[#D4AF37]/50 shadow-[0_4px_20px_rgba(212,175,55,0.1)]'
                  }`}
                >
                  {/* Unread indicator bar */}
                  {!item.read && (
                    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#FFDF73] animate-pulse" />
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2 pl-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catDetails.pillClass}`}>
                        {catDetails.icon}
                        <span>{catDetails.label}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider border ${severityBadge}`}>
                        {item.severity}
                      </span>

                      <span className="text-[11px] text-neutral-400 font-mono">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-1 rounded-lg text-neutral-500 hover:text-white transition-colors"
                        title={item.read ? 'Leída' : 'Marcar como leída'}
                      >
                        <Check className={`w-3.5 h-3.5 ${item.read ? 'text-neutral-600' : 'text-[#D4AF37]'}`} />
                      </button>
                      <button
                        onClick={() => deleteNotification(item.id)}
                        className="p-1 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                        title="Eliminar notificación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pl-4">
                    <h5 className="text-sm font-bold text-white mb-1 leading-snug font-serif-luxury">
                      {item.title}
                    </h5>
                    <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                        <span className="font-semibold text-neutral-300">{item.senderName || 'INBR Oficial'}</span>
                        {item.actionPayload?.dogReg && (
                          <span className="font-mono text-[#FFE885] bg-black/60 px-1.5 py-0.5 rounded border border-[#D4AF37]/30">
                            Reg: {item.actionPayload.dogReg}
                          </span>
                        )}
                        {item.actionPayload?.microchip && (
                          <span className="font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            Chip: {item.actionPayload.microchip}
                          </span>
                        )}
                      </div>

                      {item.actionType && (
                        <button
                          onClick={() => handleNotificationClick(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1F190E] hover:bg-[#2B2312] border border-[#D4AF37]/50 text-[#FFE885] hover:text-white text-xs font-bold transition-all shadow-sm"
                        >
                          <span>
                            {item.actionType === 'VERIFY_DOG'
                              ? 'Verificar en Registro'
                              : item.actionType === 'VIEW_EVENT'
                              ? 'Ver Próximo Evento'
                              : item.actionType === 'VIEW_BREEDERS'
                              ? 'Ver Criadores'
                              : item.actionType === 'VIEW_LITTER'
                              ? 'Ver Camada en Vivo'
                              : 'Ver Detalles'}
                          </span>
                          <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 bg-[#080808] border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Conexión Realtime WebSocket:</span>
            <span className="font-mono text-[#D4AF37]">glyqawudervvqnxbdybp.supabase.co</span>
          </div>

          <div className="flex items-center gap-3">
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-neutral-500 hover:text-neutral-300 transition-colors text-[11px]"
              >
                Limpiar historial
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 font-bold transition-all border border-neutral-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
