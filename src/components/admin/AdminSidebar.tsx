import React from 'react';
import { 
  Award, 
  Users, 
  Image as ImageIcon, 
  Sparkles, 
  BookOpen, 
  Trophy, 
  Search, 
  Video, 
  Globe, 
  FileText, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Lock,
  Layers,
  FileSpreadsheet,
  Rocket
} from 'lucide-react';

export type AdminTabKey = 
  | 'visual_editor'
  | 'designer'
  | 'excel_database'
  | 'generator'
  | 'directiva'
  | 'judges'
  | 'representatives'
  | 'gallery'
  | 'special_edition'
  | 'certifications'
  | 'champions'
  | 'search'
  | 'litters'
  | 'content'
  | 'activity_logs'
  | 'publish_guide';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: AdminTabKey;
  onSelectTab: (tab: AdminTabKey) => void;
  isAdmin: boolean;
  userRoleName?: string;
  dogsCount?: number;
  pendingVouchersCount?: number;
  activityLogsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  isAdmin,
  userRoleName = 'Jonathan García',
  dogsCount = 0,
  pendingVouchersCount = 0,
  activityLogsCount = 0,
}) => {
  const navSections = [
    {
      group: 'GESTIÓN Y DISEÑO',
      items: [
        {
          id: 'visual_editor' as AdminTabKey,
          label: 'Editor Visual en Vivo (Igual a la Web)',
          shortLabel: 'Editor Web',
          icon: Layers,
          badge: 'WYSIWYG',
          badgeColor: 'bg-gold-gradient text-black font-black',
        },
        {
          id: 'designer' as AdminTabKey,
          label: 'Diseñador: Credencial & Pedigree',
          shortLabel: 'Diseñador',
          icon: Sliders,
          badge: 'Canvas',
          badgeColor: 'bg-[#D4AF37] text-black',
        },
        {
          id: 'directiva' as AdminTabKey,
          label: 'Directiva Ejecutiva',
          shortLabel: 'Directiva',
          icon: ShieldCheck,
          badge: 'Equipo',
          badgeColor: 'bg-[#D4AF37] text-black',
        },
        {
          id: 'judges' as AdminTabKey,
          label: 'Jueces Oficiales',
          shortLabel: 'Jueces',
          icon: Award,
        },
        {
          id: 'representatives' as AdminTabKey,
          label: 'Representantes & Delegados',
          shortLabel: 'Delegados',
          icon: Users,
          badgeCount: pendingVouchersCount > 0 ? pendingVouchersCount : undefined,
          badgeColor: 'bg-rose-600 text-white',
        },
        {
          id: 'gallery' as AdminTabKey,
          label: 'Galería Oficial',
          shortLabel: 'Galería',
          icon: ImageIcon,
        },
        {
          id: 'special_edition' as AdminTabKey,
          label: 'Ediciones Especiales',
          shortLabel: 'Especiales',
          icon: Sparkles,
        },
        {
          id: 'certifications' as AdminTabKey,
          label: 'Certificaciones & Estándares',
          shortLabel: 'Estándares',
          icon: BookOpen,
        },
        {
          id: 'champions' as AdminTabKey,
          label: 'Campeonatos & Tabla de Puntos',
          shortLabel: 'Puntajes',
          icon: Trophy,
        },
      ],
    },
    {
      group: 'REGISTROS & CONSULTA',
      items: [
        {
          id: 'excel_database' as AdminTabKey,
          label: 'Cargar Bases de Datos (Excel / CSV)',
          shortLabel: 'Cargar Excel',
          icon: FileSpreadsheet,
          badge: 'Base de Datos',
          badgeColor: 'bg-emerald-600 text-white font-bold',
        },
        {
          id: 'search' as AdminTabKey,
          label: 'Buscador & Registros Supabase',
          shortLabel: 'Buscador',
          icon: Search,
          badgeCount: dogsCount > 0 ? dogsCount : undefined,
          badgeColor: 'bg-neutral-800 text-[#FFE885]',
        },
        {
          id: 'generator' as AdminTabKey,
          label: 'Generador Oficial (PDF/JPG)',
          shortLabel: 'Generador',
          icon: FileText,
        },
        {
          id: 'litters' as AdminTabKey,
          label: 'Camadas en Vivo',
          shortLabel: 'Camadas',
          icon: Video,
        },
      ],
    },
    {
      group: 'CMS & AUDITORÍA',
      items: [
        {
          id: 'content' as AdminTabKey,
          label: 'Editor Web Global & DOM',
          shortLabel: 'Web CMS',
          icon: Globe,
        },
        {
          id: 'activity_logs' as AdminTabKey,
          label: 'Logs de Auditoría',
          shortLabel: 'Logs',
          icon: FileText,
          badgeCount: activityLogsCount > 0 ? activityLogsCount : undefined,
          badgeColor: 'bg-neutral-800 text-neutral-300',
        },
        {
          id: 'publish_guide' as AdminTabKey,
          label: 'Cómo Ver y Publicar la Web en Línea',
          shortLabel: 'Publicar Web',
          icon: Rocket,
          badge: 'Online 24/7',
          badgeColor: 'bg-[#D4AF37] text-black font-black',
        },
      ],
    },
  ];

  const representativeSections = [
    {
      group: 'PANEL DE REPRESENTANTE: CARGA Y TRÁMITES',
      items: [
        {
          id: 'litters' as AdminTabKey,
          label: 'Registrar Camada en Vivo',
          shortLabel: 'Camadas',
          icon: Video,
          badge: 'Carga',
          badgeColor: 'bg-emerald-700 text-white',
        },
        {
          id: 'generator' as AdminTabKey,
          label: 'Registrar F1 Inicial / Homologación',
          shortLabel: 'Trámites',
          icon: FileText,
          badge: 'Oficial',
          badgeColor: 'bg-[#D4AF37] text-black',
        },
        {
          id: 'search' as AdminTabKey,
          label: 'Consultar Registros Supabase',
          shortLabel: 'Buscador',
          icon: Search,
          badgeCount: dogsCount > 0 ? dogsCount : undefined,
          badgeColor: 'bg-neutral-800 text-[#FFE885]',
        },
      ],
    },
  ];

  const sectionsToRender = isAdmin ? navSections : representativeSections;

  return (
    <aside
      className={`no-print transition-all duration-300 ease-in-out shrink-0 bg-[#0A0906] border-r border-[#D4AF37]/40 flex flex-col justify-between z-20 ${
        isCollapsed ? 'w-16 sm:w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="p-3 sm:p-4 border-b border-neutral-800/80 flex items-center justify-between gap-2">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full border border-[#D4AF37] p-0.5 bg-black overflow-hidden shrink-0 shadow">
                <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-black tracking-wider text-gold-gradient uppercase block truncate leading-tight font-serif-luxury">
                  PANEL MAESTRO
                </span>
                <span className="text-[9px] font-mono text-neutral-400 block truncate">
                  International Breeds Registry
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded-full border border-[#D4AF37] p-0.5 bg-black overflow-hidden shadow">
              <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
          )}

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
            title={isCollapsed ? 'Expandir Sidebar' : 'Colapsar Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-[#FFE885]" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-[#FFE885]" />
            )}
          </button>
        </div>

        {/* User Role status card */}
        {!isCollapsed && (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-[#141008] border border-[#D4AF37]/30 shadow-inner">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isAdmin ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black text-white truncate block font-mono">
                  {userRoleName}
                </span>
                <span className={`text-[9px] font-mono font-bold block ${isAdmin ? 'text-[#FFE885]' : 'text-neutral-400'}`}>
                  {isAdmin ? '👑 ADMINISTRADOR MAESTRO' : '🔒 REPRESENTANTE AUTORIZADO'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs List */}
        <div className="p-2 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar">
          {sectionsToRender.map((section) => (
            <div key={section.group} className="space-y-1">
              {!isCollapsed && (
                <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider text-neutral-400 px-2.5 block mb-1">
                  {section.group}
                </span>
              )}

              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition-all cursor-pointer group relative ${
                      isCollapsed
                        ? 'justify-center p-2.5'
                        : 'justify-between px-3 py-2 text-left'
                    } ${
                      isActive
                        ? 'bg-gold-gradient text-black font-black shadow-lg scale-102'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={`shrink-0 transition-transform ${
                          isCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                        } ${
                          isActive
                            ? 'text-black stroke-[2.5]'
                            : 'text-[#D4AF37] group-hover:scale-110'
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="text-xs truncate font-medium">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {/* Badge or indicator */}
                    {!isCollapsed && (
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {item.badge && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${item.badgeColor || 'bg-black/30'}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.badgeCount !== undefined && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${item.badgeColor || 'bg-neutral-800'}`}>
                            {item.badgeCount}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Active accent dot in collapsed mode */}
                    {isCollapsed && isActive && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-black shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer toggle / status */}
      <div className="p-3 border-t border-neutral-800/80 bg-[#080705]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#D4AF37]" />
              <span>v2.4 Segura</span>
            </span>
            <span className="text-[#FFE885]">Supabase Conectado</span>
          </div>
        ) : (
          <div className="flex justify-center text-neutral-400" title="Sistema Seguro INBR">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          </div>
        )}
      </div>
    </aside>
  );
};
