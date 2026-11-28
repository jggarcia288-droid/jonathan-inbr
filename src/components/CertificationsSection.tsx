import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { Award, ArrowRightLeft, BadgeCheck, Users, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const CertificationsSection: React.FC = () => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  const certifications = [
    {
      id: 'f1',
      icon: Award,
      badge: 'TRÁMITE FUNDACIONAL',
      title: 'F1 INICIAL',
      subtitle: 'Registro Canino Inicial de Ejemplar',
      accent: 'border-[#D4AF37]',
      glow: 'shadow-[0_0_25px_rgba(212,175,55,0.25)]',
      whatIs: 'Es el registro primario y certificado oficial de pureza genética emitido para un cachorro o ejemplar fundador que no cuenta con un árbol previo registrado en el club.',
      whatFor: 'Sirve para certificar su fenotipo conforme al estándar, asignarle su número de folio único e irrepetible, registrar su microchip de 15 dígitos y abrir su libro genealógico para que toda su descendencia cuente con pedigrí reconocido internacionalmente.',
    },
    {
      id: 'homologacion',
      icon: ArrowRightLeft,
      badge: 'VALIDEZ INTERNACIONAL',
      title: 'HOMOLOGACIÓN',
      subtitle: 'Transferencia de Otros Clubes a INBR',
      accent: 'border-emerald-500/50',
      glow: 'shadow-[0_0_25px_rgba(16,185,129,0.2)]',
      whatIs: 'Es el proceso técnico-jurídico mediante el cual INBR convalida y reconoce oficialmente el pedigrí o certificado de registro emitido por otros registros caninos (como ABKC, UKC, FCI, AKC, IBC, etc.).',
      whatFor: 'Sirve para incorporar a tu ejemplar al circuito mundial INBR sin perder sus generaciones anteriores ni sus títulos de campeonato conquistados, otorgándole validez notarial y derecho a competir en todos nuestros shows y exposiciones oficiales.',
    },
    {
      id: 'permanente',
      icon: BadgeCheck,
      badge: 'TÍTULO DEFINITIVO VITALICIO',
      title: 'REGISTRO PERMANENTE',
      subtitle: 'Certificación Notarial Adulta Vitalicia',
      accent: 'border-[#FFDF73]',
      glow: 'shadow-[0_0_30px_rgba(255,223,115,0.3)]',
      whatIs: 'Es el título de propiedad definitiva y consagración genealógica vitalicia que se otorga al ejemplar una vez alcanzada la madurez morfológica e inspeccionado su microchip oficial.',
      whatFor: 'Sirve para sellar para siempre los derechos de reproducción certificada, emitir el certificado final en papel moneda de seguridad con código QR criptográfico inmutable, y asegurar el valor legal y comercial más alto en el mercado canino mundial.',
    },
    {
      id: 'camada',
      icon: Users,
      badge: 'AUDITORÍA FÍSICA EN VIVO',
      title: 'REGISTRO DE CAMADA',
      subtitle: 'Acta de Nacimiento Verificada en Vivo',
      accent: 'border-rose-500/50',
      glow: 'shadow-[0_0_25px_rgba(244,63,94,0.2)]',
      whatIs: 'Es la certificación en tiempo real del nacimiento de una camada auditada mediante transmisión de cámara directa (sin fotos falsas ni videos guardados de galería).',
      whatFor: 'Sirve para garantizar con certeza absoluta del 100% la paternidad y maternidad física de los cachorros junto a la madre amamantando, erradicando el fraude genético y entregando a cada cachorro su microchip y certificado antes de salir del criadero.',
    },
  ];

  return (
    <section id="certificaciones" className="py-20 bg-[#050505] relative border-t border-b border-[#D4AF37]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              DOCUMENTACIÓN Y AVALES OFICIALES INBR
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3">
            {content.certificationsTitle || 'Nuestras Certificaciones'}
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {content.certificationsSubtitle || 'Conoce cada uno de los trámites y avales oficiales de INBR: qué representan y para qué sirven a tu criadero.'}
          </p>
        </div>

        {/* 4 Cards Grid: F1 Inicial, Homologación, Registro Permanente, Registro de Camada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {certifications.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`rounded-3xl bg-gradient-to-b from-[#14120C] via-[#0E0D09] to-[#080808] border-2 ${item.accent} ${item.glow} p-7 sm:p-8 flex flex-col justify-between hover-card-luxury transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-13 h-13 rounded-2xl bg-[#1C170E] border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE885] shadow-inner">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-md bg-black/80 text-[#FFE885] border border-[#D4AF37]/40 tracking-wider">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white font-serif-luxury mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#D4AF37] font-semibold mb-6">
                    {item.subtitle}
                  </p>

                  {/* ¿QUÉ ES? */}
                  <div className="mb-5 p-4 rounded-2xl bg-[#080808] border border-neutral-800/90">
                    <span className="text-[11px] uppercase tracking-wider text-[#FFE885] font-black block mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      ¿QUÉ ES?
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                      {item.whatIs}
                    </p>
                  </div>

                  {/* ¿PARA QUÉ SIRVE? */}
                  <div className="p-4 rounded-2xl bg-[#080808] border border-neutral-800/90">
                    <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-black block mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ¿PARA QUÉ SIRVE Y POR QUÉ ES INDISPENSABLE?
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                      {item.whatFor}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono text-[11px]">
                    INBR CERTIFICATE PROTOCOL
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Emisión Notariada Oficial</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
