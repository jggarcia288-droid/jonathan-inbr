import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDynamicContent } from '../utils/dynamicContent';
import { useRegistry } from '../context/RegistryContext';
import { 
  User, 
  ShieldCheck, 
  Award, 
  FileText, 
  CreditCard, 
  PlusCircle, 
  ExternalLink, 
  KeyRound, 
  Lock, 
  LogOut, 
  Sparkles,
  QrCode,
  FileCheck2,
  CheckCircle2
} from 'lucide-react';
import { DogRecord } from '../data/registryData';

interface UserProfileSectionProps {
  onOpenCertificateModal: (dog: DogRecord) => void;
  onOpenAdminPanel: () => void;
  onOpenRegisterForm: () => void;
  onOpenVerify: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  onOpenCertificateModal,
  onOpenAdminPanel,
  onOpenRegisterForm,
  onOpenVerify,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { content } = useDynamicContent();
  const { dogs } = useRegistry();

  // Pick up dogs belonging to current user or sample verified dogs
  const userDogs = dogs.filter((d) => {
    if (user?.role === 'MASTER') return true;
    if (user?.name) {
      return d.owner.toLowerCase().includes(user.name.toLowerCase()) || 
             d.breeder.toLowerCase().includes(user.name.toLowerCase());
    }
    return false;
  }).slice(0, 6);

  const displayDogs = userDogs.length > 0 ? userDogs : dogs.slice(0, 4);

  return (
    <section id="mi-perfil" className="py-24 bg-[#0A0A0A] relative border-t border-b border-[#D4AF37]/30 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FFE885]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/60 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:scale-105 transition-transform duration-300">
            <User className="w-4 h-4 text-[#FFE885] animate-pulse" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              {content.profileBadge || 'PORTAL DE AFILIADO & AUTENTICACIÓN • INBR'}
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-4 uppercase">
            {content.profileTitle || 'Mi Perfil de Criador & Propietario'}
          </h2>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {content.profileSubtitle || 'Consulta tus ejemplares notariados, descarga de certificados digitales, credenciales PVC y seguimiento de trámites en tiempo real.'}
          </p>
        </div>

        {/* Member Profile Dashboard Card */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-[#14120D] to-[#0A0A0A] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(212,175,55,0.2)] mb-12 hover:border-[#D4AF37] transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-8 border-b border-neutral-800">
            {/* Avatar & Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-[#D4AF37] p-1 bg-black shadow-[0_0_25px_rgba(212,175,55,0.4)] group">
                  <img
                    src="/logo-inbr.jpg"
                    alt="Perfil Afiliado"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <span className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-gold-gradient text-black shadow-lg">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury">
                    {isAuthenticated ? user?.name : 'Criador / Propietario Afiliado INBR'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1C160B] border border-[#D4AF37] text-[#FFE885]">
                    {isAuthenticated ? user?.role : 'ESTADO ACTIVO'}
                  </span>
                </div>

                <p className="text-xs text-neutral-300 font-mono mb-2">
                  Folio Afiliación: <strong className="text-[#FFE885]">{user?.email ? `INBR-AFF-${user.email.split('@')[0].toUpperCase()}` : 'INBR-AFF-GLOBAL2026'}</strong>
                </p>

                <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                  Autorización internacional para emisión de camadas F1, certificación genética y acceso a la base de datos de pedigrís oficiales.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 hover:scale-105 transition-all shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAuthenticated ? 'Abrir Panel de Control' : 'Ingresar con Clave Maestra'}</span>
              </button>

              <button
                onClick={onOpenRegisterForm}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1A160D] border border-[#D4AF37] hover:bg-[#2A2213] transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Registrar Nuevo Ejemplar F1</span>
              </button>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 hover:border-[#D4AF37]/50 transition-all text-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Ejemplares Registrados</span>
              <span className="text-2xl font-black text-white font-serif-luxury">{dogs.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 hover:border-[#D4AF37]/50 transition-all text-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Microchips Auditados</span>
              <span className="text-2xl font-black text-emerald-400 font-serif-luxury">100% ISO</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 hover:border-[#D4AF37]/50 transition-all text-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Certificaciones Validadas</span>
              <span className="text-2xl font-black text-[#FFE885] font-serif-luxury">Notariadas</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/60 border border-neutral-800 hover:border-[#D4AF37]/50 transition-all text-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Estatus en Ring</span>
              <span className="text-2xl font-black text-emerald-400 font-serif-luxury">Activo</span>
            </div>
          </div>
        </div>

        {/* Ejemplares & Documentos Rápidos */}
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-white font-serif-luxury">
                Ejemplares Registrados & Documentos Disponibles
              </h4>
              <p className="text-xs text-neutral-400">
                Haz clic en cualquier ejemplar para abrir su Certificado Oficial de Pedigrí o Credencial PVC.
              </p>
            </div>
            <button
              onClick={onOpenVerify}
              className="text-xs font-mono text-[#FFE885] hover:underline flex items-center gap-1"
            >
              <span>Buscador por Microchip</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayDogs.map((dog) => (
              <div
                key={dog.regNumber}
                onClick={() => onOpenCertificateModal(dog)}
                className="p-4 rounded-2xl bg-[#110F0A] border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#D4AF37] bg-black shrink-0">
                    <img
                      src={dog.imageUrl}
                      alt={dog.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[#FFE885] block truncate">
                      {dog.regNumber}
                    </span>
                    <h5 className="text-sm font-black text-white font-serif-luxury truncate group-hover:text-[#FFE885] transition-colors">
                      {dog.name}
                    </h5>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {dog.breed} • {dog.variety || 'Standard'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#1C160B] border border-[#D4AF37]/50 text-[#FFE885] group-hover:bg-gold-gradient group-hover:text-black transition-all">
                    Ver Pedigrí
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
