import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { SAMPLE_DOGS, DogRecord } from '../data/registryData';
import { Crown, Trophy, Sparkles, Award, Star, Flame, ChevronRight } from 'lucide-react';

interface HallOfFameSectionProps {
  onSelectDog: (dog: DogRecord) => void;
}

export const HallOfFameSection: React.FC<HallOfFameSectionProps> = ({ onSelectDog }) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  const vulcan = SAMPLE_DOGS.find((d) => d.name === 'KING VULCAN') || SAMPLE_DOGS[0];
  const bella = SAMPLE_DOGS.find((d) => d.name === 'QUEEN BELLA') || SAMPLE_DOGS[1];

  return (
    <section id="salon-fama" className="py-20 bg-[#0E0E0E] relative border-t border-b border-[#C9A86A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#20180b] border border-[#C9A86A]/50 mb-4 shadow-[0_0_15px_rgba(201,168,106,0.25)]">
            <Crown className="w-4 h-4 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {t('hallOfFame.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {content.hallOfFameTitle || t('hallOfFame.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg">
            {content.hallOfFameSubtitle || t('hallOfFame.subtitle')}
          </p>
        </div>

        {/* 2 Hall of Fame Legends Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* KING VULCAN */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#18150f] via-[#141414] to-[#0A0A0A] border-2 border-[#C9A86A] p-8 overflow-hidden shadow-[0_0_40px_rgba(201,168,106,0.15)] flex flex-col justify-between group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown className="w-40 h-40 text-[#C9A86A]" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full bg-gold-gradient text-black font-extrabold text-xs tracking-wider flex items-center gap-1.5 shadow-md">
                  <Flame className="w-3.5 h-3.5 fill-black" />
                  LEGEND OF THE RING
                </span>
                <span className="text-xs font-mono font-bold text-[#E7C888]">
                  REG: {vulcan.regNumber}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-center mb-6">
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-[#C9A86A] shadow-2xl shrink-0">
                  <img
                    src={content.hallOfFamePhoto1 || vulcan.imageUrl}
                    alt={vulcan.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div>
                  <h3 className="text-3xl font-black text-gold-gradient font-serif-luxury mb-1">
                    {t('hallOfFame.vulcan.title')}
                  </h3>
                  <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    {t('hallOfFame.vulcan.subtitle')}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-mono">
                    {t('hallOfFame.vulcan.breed')}
                  </div>
                </div>
              </div>

              <p className="text-neutral-300 text-sm leading-relaxed mb-6 font-normal">
                {t('hallOfFame.vulcan.desc')}
              </p>

              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-neutral-800 space-y-2 mb-6 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Récord en Exposiciones:</span>
                  <span className="text-[#E7C888] font-bold font-mono">{t('hallOfFame.vulcan.record')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Puntaje Oficial Acumulado:</span>
                  <span className="text-white font-bold font-mono">{vulcan.points} Puntos INBR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Línea Sanguínea:</span>
                  <span className="text-neutral-200">Padre: {vulcan.sire}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectDog(vulcan)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              <span>Ver Pedigrí y Genograma Oficial de King Vulcan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* QUEEN BELLA */}
          <div className="relative rounded-3xl bg-gradient-to-b from-[#18150f] via-[#141414] to-[#0A0A0A] border-2 border-[#C9A86A] p-8 overflow-hidden shadow-[0_0_40px_rgba(201,168,106,0.15)] flex flex-col justify-between group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy className="w-40 h-40 text-[#C9A86A]" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full bg-gold-gradient text-black font-extrabold text-xs tracking-wider flex items-center gap-1.5 shadow-md">
                  <Star className="w-3.5 h-3.5 fill-black" />
                  GOLDEN MATRIARCH
                </span>
                <span className="text-xs font-mono font-bold text-[#E7C888]">
                  REG: {bella.regNumber}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-center mb-6">
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-2 border-[#C9A86A] shadow-2xl shrink-0">
                  <img
                    src={content.hallOfFamePhoto2 || bella.imageUrl}
                    alt={bella.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div>
                  <h3 className="text-3xl font-black text-gold-gradient font-serif-luxury mb-1">
                    {t('hallOfFame.bella.title')}
                  </h3>
                  <div className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    {t('hallOfFame.bella.subtitle')}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs font-mono">
                    {t('hallOfFame.bella.breed')}
                  </div>
                </div>
              </div>

              <p className="text-neutral-300 text-sm leading-relaxed mb-6 font-normal">
                {t('hallOfFame.bella.desc')}
              </p>

              <div className="p-4 rounded-xl bg-[#0D0D0D] border border-neutral-800 space-y-2 mb-6 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Récord en Pista:</span>
                  <span className="text-[#E7C888] font-bold font-mono">{t('hallOfFame.bella.record')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Puntaje Oficial Acumulado:</span>
                  <span className="text-white font-bold font-mono">{bella.points} Puntos INBR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Progenie Registrada:</span>
                  <span className="text-neutral-200">8 Campeones Homologados</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectDog(bella)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              <span>Ver Pedigrí y Genograma Oficial de Queen Bella</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
