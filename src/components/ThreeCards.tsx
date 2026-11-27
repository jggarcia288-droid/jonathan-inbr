import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Globe, ShieldAlert, Award, FileCheck2, Cpu, CheckCircle } from 'lucide-react';

interface ThreeCardsProps {
  onOpenVerify: () => void;
  onOpenForms: () => void;
}

export const ThreeCards: React.FC<ThreeCardsProps> = ({ onOpenVerify, onOpenForms }) => {
  const { t } = useTranslation();

  const cards = [
    {
      icon: Globe,
      title: t('threeCards.card1Title'),
      desc: t('threeCards.card1Desc'),
      action: onOpenForms,
      btnLabel: 'Iniciar Registro',
      highlightBadge: '28+ Países Reconocidos',
    },
    {
      icon: Award,
      title: t('threeCards.card2Title'),
      desc: t('threeCards.card2Desc'),
      action: onOpenVerify,
      btnLabel: 'Validar Pedigrí',
      highlightBadge: 'Homologación ABKC/UKC/FCI',
    },
    {
      icon: Cpu,
      title: t('threeCards.card3Title'),
      desc: t('threeCards.card3Desc'),
      action: onOpenVerify,
      btnLabel: 'Auditoría Criptográfica',
      highlightBadge: 'Microchip ISO 11784/11785',
    },
  ];

  return (
    <section className="py-16 bg-[#0A0A0A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl bg-gradient-to-b from-[#18140B] via-[#12110D] to-[#0A0A0A] border-2 border-[#D4AF37]/40 p-8 flex flex-col justify-between group hover-card-luxury transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#1c1811] border border-[#C9A86A]/50 flex items-center justify-center text-[#C9A86A] shadow-inner group-hover:scale-105 transition-transform">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#C9A86A]/15 text-[#E7C888] border border-[#C9A86A]/30">
                      {card.highlightBadge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white font-serif-luxury mb-4 group-hover:text-[#E7C888] transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-neutral-300 text-sm leading-relaxed mb-6 font-normal">
                    {card.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-800/80">
                  <button
                    onClick={card.action}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-neutral-200 bg-[#1A1A1A] border border-neutral-700 hover:text-black hover:bg-gold-gradient hover:border-[#C9A86A] transition-all"
                  >
                    <span>{card.btnLabel}</span>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
