import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent, uploadCmsImage } from '../utils/dynamicContent';
import { BREED_IMAGES } from '../utils/breedImages';
import { 
  Sparkles, 
  ArrowRight,
  UploadCloud,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface HeroBloodDataProps {
  onSearchRegistry?: (code: string) => void;
  onGoToLiveCamada?: () => void;
  onGoToForms?: () => void;
}

const HERO_BG_URL = BREED_IMAGES.heroBanner;

export const HeroBloodData: React.FC<HeroBloodDataProps> = () => {
  const { t } = useTranslation();
  const { content, updateContent } = useDynamicContent();
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const bannerImgUrl = content.heroBannerUrl || BREED_IMAGES.heroBanner;

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingBanner(true);
      try {
        const uploadedUrl = await uploadCmsImage(e.target.files[0]);
        updateContent({ heroBannerUrl: uploadedUrl });
      } catch (err) {
        console.error('Error uploading hero banner:', err);
      } finally {
        setIsUploadingBanner(false);
      }
    }
  };

  return (
    <section id="inicio" className="relative pt-10 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-[#050505]">
      {/* Background Image requested by user with rich dark luxury gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src={HERO_BG_URL}
          alt="INBR Background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-25 filter brightness-75 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-[#050505]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/95 via-transparent to-[#050505]/95" />
      </div>

      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-radial-luxury pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Official Emblem Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full p-1 bg-gradient-to-b from-[#FFE885] via-[#D4AF37] to-[#7A5817] shadow-[0_0_45px_rgba(212,175,55,0.6)] hover:scale-105 transition-all duration-300 group">
              <div className="w-full h-full rounded-full overflow-hidden bg-black p-0.5">
                <img
                  src={content.siteLogoUrl || '/logo-inbr.jpg'}
                  alt="INBR Official Medallion"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-inbr.jpg';
                  }}
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#18140B] border border-[#FFDF73] text-[10px] font-mono font-black text-[#FFE885] tracking-widest whitespace-nowrap shadow-md">
                OPERANDO DESDE 2022
              </div>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/60 mb-5 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-[#FFE885] animate-pulse" />
            <span className="text-xs md:text-sm font-bold text-[#FFE885] tracking-wider uppercase">
              {content.heroBadge || t('hero.badge')}
            </span>
          </div>

          {/* Main Title: INTERNATIONAL BREEDS REGISTRY */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-serif-luxury text-white tracking-wide leading-[1.1] mb-6 uppercase">
            {content.heroTitleLine1 || 'INTERNATIONAL'} <br />
            <span className="text-gold-gradient drop-shadow-[0_4px_30px_rgba(212,175,55,0.4)]">
              {content.heroTitleLine2 || 'BREEDS REGISTRY'}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-neutral-300 max-w-2xl mx-auto font-light leading-relaxed mb-8">
            {content.heroSubtitle || t('hero.subtitle')}
          </p>

          {/* Single Action Button: INBR ICCR Bloods Data */}
          <div className="flex items-center justify-center mb-12">
            <a
              href="https://thebullybloodsdata.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              title="Acceder a INBR ICCR Bloods Data"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>INBR ICCR Bloods Data</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ESPACIO PARA FOTO / BANNER EN GRANDE SOLICITADO POR EL USUARIO            */}
        {/* ========================================================================= */}
        <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden border-2 border-[#D4AF37]/50 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(212,175,55,0.25)] relative group">
          <div className="aspect-[21/9] sm:aspect-[24/9] w-full bg-black relative overflow-hidden">
            <img
              src={bannerImgUrl}
              alt="Banner Oficial INBR"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            
            {/* Banner Overlay Info */}
            <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono text-[#FFE885] font-black uppercase tracking-widest block mb-0.5">
                  INTERNATIONAL BREEDS REGISTRY
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury">
                  Genética & Excelencia Morfológica Certificada
                </h3>
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-[#D4AF37]/50 text-[11px] font-mono text-[#FFE885]">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>INBR OFICIAL • 2022-2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
