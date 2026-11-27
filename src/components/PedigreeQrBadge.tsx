import React, { useState } from 'react';
import { DogRecord } from '../data/registryData';
import { useDogQrCode } from '../utils/qrCodeGenerator';
import { ExternalLink, Copy, Check, Download, QrCode as QrIcon, ShieldCheck, Sparkles } from 'lucide-react';

interface PedigreeQrBadgeProps {
  dog: DogRecord;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  showSubtitle?: boolean;
  onNavigateToVerification?: (microchipOrReg: string) => void;
}

export const PedigreeQrBadge: React.FC<PedigreeQrBadgeProps> = ({
  dog,
  size = 'md',
  label = 'Verificación Digital',
  className = '',
  showSubtitle = true,
  onNavigateToVerification,
}) => {
  const { qrDataUrl, verificationUrl, isLoading } = useDogQrCode(dog);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleDownloadQr = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_INBR_${(dog.microchip || dog.regNumber || 'pedigree').replace(/[^a-zA-Z0-9_-]/g, '')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDirectOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToVerification) {
      onNavigateToVerification(dog.microchip || dog.regNumber);
      setShowPreviewModal(false);
      return;
    }
    // Navigate or open window
    if (typeof window !== 'undefined') {
      window.open(verificationUrl, '_blank');
    }
  };

  return (
    <>
      <div 
        className={`flex flex-col items-center group relative cursor-pointer select-none ${className}`}
        onClick={() => setShowPreviewModal(true)}
        title="Haz clic para probar o descargar el Código QR de verificación"
      >
        {/* QR Container */}
        <div className={`${sizeClasses[size]} bg-white p-1 rounded-lg border border-neutral-900 shadow-md relative overflow-hidden transition-transform group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.4)]`}>
          {isLoading || !qrDataUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 animate-pulse">
              <QrIcon className="w-6 h-6 animate-spin text-[#D4AF37]" />
              <span className="text-[7px] font-mono mt-0.5">Generando...</span>
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt={`QR Verificación Microchip ${dog.microchip || dog.regNumber}`}
              className="w-full h-full object-contain block"
              loading="eager"
            />
          )}

          {/* Subtle Hover Action Hint (ignored during PDF capture) */}
          <div 
            data-html2canvas-ignore="true"
            className="absolute inset-0 bg-black/75 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center no-print"
          >
            <ExternalLink className="w-4 h-4 text-[#FFE885] mb-0.5" />
            <span className="text-[7px] font-bold text-white uppercase tracking-tighter leading-none">
              Probar QR
            </span>
          </div>
        </div>

        {/* Subtitle / Microchip caption */}
        {showSubtitle && (
          <div className="text-center mt-1">
            <span className="text-[8px] font-mono font-bold text-neutral-700 block uppercase tracking-tight leading-none">
              {label}
            </span>
            <span className="text-[7px] font-mono text-neutral-500 block leading-tight mt-0.5">
              CHIP: {dog.microchip || dog.regNumber}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Modal for Testing & Verifying QR Destination */}
      {showPreviewModal && (
        <div 
          data-html2canvas-ignore="true"
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn no-print"
          onClick={() => setShowPreviewModal(false)}
        >
          <div 
            className="bg-[#12100B] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_40px_rgba(212,175,55,0.3)] text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20180B] border border-[#D4AF37]/50 text-[#FFE885] text-xs font-bold mb-4 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>VALIDACIÓN DE MICROCHIP ISO 11784/11785</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury mb-1">
              Código QR Único del Pedigrí
            </h3>
            <p className="text-xs text-neutral-400 mb-5">
              Al escanear este código con cualquier teléfono, redirige instantáneamente a la vista pública de verificación oficial de INBR.
            </p>

            {/* Large QR Display */}
            <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border-2 border-[#D4AF37] shadow-xl mb-4 relative">
              {qrDataUrl && (
                <img 
                  src={qrDataUrl} 
                  alt="QR Verificación" 
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Dog details banner */}
            <div className="bg-[#1B160E] rounded-xl p-3 border border-[#D4AF37]/30 text-left mb-5 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-bold uppercase text-[10px]">Ejemplar:</span>
                <span className="text-[#FFE885] font-black">{dog.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-bold uppercase text-[10px]">Microchip ISO:</span>
                <span className="font-mono text-white font-bold text-[11px]">{dog.microchip}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-bold uppercase text-[10px]">Folio Registro:</span>
                <span className="font-mono text-neutral-300 text-[11px]">{dog.regNumber}</span>
              </div>
              <div className="pt-1 border-t border-neutral-800">
                <span className="text-[9px] text-neutral-500 font-mono block truncate">
                  URL destino: {verificationUrl}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleDirectOpen}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-gradient text-black font-black text-xs sm:text-sm hover:brightness-110 shadow-lg active:scale-95 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Vista Pública</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#221C11] border border-[#D4AF37]/40 text-[#FFE885] font-bold text-xs hover:border-[#D4AF37] active:scale-95 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold text-xs hover:text-white hover:border-neutral-500 active:scale-95 transition-all"
                title="Descargar imagen PNG del QR"
              >
                <Download className="w-4 h-4" />
                <span>PNG</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 uppercase tracking-widest font-mono"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </>
  );
};
