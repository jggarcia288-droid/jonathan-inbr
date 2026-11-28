import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useRegistry } from '../context/RegistryContext';
import { useAuth } from '../hooks/useAuth';
import { DogRecord } from '../data/registryData';
import { getBreedImageByIdOrName } from '../utils/breedImages';
import { buildEightGenPedigree, EightGenPedigree } from '../utils/pedigreeResolver';
import { InteractivePedigreeTree } from './InteractivePedigreeTree';
import { AncestorAutocompleteInput } from './AncestorAutocompleteInput';
import { 
  HomologationPedigreeBuilder, 
  HomologationPedigreeData, 
  INITIAL_HOMOLOGATION_PEDIGREE 
} from './HomologationPedigreeBuilder';
import { 
  generateIndividualFormPdf, 
  generateLitterFormPdf, 
  downloadBlankIndividualPdf, 
  downloadBlankLitterPdf,
  IndividualFormPdfData,
  LitterFormPdfData
} from '../utils/officialFormPdfGenerator';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { 
  FileSpreadsheet, 
  GitBranch, 
  ArrowRightLeft, 
  CheckCircle2, 
  Send, 
  Award, 
  BadgeCheck, 
  Calendar, 
  Search, 
  Lock, 
  UploadCloud, 
  CreditCard, 
  AlertCircle, 
  Image as ImageIcon, 
  ArrowLeft,
  Download,
  Baby,
  FileText,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Printer,
  Sparkles,
  Camera,
  Mail,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

interface FormsAndGenogramSectionProps {
  onOpenCertificate?: (dog: DogRecord) => void;
  onOpenAdminPanel?: () => void;
}

export const FormsAndGenogramSection: React.FC<FormsAndGenogramSectionProps> = ({ 
  onOpenCertificate,
  onOpenAdminPanel 
}) => {
  const { t } = useTranslation();
  const { dogs, searchDogOnlineAndOffline } = useRegistry();
  const { user, isAuthenticated } = useAuth();
  
  // Available tabs: f1, permanent, homologation, litter, genogram
  const [activeTab, setActiveTab] = useState<'f1' | 'permanent' | 'homologation' | 'litter' | 'genogram'>('f1');
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [showBlankPdfBanner, setShowBlankPdfBanner] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [isSearchingGenogram, setIsSearchingGenogram] = useState(false);
  const [isSectionExpanded, setIsSectionExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      return h.includes('formulario') || h.includes('f1') || h.includes('permanente') || h.includes('homologacion');
    }
    return false;
  });

  // Auto-expand section if targeted by URL hash (#formularios)
  React.useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined') {
        const h = window.location.hash.toLowerCase();
        if (h.includes('formulario') || h.includes('f1') || h.includes('permanente') || h.includes('homologacion')) {
          setIsSectionExpanded(true);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const canDownloadOrPrint = 
    isAuthenticated && 
    (user?.role === 'MASTER' || (user?.role === 'REPRESENTATIVE' && user?.canPrint));

  // ==========================================
  // 1. F1 DATA (SOLO INFO DE ARRIBA, SIN PAPÁS NI ASCENDENCIA)
  // ==========================================
  const [f1Data, setF1Data] = useState({
    dogName: '',
    breed: 'American Bully',
    gender: 'Macho',
    dob: '',
    color: '',
    microchip: '',
    breeder: '',
    owner: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    postalCode: '',
    cityState: '',
    country: 'México',
  });
  const [f1PhotoLateral, setF1PhotoLateral] = useState<File | null>(null);
  const [f1PhotoFrontal, setF1PhotoFrontal] = useState<File | null>(null);
  const [f1PhotoRear, setF1PhotoRear] = useState<File | null>(null);
  const [f1ReceiptFile, setF1ReceiptFile] = useState<File | null>(null);
  const [f1Submitted, setF1Submitted] = useState(false);

  // ==========================================
  // 2. PERMANENTE DATA (INFO DE ARRIBA + N° REGISTRO INBR DE PAPÁ Y MAMÁ)
  // ==========================================
  const [permanentData, setPermanentData] = useState({
    dogName: '',
    breed: 'American Bully',
    gender: 'Macho',
    dob: '',
    color: '',
    microchip: '',
    breeder: '',
    owner: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    postalCode: '',
    cityState: '',
    country: 'México',
    sireReg: '', // Solo folio INBR del padre
    damReg: '',  // Solo folio INBR de la madre
    previousReg: '',
  });
  const [permanentReceiptFile, setPermanentReceiptFile] = useState<File | null>(null);
  const [permanentSubmitted, setPermanentSubmitted] = useState(false);

  // ==========================================
  // 3. HOMOLOGACIÓN DATA (INFO DE ARRIBA + REGISTRO PREVIO + FOTO OBLIGATORIA + ÁRBOL COMPLETO)
  // ==========================================
  const [homoData, setHomoData] = useState({
    dogName: '',
    originalReg: '',
    originalClub: 'ABKC',
    breed: 'American Bully',
    gender: 'Macho',
    dob: '',
    color: '',
    microchip: '',
    breeder: '',
    owner: '',
    phone: '',
    email: '',
    street: '',
    number: '',
    neighborhood: '',
    postalCode: '',
    cityState: '',
    country: 'México',
  });
  const [homoPedigreePhoto, setHomoPedigreePhoto] = useState<File | null>(null);
  const [homoPedigreePhotoPreview, setHomoPedigreePhotoPreview] = useState<string | null>(null);
  const [homoPedigree, setHomoPedigree] = useState<HomologationPedigreeData>(INITIAL_HOMOLOGATION_PEDIGREE);
  const [homoReceiptFile, setHomoReceiptFile] = useState<File | null>(null);
  const [homoSubmitted, setHomoSubmitted] = useState(false);

  // ==========================================
  // 4. CAMADA DATA (INFORMACIÓN DE CAMADA, PADRE, MADRE, PROPIETARIO Y HASTA 12 CACHORROS)
  // ==========================================
  const [litterData, setLitterData] = useState({
    breed: 'American Bully',
    birthDate: '',
    matingDate: '',
    totalMales: 3,
    totalFemales: 3,
    // Padre
    fatherInbr: '',
    fatherName: '',
    fatherOwner: '',
    fatherCoOwner: '',
    fatherAddress: '',
    fatherCity: '',
    fatherState: '',
    fatherZip: '',
    fatherCountry: 'México',
    fatherEmail: '',
    // Madre
    motherInbr: '',
    motherName: '',
    motherOwner: '',
    motherCoOwner: '',
    motherAddress: '',
    motherCity: '',
    motherState: '',
    motherZip: '',
    motherCountry: 'México',
    motherEmail: '',
    // Propietario de la camada
    litterOwnerName: '',
    litterOwnerAddress: '',
    litterOwnerCity: '',
    litterOwnerState: '',
    litterOwnerZip: '',
    litterOwnerCountry: 'México',
    litterOwnerEmail: '',
    // Legal terms acceptance
    legalTermsAccepted: false,
  });

  const [puppiesList, setPuppiesList] = useState<Array<{ id: string; gender: 'Macho' | 'Hembra'; color: string }>>([
    { id: 'pup-1', gender: 'Macho', color: '' },
    { id: 'pup-2', gender: 'Macho', color: '' },
    { id: 'pup-3', gender: 'Macho', color: '' },
    { id: 'pup-4', gender: 'Hembra', color: '' },
    { id: 'pup-5', gender: 'Hembra', color: '' },
    { id: 'pup-6', gender: 'Hembra', color: '' },
  ]);

  const [litterReceiptFile, setLitterReceiptFile] = useState<File | null>(null);
  const [litterSubmitted, setLitterSubmitted] = useState(false);

  // Helper to add a puppy
  const handleAddPuppy = () => {
    if (puppiesList.length >= 12) {
      alert('El formato oficial contempla hasta 12 cachorros por registro.');
      return;
    }
    const nextIdx = puppiesList.length + 1;
    setPuppiesList([
      ...puppiesList,
      { id: `pup-${Date.now()}-${nextIdx}`, gender: 'Macho', color: '' }
    ]);
  };

  // Helper to remove a puppy
  const handleRemovePuppy = (index: number) => {
    if (puppiesList.length <= 1) return;
    setPuppiesList(puppiesList.filter((_, i) => i !== index));
  };

  // ==========================================
  // 5. GENOGRAMA CONSULTA Y BUILDER
  // ==========================================
  const [genogramSubTab, setGenogramSubTab] = useState<'consult' | 'builder'>('consult');
  const [searchRegInput, setSearchRegInput] = useState('');
  const [searchedDog, setSearchedDog] = useState<DogRecord | null>(null);
  const [hasSearchedGenogram, setHasSearchedGenogram] = useState(false);
  const [genogramMode, setGenogramMode] = useState<'interactive' | 'printable'>('interactive');

  const [builderData, setBuilderData] = useState({
    name: 'EJEMPLAR EN CONSTRUCCIÓN',
    regNumber: 'INBR-GEN-2026',
    breed: 'American Bully',
    gender: 'Macho' as 'Macho' | 'Hembra',
    color: 'Por definir',
    microchip: '900000000000000',
    sire: 'SIN REGISTRO',
    dam: 'SIN REGISTRO',
    sireReg: '—',
    damReg: '—',
    sireSire: 'SIN REGISTRO',
    sireDam: 'SIN REGISTRO',
    damSire: 'SIN REGISTRO',
    damDam: 'SIN REGISTRO',
  });

  const builderDog = useMemo<DogRecord>(() => {
    return {
      regNumber: builderData.regNumber || 'INBR-GEN-2026',
      microchip: builderData.microchip || '900000000000000',
      name: builderData.name || 'EJEMPLAR EN CONSTRUCCIÓN',
      breed: builderData.breed || 'American Bully',
      variety: 'Standard',
      gender: builderData.gender,
      dob: '2025-06-15',
      color: builderData.color || 'Por definir',
      owner: 'Criadero Certificado INBR',
      breeder: 'INBR Bloodline',
      country: 'México',
      sire: builderData.sire || 'SIN REGISTRO',
      sireReg: builderData.sireReg || '—',
      dam: builderData.dam || 'SIN REGISTRO',
      damReg: builderData.damReg || '—',
      points: 0,
      titles: [],
      imageUrl: getBreedImageByIdOrName(builderData.breed || ''),
      status: 'ACTIVE_VALIDATED',
      genogram: {
        sire: {
          name: builderData.sire || 'SIN REGISTRO',
          reg: builderData.sireReg || '—',
          titles: [],
          sire: { name: builderData.sireSire || 'SIN REGISTRO', reg: '—', titles: [], sire: 'SIN REGISTRO', dam: 'SIN REGISTRO' },
          dam: { name: builderData.sireDam || 'SIN REGISTRO', reg: '—', titles: [], sire: 'SIN REGISTRO', dam: 'SIN REGISTRO' },
        },
        dam: {
          name: builderData.dam || 'SIN REGISTRO',
          reg: builderData.damReg || '—',
          titles: [],
          sire: { name: builderData.damSire || 'SIN REGISTRO', reg: '—', titles: [], sire: 'SIN REGISTRO', dam: 'SIN REGISTRO' },
          dam: { name: builderData.damDam || 'SIN REGISTRO', reg: '—', titles: [], sire: 'SIN REGISTRO', dam: 'SIN REGISTRO' },
        },
      },
    };
  }, [builderData]);

  const handleSearchGenogram = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRegInput.trim();
    setHasSearchedGenogram(true);
    if (!q) return;
    setIsSearchingGenogram(true);
    try {
      const found = await searchDogOnlineAndOffline(q);
      setSearchedDog(found || null);
    } finally {
      setIsSearchingGenogram(false);
    }
  };

  const [isExportingGenogramJpg, setIsExportingGenogramJpg] = useState(false);

  const handleExportGenogramJpg = async () => {
    if (!searchedDog || isExportingGenogramJpg) return;
    if (!canDownloadOrPrint) {
      setShowRestrictedModal(true);
      return;
    }

    setIsExportingGenogramJpg(true);
    try {
      const el = document.getElementById('genogram-canvas-container');
      if (!el) throw new Error('Contenedor del genograma no encontrado');

      const imgs = Array.from(el.querySelectorAll('img'));
      imgs.forEach((img) => {
        try { img.crossOrigin = 'anonymous'; } catch {}
      });

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#080808',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const cleanReg = searchedDog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `INBR_Documento_Genograma_${cleanReg}.jpg`;

      const downloadLink = document.createElement('a');
      downloadLink.href = imgData;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#000000'],
        });
      } catch {}
    } catch (err) {
      console.error('Error al exportar genograma JPG:', err);
      alert('Hubo un error al generar la imagen JPG del documento.');
    } finally {
      setIsExportingGenogramJpg(false);
    }
  };

  // ==========================================
  // SUBMISSION HANDLERS
  // ==========================================
  const handleF1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f1ReceiptFile) {
      alert('Por favor adjunta la foto o comprobante de tu pago bancario.');
      return;
    }
    setF1Submitted(true);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFE885', '#FFFFFF'],
      });
    } catch {}
  };

  const handlePermanentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permanentReceiptFile) {
      alert('Por favor adjunta la foto o comprobante de tu pago bancario.');
      return;
    }
    setPermanentSubmitted(true);
    try {
      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#FFE885', '#D4AF37', '#60A5FA', '#FFFFFF'],
      });
    } catch {}
  };

  const handleHomoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homoPedigreePhoto) {
      alert('Por favor sube la fotografía o escaneo del certificado / registro previo para cotejar los datos del ejemplar.');
      return;
    }
    if (!homoReceiptFile) {
      alert('Por favor adjunta la foto de tu comprobante de pago bancario.');
      return;
    }
    setHomoSubmitted(true);
    try {
      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#10B981', '#FFFFFF'],
      });
    } catch {}
  };

  const handleLitterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!litterData.legalTermsAccepted) {
      alert('Debes aceptar la declaración de veracidad y propiedad de la camada.');
      return;
    }
    if (!litterReceiptFile) {
      alert('Por favor sube el comprobante de pago de la camada.');
      return;
    }
    setLitterSubmitted(true);
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFE885', '#E11D48', '#FFFFFF'],
      });
    } catch {}
  };

  // Helper to trigger filled PDF downloads
  const handleDownloadFilledF1Pdf = () => {
    const pdf = generateIndividualFormPdf({
      procedureType: 'F1',
      dogName: f1Data.dogName,
      breed: f1Data.breed,
      gender: f1Data.gender,
      dob: f1Data.dob,
      color: f1Data.color,
      microchip: f1Data.microchip,
      breeder: f1Data.breeder,
      owner: f1Data.owner,
      phone: f1Data.phone,
      email: f1Data.email,
      street: f1Data.street,
      number: f1Data.number,
      neighborhood: f1Data.neighborhood,
      postalCode: f1Data.postalCode,
      cityState: f1Data.cityState,
      country: f1Data.country,
    }, false);
    pdf.save(`INBR_Formato_F1_${f1Data.dogName || 'Ejemplar'}.pdf`);
  };

  const handleDownloadFilledPermanentPdf = () => {
    const pdf = generateIndividualFormPdf({
      procedureType: 'PERMANENTE',
      dogName: permanentData.dogName,
      breed: permanentData.breed,
      gender: permanentData.gender,
      dob: permanentData.dob,
      color: permanentData.color,
      microchip: permanentData.microchip,
      breeder: permanentData.breeder,
      owner: permanentData.owner,
      phone: permanentData.phone,
      email: permanentData.email,
      street: permanentData.street,
      number: permanentData.number,
      neighborhood: permanentData.neighborhood,
      postalCode: permanentData.postalCode,
      cityState: permanentData.cityState,
      country: permanentData.country,
      sire: permanentData.sireReg ? `INBR: ${permanentData.sireReg}` : '',
      dam: permanentData.damReg ? `INBR: ${permanentData.damReg}` : '',
    }, false);
    pdf.save(`INBR_Formato_Permanente_${permanentData.dogName || 'Ejemplar'}.pdf`);
  };

  const handleDownloadFilledHomoPdf = () => {
    const pdf = generateIndividualFormPdf({
      procedureType: 'HOMOLOGACION',
      dogName: homoData.dogName,
      breed: homoData.breed,
      gender: homoData.gender,
      dob: homoData.dob,
      color: homoData.color,
      microchip: homoData.microchip,
      breeder: homoData.breeder,
      owner: homoData.owner,
      phone: homoData.phone,
      email: homoData.email,
      street: homoData.street,
      number: homoData.number,
      neighborhood: homoData.neighborhood,
      postalCode: homoData.postalCode,
      cityState: homoData.cityState,
      country: homoData.country,
      sire: homoPedigree.sire?.name,
      sireColor: homoPedigree.sire?.color,
      dam: homoPedigree.dam?.name,
      damColor: homoPedigree.dam?.color,
      sireSire: homoPedigree.sireSire?.name,
      sireSireColor: homoPedigree.sireSire?.color,
      sireDam: homoPedigree.sireDam?.name,
      sireDamColor: homoPedigree.sireDam?.color,
      damSire: homoPedigree.damSire?.name,
      damSireColor: homoPedigree.damSire?.color,
      damDam: homoPedigree.damDam?.name,
      damDamColor: homoPedigree.damDam?.color,
    }, false);
    pdf.save(`INBR_Formato_Homologacion_${homoData.dogName || 'Ejemplar'}.pdf`);
  };

  const handleDownloadFilledLitterPdf = () => {
    const pdf = generateLitterFormPdf({
      breed: litterData.breed,
      birthDate: litterData.birthDate,
      matingDate: litterData.matingDate,
      totalMales: litterData.totalMales,
      totalFemales: litterData.totalFemales,
      fatherInbr: litterData.fatherInbr,
      fatherName: litterData.fatherName,
      fatherOwner: litterData.fatherOwner,
      fatherCoOwner: litterData.fatherCoOwner,
      fatherAddress: litterData.fatherAddress,
      fatherCity: litterData.fatherCity,
      fatherState: litterData.fatherState,
      fatherZip: litterData.fatherZip,
      fatherCountry: litterData.fatherCountry,
      fatherEmail: litterData.fatherEmail,
      motherInbr: litterData.motherInbr,
      motherName: litterData.motherName,
      motherOwner: litterData.motherOwner,
      motherCoOwner: litterData.motherCoOwner,
      motherAddress: litterData.motherAddress,
      motherCity: litterData.motherCity,
      motherState: litterData.motherState,
      motherZip: litterData.motherZip,
      motherCountry: litterData.motherCountry,
      motherEmail: litterData.motherEmail,
      litterOwnerName: litterData.litterOwnerName,
      litterOwnerAddress: litterData.litterOwnerAddress,
      litterOwnerCity: litterData.litterOwnerCity,
      litterOwnerState: litterData.litterOwnerState,
      litterOwnerZip: litterData.litterOwnerZip,
      litterOwnerCountry: litterData.litterOwnerCountry,
      litterOwnerEmail: litterData.litterOwnerEmail,
      puppies: puppiesList.map(p => ({ gender: p.gender, color: p.color })),
    }, false);
    pdf.save(`INBR_Acta_Camada_${litterData.motherInbr || 'Oficial'}.pdf`);
  };

  const pedigree: EightGenPedigree | null = searchedDog ? buildEightGenPedigree(searchedDog, dogs) : null;

  return (
    <section id="formularios" className="py-4 sm:py-8 bg-[#080808] relative border-t border-b border-[#D4AF37]/25 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ENCABEZADO ACORDEÓN CLICKEABLE (EXPANDIBLE / RETRÁCTIL) */}
        <div className="rounded-3xl bg-gradient-to-r from-[#17130A] via-[#1C160B] to-[#120F08] border-2 border-[#D4AF37]/70 shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-hidden transition-all mb-8">
          <button
            type="button"
            onClick={() => setIsSectionExpanded(!isSectionExpanded)}
            className="w-full p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:bg-[#251D0F]/40 transition-colors cursor-pointer group"
            aria-expanded={isSectionExpanded}
            title={isSectionExpanded ? 'Contraer portal de formatos de registro' : 'Expandir portal de formatos de registro'}
          >
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gold-gradient text-black flex items-center justify-center font-black shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7 text-black stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-[#FFE885] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2A2012] border border-[#D4AF37]/50">
                    PORTAL OFICIAL DE TRÁMITES & FORMATOS INBR
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                    5 Trámites Disponibles
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-white font-serif-luxury tracking-wide group-hover:text-[#FFE885] transition-colors leading-tight">
                  Formatos & Formularios de Registro Canino
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 line-clamp-1 sm:line-clamp-none mt-0.5">
                  F1 Inicial, Registro Permanente, Homologación, Registro de Camada y Genograma.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
              <span className="text-xs font-bold text-[#FFE885] font-mono uppercase tracking-wider">
                {isSectionExpanded ? '▲ Contraer Formatos' : '▼ Abrir Formatos'}
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gold-gradient text-black flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                {isSectionExpanded ? <ChevronUp className="w-5 h-5 text-black stroke-[2.5]" /> : <ChevronDown className="w-5 h-5 text-black stroke-[2.5]" />}
              </div>
            </div>
          </button>
        </div>

        {/* CONTENIDO EXPANDIBLE DE LA SECCIÓN (SIN MENÚS ANIDADOS DE 3 FASES) */}
        {isSectionExpanded && (
          <div className="space-y-5 animate-fadeIn">
            {/* Barra superior limpia: navegación + botones compactos de Formatos PDF y Datos Bancarios */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#inicio"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#14120D] border border-[#D4AF37]/50 text-xs font-bold text-[#FFE885] hover:bg-[#201A0E] transition-all"
                  title="Regresar al Inicio"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Inicio</span>
                </a>

                <a
                  href="#verificacion"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-all"
                >
                  <span>Verificación →</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBlankPdfBanner((prev) => !prev);
                    setShowBankInfo(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    showBlankPdfBanner
                      ? 'bg-gold-gradient text-black border-[#D4AF37] font-black shadow'
                      : 'bg-[#17130B] border-[#D4AF37]/60 text-[#FFE885] hover:bg-[#241D10]'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Formatos en Blanco PDF</span>
                  {showBlankPdfBanner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {activeTab !== 'genogram' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankInfo((prev) => !prev);
                      setShowBlankPdfBanner(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      showBankInfo
                        ? 'bg-gold-gradient text-black border-[#D4AF37] font-black shadow'
                        : 'bg-[#17130B] border-[#D4AF37]/60 text-[#FFE885] hover:bg-[#241D10]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cuentas BBVA / OXXO</span>
                    {showBankInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Cajón opcional: Formatos PDF en Blanco */}
            {showBlankPdfBanner && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#16120B] border border-[#D4AF37] space-y-3 animate-fadeIn">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Descarga los formatos PDF oficiales INBR en blanco, imprímelos en tamaño carta y envíalos junto con tu ficha de pago.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => downloadBlankIndividualPdf('F1')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 transition-all shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Formato Individual PDF (F1 / Permanente)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadBlankLitterPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#1E190E] border border-[#D4AF37] text-[#FFE885] font-bold text-xs hover:bg-[#2A2214] transition-all shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Formato de Camada PDF (2 Pág.)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Cajón opcional: Datos Bancarios */}
            {showBankInfo && activeTab !== 'genogram' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#16120B] border border-[#D4AF37] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                <div className="text-xs text-neutral-300 leading-relaxed space-y-1">
                  <p>Realiza tu pago en ventanilla bancaria, transferencia SPEI o tiendas OXXO.</p>
                  <p className="text-[#FFE885] font-semibold">Adjunta tu comprobante al final del formulario.</p>
                </div>
                <div className="text-left sm:text-right text-xs space-y-1 bg-black/70 p-3 rounded-xl border border-neutral-800 shrink-0 w-full sm:w-auto">
                  <div>Banco: <strong className="text-white">BBVA México</strong></div>
                  <div>Beneficiario: <strong className="text-[#FFE885]">Jonathan García / INBR</strong></div>
                  <div>N° Tarjeta: <strong className="font-mono text-white text-sm">4152 3138 9012 7770</strong></div>
                  <div>CLABE Interbancaria: <strong className="font-mono text-[#FFE885] text-xs">0121 8000 4152 3138 90</strong></div>
                </div>
              </div>
            )}

            {/* BARRA DIRECTA DE 5 TRÁMITES (1 CLIC, SIN MENÚ DESPLEGABLE INTERMEDIO) */}
            <div className="bg-[#120F0A] border-2 border-[#D4AF37]/80 rounded-2xl p-1.5 shadow-xl overflow-x-auto">
              <div className="flex items-center gap-1.5 min-w-max sm:grid sm:grid-cols-5">
                {[
                  { id: 'f1', label: '1. Aplicación F1', icon: Award },
                  { id: 'permanent', label: '2. Permanente', icon: BadgeCheck },
                  { id: 'homologation', label: '3. Homologación', icon: ArrowRightLeft },
                  { id: 'litter', label: '4. Camada', icon: Baby },
                  { id: 'genogram', label: '5. Genograma 4G', icon: GitBranch },
                ].map((item) => {
                  const Icon = item.icon;
                  const isAct = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as any)}
                      className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isAct
                          ? 'bg-gold-gradient text-black font-black shadow-lg'
                          : 'text-neutral-300 hover:text-white hover:bg-[#1E190E]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isAct ? 'text-black' : 'text-[#D4AF37]'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

        {/* ========================================================================= */}
        {/* 1. FORMULARIO F1 INICIAL (SOLO INFO DE ARRIBA, SIN PAPÁS NI ASCENDENCIA)    */}
        {/* ========================================================================= */}
        {activeTab === 'f1' && (
          <div className="max-w-4xl mx-auto rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-neutral-800 gap-4">
              <div>
                <span className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider block mb-1">
                  INBR CERTIFIED • TRAMITACIÓN F1 INICIAL
                </span>
                <h3 className="text-2xl font-bold text-white font-serif-luxury">
                  Formulario F1 de Registro Inicial Base
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Para ejemplares fundadores o cachorros nuevos. Solo requiere los datos generales del perro y dirección de envío (sin ascendencia).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadBlankIndividualPdf('F1')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-[#D4AF37]/60 text-[#FFE885] text-xs font-bold hover:bg-[#1C160B] transition-all cursor-pointer"
                  title="Descargar Formato F1 en Blanco"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF en Blanco</span>
                </button>
              </div>
            </div>

            {!f1Submitted ? (
              <form onSubmit={handleF1Submit} className="space-y-6">
                {/* 1. Datos del Ejemplar */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    <span>Datos Oficiales del Ejemplar</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Nombre del Ejemplar *
                      </label>
                      <input
                        type="text"
                        required
                        value={f1Data.dogName}
                        onChange={(e) => setF1Data({ ...f1Data, dogName: e.target.value })}
                        placeholder="ej: TITAN BLOOD BULLSEYE"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Raza *
                      </label>
                      <input
                        type="text"
                        required
                        value={f1Data.breed}
                        onChange={(e) => setF1Data({ ...f1Data, breed: e.target.value })}
                        placeholder="American Bully, Exotic Bull, APBT, French Bulldog, etc."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Sexo *
                      </label>
                      <select
                        value={f1Data.gender}
                        onChange={(e) => setF1Data({ ...f1Data, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="Macho">Macho</option>
                        <option value="Hembra">Hembra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Color *
                      </label>
                      <input
                        type="text"
                        required
                        value={f1Data.color}
                        onChange={(e) => setF1Data({ ...f1Data, color: e.target.value })}
                        placeholder="ej: Lilac Tri-Color, Champagne, Blue & White"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Fecha de Nacimiento *
                      </label>
                      <input
                        type="date"
                        required
                        value={f1Data.dob}
                        onChange={(e) => setF1Data({ ...f1Data, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        No. de Microchip
                      </label>
                      <input
                        type="text"
                        value={f1Data.microchip}
                        onChange={(e) => setF1Data({ ...f1Data, microchip: e.target.value })}
                        placeholder="Microchip ISO 15 dígitos (si ya cuenta con él)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Criador *
                      </label>
                      <input
                        type="text"
                        required
                        value={f1Data.breeder}
                        onChange={(e) => setF1Data({ ...f1Data, breeder: e.target.value })}
                        placeholder="Nombre del criador o kennel"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Propietario *
                      </label>
                      <input
                        type="text"
                        required
                        value={f1Data.owner}
                        onChange={(e) => setF1Data({ ...f1Data, owner: e.target.value })}
                        placeholder="Nombre completo del propietario"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Tel/cel. Propietario *
                      </label>
                      <input
                        type="tel"
                        required
                        value={f1Data.phone}
                        onChange={(e) => setF1Data({ ...f1Data, phone: e.target.value })}
                        placeholder="+52 55 1234 5678"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        E-mail Propietario *
                      </label>
                      <input
                        type="email"
                        required
                        value={f1Data.email}
                        onChange={(e) => setF1Data({ ...f1Data, email: e.target.value })}
                        placeholder="propietario@email.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Dirección de Envío */}
                <div className="p-4 rounded-2xl bg-[#0A0907] border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                    Dirección de Envío del Certificado Físico
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Calle *</label>
                      <input
                        type="text"
                        required
                        value={f1Data.street}
                        onChange={(e) => setF1Data({ ...f1Data, street: e.target.value })}
                        placeholder="ej: Av. Insurgentes Sur"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Número (Ext / Int) *</label>
                      <input
                        type="text"
                        required
                        value={f1Data.number}
                        onChange={(e) => setF1Data({ ...f1Data, number: e.target.value })}
                        placeholder="ej: 1250 Int 4B"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Colonia / Localidad *</label>
                      <input
                        type="text"
                        required
                        value={f1Data.neighborhood}
                        onChange={(e) => setF1Data({ ...f1Data, neighborhood: e.target.value })}
                        placeholder="ej: Del Valle"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P. *</label>
                      <input
                        type="text"
                        required
                        value={f1Data.postalCode}
                        onChange={(e) => setF1Data({ ...f1Data, postalCode: e.target.value })}
                        placeholder="03100"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad / Estado *</label>
                      <input
                        type="text"
                        required
                        value={f1Data.cityState}
                        onChange={(e) => setF1Data({ ...f1Data, cityState: e.target.value })}
                        placeholder="CDMX / México"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Fotografías Oficiales del Ejemplar (Lateral, Frontal, Trasera) */}
                <div className="p-4 rounded-2xl bg-[#0A0907] border border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFE885] uppercase">
                    <Camera className="w-4 h-4 text-[#D4AF37]" />
                    <span>Fotografías Oficiales del Ejemplar *</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Sube las fotografías nítidas del ejemplar (perfil lateral, frontal y trasera/mordida) para cotejar su morfología y fenotipo.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[#12110D] border border-neutral-700/80 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-neutral-300">Foto Lateral / Perfil *</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setF1PhotoLateral(e.target.files[0]);
                        }}
                        className="w-full text-[11px] text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-[#FFE885] file:text-[10px] file:font-bold cursor-pointer"
                      />
                      {f1PhotoLateral && (
                        <span className="text-[10px] text-emerald-400 font-mono block">✅ {f1PhotoLateral.name}</span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-[#12110D] border border-neutral-700/80 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-neutral-300">Foto Frontal *</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setF1PhotoFrontal(e.target.files[0]);
                        }}
                        className="w-full text-[11px] text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-[#FFE885] file:text-[10px] file:font-bold cursor-pointer"
                      />
                      {f1PhotoFrontal && (
                        <span className="text-[10px] text-emerald-400 font-mono block">✅ {f1PhotoFrontal.name}</span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-[#12110D] border border-neutral-700/80 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-neutral-300">Foto Posterior / Libre</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setF1PhotoRear(e.target.files[0]);
                        }}
                        className="w-full text-[11px] text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-[#FFE885] file:text-[10px] file:font-bold cursor-pointer"
                      />
                      {f1PhotoRear && (
                        <span className="text-[10px] text-emerald-400 font-mono block">✅ {f1PhotoRear.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Comprobante de Pago */}
                <div className="p-4 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37]/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFE885] uppercase">
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>Comprobante de Pago Bancario (Ficha BBVA / OXXO / Transferencia) *</span>
                  </div>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setF1ReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-gradient file:text-black file:font-bold hover:file:brightness-110 cursor-pointer"
                  />
                  {f1ReceiptFile && (
                    <span className="text-emerald-400 text-xs font-bold block">
                      ✅ Comprobante adjunto: {f1ReceiptFile.name}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#FFE885] pt-1">
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Se enviará copia íntegra con las fotos y recibo de pago a <strong>inbr.oficial@gmail.com</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadFilledF1Pdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border-2 border-[#D4AF37] hover:bg-[#2A2214] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Descargar PDF con mis Datos</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitud F1 en Línea</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white font-serif-luxury">
                  ¡Solicitud F1 Recibida Exitosamente!
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  Tu expediente ha sido registrado bajo el nombre <strong className="text-white">{f1Data.dogName}</strong>. Se ha generado y transmitido una copia oficial con todos los datos, fotografías adjuntas y comprobante bancario al correo institucional <strong className="text-[#FFE885]">inbr.oficial@gmail.com</strong>.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadFilledF1Pdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 shadow"
                  >
                    Descargar Copia de Respaldo PDF
                  </button>
                  <a
                    href={`mailto:inbr.oficial@gmail.com?subject=Expediente%20F1%20-${encodeURIComponent(f1Data.dogName)}&body=Solicitud%20de%20Registro%20F1%20para%20${encodeURIComponent(f1Data.dogName)}.%20Propietario:%20${encodeURIComponent(f1Data.owner)}.%20Tel:${encodeURIComponent(f1Data.phone)}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1B160C] border border-[#D4AF37] hover:bg-[#2A2012] flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Copia Enviada a inbr.oficial@gmail.com</span>
                  </a>
                  <button
                    onClick={() => {
                      setF1Submitted(false);
                      setF1ReceiptFile(null);
                      setF1PhotoLateral(null);
                      setF1PhotoFrontal(null);
                      setF1PhotoRear(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
                  >
                    Registrar Otro Ejemplar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. FORMULARIO DE REGISTRO PERMANENTE (INFO ARRIBA + N° REGISTRO DE PADRES)  */}
        {/* ========================================================================= */}
        {activeTab === 'permanent' && (
          <div className="max-w-4xl mx-auto rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-neutral-800 gap-4">
              <div>
                <span className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider block mb-1">
                  HOMOLOGACIÓN DEFINITIVA • REGISTRO PERMANENTE
                </span>
                <h3 className="text-2xl font-bold text-white font-serif-luxury">
                  Formulario de Registro Permanente INBR
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Para ejemplares cuyos padres ya están registrados en INBR. Solo se requieren los datos generales del perro y los dos números de registro INBR de los progenitores.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadBlankIndividualPdf('PERMANENTE')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-[#D4AF37]/60 text-[#FFE885] text-xs font-bold hover:bg-[#1C160B] transition-all cursor-pointer"
                  title="Descargar Formato Permanente en Blanco"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF en Blanco</span>
                </button>
              </div>
            </div>

            {!permanentSubmitted ? (
              <form onSubmit={handlePermanentSubmit} className="space-y-6">
                {/* 1. Datos del Ejemplar */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Datos Oficiales del Ejemplar</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Nombre del Ejemplar *
                      </label>
                      <input
                        type="text"
                        required
                        value={permanentData.dogName}
                        onChange={(e) => setPermanentData({ ...permanentData, dogName: e.target.value })}
                        placeholder="ej: KRONOS LEGENDARY"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Raza *
                      </label>
                      <input
                        type="text"
                        required
                        value={permanentData.breed}
                        onChange={(e) => setPermanentData({ ...permanentData, breed: e.target.value })}
                        placeholder="American Bully, Exotic Bull, etc."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Sexo *</label>
                      <select
                        value={permanentData.gender}
                        onChange={(e) => setPermanentData({ ...permanentData, gender: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      >
                        <option value="Macho">Macho</option>
                        <option value="Hembra">Hembra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Color *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.color}
                        onChange={(e) => setPermanentData({ ...permanentData, color: e.target.value })}
                        placeholder="ej: Chocolate Tri, Fawn"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        required
                        value={permanentData.dob}
                        onChange={(e) => setPermanentData({ ...permanentData, dob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">No. de Microchip</label>
                      <input
                        type="text"
                        value={permanentData.microchip}
                        onChange={(e) => setPermanentData({ ...permanentData, microchip: e.target.value })}
                        placeholder="Microchip ISO 15 dígitos"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Criador *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.breeder}
                        onChange={(e) => setPermanentData({ ...permanentData, breeder: e.target.value })}
                        placeholder="Nombre del criador o kennel"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Propietario *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.owner}
                        onChange={(e) => setPermanentData({ ...permanentData, owner: e.target.value })}
                        placeholder="Nombre del titular"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Tel/cel. Propietario *</label>
                      <input
                        type="tel"
                        required
                        value={permanentData.phone}
                        onChange={(e) => setPermanentData({ ...permanentData, phone: e.target.value })}
                        placeholder="+52 55 1234 5678"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">E-mail Propietario *</label>
                      <input
                        type="email"
                        required
                        value={permanentData.email}
                        onChange={(e) => setPermanentData({ ...permanentData, email: e.target.value })}
                        placeholder="propietario@email.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. REGISTROS INBR DE LOS PADRES (SOLO LOS NÚMEROS DE REGISTRO) */}
                <div className="p-5 rounded-2xl bg-[#141008] border-2 border-[#D4AF37] space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-xs font-mono font-bold text-[#FFE885] uppercase tracking-wider">
                      Números de Registro INBR de los Padres (Vinculación Automática de Árbol)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Dado que ambos progenitores ya se encuentran certificados en el Libro de Orígenes de INBR, el pedigrí oficial de 4 generaciones se vincula de manera automática mediante sus dos folios:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#FFE885] mb-1.5">
                        N° de Registro INBR del Padre (Sire) *
                      </label>
                      <input
                        type="text"
                        required
                        value={permanentData.sireReg}
                        onChange={(e) => setPermanentData({ ...permanentData, sireReg: e.target.value })}
                        placeholder="ej: INBR-84920 o F110369"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-[#D4AF37]/60 text-xs font-mono text-white focus:outline-none focus:border-[#FFE885]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#FFE885] mb-1.5">
                        N° de Registro INBR de la Madre (Dam) *
                      </label>
                      <input
                        type="text"
                        required
                        value={permanentData.damReg}
                        onChange={(e) => setPermanentData({ ...permanentData, damReg: e.target.value })}
                        placeholder="ej: INBR-00192 o BI10000"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#080808] border border-[#D4AF37]/60 text-xs font-mono text-white focus:outline-none focus:border-[#FFE885]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Dirección de Envío */}
                <div className="p-4 rounded-2xl bg-[#0A0907] border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                    Dirección de Envío del Registro Permanente
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Calle *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.street}
                        onChange={(e) => setPermanentData({ ...permanentData, street: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Número *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.number}
                        onChange={(e) => setPermanentData({ ...permanentData, number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Colonia / Localidad *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.neighborhood}
                        onChange={(e) => setPermanentData({ ...permanentData, neighborhood: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P. *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.postalCode}
                        onChange={(e) => setPermanentData({ ...permanentData, postalCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad / Estado *</label>
                      <input
                        type="text"
                        required
                        value={permanentData.cityState}
                        onChange={(e) => setPermanentData({ ...permanentData, cityState: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Comprobante de Pago */}
                <div className="p-4 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37]/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFE885] uppercase">
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>Comprobante de Pago Bancario para Registro Permanente *</span>
                  </div>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPermanentReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-gradient file:text-black file:font-bold hover:file:brightness-110 cursor-pointer"
                  />
                  {permanentReceiptFile && (
                    <span className="text-emerald-400 text-xs font-bold block">
                      ✅ Comprobante adjunto: {permanentReceiptFile.name}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadFilledPermanentPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border-2 border-[#D4AF37] hover:bg-[#2A2214] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Descargar PDF con mis Datos</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Emitir Registro Permanente en Línea</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white font-serif-luxury">
                  ¡Registro Permanente Enviado a Certificación!
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  El expediente de <strong className="text-white">{permanentData.dogName}</strong> ha sido vinculado exitosamente con los folios de los progenitores ({permanentData.sireReg} y {permanentData.damReg}).
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadFilledPermanentPdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 shadow"
                  >
                    Descargar Copia de Respaldo PDF
                  </button>
                  <button
                    onClick={() => {
                      setPermanentSubmitted(false);
                      setPermanentReceiptFile(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
                  >
                    Nuevo Trámite Permanente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. FORMULARIO DE HOMOLOGACIÓN (INFO + FOTO REGISTRO OBLIGATORIA + ÁRBOL)    */}
        {/* ========================================================================= */}
        {activeTab === 'homologation' && (
          <div className="max-w-4xl mx-auto rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-neutral-800 gap-4">
              <div>
                <span className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider block mb-1">
                  TRANSFERENCIA INTERNACIONAL OFICIAL
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif-luxury">
                  Homologación desde Otros Clubes Caninos
                </h3>
                <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                  Homologa ejemplares provenientes de ABKC, UKC, FCI, FCM o AKC. Requiere subir la foto nítida de tu certificado previo y capturar la ascendencia con colores exactos.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadBlankIndividualPdf('HOMOLOGACION')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-[#D4AF37]/60 text-[#FFE885] text-xs font-bold hover:bg-[#1C160B] transition-all cursor-pointer"
                  title="Descargar Formato Homologación en Blanco"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF en Blanco</span>
                </button>
              </div>
            </div>

            {!homoSubmitted ? (
              <form onSubmit={handleHomoSubmit} className="space-y-6">
                {/* 1. Datos del Club de Procedencia */}
                <div className="p-4 rounded-2xl bg-[#16120B] border-2 border-[#D4AF37] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFE885] uppercase">
                    <ArrowRightLeft className="w-4 h-4 text-[#D4AF37]" />
                    <span>1. Registro Previo & Club de Origen</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Club o Registro de Origen *</label>
                      <select
                        value={homoData.originalClub}
                        onChange={(e) => setHomoData({ ...homoData, originalClub: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                      >
                        <option value="ABKC">ABKC (American Bully Kennel Club)</option>
                        <option value="UKC">UKC (United Kennel Club)</option>
                        <option value="FCI">FCI (Federation Cynologique Int.)</option>
                        <option value="FCM">FCM (Federación Canófila Mexicana)</option>
                        <option value="AKC">AKC (American Kennel Club)</option>
                        <option value="IBKC">IBKC</option>
                        <option value="OTRO">Otro Club Internacional</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">N° de Folio / Registro Previo *</label>
                      <input
                        type="text"
                        required
                        value={homoData.originalReg}
                        onChange={(e) => setHomoData({ ...homoData, originalReg: e.target.value })}
                        placeholder="ej: ABKC-99281-22 o UKC-..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs font-mono text-white focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* FOTO OBLIGATORIA DEL REGISTRO PREVIO (SOLICITADO EXPRESAMENTE POR EL USUARIO) */}
                  <div className="p-4 rounded-xl bg-[#0F0D09] border border-amber-500/50 space-y-2">
                    <div className="flex items-start gap-2 text-xs font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span>Subida Obligatoria de Foto del Registro Previo (Pedigree / Certificado Actual) *</span>
                        <p className="text-[11px] text-neutral-300 font-normal mt-0.5">
                          Sube una fotografía nítida o escaneo del certificado original de procedencia para cotejar los nombres y colores exactos de los ejemplares de la genealogía.
                        </p>
                      </div>
                    </div>

                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setHomoPedigreePhoto(file);
                          if (file.type.startsWith('image/')) {
                            setHomoPedigreePhotoPreview(URL.createObjectURL(file));
                          } else {
                            setHomoPedigreePhotoPreview(null);
                          }
                        }
                      }}
                      className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-gradient file:text-black file:font-bold hover:file:brightness-110 cursor-pointer"
                    />

                    {homoPedigreePhoto && (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-emerald-400 text-xs font-bold">
                          ✅ Certificado original adjunto: {homoPedigreePhoto.name}
                        </span>
                        {homoPedigreePhotoPreview && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#D4AF37] shadow">
                            <img src={homoPedigreePhotoPreview} alt="Registro Previo" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Datos Generales del Ejemplar */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D4AF37]" />
                    <span>2. Datos Oficiales del Ejemplar</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre Completo del Ejemplar *</label>
                      <input
                        type="text"
                        required
                        value={homoData.dogName}
                        onChange={(e) => setHomoData({ ...homoData, dogName: e.target.value })}
                        placeholder="Nombre registrado"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Raza *</label>
                      <input
                        type="text"
                        required
                        value={homoData.breed}
                        onChange={(e) => setHomoData({ ...homoData, breed: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Sexo *</label>
                      <select
                        value={homoData.gender}
                        onChange={(e) => setHomoData({ ...homoData, gender: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      >
                        <option value="Macho">Macho</option>
                        <option value="Hembra">Hembra</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Color *</label>
                      <input
                        type="text"
                        required
                        value={homoData.color}
                        onChange={(e) => setHomoData({ ...homoData, color: e.target.value })}
                        placeholder="Color de manto"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        required
                        value={homoData.dob}
                        onChange={(e) => setHomoData({ ...homoData, dob: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">No. de Microchip</label>
                      <input
                        type="text"
                        value={homoData.microchip}
                        onChange={(e) => setHomoData({ ...homoData, microchip: e.target.value })}
                        placeholder="15 dígitos"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Criador *</label>
                      <input
                        type="text"
                        required
                        value={homoData.breeder}
                        onChange={(e) => setHomoData({ ...homoData, breeder: e.target.value })}
                        placeholder="Criador original"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Propietario *</label>
                      <input
                        type="text"
                        required
                        value={homoData.owner}
                        onChange={(e) => setHomoData({ ...homoData, owner: e.target.value })}
                        placeholder="Propietario titular"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Tel/cel. Propietario *</label>
                      <input
                        type="tel"
                        required
                        value={homoData.phone}
                        onChange={(e) => setHomoData({ ...homoData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">E-mail Propietario *</label>
                      <input
                        type="email"
                        required
                        value={homoData.email}
                        onChange={(e) => setHomoData({ ...homoData, email: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Dirección de Envío */}
                <div className="p-4 rounded-2xl bg-[#0A0907] border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                    Dirección de Envío
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Calle *</label>
                      <input
                        type="text"
                        required
                        value={homoData.street}
                        onChange={(e) => setHomoData({ ...homoData, street: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Número *</label>
                      <input
                        type="text"
                        required
                        value={homoData.number}
                        onChange={(e) => setHomoData({ ...homoData, number: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Colonia / Localidad *</label>
                      <input
                        type="text"
                        required
                        value={homoData.neighborhood}
                        onChange={(e) => setHomoData({ ...homoData, neighborhood: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P. *</label>
                      <input
                        type="text"
                        required
                        value={homoData.postalCode}
                        onChange={(e) => setHomoData({ ...homoData, postalCode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad / Estado *</label>
                      <input
                        type="text"
                        required
                        value={homoData.cityState}
                        onChange={(e) => setHomoData({ ...homoData, cityState: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ÁRBOL GENEALÓGICO COMPLETO (HOMOLOGATION PEDIGREE BUILDER) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-[#D4AF37]" />
                    <span>3. Árbol Genealógico Completo de 4 Generaciones (Padre, Madre y Ancestros con Colores)</span>
                  </h4>
                  <HomologationPedigreeBuilder
                    value={homoPedigree}
                    onChange={(updated) => setHomoPedigree(updated)}
                  />
                </div>

                {/* 5. Comprobante de Pago */}
                <div className="p-4 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37]/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFE885] uppercase">
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>Comprobante de Pago Bancario para Homologación *</span>
                  </div>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setHomoReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-gradient file:text-black file:font-bold hover:file:brightness-110 cursor-pointer"
                  />
                  {homoReceiptFile && (
                    <span className="text-emerald-400 text-xs font-bold block">
                      ✅ Comprobante adjunto: {homoReceiptFile.name}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadFilledHomoPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border-2 border-[#D4AF37] hover:bg-[#2A2214] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Descargar PDF con mis Datos</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Enviar Solicitud de Homologación en Línea</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white font-serif-luxury">
                  ¡Solicitud de Homologación Recibida!
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  Los datos del ejemplar <strong className="text-white">{homoData.dogName}</strong> ({homoData.originalClub}: {homoData.originalReg}) y la fotografía de su certificado han sido enviados para cotejo notarial e incorporación al Libro de Orígenes INBR.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadFilledHomoPdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 shadow"
                  >
                    Descargar Copia de Respaldo PDF
                  </button>
                  <button
                    onClick={() => {
                      setHomoSubmitted(false);
                      setHomoReceiptFile(null);
                      setHomoPedigreePhoto(null);
                      setHomoPedigreePhotoPreview(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
                  >
                    Nueva Homologación
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. FORMULARIO DE REGISTRO DE CAMADA (IDÉNTICO A LAS 2 PÁGINAS DEL PDF)     */}
        {/* ========================================================================= */}
        {activeTab === 'litter' && (
          <div className="max-w-4xl mx-auto rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/50 p-6 sm:p-10 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-6 border-b border-neutral-800 gap-4">
              <div>
                <span className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider block mb-1">
                  ACTA OFICIAL DE CRUZA & CAMADA
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif-luxury">
                  Formulario Oficial de Registro de Camada
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Formato idéntico al acta oficial de 2 páginas de INBR: datos de camada, información completa del padre y madre, titular de la camada y desglose de hasta 12 cachorros.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={downloadBlankLitterPdf}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-[#D4AF37]/60 text-[#FFE885] text-xs font-bold hover:bg-[#1C160B] transition-all cursor-pointer"
                  title="Descargar Formato de Camada en Blanco (2 Páginas)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF Camada en Blanco (2 Pág.)</span>
                </button>
              </div>
            </div>

            {!litterSubmitted ? (
              <form onSubmit={handleLitterSubmit} className="space-y-8">
                {/* 1. INFORMACIÓN DE LA CAMADA */}
                <div className="p-5 rounded-2xl bg-[#16120B] border-2 border-[#D4AF37] space-y-4">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-neutral-800">
                    <Baby className="w-4 h-4 text-[#D4AF37]" />
                    <span>1. Información de la Camada</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Raza *</label>
                      <input
                        type="text"
                        required
                        value={litterData.breed}
                        onChange={(e) => setLitterData({ ...litterData, breed: e.target.value })}
                        placeholder="American Bully, Exotic Bull, etc."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        required
                        value={litterData.birthDate}
                        onChange={(e) => setLitterData({ ...litterData, birthDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Fecha de Cruza</label>
                      <input
                        type="date"
                        value={litterData.matingDate}
                        onChange={(e) => setLitterData({ ...litterData, matingDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5"># Total de Machos *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={litterData.totalMales}
                        onChange={(e) => setLitterData({ ...litterData, totalMales: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1.5"># Total de Hembras *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={litterData.totalFemales}
                        onChange={(e) => setLitterData({ ...litterData, totalFemales: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. INFORMACIÓN DEL PADRE & INFORMACIÓN DE LA MADRE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Padre */}
                  <div className="p-4 rounded-2xl bg-[#0F0D09] border border-neutral-800 space-y-3">
                    <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                      2. Información del Padre (Sire)
                    </h4>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">INBR # del Padre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.fatherInbr}
                        onChange={(e) => setLitterData({ ...litterData, fatherInbr: e.target.value })}
                        placeholder="ej: INBR-84920 o F110369"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del Padre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.fatherName}
                        onChange={(e) => setLitterData({ ...litterData, fatherName: e.target.value })}
                        placeholder="Nombre completo del semental"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del Dueño del Padre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.fatherOwner}
                        onChange={(e) => setLitterData({ ...litterData, fatherOwner: e.target.value })}
                        placeholder="Titular del semental"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del Copropietario (si aplica)</label>
                      <input
                        type="text"
                        value={litterData.fatherCoOwner}
                        onChange={(e) => setLitterData({ ...litterData, fatherCoOwner: e.target.value })}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Dirección Actual</label>
                      <input
                        type="text"
                        value={litterData.fatherAddress}
                        onChange={(e) => setLitterData({ ...litterData, fatherAddress: e.target.value })}
                        placeholder="Calle, número, colonia"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad</label>
                        <input
                          type="text"
                          value={litterData.fatherCity}
                          onChange={(e) => setLitterData({ ...litterData, fatherCity: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Estado / Prov.</label>
                        <input
                          type="text"
                          value={litterData.fatherState}
                          onChange={(e) => setLitterData({ ...litterData, fatherState: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P.</label>
                        <input
                          type="text"
                          value={litterData.fatherZip}
                          onChange={(e) => setLitterData({ ...litterData, fatherZip: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">País</label>
                        <input
                          type="text"
                          value={litterData.fatherCountry}
                          onChange={(e) => setLitterData({ ...litterData, fatherCountry: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={litterData.fatherEmail}
                        onChange={(e) => setLitterData({ ...litterData, fatherEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Columna Madre */}
                  <div className="p-4 rounded-2xl bg-[#0F0D09] border border-neutral-800 space-y-3">
                    <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                      3. Información de la Madre (Dam)
                    </h4>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">INBR # de la Madre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.motherInbr}
                        onChange={(e) => setLitterData({ ...litterData, motherInbr: e.target.value })}
                        placeholder="ej: INBR-00192 o BI10000"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre de la Madre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.motherName}
                        onChange={(e) => setLitterData({ ...litterData, motherName: e.target.value })}
                        placeholder="Nombre completo de la hembra"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del Dueño de la Madre *</label>
                      <input
                        type="text"
                        required
                        value={litterData.motherOwner}
                        onChange={(e) => setLitterData({ ...litterData, motherOwner: e.target.value })}
                        placeholder="Titular de la hembra"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Nombre del Copropietario (si aplica)</label>
                      <input
                        type="text"
                        value={litterData.motherCoOwner}
                        onChange={(e) => setLitterData({ ...litterData, motherCoOwner: e.target.value })}
                        placeholder="Opcional"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Dirección Actual</label>
                      <input
                        type="text"
                        value={litterData.motherAddress}
                        onChange={(e) => setLitterData({ ...litterData, motherAddress: e.target.value })}
                        placeholder="Calle, número, colonia"
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad</label>
                        <input
                          type="text"
                          value={litterData.motherCity}
                          onChange={(e) => setLitterData({ ...litterData, motherCity: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Estado / Prov.</label>
                        <input
                          type="text"
                          value={litterData.motherState}
                          onChange={(e) => setLitterData({ ...litterData, motherState: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P.</label>
                        <input
                          type="text"
                          value={litterData.motherZip}
                          onChange={(e) => setLitterData({ ...litterData, motherZip: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-300 mb-1">País</label>
                        <input
                          type="text"
                          value={litterData.motherCountry}
                          onChange={(e) => setLitterData({ ...litterData, motherCountry: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={litterData.motherEmail}
                        onChange={(e) => setLitterData({ ...litterData, motherEmail: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#14120D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. INFORMACIÓN DEL PROPIETARIO DE LA CAMADA */}
                <div className="p-4 rounded-2xl bg-[#0A0907] border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider pb-1 border-b border-neutral-800">
                    4. Información del Propietario de la Camada
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre del Propietario Titular *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerName}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerName: e.target.value })}
                        placeholder="Nombre completo"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Email del Propietario *</label>
                      <input
                        type="email"
                        required
                        value={litterData.litterOwnerEmail}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerEmail: e.target.value })}
                        placeholder="propietario@email.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Dirección Actual *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerAddress}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerAddress: e.target.value })}
                        placeholder="Calle, número, colonia"
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Ciudad *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerCity}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerCity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Estado / Providencia *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerState}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerState: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">C.P. *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerZip}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerZip: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-300 mb-1">País *</label>
                      <input
                        type="text"
                        required
                        value={litterData.litterOwnerCountry}
                        onChange={(e) => setLitterData({ ...litterData, litterOwnerCountry: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#12110D] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. INFORMACIÓN DE LOS CACHORROS (HASTA 12 CACHORROS) */}
                <div className="p-5 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37] space-y-4">
                  <div className="flex flex-wrap items-center justify-between pb-2 border-b border-neutral-800 gap-2">
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-[#D4AF37]" />
                      <h4 className="text-xs font-mono text-[#FFE885] font-bold uppercase tracking-wider">
                        5. Información de los Cachorros (Página 2 del Formato Oficial)
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-neutral-400">
                        Total: {puppiesList.length} cachorros
                      </span>
                      <button
                        type="button"
                        onClick={handleAddPuppy}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-gold-gradient text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Cachorro</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {puppiesList.map((pup, idx) => (
                      <div
                        key={pup.id || idx}
                        className="p-3.5 rounded-xl bg-[#090806] border border-neutral-800 hover:border-[#D4AF37]/60 transition-all space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#FFE885]">
                            CACHORRO {idx + 1}
                          </span>
                          {puppiesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePuppy(idx)}
                              className="text-neutral-500 hover:text-rose-400 p-0.5"
                              title="Eliminar este cachorro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Sexo Checkboxes */}
                        <div className="flex items-center gap-4 text-xs text-neutral-300">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`gender-${pup.id}`}
                              checked={pup.gender === 'Macho'}
                              onChange={() => {
                                const copy = [...puppiesList];
                                copy[idx].gender = 'Macho';
                                setPuppiesList(copy);
                              }}
                              className="accent-[#D4AF37]"
                            />
                            <span>Macho</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`gender-${pup.id}`}
                              checked={pup.gender === 'Hembra'}
                              onChange={() => {
                                const copy = [...puppiesList];
                                copy[idx].gender = 'Hembra';
                                setPuppiesList(copy);
                              }}
                              className="accent-[#D4AF37]"
                            />
                            <span>Hembra</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 uppercase font-mono mb-1">
                            Color / Marcas *
                          </label>
                          <input
                            type="text"
                            required
                            value={pup.color}
                            onChange={(e) => {
                              const copy = [...puppiesList];
                              copy[idx].color = e.target.value;
                              setPuppiesList(copy);
                            }}
                            placeholder="ej: Champagne Tri, Blue"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#14120D] border border-neutral-700 text-xs text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. DECLARACIÓN DE VERACIDAD (LEGAL) */}
                <div className="p-5 rounded-2xl bg-[#1C1309] border-2 border-amber-500/70 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-[#FFE885] uppercase tracking-wider">
                      Declaración Notarial & Cláusula de Veracidad
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                    "ESTOY DE ACUERDO QUE SOY EL PROPIETARIO DE ESTA CAMADA REGISTRADA Y LA INFORMACIÓN PROPORCIONADA ES VERDAD. INBR ESTÁ RESERVADO CON EL DERECHO A CANCELAR ESTE REGISTRO EN CUALQUIER MOMENTO SI ENCONTRAMOS QUE LA INFORMACIÓN PROPORCIONADA ES FALSA SIN REEMBOLSO ALGUNO."
                  </p>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={litterData.legalTermsAccepted}
                      onChange={(e) => setLitterData({ ...litterData, legalTermsAccepted: e.target.checked })}
                      className="mt-0.5 accent-[#D4AF37] w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-white">
                      Acepto bajo protesta de decir verdad que soy el propietario legítimo de esta camada y asumo total responsabilidad de la información proporcionada.
                    </span>
                  </label>
                </div>

                {/* 6. Comprobante de Pago */}
                <div className="p-4 rounded-2xl bg-[#14120D] border-2 border-[#D4AF37]/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#FFE885] uppercase">
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>Comprobante de Pago de Registro de Camada *</span>
                  </div>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLitterReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-neutral-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-gradient file:text-black file:font-bold hover:file:brightness-110 cursor-pointer"
                  />
                  {litterReceiptFile && (
                    <span className="text-emerald-400 text-xs font-bold block">
                      ✅ Comprobante adjunto: {litterReceiptFile.name}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadFilledLitterPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border-2 border-[#D4AF37] hover:bg-[#2A2214] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#D4AF37]" />
                    <span>Descargar Acta PDF con mis Datos (2 Pág.)</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <Baby className="w-4 h-4" />
                    <span>Enviar Registro de Camada Oficial en Línea</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/60 text-center space-y-4 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-xl font-bold text-white font-serif-luxury">
                  ¡Acta de Camada Recibida con Éxito!
                </h4>
                <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                  Se ha registrado la camada de {puppiesList.length} cachorros ({litterData.totalMales} machos, {litterData.totalFemales} hembras) con padre {litterData.fatherName} y madre {litterData.motherName}.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadFilledLitterPdf}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 shadow"
                  >
                    Descargar Acta Oficial en PDF (2 Páginas)
                  </button>
                  <button
                    onClick={() => {
                      setLitterSubmitted(false);
                      setLitterReceiptFile(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
                  >
                    Registrar Otra Camada
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. VISUALIZADOR DE GENOGRAMA PRIVADO (4 GENERACIONES COMPLETAS)           */}
        {/* ========================================================================= */}
        {activeTab === 'genogram' && (
          <div className="rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/40 p-6 sm:p-10 shadow-2xl animate-fadeIn">
            {/* Header & Privacy Notice */}
            <div className="pb-6 mb-8 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-mono text-[#FFE885] font-bold uppercase mb-1">
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span>CONSULTA PRIVADA DE PEDIGRÍ Y LINAJE OFICIAL</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-serif-luxury">
                Árbol Genealógico & Genograma (4 Generaciones)
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                Por protección estricta a la privacidad de los asociados y criaderos, los números telefónicos, domicilios y listas públicas de ejemplares se mantienen ocultos y cifrados. Para consultar el árbol genealógico completo de <strong>4 GENERACIONES</strong>, ingresa el <strong>NÚMERO DE REGISTRO</strong> oficial del ejemplar.
              </p>
            </div>

            {/* Sub-tab Switcher: Consulta Oficial vs Constructor Inteligente */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
              <button
                type="button"
                onClick={() => setGenogramSubTab('consult')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  genogramSubTab === 'consult'
                    ? 'bg-gold-gradient text-black shadow-lg scale-105'
                    : 'bg-[#15130E] border border-neutral-800 text-neutral-300 hover:border-[#D4AF37]/50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Consulta por N° de Registro Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => setGenogramSubTab('builder')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  genogramSubTab === 'builder'
                    ? 'bg-gold-gradient text-black shadow-lg scale-105'
                    : 'bg-[#15130E] border border-neutral-800 text-neutral-300 hover:border-[#D4AF37]/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Constructor Asistido de Genograma (4G en Vivo)</span>
              </button>
            </div>

            {genogramSubTab === 'consult' ? (
              <>
                {/* BUSCADOR EXCLUSIVO POR NÚMERO DE REGISTRO O MICROCHIP */}
                <div className="max-w-2xl mx-auto mb-10">
                  <form onSubmit={handleSearchGenogram} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchRegInput}
                        onChange={(e) => setSearchRegInput(e.target.value)}
                        placeholder="Ingresa el N° de Registro o Microchip..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#080808] border-2 border-[#D4AF37]/50 text-white font-mono text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-[#FFE885] shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingGenogram}
                      className="px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 hover:scale-105 transition-all shadow-xl shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSearchingGenogram ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span>{isSearchingGenogram ? 'Buscando...' : 'Consultar Pedigrí (4 Gen)'}</span>
                    </button>
                  </form>
                </div>

                {/* RESULTADO: 4 GENERACIONES COMPLETAS DE PEDIGRÍ */}
                {searchedDog && pedigree ? (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl bg-[#18140B] border-2 border-[#D4AF37] gap-4 shadow-xl">
                      <div className="flex items-center gap-4">
                        <img
                          src={searchedDog.imageUrl}
                          alt={searchedDog.name}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-[#D4AF37] shadow"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-bold text-white font-serif-luxury">
                              {searchedDog.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#2A2012] border border-[#D4AF37] text-[#FFE885]">
                              INBR OFICIAL
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 font-mono mt-0.5">
                            REG: <strong className="text-[#FFE885]">{searchedDog.regNumber}</strong> • {searchedDog.breed} • {searchedDog.color}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {onOpenCertificate && (
                          <button
                            type="button"
                            onClick={() => onOpenCertificate(searchedDog)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 transition-all shadow cursor-pointer"
                          >
                            <span>Ver Certificado Notarial</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div id="genogram-canvas-container" className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0A] border border-neutral-800">
                      <InteractivePedigreeTree dog={searchedDog} onOpenCertificate={onOpenCertificate} />
                    </div>
                  </div>
                ) : hasSearchedGenogram ? (
                  <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-400">
                    No se localizó ningún ejemplar bajo el folio ingresado. Por favor corrobora la numeración o ponte en contacto con la administración central de INBR.
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#100E0A] border border-neutral-800 text-center max-w-xl mx-auto space-y-2">
                    <Lock className="w-10 h-10 text-[#D4AF37] mx-auto opacity-70" />
                    <h4 className="text-base font-bold text-white font-serif-luxury">
                      Sistema de Pedigrí Confidencial
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Ingresa el folio oficial del ejemplar para desplegar su árbol genealógico completo de 4 generaciones certificado por INBR.
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* CONSTRUCTOR ASISTIDO DE GENOGRAMA (4G EN VIVO) */
              <div className="space-y-8 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-[#16120B] border-2 border-[#D4AF37] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFE885] uppercase">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Configuración del Ejemplar Progenie</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Nombre Progenie</label>
                      <input
                        type="text"
                        value={builderData.name}
                        onChange={(e) => setBuilderData({ ...builderData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Raza</label>
                      <input
                        type="text"
                        value={builderData.breed}
                        onChange={(e) => setBuilderData({ ...builderData, breed: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">Color</label>
                      <input
                        type="text"
                        value={builderData.color}
                        onChange={(e) => setBuilderData({ ...builderData, color: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#080808] border border-neutral-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <AncestorAutocompleteInput
                        label="Padre (Sire)"
                        value={builderData.sire === 'SIN REGISTRO' ? '' : builderData.sire}
                        genderFilter="MACHO"
                        placeholder="Busca por nombre o folio INBR del padre..."
                        onChange={(val) => setBuilderData((prev) => ({ ...prev, sire: val || 'SIN REGISTRO', sireReg: '—' }))}
                        onSelectAncestor={(anc) =>
                          setBuilderData((prev) => ({
                            ...prev,
                            sire: anc.name,
                            sireReg: anc.regNumber,
                            sireSire: anc.sire || prev.sireSire,
                            sireDam: anc.dam || prev.sireDam,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <AncestorAutocompleteInput
                        label="Madre (Dam)"
                        value={builderData.dam === 'SIN REGISTRO' ? '' : builderData.dam}
                        genderFilter="HEMBRA"
                        placeholder="Busca por nombre o folio INBR de la madre..."
                        onChange={(val) => setBuilderData((prev) => ({ ...prev, dam: val || 'SIN REGISTRO', damReg: '—' }))}
                        onSelectAncestor={(anc) =>
                          setBuilderData((prev) => ({
                            ...prev,
                            dam: anc.name,
                            damReg: anc.regNumber,
                            damSire: anc.sire || prev.damSire,
                            damDam: anc.dam || prev.damDam,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 rounded-2xl bg-[#0A0A0A] border border-neutral-800">
                  <InteractivePedigreeTree dog={builderDog} onOpenCertificate={onOpenCertificate} />
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        )}
      </div>
    </section>
  );
};
