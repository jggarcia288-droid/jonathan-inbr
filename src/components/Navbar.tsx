import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, LANGUAGES, SupportedLocale } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { useNotifications } from '../context/NotificationContext';
import { 
  Globe, 
  ChevronDown, 
  Check, 
  Menu, 
  X, 
  ExternalLink,
  Dna,
  Lock,
  Trophy,
  Bell,
  Radio,
  FileText,
  Users,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';

interface NavbarProps {
  onOpenVerify: () => void;
  onOpenRegister: () => void;
  onOpenExcelImporter: () => void;
  onOpenAdminPanel: () => void;
  onOpenRepresentativePanel?: () => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenVerify, 
  onOpenRegister, 
  onOpenExcelImporter, 
  onOpenAdminPanel,
  onOpenRepresentativePanel,
  onOpenNotifications
}) => {
  const { locale, setLocale, t } = useTranslation();
  const { content } = useDynamicContent();
  const { unreadCount, isConnected } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent background body scroll when mobile menu is open & handle Escape key
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const primaryNavLinks = [
    { href: '#inicio', label: 'Inicio' },
    { href: '#razas', label: 'Razas' },
    { href: '#verificacion', label: 'Verificación' },
    { href: '#eventos', label: 'Eventos' },
    { href: '#formularios', label: 'Registro & Árbol' },
    { href: '#criadores', label: 'Criadores' },
  ];

  const moreNavLinks = [
    { href: '#galeria', label: 'Galería de Fotos' },
    { href: '#quienes-somos', label: 'Quiénes Somos' },
    { href: '#estandares', label: 'Estándares Raciales' },
    { href: '#certificaciones', label: 'Certificaciones Oficiales' },
    { href: '#campeones', label: 'Puntajes & Campeonatos' },
    { href: '#edicion-especial', label: 'Edición Especial INBR' },
    { href: '#equipo', label: 'Equipo Directivo & Jueces' },
    { href: '#salon-fama', label: 'Salón de la Fama' },
    { href: '#contacto', label: 'Contacto' },
  ];

  return (
    <>
      <header className="navbar sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-[#D4AF37]/35 shadow-[0_4px_30px_rgba(0,0,0,0.85)] w-full max-w-full">
        {/* Main Bar: Responsive, clean, without excessive top banner height */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            
            {/* Left: Brand Identity with Official Medallion */}
            <a href="#" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#D4AF37] p-0.5 bg-[#141414] shadow-[0_0_15px_rgba(212,175,55,0.45)] group-hover:scale-105 transition-transform shrink-0">
                <img
                  src={content.siteLogoUrl || '/logo-inbr.jpg'}
                  alt="INBR Official Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-inbr.jpg';
                  }}
                />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif-luxury font-black text-lg sm:text-2xl tracking-wider text-gold-gradient drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)] leading-none">
                    INBR
                  </span>
                  <span className="px-1 py-0.2 sm:px-1.5 sm:py-0.5 text-[8px] sm:text-[9px] font-black rounded tracking-widest uppercase bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885]">
                    OFICIAL
                  </span>
                </div>
                <span className="hidden md:inline text-[10px] tracking-wider uppercase text-neutral-300 font-bold leading-tight truncate">
                  International Breeds Registry
                </span>
              </div>
            </a>

            {/* Center: Desktop Navigation Links (hidden on mobile) */}
            <nav className="navbar-nav hidden lg:flex items-center justify-center space-x-1 xl:space-x-1.5 flex-1 px-2 relative z-50">
              {primaryNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-2.5 py-1.5 text-xs xl:text-[13px] font-bold text-neutral-200 hover:text-[#FFE885] hover:bg-[#1C160B] rounded-lg border border-transparent hover:border-[#D4AF37]/40 transition-all whitespace-nowrap"
                >
                  {link.label}
                </a>
              ))}

              {/* Más Secciones Dropdown */}
              <div className="relative z-50" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs xl:text-[13px] font-bold rounded-lg border transition-all ${
                    moreMenuOpen
                      ? 'text-[#FFE885] bg-[#1C160B] border-[#D4AF37]'
                      : 'text-neutral-300 hover:text-white border-transparent hover:border-neutral-700'
                  }`}
                >
                  <span>Más Secciones</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180 text-[#FFDF73]' : ''}`} />
                </button>

                {moreMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-[#0D0D0D]/98 backdrop-blur-xl border-2 border-[#D4AF37] shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(212,175,55,0.35)] py-2 z-[70] animate-fadeIn max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="px-3.5 py-1.5 border-b border-neutral-800 text-[10px] font-mono text-[#D4AF37] uppercase font-bold tracking-wider flex items-center justify-between">
                      <span>Secciones Oficiales INBR</span>
                      <span className="text-[9px] text-[#FFE885]/70">10 Secciones</span>
                    </div>
                    {moreNavLinks.map((item, idx) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreMenuOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-[#1E190F] hover:text-[#FFE885] transition-all border-l-2 border-transparent hover:border-[#D4AF37]"
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-neutral-600 font-mono">#{idx + 7}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Right: Actions (Notifications, Language & Panels) */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative z-50">
              {/* Real-Time Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 sm:p-2.5 rounded-xl bg-[#141414] border border-[#D4AF37]/50 hover:border-[#FFDF73] hover:bg-[#1E190E] transition-all shadow-md group shrink-0"
                title="Centro de Notificaciones en Tiempo Real (INBR Live)"
                aria-label="Abrir notificaciones"
              >
                <Bell className="w-4 h-4 text-[#FFDF73] group-hover:scale-110 transition-transform" />
                
                {unreadCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border border-black shadow-md animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : (
                  <span 
                    className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                      isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} 
                    title={isConnected ? 'Supabase Realtime Conectado' : 'Conectando a Supabase'}
                  />
                )}
              </button>

              {/* Language Selector */}
              <div className="relative shrink-0 z-50" ref={langDropdownRef}>
                <button
                  type="button"
                  onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-[#141414] border border-[#D4AF37]/50 hover:border-[#FFDF73] hover:bg-[#1E190E] transition-all shadow-md group"
                  aria-label="Seleccionar idioma"
                  title="Cambiar idioma"
                >
                  <span className="text-sm sm:text-base">{currentLang.flag}</span>
                  <span className="hidden xl:inline uppercase text-[11px] font-bold text-[#FFDF73] tracking-wide">{currentLang.label}</span>
                  <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${langDropdownOpen ? 'rotate-180 text-[#FFDF73]' : ''}`} />
                </button>

                {langDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#0F0F0F]/98 backdrop-blur-xl border-2 border-[#D4AF37] shadow-[0_15px_40px_rgba(0,0,0,0.95)] py-2 z-[70] animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-neutral-800 text-[10px] font-mono text-[#D4AF37] uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3 h-3" />
                      <span>Seleccionar Idioma</span>
                    </div>
                    {LANGUAGES.map((lang) => {
                      const isActive = locale === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLocale(lang.code as SupportedLocale);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-[#D4AF37]/25 to-transparent text-[#FFE885] font-bold border-l-4 border-[#D4AF37]'
                              : 'text-neutral-300 hover:bg-[#1E1A11] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-[#FFDF73]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Desktop Panels (Separated: Representantes vs Master) */}
              <div className="hidden lg:flex items-center gap-2">
                {/* Panel de Representantes */}
                {onOpenRepresentativePanel && (
                  <button
                    type="button"
                    onClick={onOpenRepresentativePanel}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#16130D] border border-[#D4AF37]/60 hover:bg-[#221B11] hover:border-[#FFDF73] transition-all shadow cursor-pointer whitespace-nowrap"
                    title="Panel para Representantes y Delegados: Cargar Camadas, Homologaciones e Iniciales"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Panel Representante</span>
                  </button>
                )}

                {/* Panel Master (Jonathan García) */}
                <button
                  type="button"
                  onClick={onOpenAdminPanel}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer whitespace-nowrap"
                  title="Panel Master Exclusivo (Jonathan García - CEO): Edición Visual y Administración"
                >
                  <Lock className="w-3.5 h-3.5 text-black" />
                  <span>Panel Master</span>
                </button>
              </div>

              {/* Mobile Menu Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-neutral-900 border border-[#D4AF37]/40 text-[#FFE885] hover:bg-[#1E190E] focus:outline-none shrink-0"
                aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-[#FFE885]" /> : <Menu className="w-5 h-5 text-[#FFE885]" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* FIXED MOBILE NAVIGATION PANEL (MAX-WIDTH, INTERNAL SCROLL, ZERO DISTORTION) */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden overflow-hidden" aria-modal="true" role="dialog">
          {/* Backdrop overlay with blur */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Navigation Panel Container with Fixed Positioning, Max-Width, and Internal Scroll */}
          <div className="fixed inset-y-0 right-0 z-[101] w-full max-w-sm sm:max-w-md bg-[#0A0A0A] border-l-2 border-[#D4AF37]/60 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col h-full max-h-screen overflow-hidden animate-slideInRight">
            
            {/* 1. Header (Fixed at top of drawer) */}
            <div className="px-4 py-3.5 border-b border-neutral-800 bg-[#120F09] flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#18140B] border border-[#D4AF37] p-0.5 overflow-hidden">
                  <img
                    src={content.siteLogoUrl || '/logo-inbr.jpg'}
                    alt="INBR Logo"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/logo-inbr.jpg';
                    }}
                  />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-serif-luxury font-black text-base text-gold-gradient leading-none">
                      INBR
                    </span>
                    <span className="px-1 py-0.2 text-[8px] font-black rounded bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885]">
                      OFICIAL
                    </span>
                  </div>
                  <span className="text-[9px] text-neutral-400 font-mono tracking-wider uppercase">
                    Menú de Navegación
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-neutral-300 hover:text-white transition-all active:scale-95"
                aria-label="Cerrar menú de navegación"
              >
                <X className="w-5 h-5 text-[#FFE885]" />
              </button>
            </div>

            {/* 2. Internal Scrollable Body with overscroll-contain */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 custom-scrollbar">
              
              {/* Notifications Status Card */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenNotifications?.();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#141009] border border-[#D4AF37]/40 shadow-sm hover:border-[#FFDF73] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FFDF73]" />
                  <span className="text-xs font-bold text-neutral-200">INBR Live Notifications</span>
                </div>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                    {unreadCount} nuevas
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {isConnected ? '● Conectado' : '● Activo'}
                  </span>
                )}
              </button>

              {/* SEPARATED PANELS ACCESS CARDS */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] block font-bold">
                  Paneles Exclusivos de Control:
                </span>

                {/* Panel Master Button */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdminPanel();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black font-black text-xs shadow-lg hover:brightness-105 active:scale-98 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-black text-[#FFE885] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black uppercase leading-tight">Panel Master (CEO)</div>
                      <div className="text-[10px] font-semibold text-neutral-800">Editor Visual, Certificados y Base Central</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-black shrink-0" />
                </button>

                {/* Panel Representantes Button */}
                {onOpenRepresentativePanel && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenRepresentativePanel();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#14110A] border-2 border-[#D4AF37]/60 text-[#FFE885] font-black text-xs shadow hover:bg-[#1E190E] active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#221B11] border border-[#D4AF37] text-[#FFE885] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold leading-tight">Panel de Representantes</div>
                        <div className="text-[10px] text-neutral-400 font-normal">Cargar Camadas, Homologaciones e Iniciales</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                )}
              </div>

              {/* EXTERNAL TREE TOOL */}
              <a
                href="https://thebullybloodsdata.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[#16140F] border border-[#D4AF37]/40 text-[#FFE885] text-xs font-bold shadow hover:border-[#FFDF73] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Dna className="w-4 h-4 text-[#D4AF37]" />
                  <span className="truncate">INBR ICCR Bloods Data (Crear Árbol con Fotos)</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#FFE885]" />
              </a>

              {/* CLEAN NAVIGATION LINKS (NO DUPLICATES) */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-bold mb-1">
                  Secciones de la Plataforma:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[...primaryNavLinks, ...moreNavLinks].map((link, idx) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:bg-[#1C160B] hover:text-[#FFE885] border border-neutral-800/80 hover:border-[#D4AF37]/40 transition-all flex items-center justify-between"
                    >
                      <span className="truncate">{link.label}</span>
                      <span className="text-neutral-600 text-[10px] shrink-0">#{idx + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Footer (Fixed at bottom of drawer) */}
            <div className="p-3.5 border-t border-neutral-800 bg-[#120F09] shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>✕ Cerrar Menú y Volver al Sitio</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
