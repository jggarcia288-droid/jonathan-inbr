import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useDynamicContent } from '../utils/dynamicContent';
import { BREED_IMAGES } from '../utils/breedImages';
import { 
  BookOpen, 
  FileText, 
  Download, 
  UploadCloud, 
  Settings, 
  CheckCircle2, 
  Award, 
  Scale, 
  ShieldCheck, 
  AlertOctagon,
  Sparkles,
  Lock,
  X
} from 'lucide-react';

interface BreedStandardDetail {
  id: string;
  name: string;
  category: string;
  image: string;
  summary: string;
  head: string;
  bite: string;
  neck: string;
  body: string;
  limbs: string;
  faults: string;
  pdfFileName: string;
  pdfUrl?: string;
  pdfUpdatedAt: string;
}

const DEFAULT_STANDARDS: Record<string, BreedStandardDetail> = {
  'american-bully': {
    id: 'american-bully',
    name: 'American Bully',
    category: 'Raza Tipo Bull',
    image: BREED_IMAGES.americanBully,
    summary: 'El American Bully debe transmitir una gran fuerza para su tamaño. Es un perro de cuerpo compacto, mediano a grande, con una cabeza pesada y esculpida, cuerpo musculoso y estructura ósea robusta.',
    head: 'Longitud media, cráneo ancho, músculos de las mejillas muy pronunciados, stop definido y orejas de inserción alta.',
    bite: 'Mordida en tijera perfecta o en tijera invertida / leve prognatismo sin dientes visibles con la boca cerrada.',
    neck: 'Pesado, ligeramente arqueado, afinándose desde los hombros hasta la base del cráneo, sin piel suelta excesiva.',
    body: 'Costillas redondeadas en barril, pecho profundo y ancho, lomo corto y grupa ligeramente inclinada hacia la base de la cola.',
    limbs: 'Huesos fuertes y redondos, cuartillas rectas, corvejones bien descendidos sin giros hacia adentro ni hacia afuera.',
    faults: 'Prognatismo excesivo, cola enroscada o amputada, ojos claros/albinos, claudicación de codos o corvejones de vaca.',
    pdfFileName: 'Estandar_Oficial_American_Bully_INBR_2026.pdf',
    pdfUpdatedAt: '2026-01-15',
  },
  'exotic-bull': {
    id: 'exotic-bull',
    name: 'Exotic Bull',
    category: 'Edición Especial',
    image: BREED_IMAGES.exoticBull,
    summary: 'Extrema compactación, cabeza braquicéfala con stop a 90 grados, manteniendo la capacidad de respiración limpia y libre de claudicación.',
    head: 'Cráneo masivo y cúbico, hocico corto pero con orificios nasales completamente despejados, mandíbula ancha.',
    bite: 'Ligero prognatismo tolerado. La mandíbula inferior debe ser ancha y cuadrada.',
    neck: 'Corto, muy musculoso, transicionando directamente hacia una caja torácica ultra ancha.',
    body: 'Cuerpo ultra compacto, distancia cruz-cola casi igual a la altura a la cruz, musculatura hipertrofiada.',
    limbs: 'Huesos extremadamente densos, aplomos rectos con tolerancia a ligero desvío no claudicante.',
    faults: 'Falta total de fosas nasales abiertas (estenosis severa), ceguera, agresividad o timidez extrema.',
    pdfFileName: 'Estandar_Oficial_Exotic_Bull_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-01',
  },
  'french-bulldog': {
    id: 'french-bulldog',
    name: 'French Bulldog',
    category: 'Compañía & Molosoide',
    image: BREED_IMAGES.frenchBulldog,
    summary: 'Pequeño molosoide fornido, compacto y de hueso sólido. Orejas de murciélago erectas y cola naturalmente corta.',
    head: 'Fuerte, ancha y cuadrada; la piel de la cabeza forma pliegues y arrugas simétricas sin obstruir los ojos.',
    bite: 'Mandíbula inferior prominente (prognatismo moderado) que sobrepasa a la superior con curvatura hacia arriba.',
    neck: 'Corto, ligeramente arqueado, sin papada excesiva.',
    body: 'Línea dorsal que se eleva progresivamente hasta el lomo para descender hacia la cola (roach back).',
    limbs: 'Patas traseras ligeramente más largas que las delanteras elevando la grupa.',
    faults: 'Orejas no erectas, cola amputada artificialmente, ojos no visibles o con entropión.',
    pdfFileName: 'Estandar_Oficial_French_Bulldog_INBR_2026.pdf',
    pdfUpdatedAt: '2026-01-25',
  },
  'english-bulldog': {
    id: 'english-bulldog',
    name: 'English Bulldog',
    category: 'Raza Tipo Bull',
    image: BREED_IMAGES.englishBulldog,
    summary: 'Moloso de talla media, pelo corto, compacto y de estructura baja con hombros anchos, cabeza masiva y marcha firme.',
    head: 'Cráneo muy grande y ancho frente a su alzada, con frente plana, stop marcado y orejas pequeñas en forma de rosa.',
    bite: 'Mandíbula inferior ancha, cuadrada y en prognatismo moderado, bien alineada.',
    neck: 'Corto, muy grueso, profundo y fuerte, bien arqueado en la nuca.',
    body: 'Pecho amplio y redondo, costillas bien arqueadas y dorso corto y fuerte, más alto en el lomo que en los hombros.',
    limbs: 'Miembros anteriores muy sólidos, musculosos y rectos; posteriores fuertes y musculosos.',
    faults: 'Dificultad respiratoria audible en reposo, orejas erectas o ausencia de tipicidad facial.',
    pdfFileName: 'Estandar_Oficial_English_Bulldog_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-05',
  },
  'cane-corso': {
    id: 'cane-corso',
    name: 'Cane Corso Italiano',
    category: 'Moloso de Guardia',
    image: BREED_IMAGES.caneCorso,
    summary: 'Moloso mediano a grande, atlético, distinguido y potente. Estructura compacta, elegante y robusta, con trote elástico y gran nobleza.',
    head: 'Braquicefálica, cráneo ancho, eje longitudinal ligeramente convergente, stop bien marcado.',
    bite: 'Ligero prognatismo (no mayor a 5 mm). Mordida en pinza tolerada pero no deseada.',
    neck: 'Fuerte, musculoso, con longitud similar a la cabeza, sin papada excesiva.',
    body: 'Dorso recto, muy musculoso y firme, pecho bien desarrollado, grupa larga y ligeramente inclinada.',
    limbs: 'Hombros largos e inclinados, aplomos perfectamente verticales, pisada firme y elástica.',
    faults: 'Ejes craneofaciales divergentes, enognatismo, despigmentación total de trufa, cola anillada.',
    pdfFileName: 'Estandar_Oficial_Cane_Corso_INBR_2026.pdf',
    pdfUpdatedAt: '2026-01-20',
  },
  'pastor-aleman': {
    id: 'pastor-aleman',
    name: 'Pastor Alemán',
    category: 'Trabajo & K9',
    image: BREED_IMAGES.pastorAleman,
    summary: 'Perro de talla mediana a grande, ligeramente alargado, musculoso y seco, dotado de gran firmeza nerviosa, seguridad e instinto de guarda y trabajo.',
    head: 'En forma de cuña proporcionada al cuerpo, frente ligeramente convexa, stop moderado y orejas triangulares erectas hacia adelante.',
    bite: 'Mordida en tijera fuerte, sana y completa de 42 piezas dentales.',
    neck: 'Fuerte, bien musculado, sin piel flácida ni papada, formando un ángulo cercano a 45°.',
    body: 'Cruz alta y prolongada, dorso recto, firme y muy musculado hacia la grupa suavemente inclinada.',
    limbs: 'Escápula larga e inclinada, miembros anteriores rectos, posteriores bien angulados para un trote amplio de gran alcance.',
    faults: 'Orejas caídas o blandas, falta de firmeza de carácter, prognatismo o enognatismo.',
    pdfFileName: 'Estandar_Oficial_Pastor_Aleman_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-12',
  },
  'pastor-belga-malinois': {
    id: 'pastor-belga-malinois',
    name: 'Pastor Belga Malinois',
    category: 'Trabajo & K9',
    image: BREED_IMAGES.pastorBelgaMalinois,
    summary: 'Canino mediolíneo armónico, ágil, rústico, habituado a la vida al aire libre y con facultades de trabajo deportivo K9 excepcionales.',
    head: 'Cincelada, larga pero no exagerada, máscara negra bien definida, ojos almendrados color castaño oscuro.',
    bite: 'Mordida en tijera completa de 42 piezas dentales. Pinza tolerada en caninos de trabajo.',
    neck: 'Bien desprendido, musculoso, ensanchándose paulatinamente hacia los hombros, sin papada.',
    body: 'Poderoso sin pesadez, línea superior recta y firme, vientre moderadamente recogido.',
    limbs: 'Osamenta sólida pero magra, aplomos impecables, corvejones bien angulados y firmes.',
    faults: 'Carácter temeroso o hiperagresivo incontrolado, cola corta de nacimiento, ausencia de máscara.',
    pdfFileName: 'Estandar_Oficial_Malinois_K9_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-10',
  },
  'doberman': {
    id: 'doberman',
    name: 'Doberman Pinscher',
    category: 'Moloso & Guardia',
    image: BREED_IMAGES.doberman,
    summary: 'Perro mediano, fuerte y musculoso de líneas elegantes y nobles. Temperamento amigable, firmeza y gran capacidad de guarda y compañía.',
    head: 'En forma de cuña obtusa vista desde arriba y de perfil, líneas superiores paralelas, trufa bien desarrollada y ojos oscuros.',
    bite: 'Mordida en tijera fuerte y completa con 42 piezas.',
    neck: 'De buena longitud, seco, musculoso y con porte erguido y elegante.',
    body: 'Cuerpo cuadrado, cruz bien pronunciada, dorso corto y firme, pecho amplio y vientre recogido.',
    limbs: 'Extremidades rectas, hueso sólido, corvejones paralelos y trote elástico con gran cobertura de terreno.',
    faults: 'Timidez, agresividad descontrolada, manchas blancas extensas o dentadura incompleta severa.',
    pdfFileName: 'Estandar_Oficial_Doberman_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-14',
  },
  'rottweiler': {
    id: 'rottweiler',
    name: 'Rottweiler',
    category: 'Moloso & Guardia',
    image: BREED_IMAGES.rottweiler,
    summary: 'Perro robusto, mediano a grande, ni pesado ni ligero, ni alto de patas ni agalgado. Proporciones armoniosas que denotan gran fuerza, agilidad y resistencia.',
    head: 'Longitud media, ancha entre las orejas, stop bien marcado, pómulos arqueados y marcas fuego bien delimitadas.',
    bite: 'Mordida en tijera fuerte y completa (42 piezas).',
    neck: 'Fuerte, moderadamente largo, bien musculado, ligeramente arqueado y sin papada.',
    body: 'Dorso recto, fuerte y firme; pecho ancho y profundo con costillas bien arqueadas.',
    limbs: 'Hueso denso y aplomos firmes, muslos anchos y musculosísimos, corvejones angulados sin debilidad.',
    faults: 'Prognatismo, enognatismo, ojos claros amarillos o falta de equilibrio temperamental.',
    pdfFileName: 'Estandar_Oficial_Rottweiler_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-15',
  },
  'american-pit-bull': {
    id: 'american-pit-bull',
    name: 'American Pit Bull Terrier',
    category: 'Raza Tipo Bull',
    image: BREED_IMAGES.apbt,
    summary: 'Atleta canino de talla media, pelaje corto y musculatura definida. Combina fuerza, agilidad, resistencia y gran nobleza con las personas.',
    head: 'Longitud media en forma de cuña ancha, cráneo plano entre las orejas, mejillas prominentes libres de arrugas.',
    bite: 'Mordida en tijera apretada y completa.',
    neck: 'Musculoso, seco y ligeramente arqueado hasta hombros anchos y bien inclinados.',
    body: 'Costillas profundas y bien arqueadas hacia atrás, lomo corto y fuerte, nunca pesado.',
    limbs: 'Huesos redondos y fuertes sin pesadez excesiva, cuartillas firmes y gran propulsión trasera.',
    faults: 'Peso excesivo o falta de tonicidad atlética, cola enroscada o displasia evidente.',
    pdfFileName: 'Estandar_Oficial_APBT_INBR_2026.pdf',
    pdfUpdatedAt: '2026-02-16',
  },
};

interface RacialStandardsSectionProps {
  selectedBreedId: string;
  onSelectBreed: (breedId: string) => void;
}

export const RacialStandardsSection: React.FC<RacialStandardsSectionProps> = ({
  selectedBreedId,
  onSelectBreed,
}) => {
  const { t } = useTranslation();
  const { content } = useDynamicContent();
  const [standards, setStandards] = useState<Record<string, BreedStandardDetail>>(DEFAULT_STANDARDS);
  const [activeTab, setActiveTab] = useState<'head' | 'bite' | 'neck' | 'body' | 'limbs' | 'faults'>('head');
  
  // Admin Panel State
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminTargetBreed, setAdminTargetBreed] = useState<string>(selectedBreedId);
  const [adminNewPdfName, setAdminNewPdfName] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);

  const normalizedKey = selectedBreedId === 'exotic-bully' ? 'exotic-bull' : selectedBreedId;
  const baseStandard = standards[normalizedKey] || standards['american-bully'];
  const cmsBreedMatch = (content.bullBreedsList || []).find((b) => b.id === baseStandard.id);
  const currentStandard = cmsBreedMatch?.image
    ? { ...baseStandard, image: cmsBreedMatch.image, name: cmsBreedMatch.name || baseStandard.name }
    : baseStandard;

  // Handle client/associate PDF download
  const handleDownloadPdf = (standard: BreedStandardDetail) => {
    if (content.standardsPdfUrl) {
      const link = document.createElement('a');
      link.href = content.standardsPdfUrl;
      link.target = '_blank';
      link.download = standard.pdfFileName || 'Estandar_Oficial_INBR_2026.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Generate text/blob download representing the certified standard document
    const contentText = `
================================================================================
INTERNATIONAL BREEDS REGISTRY (INBR) - MANUAL OFICIAL DE ESTÁNDAR RACIAL 2026
================================================================================
RAZA: ${standard.name.toUpperCase()}
CATEGORÍA OFICIAL: ${standard.category}
ARCHIVO OFICIAL: ${standard.pdfFileName}
VIGENCIA: ACTUALIZADO ${standard.pdfUpdatedAt}
PRESIDENCIA DEL COLEGIO DE JUECES: Robert Felix / Jonathan Garcia (CEO)

RESUMEN MORFOLÓGICO GENERAL:
${standard.summary}

CRITERIOS DETALLADOS DE JUZGAMIENTO EN RING:
1. CABEZA Y CRÁNEO:
${standard.head}

2. MORDIDA Y DENTADURA:
${standard.bite}

3. CUELLO Y ANTEPECHO:
${standard.neck}

4. CUERPO, COSTILLAR Y LOMO:
${standard.body}

5. EXTREMIDADES, APLOMOS Y MOVIMIENTO:
${standard.limbs}

6. FALTAS Y DESCALIFICACIONES OFICIALES:
${standard.faults}

================================================================================
DOCUMENTO NOTARIADO Y REGISTRADO ANTE EL COMITÉ MORFOLÓGICO INTERNACIONAL INBR
================================================================================
    `;

    const blob = new Blob([contentText], { type: 'application/pdf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = standard.pdfFileName.replace(/\.pdf$/, '') + '_INBR.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Admin PDF Upload / Replacement
  const handleAdminUploadPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewPdfName.trim()) return;

    const target = standards[adminTargetBreed] || standards['american-bully'];
    const updated = {
      ...standards,
      [adminTargetBreed]: {
        ...target,
        pdfFileName: adminNewPdfName.endsWith('.pdf') ? adminNewPdfName : `${adminNewPdfName}.pdf`,
        pdfUpdatedAt: new Date().toISOString().split('T')[0],
      },
    };

    setStandards(updated);
    setAdminSuccessMsg(`PDF actualizado con éxito para "${target.name}". Ya disponible para descarga de clientes.`);
    setTimeout(() => {
      setAdminSuccessMsg(null);
      setAdminNewPdfName('');
    }, 2500);
  };

  return (
    <section id="estandares" className="py-20 bg-[#050505] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Return Bar */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-800">
          <a
            href="#razas"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14120D] border border-[#D4AF37]/50 text-xs font-bold text-[#FFE885] hover:bg-[#201A0E] transition-all hover:scale-105"
            title="Volver a la galería de razas"
          >
            <span>← Volver al Catálogo de Razas</span>
          </a>

          <a
            href="#inicio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-white transition-all"
            title="Volver a la página principal"
          >
            <span>↑ Inicio</span>
          </a>
        </div>

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#18140B] border border-[#D4AF37]/50 mb-3 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#FFE885] tracking-widest uppercase">
              CRITERIOS OFICIALES DE JUZGAMIENTO INBR
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-serif-luxury tracking-wide mb-3">
            {content.racialStandardsTitle || 'Estándares Raciales Oficiales'}
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {content.racialStandardsSubtitle || 'Consulta la morfología oficial, puntos anatómicos y descarga la ficha técnica certificada en PDF aprobada por el Colegio de Jueces.'}
          </p>
        </div>

        {/* Breed Selector Chips */}
        <div className="flex overflow-x-auto pb-4 gap-2.5 mb-10 scrollbar-none justify-start lg:justify-center">
          {Object.values(standards).map((b) => {
            const isSelected = b.id === currentStandard.id;
            return (
              <button
                key={b.id}
                onClick={() => onSelectBreed(b.id)}
                className={`flex-shrink-0 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-gold-gradient text-black shadow-lg scale-105'
                    : 'bg-[#12110D] border border-neutral-800 text-neutral-300 hover:border-[#D4AF37]/60'
                }`}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        {/* BREED SHOWCASE WITH PHOTO, DESCRIPTION & DOWNLOAD PDF BUTTON */}
        <div className="rounded-3xl bg-[#12110D] border-2 border-[#D4AF37]/40 overflow-hidden shadow-2xl mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center bg-gradient-to-r from-[#18140B] via-[#14120D] to-[#18140B] border-b border-neutral-800">
            {/* Exemplar Photo representing the Standard */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="w-full max-w-sm h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.3)] relative group">
                <img
                  src={currentStandard.image}
                  alt={currentStandard.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 text-[#FFE885] border border-[#D4AF37]/50 text-[10px] font-mono font-bold">
                  EJEMPLAR DE REFERENCIA INBR
                </span>
              </div>
            </div>

            {/* Description & Official Download Button */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-mono text-[#D4AF37] font-bold uppercase">
                    ESTÁNDAR RACIAL OFICIAL • {currentStandard.category}
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black text-white font-serif-luxury">
                    {currentStandard.name}
                  </h3>
                </div>

                {/* BOTÓN OFICIAL DE DESCARGA PDF PARA ASOCIADOS Y CLIENTES */}
                <button
                  onClick={() => handleDownloadPdf(currentStandard)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl hover:scale-105"
                  title="Descargar estándar completo en PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Estándar en PDF</span>
                </button>
              </div>

              {/* Pequeña descripción del estándar */}
              <div className="p-4.5 rounded-2xl bg-[#080808] border border-[#D4AF37]/30 text-neutral-200 text-xs sm:text-sm leading-relaxed">
                <strong className="text-[#FFE885] block font-serif-luxury mb-1">
                  Descripción Morfológica Oficial:
                </strong>
                {currentStandard.summary}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span>Ficha: <strong className="text-white font-mono">{currentStandard.pdfFileName}</strong></span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">
                  Actualizado: {currentStandard.pdfUpdatedAt}
                </span>
              </div>
            </div>
          </div>

          {/* Morphological Tabs View */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-4 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-neutral-800 space-y-2 bg-[#0A0A0A]">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold px-2 block mb-2">
                Puntos de Juzgamiento Oficial:
              </span>

              {[
                { id: 'head', label: 'Cabeza & Cráneo', icon: Award },
                { id: 'bite', label: 'Mordida & Dentadura', icon: Scale },
                { id: 'neck', label: 'Cuello & Antepecho', icon: ShieldCheck },
                { id: 'body', label: 'Cuerpo, Pecho y Espalda', icon: Sparkles },
                { id: 'limbs', label: 'Extremidades & Aplomos', icon: FileText },
                { id: 'faults', label: 'Faltas Descalificatorias', icon: AlertOctagon, danger: true },
              ].map((sec) => {
                const Icon = sec.icon;
                const isActive = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.id as any)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? sec.danger
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-600 shadow-md font-bold'
                          : 'bg-gold-gradient text-black font-bold shadow-md'
                        : 'text-neutral-300 hover:bg-[#18140B] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{sec.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-8 p-6 sm:p-8 bg-[#12110D] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                  <h4 className="text-lg font-bold text-white font-serif-luxury flex items-center gap-2">
                    <span className="text-[#D4AF37]">§</span>
                    <span>Criterio Técnico: {activeTab.toUpperCase()}</span>
                  </h4>
                  <span className="text-xs text-neutral-400 font-mono">
                    Manual de Pista Oficial INBR
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#080808] border border-neutral-800 mb-6 text-sm text-neutral-200 leading-relaxed">
                  {currentStandard[activeTab]}
                </div>
              </div>

              {/* Pie de criterio técnico */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Acreditado por el Colegio de Jueces INBR • Vigencia 2026
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                  ESTÁNDAR HOMOLOGADO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE PANEL ADMINISTRATIVO PARA GESTIÓN DE PDFS (SOLICITADO EXPLÍCITAMENTE) */}
        {adminPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-xl bg-[#12110D] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.4)] my-8">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold-gradient text-black flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white font-serif-luxury">
                      Panel Administrativo INBR - Gestión de PDFs
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Exclusivo Administrador: Jonathan Garcia / Dirección Técnica
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setAdminPanelOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {adminSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adminSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAdminUploadPdf} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Seleccionar Raza para Actualizar su PDF *
                  </label>
                  <select
                    value={adminTargetBreed}
                    onChange={(e) => setAdminTargetBreed(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {Object.values(standards).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.pdfFileName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Nombre del Archivo PDF Oficial a Asignar *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNewPdfName}
                    onChange={(e) => setAdminNewPdfName(e.target.value)}
                    placeholder="ej: Estandar_Oficial_American_Bully_INBR_Edicion_2026.pdf"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Subida del archivo físico PDF */}
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">
                    Seleccionar Archivo PDF desde tu Computadora
                  </label>
                  <div className="border-2 border-dashed border-neutral-700 hover:border-[#D4AF37] rounded-xl p-5 text-center cursor-pointer bg-[#080808]">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAdminNewPdfName(e.target.files[0].name);
                        }
                      }}
                      className="hidden"
                      id="pdfUploadInput"
                    />
                    <label htmlFor="pdfUploadInput" className="cursor-pointer block space-y-1">
                      <UploadCloud className="w-8 h-8 text-[#D4AF37] mx-auto" />
                      <span className="text-neutral-300 font-semibold block">Haz clic para cargar el documento PDF</span>
                      <span className="text-[10px] text-neutral-500">Solo formato .pdf (Tamaño máx: 25 MB)</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#080808] border border-neutral-800 text-[11px] text-neutral-400">
                  Al presionar guardar, el nuevo documento PDF reemplazará la versión anterior y estará disponible inmediatamente para descarga pública por cualquier asociado o cliente.
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg"
                >
                  Guardar y Publicar PDF de Estándar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
