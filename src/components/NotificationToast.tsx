import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { 
  Bell, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  Radio
} from 'lucide-react';
import { NotificationCategory, NotificationSeverity } from '../types/notifications';

interface NotificationToastProps {
  onAction?: (actionType?: string, actionPayload?: any) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onAction }) => {
  const { recentToast, dismissToast, markAsRead } = useNotifications();

  if (!recentToast) return null;

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'REGISTRY':
        return {
          label: 'Registro Oficial',
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'BREEDER_ALERT':
        return {
          label: 'Alerta de Criador',
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
        };
      case 'UPCOMING_EVENT':
        return {
          label: 'Próximo Evento',
          bg: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
          icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
        };
      default:
        return {
          label: 'Aviso INBR',
          bg: 'bg-neutral-900 border-[#D4AF37]/50 text-[#FFE885]',
          icon: <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />,
        };
    }
  };

  const getSeverityPill = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'URGENT':
        return 'bg-red-600 text-white animate-pulse font-black';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      case 'SUCCESS':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      default:
        return 'bg-neutral-800 text-neutral-300 border border-neutral-700';
    }
  };

  const cat = getCategoryBadge(recentToast.category);

  const handleActionClick = () => {
    markAsRead(recentToast.id);
    if (onAction && recentToast.actionType) {
      onAction(recentToast.actionType, recentToast.actionPayload);
    }
    dismissToast();
  };

  return (
    <aside 
      aria-label="Notificación en tiempo real"
      className="fixed bottom-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-bounce-short pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.3)]"
    >
      <div className="bg-[#0C0C0C]/95 backdrop-blur-md rounded-2xl border-2 border-[#D4AF37] p-4 text-left overflow-hidden relative">
        {/* Top Gold Live Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#FFDF73] to-[#D4AF37] animate-pulse" />

        <div className="flex items-start justify-between gap-3 mb-2 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cat.bg}`}>
              {cat.icon}
              <span>{cat.label}</span>
            </span>

            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold ${getSeverityPill(recentToast.severity)}`}>
              {recentToast.severity === 'URGENT' ? 'URGENTE' : recentToast.severity}
            </span>

            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Supabase Live</span>
            </span>
          </div>

          <button
            onClick={dismissToast}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h4 className="text-sm font-bold text-white mb-1 leading-snug line-clamp-1 font-serif-luxury">
          {recentToast.title}
        </h4>
        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-3">
          {recentToast.message}
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
          <span className="text-[10px] text-neutral-400 font-mono">
            {recentToast.senderName || 'INBR Oficial'}
          </span>

          <div className="flex items-center gap-2">
            {recentToast.actionType && (
              <button
                onClick={handleActionClick}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gold-gradient text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow"
              >
                <span>Ver Ahora</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={dismissToast}
              className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
