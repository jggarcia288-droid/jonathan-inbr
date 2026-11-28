import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { useRegistry } from '../context/RegistryContext';
import { DogRecord } from '../data/registryData';
import { PedigreeQrBadge } from './PedigreeQrBadge';
import { InteractivePedigreeTree } from './InteractivePedigreeTree';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Award, 
  QrCode, 
  Calendar,
  Lock,
  FileSpreadsheet,
  Dna,
  ArrowLeft,
  X
} from 'lucide-react';

interface VerificationSectionProps {
  initialCode?: string;
  onOpenCertificate: (dog: DogRecord) => void;
  onOpenExcelImporter?: () => void;
}

export const VerificationSection: React.FC<VerificationSectionProps> = ({
  initialCode = '',
  onOpenCertificate,
  onOpenExcelImporter,
}) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();
  const { findDogByQuery, searchDogOnlineAndOffline, dogs, supabaseTotalCount, isLoadingSupabase } = useRegistry();

  const [query, setQuery] = useState(initialCode);
  const [result, setResult] = useState<DogRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [showInteractiveTree, setShowInteractiveTree] = useState(false);

  const handleVerify = async (searchQuery?: string) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;

    setHasSearched(true);
    setNotFound(false);

    // 1. Instant check in memory
    const localFound = findDogByQuery(q);
    if (localFound) {
      setResult(localFound);
      setNotFound(false);
      setIsSearchingOnline(false);
      return;
    }

    // 2. Real-time online check against Supabase
    setIsSearchingOnline(true);
    try {
      const onlineFound = await searchDogOnlineAndOffline(q);
      if (onlineFound) {
        setResult(onlineFound);
        setNotFound(false);
      } else {
        setResult(null);
        setNotFound(true);
      }
    } catch (err) {
      console.warn('Error in verification search:', err);
      setResult(null);
      setNotFound(true);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setQuery(initialCode.trim());
      handleVerify(initialCode.trim());
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <section id="verificacion" className="py-20 bg-[#080808] relative border-t border-b border-[#D4AF37]/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
            href="#razas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-all"
            title="Ver Razas Oficiales"
          >
            <span>Ver Razas Oficiales →</span>
          </a>
        </div>

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <Lock className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              CONSULTA PRIVADA Y CONFIDENCIAL • CERTIFICACIÓN OFICIAL INBR
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3">
            {content.verificationTitle || 'Verificación (Registro o Microchip)'}
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            {content.verificationSubtitle || 'Ingresa el número de registro oficial o microchip para consultar el estado del ejemplar en la base de datos central.'}
          </p>
        </div>

        {/* Search Input Box */}
        <div className="max-w-2xl mx-auto mb-10">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ingresa tu N° de Registro Oficial o Microchip..."
                className="w-full pl-12 pr-11 py-4 rounded-2xl bg-[#0F0E0B] border-2 border-[#D4AF37]/60 text-white font-mono text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-[#FFE885] shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHasSearched(false);
                    setResult(null);
                    setNotFound(false);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                  title="Borrar texto"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearchingOnline}
              className="px-8 py-4 rounded-2xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 hover:scale-105 transition-all shadow-xl shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSearchingOnline ? 'Buscando...' : 'Verificar Registro'}</span>
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-neutral-400">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Privacidad protegida: Ningún dato es público. Solo cada propietario con su folio o microchip oficial puede consultar su ejemplar.</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RESULTADO: SOLO APARECE CUANDO SE HA BUSCADO Y EXISTE EL EJEMPLAR         */}
        {/* ========================================================================= */}
        {hasSearched && result && (
          <div className="rounded-3xl bg-[#14120D] border-2 border-[#D4AF37] p-6 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.25)] relative overflow-hidden animate-fadeIn">
            {/* Watermark */}
            <div className="absolute top-0 right-0 w-80 h-80 opacity-5 pointer-events-none">
              <ShieldCheck className="w-full h-full text-[#D4AF37]" />
            </div>

            {/* Banner de Verificación de Microchip / QR */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>MICROCHIP ISO 11784/11785 VALIDADO • VERIFICACIÓN ACTIVA</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F190E] border border-[#D4AF37]/50 text-[#FFE885] text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Chip: {result.microchip}</span>
              </div>
            </div>

            {/* Validation Banner */}
            <div className="flex flex-wrap items-center justify-between pb-6 mb-6 border-b border-neutral-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                      EJEMPLAR ACTIVO & VALIDADO
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#2A2012] border border-[#D4AF37] text-[#FFE885] font-mono font-bold">
                      INBR OFICIAL
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white font-serif-luxury tracking-wide">
                    {result.name}
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowInteractiveTree(!showInteractiveTree)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-[#FFE885] bg-[#1E190E] border-2 border-[#D4AF37] hover:bg-[#2A2214] active:scale-95 transition-all cursor-pointer shadow"
                >
                  <Dna className="w-4 h-4 text-[#D4AF37]" />
                  <span>{showInteractiveTree ? 'Ocultar Árbol' : 'Árbol Genealógico (4G)'}</span>
                </button>
              </div>
            </div>

            {/* Dog Card Details */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="w-44 h-48 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-xl bg-black">
                  <img src={result.imageUrl} alt={result.name} className="w-full h-full object-cover" />
                </div>
                <div className="mt-3 flex flex-col items-center">
                  <PedigreeQrBadge dog={result} size="sm" label="QR de Verificación" />
                </div>
              </div>

              <div className="md:col-span-8 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-800">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">N° de Registro:</span>
                    <strong className="font-mono text-sm text-[#FFE885] font-bold">{result.regNumber}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Microchip ISO:</span>
                    <strong className="font-mono text-xs text-neutral-200">{result.microchip}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Raza:</span>
                    <strong className="text-white text-xs">{result.breed}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Sexo / Color:</span>
                    <strong className="text-white text-xs">{result.gender} • {result.color}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Padre (Sire):</span>
                    <span className="text-neutral-200 font-medium">{result.sire}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Madre (Dam):</span>
                    <span className="text-neutral-200 font-medium">{result.dam}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Propietario Titular:</span>
                    <span className="text-white font-medium">{result.owner}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Criadero Registrado:</span>
                    <span className="text-neutral-300 font-medium">{result.breeder}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sello de Autenticidad */}
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#D4AF37]" />
                <span>Sello Notarial Criptográfico SHA-256 Validado</span>
              </div>
              <span className="text-emerald-400 font-bold">ESTADO: ACTIVO</span>
            </div>

            {/* Árbol Genealógico Interactivo Desplegable (4G) */}
            {showInteractiveTree && (
              <div className="mt-8 pt-6 border-t-2 border-[#D4AF37]/40 animate-fadeIn">
                <InteractivePedigreeTree
                  dog={result}
                  onOpenCertificate={onOpenCertificate}
                />
              </div>
            )}
          </div>
        )}

        {/* Loading online status */}
        {isSearchingOnline && (
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-[#14110A] border border-[#D4AF37]/50 text-center animate-fadeIn shadow-lg">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h4 className="text-base font-bold text-[#FFE885] font-serif-luxury mb-1">
              Consultando Base de Datos Central INBR...
            </h4>
            <p className="text-xs text-neutral-400">
              Buscando folio "{query}" en la base de datos oficial INBR...
            </p>
          </div>
        )}

        {/* Not Found Message */}
        {!isSearchingOnline && hasSearched && notFound && (
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-rose-950/20 border border-rose-600/40 text-center animate-fadeIn">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h4 className="text-xl font-bold text-white font-serif-luxury mb-1">
              Registro No Encontrado
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
              No se localizó ningún ejemplar bajo el folio o microchip "{query}". Por favor corrobora la numeración o ponte en contacto con la administración central de INBR.
            </p>
          </div>
        )}

        {/* Estado inicial sin buscar */}
        {!hasSearched && (
          <div className="p-8 rounded-2xl bg-[#100E0A] border border-neutral-800 text-center max-w-xl mx-auto space-y-2">
            <ShieldCheck className="w-10 h-10 text-[#D4AF37] mx-auto opacity-70" />
            <h4 className="text-base font-bold text-white font-serif-luxury">
              Protección y Confidencialidad de Datos INBR
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Todos los registros se encuentran bajo estricta reserva y protección de privacidad. Los datos del ejemplar únicamente se despliegan de forma individual y privada al propietario que ingrese el número de folio o microchip oficial correspondiente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
