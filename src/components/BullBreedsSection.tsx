import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { Layers, BookOpen, Sparkles, Filter, ShieldCheck, ArrowLeft } from 'lucide-react';

interface MultiBreedsSectionProps {
  onSelectBreedStandard: (breedId: string) => void;
}

interface BreedCardItem {
  id: string;
  name: string;
  category: 'bull' | 'guard' | 'work' | 'companion';
  subtitle: string;
  description: string;
  varieties: string[];
  image: string;
}

export const BullBreedsSection: React.FC<MultiBreedsSectionProps> = ({ onSelectBreedStandard }) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const multiBreeds: BreedCardItem[] = [
    {
      id: 'american-bully',
      name: 'American Bully',
      category: 'bull',
      subtitle: 'Compañero Supremo y Estructura Muscular',
      description: 'Perro compacto, potente, con gran osamenta, temperamento afable y equilibrio biomecánico.',
      varieties: ['Pocket', 'Standard', 'Classic', 'XL'],
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'exotic-bully',
      name: 'Exotic Bully',
      category: 'bull',
      subtitle: 'Fenotipo Extremo y Agilidad Preservada',
      description: 'Evolución morfológica con máxima compactación, densidad ósea y apego al protocolo de salud INBR.',
      varieties: ['Micro', 'Clean Exotic', 'Nano'],
      image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'cane-corso',
      name: 'Cane Corso Italiano',
      category: 'guard',
      subtitle: 'Moloso de Guardia y Protección Familiar',
      description: 'Moloso potente, atlético y majestuoso. Mordida en ligero prognatismo, cuello musculoso y aplomos de gran firmeza.',
      varieties: ['Negro', 'Gris Plomo', 'Leonado / Formentino'],
      image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'pastor-belga-malinois',
      name: 'Pastor Belga Malinois',
      category: 'work',
      subtitle: 'Trabajo Deportivo, K9 e Inteligencia Operativa',
      description: 'Canino de trabajo con potencia de mordida, máxima agilidad, impulsos equilibrados y líneas de trabajo consagradas.',
      varieties: ['Línea de Ring Francés', 'Mondioring', 'K9 Operativo'],
      image: 'https://images.unsplash.com/photo-1588943211346-090881b5782a?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'french-bulldog',
      name: 'French Bulldog',
      category: 'bull',
      subtitle: 'Moloso Compacto de Compañía',
      description: 'Cuerpo compacto, orejas de murciélago, pecho ancho y excelente respiración con narinas abiertas.',
      varieties: ['Estándar Fawn/Brindle', 'Fluffy', 'Visual Isabella'],
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'doberman',
      name: 'Doberman Pinscher',
      category: 'guard',
      subtitle: 'Elegancia, Firmeza y Máximo Carácter',
      description: 'Silueta esculpida, porte noble y lealtad incondicional. Excelente dorso firme y trote amplio elástico.',
      varieties: ['Línea Europea', 'Línea Americana'],
      image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'rottweiler',
      name: 'Rottweiler',
      category: 'guard',
      subtitle: 'Potencia, Determinación y Estructura Robusta',
      description: 'Canino de origen germano con cabeza potente, marcas de fuego delimitadas y temperamento equilibrado.',
      varieties: ['Línea ADRK', 'Línea de Belleza Internacional'],
      image: 'https://images.unsplash.com/photo-1567752881298-894bb81f9379?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'american-pit-bull',
      name: 'American Pit Bull Terrier',
      category: 'bull',
      subtitle: 'Raza Atlética de Rendimiento Histórico',
      description: 'Musculatura magra, impulsión posterior sobresaliente y tenacidad con enfoque deportivo oficial.',
      varieties: ['Game Dog Tradicional', 'Conformación Deportiva'],
      image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=700&q=80',
    },
  ];

  const breedsSource = content.bullBreedsList && content.bullBreedsList.length > 0 
    ? content.bullBreedsList 
    : multiBreeds;

  const filteredBreeds = activeCategory === 'all'
    ? breedsSource
    : breedsSource.filter((b) => b.category === activeCategory);

  return (
    <section id="razas" className="py-20 bg-[#080808] relative">
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
            href="#estandares"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-all"
            title="Ver Criterios y Estándares"
          >
            <span>Estándares Raciales →</span>
          </a>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              LIBRO GENEALÓGICO MULTI-RAZAS INBR
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3">
            {content.bullBreedsTitle || 'Nuestras Razas Oficiales (Multi-Razas)'}
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base">
            {content.bullBreedsSubtitle || 'INBR es hoy un registro oficial internacional multi-razas: abarcamos razas tipo Bull, molosos de guardia, caninos de trabajo deportivo K9 y razas de compañía.'}
          </p>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: 'all', label: 'Todas las Razas' },
            { id: 'bull', label: 'Razas Tipo Bull' },
            { id: 'guard', label: 'Molosos & Guardia' },
            { id: 'work', label: 'Trabajo & Pastores K9' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-gold-gradient text-black shadow-lg scale-105'
                  : 'bg-[#12110D] border border-neutral-800 text-neutral-300 hover:border-[#D4AF37]/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Multi-Breeds Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBreeds.map((breed) => (
            <div
              key={breed.id}
              className="group relative rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/30 overflow-hidden flex flex-col justify-between hover-card-luxury transition-all duration-300 shadow-xl"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={breed.image}
                  alt={breed.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12110D] via-transparent to-transparent" />
                <span className="absolute top-3 right-3 text-[10px] font-mono font-black px-2 py-0.5 rounded bg-black/80 border border-[#D4AF37]/60 text-[#FFE885]">
                  HOMOLOGADA INBR
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white font-serif-luxury group-hover:text-[#FFE885] transition-colors mb-1">
                    {breed.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#D4AF37] mb-2.5">
                    {breed.subtitle}
                  </p>
                  <p className="text-xs text-neutral-300 line-clamp-3 mb-4 leading-relaxed font-normal">
                    {breed.description}
                  </p>

                  <div className="mb-4">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold block mb-1">
                      Variedades / Líneas:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {breed.varieties.map((v, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#18140B] text-neutral-200 border border-[#D4AF37]/30 font-medium"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectBreedStandard(breed.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Estándar Oficial</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
