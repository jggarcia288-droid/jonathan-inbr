import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { BREED_IMAGES } from '../utils/breedImages';
import { UPCOMING_EVENTS } from '../data/registryData';
import { Calendar, MapPin, Award, UserCheck, Trophy, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

interface UpcomingEventsSectionProps {
  onRegisterToShow: (eventTitle: string) => void;
}

export const UpcomingEventsSection: React.FC<UpcomingEventsSectionProps> = ({ onRegisterToShow }) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  const bannerUrl = content.eventsBannerUrl || BREED_IMAGES.heroBanner;

  return (
    <section id="eventos" className="py-20 bg-[#0A0A0A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Return Bar */}
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-neutral-800">
          <a
            href="#inicio"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14120D] border border-[#D4AF37]/50 text-xs font-bold text-[#FFE885] hover:bg-[#201A0E] transition-all hover:scale-105"
            title="Regresar al Inicio"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Regresar al Inicio</span>
          </a>

          <a
            href="#formularios"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-all"
            title="Pre-inscribir en Formularios"
          >
            <span>Inscribir Ejemplar →</span>
          </a>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#18150f] border border-[#C9A86A]/40 mb-4">
            <Calendar className="w-4 h-4 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {t('events.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {content.eventsTitle || t('events.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg">
            {content.eventsSubtitle || t('events.subtitle')}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* ESPACIO PARA SUBIR FOTO / PÓSTER OFICIAL DE CIRCUITOS                     */}
        {/* ========================================================================= */}
        <div className="max-w-5xl mx-auto mb-16 rounded-3xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-2xl bg-black relative group">
          <div className="aspect-[21/9] sm:aspect-[24/8] w-full relative overflow-hidden">
            <img
              src={bannerUrl}
              alt="Póster de Circuitos INBR"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#FFE885] uppercase tracking-widest block">
                  CIRCUITO INTERNACIONAL INBR • OPERANDO DESDE 2022
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury">
                  Pistas Oficiales en México, USA y Latinoamérica
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {UPCOMING_EVENTS.map((event) => (
            <div
              key={event.id}
              className="rounded-3xl bg-[#141414] border border-[#C9A86A]/30 overflow-hidden flex flex-col justify-between hover:border-[#C9A86A] hover:shadow-[0_10px_35px_rgba(201,168,106,0.2)] transition-all group"
            >
              {/* Event Top Banner */}
              <div className="p-6 bg-gradient-to-r from-[#1f1a11] to-[#141414] border-b border-[#C9A86A]/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold tracking-wider uppercase">
                    {event.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#C9A86A]/15 text-[#E7C888] border border-[#C9A86A]/30 text-[10px] font-mono font-bold">
                    {event.pointsMultiplier}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white font-serif-luxury group-hover:text-[#E7C888] transition-colors leading-snug">
                  {event.title}
                </h3>
              </div>

              {/* Event Body Info */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-neutral-200">
                  <Calendar className="w-4 h-4 text-[#C9A86A] shrink-0" />
                  <span>{event.date}</span>
                </div>

                <div className="flex items-start gap-3 text-sm text-neutral-200">
                  <MapPin className="w-4 h-4 text-[#C9A86A] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-neutral-200">
                  <UserCheck className="w-4 h-4 text-[#C9A86A] shrink-0" />
                  <span>Jueces: <strong className="text-[#E7C888]">{event.judges.join(', ')}</strong></span>
                </div>

                {/* Categories Tags */}
                <div className="pt-2">
                  <span className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-2 font-mono">
                    Categorías en Disputa:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {event.categories.map((cat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-black border border-neutral-700 text-neutral-300 text-[10px] font-mono"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Event Footer Button */}
              <div className="p-6 pt-0">
                <button
                  onClick={() => onRegisterToShow(event.title)}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-gold-gradient hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{t('events.registerBtn')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
