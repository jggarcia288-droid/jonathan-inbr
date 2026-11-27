import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { Target, Compass, Flag, CheckCircle, ShieldCheck, Globe2 } from 'lucide-react';

export const AboutUs: React.FC = () => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  return (
    <section id="quienes-somos" className="py-20 bg-[#0E0E0E] relative border-t border-b border-[#C9A86A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18150f] border border-[#C9A86A]/30 mb-4">
            <Globe2 className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {t('about.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {content.aboutUsTitle || t('about.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed">
            {content.aboutUsSubtitle || t('about.subtitle')}
          </p>
        </div>

        {/* Mission & Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Mission Card */}
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#161616] to-[#111] border border-[#C9A86A]/30 shadow-xl group hover:border-[#C9A86A] transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#201c13] border border-[#C9A86A]/50 flex items-center justify-center text-[#C9A86A] shadow-md">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono text-[#C9A86A] uppercase tracking-wider block">INBR Core Purpose</span>
                <h3 className="text-2xl font-bold text-white font-serif-luxury">
                  {t('about.missionTitle')}
                </h3>
              </div>
            </div>
            <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
              {content.aboutUsParagraph1 || t('about.missionDesc')}
            </p>
          </div>

          {/* Vision Card */}
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-[#161616] to-[#111] border border-[#C9A86A]/30 shadow-xl group hover:border-[#C9A86A] transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#201c13] border border-[#C9A86A]/50 flex items-center justify-center text-[#C9A86A] shadow-md">
                <Compass className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono text-[#C9A86A] uppercase tracking-wider block">Global Horizon</span>
                <h3 className="text-2xl font-bold text-white font-serif-luxury">
                  {t('about.visionTitle')}
                </h3>
              </div>
            </div>
            <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">
              {content.aboutUsParagraph2 || t('about.visionDesc')}
            </p>
          </div>
        </div>

        {/* Strategic Objectives */}
        <div className="p-8 sm:p-10 rounded-2xl bg-[#141414] border border-[#C9A86A]/25 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
            <Flag className="w-6 h-6 text-[#C9A86A]" />
            <h3 className="text-xl sm:text-2xl font-bold text-white font-serif-luxury">
              {t('about.objectivesTitle')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0E0E0E] border border-neutral-800/80">
              <CheckCircle className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                {t('about.obj1')}
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0E0E0E] border border-neutral-800/80">
              <CheckCircle className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                {t('about.obj2')}
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0E0E0E] border border-neutral-800/80">
              <CheckCircle className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                {t('about.obj3')}
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0E0E0E] border border-neutral-800/80">
              <CheckCircle className="w-5 h-5 text-[#C9A86A] shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-300 font-medium leading-relaxed">
                {t('about.obj4')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
