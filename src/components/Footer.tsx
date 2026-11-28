import React from 'react';
import { useTranslation, LANGUAGES, SupportedLocale } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { Shield, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { locale, setLocale, t } = useTranslation();
  const { content } = useDynamicContent();

  return (
    <footer className="bg-[#070707] border-t border-[#C9A86A]/20 pt-16 pb-12 text-neutral-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800/80">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D4AF37] p-0.5 bg-[#141414] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                <img
                  src={content.siteLogoUrl || '/logo-inbr.jpg'}
                  alt="INBR Official Medallion"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-inbr.jpg';
                  }}
                />
              </div>
              <div>
                <span className="font-serif-luxury font-black text-xl text-gold-gradient tracking-wider block">
                  INBR REGISTRY
                </span>
                <span className="text-[10px] tracking-widest uppercase text-neutral-300 font-semibold">
                  International Breeds Registry
                </span>
              </div>
            </div>

            <p className="text-neutral-300 leading-relaxed max-w-md text-xs">
              {t('footer.disclaimer')}
            </p>

            {/* Language Switcher in Footer */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-neutral-400">Idioma / Language:</span>
              <div className="flex items-center bg-[#141414] border border-[#C9A86A]/30 rounded-lg p-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLocale(lang.code as SupportedLocale)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                      locale === lang.code
                        ? 'bg-gold-gradient text-black font-extrabold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links 1 */}
          <div className="space-y-3">
            <h4 className="font-serif-luxury font-bold text-white text-sm uppercase tracking-wider text-[#E7C888]">
              Navegación Oficial
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#blood-data" className="hover:text-[#C9A86A] transition-colors">
                  INBR ICCR Bloods Data
                </a>
              </li>
              <li>
                <a href="#quienes-somos" className="hover:text-[#C9A86A] transition-colors">
                  Quiénes Somos & Misión
                </a>
              </li>
              <li>
                <a href="#equipo" className="hover:text-[#C9A86A] transition-colors">
                  Equipo Directivo & Jueces
                </a>
              </li>
              <li>
                <a href="#razas" className="hover:text-[#C9A86A] transition-colors">
                  Razas Tipo Bull & Edición Especial
                </a>
              </li>
              <li>
                <a href="#estandares" className="hover:text-[#C9A86A] transition-colors">
                  Estándares Raciales Oficiales
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links 2 */}
          <div className="space-y-3">
            <h4 className="font-serif-luxury font-bold text-white text-sm uppercase tracking-wider text-[#E7C888]">
              Servicios Digitales
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#verificacion" className="hover:text-[#C9A86A] transition-colors">
                  Verificación de Microchip
                </a>
              </li>
              <li>
                <a href="#camada-vivo" className="hover:text-[#C9A86A] transition-colors text-rose-300">
                  Registro de Camada en Vivo
                </a>
              </li>
              <li>
                <a href="#campeones" className="hover:text-[#C9A86A] transition-colors">
                  Puntajes y Campeones INBR
                </a>
              </li>
              <li>
                <a href="#salon-fama" className="hover:text-[#C9A86A] transition-colors">
                  Salón de la Fama
                </a>
              </li>
              <li>
                <a href="#formularios" className="hover:text-[#C9A86A] transition-colors">
                  Formulario F1 & Homologaciones
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>© 2022 - {new Date().getFullYear()} International Breeds Registry / International Wrestling. Trabajando desde el 2022. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-neutral-300 transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="hover:text-neutral-300 transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="hover:text-neutral-300 transition-colors">
              {t('footer.bylaws')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
