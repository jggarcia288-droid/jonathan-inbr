import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { useRegistry } from '../context/RegistryContext';
import { Search, ShieldCheck, Star, MessageSquare, MapPin, CheckCircle2, UploadCloud, Image as ImageIcon } from 'lucide-react';

export const BreedersDirectorySection: React.FC = () => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();
  const { breeders } = useRegistry();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  
  // Custom uploaded logos map by breeder name
  const [customLogos, setCustomLogos] = useState<{ [key: string]: string }>({});

  const handleLogoUpload = (breederName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setCustomLogos((prev) => ({ ...prev, [breederName]: url }));
    }
  };

  const filteredBreeders = breeders.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCountry = selectedCountry === 'ALL' || b.country.includes(selectedCountry);

    return matchesSearch && matchesCountry;
  });

  const countries = ['ALL', 'USA', 'México', 'Perú', 'Ecuador', 'Colombia'];

  return (
    <section id="criadores" className="py-20 bg-[#0E0E0E] relative border-t border-b border-[#C9A86A]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#18150f] border border-[#C9A86A]/40 mb-4">
            <ShieldCheck className="w-4 h-4 text-[#C9A86A]" />
            <span className="text-xs font-semibold text-[#E7C888] tracking-widest uppercase">
              {t('breeders.badge')}
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white font-serif-luxury tracking-wide mb-4">
            {content.breedersTitle || t('breeders.title')}
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg">
            {content.breedersSubtitle || t('breeders.subtitle')}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-3xl mx-auto mb-12 space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-[#C9A86A] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por criadero, titular, raza o país..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#141414] border border-[#C9A86A]/30 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#C9A86A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">Filtrar por País:</span>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCountry(c)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedCountry === c
                    ? 'bg-gold-gradient text-black font-bold'
                    : 'bg-[#181818] text-neutral-300 border border-neutral-800 hover:border-[#C9A86A]'
                }`}
              >
                {c === 'ALL' ? 'Todos' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Breeders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBreeders.map((breeder, idx) => {
            const logo = customLogos[breeder.name] || '/logo-inbr.jpg';
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#141414] border border-[#C9A86A]/25 p-6 flex flex-col justify-between hover:border-[#C9A86A] hover:shadow-[0_10px_25px_rgba(201,168,106,0.15)] transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('breeders.verified')}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[#E7C888]">
                      {Array.from({ length: breeder.stars }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#C9A86A] text-[#C9A86A]" />
                      ))}
                    </div>
                  </div>

                  {/* Logo Slot & Kennel Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-14 h-14 rounded-xl border border-[#D4AF37]/50 bg-black overflow-hidden shrink-0 group/logo">
                      <img src={logo} alt={breeder.name} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 cursor-pointer transition-opacity">
                        <UploadCloud className="w-4 h-4 text-[#FFE885]" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(breeder.name, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="overflow-hidden">
                      <h3 className="text-lg font-bold text-white font-serif-luxury truncate group-hover:text-[#E7C888] transition-colors leading-tight">
                        {breeder.name}
                      </h3>
                      <p className="text-xs text-[#C9A86A] font-medium truncate">
                        Titular: <span className="text-white font-semibold">{breeder.owner}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-neutral-300 mb-6 bg-[#0E0E0E] p-3.5 rounded-xl border border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 font-mono">Especialidad:</span>
                      <span className="text-neutral-200 font-medium">{breeder.breed}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C9A86A] shrink-0" />
                      <span>{breeder.city}, {breeder.country}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 italic pt-1 border-t border-neutral-800">
                      "{breeder.specialties}"
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 space-y-2">
                  <a
                    href={`https://wa.me/${breeder.whatsapp.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(breeder.owner)},%20vi%20su%20criadero%20en%20el%20Directorio%20Oficial%20INBR.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md"
                  >
                    <MessageSquare className="w-4 h-4 fill-black" />
                    <span>{t('breeders.contactBtn')}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBreeders.length === 0 && (
          <div className="text-center py-12 text-neutral-400 text-sm">
            No se encontraron criaderos con los criterios especificados.
          </div>
        )}
      </div>
    </section>
  );
};
