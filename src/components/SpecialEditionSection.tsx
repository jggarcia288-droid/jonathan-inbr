import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { Crown, Sparkles, UploadCloud, ShieldAlert, Award, Camera, Image as ImageIcon } from 'lucide-react';

interface SpecialDog {
  id: string;
  name: string;
  category: string;
  regNumber: string;
  owner: string;
  kennel: string;
  height: string;
  imageUrl: string;
  status: string;
}

export const SpecialEditionSection: React.FC = () => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();

  const specialBanner1 = content.specialEditionBanner1 || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1400&q=80';
  const specialBanner2 = content.specialEditionBanner2 || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1400&q=80';

  const participatingDogs = (content.specialEditionList && content.specialEditionList.length > 0)
    ? content.specialEditionList
    : [
        {
          id: 'sp-1',
          name: 'PHENOM NANO BULLET',
          category: 'Nano Bully (<11 in)',
          regNumber: 'INBR-SP-001',
          owner: 'Jonathan Garcia',
          kennel: 'Imperial Bullyz International',
          height: '10.5 pulgadas',
          imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
          status: 'AUTORIZADO OFICIAL',
        },
        {
          id: 'sp-2',
          name: 'CLEAN DIAMOND GHOST',
          category: 'Clean Exotic',
          regNumber: 'INBR-SP-002',
          owner: 'Carlos Otero',
          kennel: 'Lone Star Bullies',
          height: '12.0 pulgadas',
          imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80',
          status: 'AUTORIZADO OFICIAL',
        },
        {
          id: 'sp-3',
          name: 'EXTREME POCKET TITAN',
          category: 'Extreme Pocket',
          regNumber: 'INBR-SP-003',
          owner: 'Criadero Titan Oficial',
          kennel: 'Titan Bullyz Oficial',
          height: '14.2 pulgadas',
          imageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80',
          status: 'AUTORIZADO OFICIAL',
        },
      ];

  const specialCategories = [
    {
      title: 'Micro Bully',
      desc: 'Alzada extremadamente reducida conservando proporciones óseas sólidas y respiración libre.',
      height: '< 14 pulgadas',
      bone: 'Densidad Ósea 9/10',
      tag: 'ULTRA COMPACT',
      accent: 'border-amber-500/40',
      bgGlow: 'from-amber-950/20 to-[#12110D]',
    },
    {
      title: 'Clean Exotic',
      desc: 'Línea exótica refinada sin papada excesiva, ojos limpios y biomecánica funcional comprobada.',
      height: '11 - 13 pulgadas',
      bone: 'Cero Exceso Dérmico',
      tag: 'CLEAN PROTOCOL',
      accent: 'border-[#D4AF37]/50',
      bgGlow: 'from-[#241A0E]/40 to-[#12110D]',
    },
    {
      title: 'Extreme Pocket',
      desc: 'Masa muscular extrema en alzada de pocket, costillar en barril y tren posterior sobresaliente.',
      height: '14 - 16 pulgadas',
      bone: 'Caja Torácica en Barril',
      tag: 'MASSIVE FRAME',
      accent: 'border-yellow-600/40',
      bgGlow: 'from-yellow-950/20 to-[#12110D]',
    },
    {
      title: 'Nano Bully',
      desc: 'Dimensión diminuta extrema garantizando movilidad armónica y ausencia de defectos vertebrales.',
      height: '< 11 pulgadas',
      bone: 'Talla Mínima Certificada',
      tag: 'ULTRA RARE',
      accent: 'border-amber-400/50',
      bgGlow: 'from-amber-900/30 to-[#12110D]',
    },
  ];

  return (
    <section id="edicion-especial" className="py-24 bg-[#0A0A0A] relative overflow-hidden border-t border-b border-[#D4AF37]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              EDICIÓN ESPECIAL INBR
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3 uppercase">
            Edición Especial INBR
          </h2>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {content.specialEditionSubtitle || 'Categorías morfológicas de vanguardia autorizadas y homologadas exclusivamente por Jonathan García (Presidente de INBR).'}
          </p>
        </div>

        {/* BANNERS DE ALTA RESOLUCIÓN EDICIÓN ESPECIAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Banner 1 */}
          <div className="rounded-3xl overflow-hidden border-2 border-[#D4AF37]/50 bg-black relative group shadow-[0_10px_35px_rgba(212,175,55,0.2)] hover:border-[#D4AF37] transition-all">
            <div className="aspect-[16/9] w-full relative overflow-hidden">
              <img
                src={specialBanner1}
                alt="Banner Edición Especial 1"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              
              <div className="absolute bottom-5 left-6 right-6">
                <span className="text-[10px] font-mono font-black text-[#FFE885] uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded border border-[#D4AF37]/40">
                  Línea Exclusiva
                </span>
                <h4 className="text-lg font-black text-white font-serif-luxury mt-1">
                  Nano & Micro Bully Internacional
                </h4>
              </div>
            </div>
          </div>

          {/* Banner 2 */}
          <div className="rounded-3xl overflow-hidden border-2 border-[#D4AF37]/50 bg-black relative group shadow-[0_10px_35px_rgba(212,175,55,0.2)] hover:border-[#D4AF37] transition-all">
            <div className="aspect-[16/9] w-full relative overflow-hidden">
              <img
                src={specialBanner2}
                alt="Banner Edición Especial 2"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              
              <div className="absolute bottom-5 left-6 right-6">
                <span className="text-[10px] font-mono font-black text-[#FFE885] uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded border border-[#D4AF37]/40">
                  Vanguardia Morfológica
                </span>
                <h4 className="text-lg font-black text-white font-serif-luxury mt-1">
                  Clean Exotic & Extreme Pocket
                </h4>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Special Categories Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {specialCategories.map((cat, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-3xl bg-gradient-to-b ${cat.bgGlow} border-2 ${cat.accent} shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative group flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-black font-mono tracking-widest bg-black text-[#FFE885] border border-[#D4AF37]/50">
                    {cat.tag}
                  </span>
                  <Crown className="w-4 h-4 text-[#D4AF37]" />
                </div>

                <h3 className="text-xl font-black text-white font-serif-luxury mb-2">
                  {cat.title}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed mb-6 font-light">
                  {cat.desc}
                </p>
              </div>

              <div className="space-y-2 border-t border-neutral-800/80 pt-4 text-xs font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>Alzada Máx:</span>
                  <span className="text-[#FFE885] font-bold">{cat.height}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Estructura:</span>
                  <span className="text-neutral-200">{cat.bone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ejemplares Certificados en Edición Especial */}
        <div>
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-800">
            <div>
              <span className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider block">
                REGISTRO EXCLUSIVO
              </span>
              <h3 className="text-2xl font-bold text-white font-serif-luxury">
                Ejemplares Oficiales de Edición Especial
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Autorizados por Presidencia INBR
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {participatingDogs.map((dog) => (
              <div
                key={dog.id}
                className="p-5 rounded-2xl bg-[#12110D] border-2 border-[#D4AF37]/40 shadow-xl space-y-4 hover:border-[#FFE885] transition-all"
              >
                <div className="h-48 rounded-xl overflow-hidden border border-[#D4AF37]/50 bg-black">
                  <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#FFE885]">
                      {dog.category}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                      {dog.status}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-serif-luxury truncate">
                    {dog.name}
                  </h4>
                  <span className="text-xs font-mono text-neutral-400 block">
                    REG: {dog.regNumber}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-400 space-y-1">
                  <div>Propietario: <strong className="text-neutral-200">{dog.owner}</strong></div>
                  <div>Criadero: <strong className="text-neutral-200">{dog.kennel}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
