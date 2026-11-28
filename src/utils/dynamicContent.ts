import { useState, useEffect } from 'react';
import { 
  supabase, 
  saveCmsConfigDirect, 
  fetchCmsConfigDirect, 
  subscribeToCmsConfig 
} from '../lib/supabase';
import { BREED_IMAGES, getBreedImageByIdOrName, isLegacyStockUrl } from './breedImages';

export interface ExecutiveTeamMember {
  id: string;
  name: string;
  title: string;
  badge: string;
  image: string;
}

export interface TeamRepresentative {
  id: string;
  name: string;
  country: string;
  flag: string;
  role: string;
  contact: string;
  image?: string;
  username?: string;
  password?: string;
  canPrint?: boolean;
  canUpload?: boolean;
  isRevoked?: boolean;
}

export interface TeamJudge {
  id: string;
  name: string;
  origin: string;
  specialty: string;
  experience: string;
  badge: string;
  image?: string;
}

export interface DynamicChampionItem {
  id: string;
  name: string;
  region: string;
  points: number | string;
  breed?: string;
  title?: string;
}

export interface DynamicSpecialEditionItem {
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

export interface LayoutOffsetItem {
  x: number;
  y: number;
  fontSize: number;
  scale?: number;
  width?: number;
  height?: number;
  hidden?: boolean;
  text?: string;
}

export interface CertificateLayoutOffsets {
  dogNameOffset: LayoutOffsetItem;
  regNumberOffset: LayoutOffsetItem;
  microchipOffset: LayoutOffsetItem;
  breedOffset: LayoutOffsetItem;
  ownerOffset: LayoutOffsetItem;
  breederOffset: LayoutOffsetItem;
  dobOffset: LayoutOffsetItem;
  colorOffset: LayoutOffsetItem;
  genderOffset?: LayoutOffsetItem;
  dateOffset: LayoutOffsetItem;
  // Elementos Credencial PVC (Formato Tarjeta ID CR80 de Bolsillo)
  pvcNameOffset: LayoutOffsetItem;
  pvcRegOffset: LayoutOffsetItem;
  pvcChipOffset: LayoutOffsetItem;
  pvcBreedOffset?: LayoutOffsetItem;
  pvcColorOffset?: LayoutOffsetItem;
  pvcDobOffset?: LayoutOffsetItem;
  pvcOwnerOffset?: LayoutOffsetItem;
  pvcLogoOffset?: LayoutOffsetItem;
  pvcPhotoOffset?: LayoutOffsetItem;
  pvcQrOffset?: LayoutOffsetItem;
  // Elementos Frente
  logoOffset?: LayoutOffsetItem;
  photoOffset?: LayoutOffsetItem;
  qrOffset?: LayoutOffsetItem;
  sealOffset?: LayoutOffsetItem;
  headerTitleOffset?: LayoutOffsetItem;
  // Elementos Reverso (Genograma)
  backLogoOffset?: LayoutOffsetItem;
  backDogNameOffset?: LayoutOffsetItem;
  backQrOffset?: LayoutOffsetItem;
  backHeaderOffset?: LayoutOffsetItem;
  sireOffset?: LayoutOffsetItem;
  damOffset?: LayoutOffsetItem;
  grandparentsOffset?: LayoutOffsetItem;
  g3Offset?: LayoutOffsetItem;
  g4Offset?: LayoutOffsetItem;
  signaturesOffset?: LayoutOffsetItem;
  legalTextOffset?: LayoutOffsetItem;
  // Elementos Registro de Camada (Litter Sheet)
  litterTitleOffset?: LayoutOffsetItem;
  litterMotherOffset?: LayoutOffsetItem;
  litterFatherOffset?: LayoutOffsetItem;
  litterBreederOffset?: LayoutOffsetItem;
  litterDobOffset?: LayoutOffsetItem;
  litterPuppiesOffset?: LayoutOffsetItem;
  litterLogoOffset?: LayoutOffsetItem;
  litterQrOffset?: LayoutOffsetItem;
  litterSignaturesOffset?: LayoutOffsetItem;
  [key: string]: LayoutOffsetItem | undefined;
}

export interface GalleryPhotoItem {
  id: string;
  title: string;
  category: 'champions' | 'rings' | 'litters' | 'events';
  imageUrl: string;
  description?: string;
  date?: string;
}

export interface DynamicBreedItem {
  id: string;
  name: string;
  variety: string;
  standard: string;
  image: string;
}

export interface DynamicBreedCardItem {
  id: string;
  name: string;
  category: 'bull' | 'guard' | 'work' | 'companion';
  subtitle: string;
  description: string;
  varieties: string[];
  image: string;
}

export interface DynamicEventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  judges?: string;
  banner?: string;
}

export interface DynamicStandardItem {
  id: string;
  breed: string;
  variety: string;
  height: string;
  head: string;
  bite: string;
  body: string;
}

export interface DynamicCertificationItem {
  id: string;
  title: string;
  desc: string;
  badge: string;
}

export interface DynamicHallOfFameItem {
  id: string;
  name: string;
  titles: string;
  year: string;
  owner: string;
  image: string;
}

export interface DynamicBreederItem {
  id: string;
  kennel: string;
  owner: string;
  location: string;
  phone: string;
}

export interface DynamicContentConfig {
  // Hero
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroBadge: string;
  heroBannerUrl: string;
  bannerNotice: string;

  // Quiénes Somos
  aboutUsTitle: string;
  aboutUsSubtitle: string;
  aboutUsParagraph1: string;
  aboutUsParagraph2: string;
  aboutUsPhoto: string;

  // Equipo Directivo & Jueces
  teamBadge: string;
  teamTitle: string;
  teamSubtitle: string;
  executiveTeam: ExecutiveTeamMember[];
  representativesList: TeamRepresentative[];
  judgesList: TeamJudge[];

  // Galería Oficial
  galleryTitle: string;
  gallerySubtitle: string;
  galleryBadge: string;
  galleryPhotos: GalleryPhotoItem[];

  // Mi Perfil
  profileTitle: string;
  profileSubtitle: string;
  profileBadge: string;

  // Salón de la Fama
  hallOfFameTitle: string;
  hallOfFameSubtitle: string;
  hallOfFameDescription: string;
  hallOfFamePhoto1: string;
  hallOfFamePhoto2: string;

  // Razas & Estándares
  bullBreedsTitle: string;
  bullBreedsSubtitle: string;
  bullBreedsList: DynamicBreedCardItem[];
  racialStandardsTitle: string;
  racialStandardsSubtitle: string;
  specialEditionTitle: string;
  specialEditionSubtitle: string;
  specialEditionPhoto: string;

  // Directorio Criadores & Eventos
  breedersTitle: string;
  breedersSubtitle: string;
  eventsTitle: string;
  eventsSubtitle: string;
  eventsNotice: string;
  eventsBannerUrl: string;

  // Campeones & Verificación
  championsTitle: string;
  championsSubtitle: string;
  verificationTitle: string;
  verificationSubtitle: string;

  // Camadas & Formularios
  liveLitterTitle: string;
  liveLitterSubtitle: string;
  formsTitle: string;
  formsSubtitle: string;

  // Certificaciones & Contacto
  certificationsTitle: string;
  certificationsSubtitle: string;
  contactTitle: string;
  contactSubtitle: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;

  // Footer
  footerMotto: string;
  footerCopyright: string;

  // Section Visibilities (all true by default)
  sectionVisibility: {
    hero: boolean;
    threeCards: boolean;
    aboutUs: boolean;
    team: boolean;
    bullBreeds: boolean;
    specialEdition: boolean;
    racialStandards: boolean;
    breeders: boolean;
    events: boolean;
    champions: boolean;
    verification: boolean;
    hallOfFame: boolean;
    liveLitter: boolean;
    forms: boolean;
    certifications: boolean;
    contact: boolean;
    gallery: boolean;
    profile: boolean;
  };

  // Text Scaling (Chico, Normal, Grande, Extra Grande)
  textScale?: 'small' | 'normal' | 'large' | 'xlarge';

  // Dynamic Lists for Complete Management (Add / Remove)
  breedsList?: DynamicBreedItem[];
  eventsList?: DynamicEventItem[];
  standardsList?: DynamicStandardItem[];
  certificationsList?: DynamicCertificationItem[];
  hallOfFameList?: DynamicHallOfFameItem[];
  breedersList?: DynamicBreederItem[];
  championsList?: DynamicChampionItem[];
  specialEditionList?: DynamicSpecialEditionItem[];

  // Standards PDF and Special Edition Banners
  standardsPdfUrl?: string;
  specialEditionBanner1?: string;
  specialEditionBanner2?: string;

  // Custom text mover, offsets and background templates for certificates / credentials
  certificateOffsets?: CertificateLayoutOffsets;
  certificateBackgroundUrl?: string;
  certBackBackgroundUrl?: string;
  litterBackgroundUrl?: string;
  pvcBackgroundUrl?: string;
  certificateOrientation?: 'horizontal' | 'vertical';
  showPhotoOnCert?: boolean;
  showNotarySealOnCert?: boolean;
  showLogoOnCert?: boolean;
  certCleanBackgroundMode?: boolean;
  hideTreeBordersOnCert?: boolean;
  siteLogoUrl?: string;

  // Global DOM custom text overrides (allows modifying any text across the entire web DOM)
  customTextOverrides?: Record<string, string>;
}

export const DEFAULT_CERTIFICATE_OFFSETS: CertificateLayoutOffsets = {
  dogNameOffset: { x: 0, y: 0, fontSize: 24 },
  regNumberOffset: { x: 0, y: 0, fontSize: 13 },
  microchipOffset: { x: 0, y: 0, fontSize: 13 },
  breedOffset: { x: 0, y: 0, fontSize: 13 },
  ownerOffset: { x: 0, y: 0, fontSize: 13 },
  breederOffset: { x: 0, y: 0, fontSize: 13 },
  dobOffset: { x: 0, y: 0, fontSize: 13 },
  colorOffset: { x: 0, y: 0, fontSize: 13 },
  genderOffset: { x: 0, y: 0, fontSize: 13 },
  dateOffset: { x: 0, y: 0, fontSize: 12 },
  pvcNameOffset: { x: 0, y: 0, fontSize: 14 },
  pvcRegOffset: { x: 0, y: 0, fontSize: 10 },
  pvcChipOffset: { x: 0, y: 0, fontSize: 10 },
  pvcBreedOffset: { x: 0, y: 0, fontSize: 10 },
  pvcColorOffset: { x: 0, y: 0, fontSize: 10 },
  pvcDobOffset: { x: 0, y: 0, fontSize: 10 },
  pvcOwnerOffset: { x: 0, y: 0, fontSize: 9 },
  pvcLogoOffset: { x: 0, y: 0, fontSize: 12 },
  pvcPhotoOffset: { x: 0, y: 0, fontSize: 12 },
  pvcQrOffset: { x: 0, y: 0, fontSize: 12 },
  logoOffset: { x: 0, y: 0, fontSize: 14 },
  photoOffset: { x: 0, y: 0, fontSize: 14 },
  qrOffset: { x: 0, y: 0, fontSize: 14 },
  sealOffset: { x: 0, y: 0, fontSize: 12 },
  headerTitleOffset: { x: 0, y: 0, fontSize: 24 },
  // Reverso
  backLogoOffset: { x: 0, y: 0, fontSize: 14 },
  backDogNameOffset: { x: 0, y: 0, fontSize: 24 },
  backQrOffset: { x: 0, y: 0, fontSize: 14 },
  backHeaderOffset: { x: 0, y: 0, fontSize: 20 },
  sireOffset: { x: 0, y: 0, fontSize: 12 },
  damOffset: { x: 0, y: 0, fontSize: 12 },
  grandparentsOffset: { x: 0, y: 0, fontSize: 11 },
  g3Offset: { x: 0, y: 0, fontSize: 9 },
  g4Offset: { x: 0, y: 0, fontSize: 8 },
  signaturesOffset: { x: 0, y: 0, fontSize: 10 },
  legalTextOffset: { x: 0, y: 0, fontSize: 8 },
  // Camada
  litterTitleOffset: { x: 0, y: 0, fontSize: 22 },
  litterMotherOffset: { x: 0, y: 0, fontSize: 13 },
  litterFatherOffset: { x: 0, y: 0, fontSize: 13 },
  litterBreederOffset: { x: 0, y: 0, fontSize: 13 },
  litterDobOffset: { x: 0, y: 0, fontSize: 13 },
  litterPuppiesOffset: { x: 0, y: 0, fontSize: 12 },
  litterLogoOffset: { x: 0, y: 0, fontSize: 14 },
  litterQrOffset: { x: 0, y: 0, fontSize: 14 },
  litterSignaturesOffset: { x: 0, y: 0, fontSize: 11 },
};

export const CANONICAL_CHAMPIONS_LIST: DynamicChampionItem[] = [
  { id: 'chmp-1', name: 'DON LEE', breed: 'EXOTIC BULL', region: 'MÉXICO', points: 700, title: 'CAMPEÓN MEXICANO' },
  { id: 'chmp-2', name: 'BAM BAM', breed: 'BULLDOG FRANCES', region: 'MÉXICO', points: 650, title: 'CAMPEÓN MEXICANO' },
  { id: 'chmp-3', name: 'CADETE', breed: 'AMERICAN BULLY', region: 'MÉXICO', points: 625, title: 'CAMPEÓN MEXICANO' },
  { id: 'chmp-4', name: 'BARRERA BULLS THANOS', breed: 'AMERICAN BULLY', region: 'GUATEMALA', points: 600, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-5', name: 'MERLIN', breed: 'NANO BULL', region: 'GUATEMALA', points: 600, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-6', name: 'CIANURO', breed: 'EXOTIC BULL', region: 'GUATEMALA', points: 600, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-7', name: 'KELLY', breed: 'EXOTIC BULL', region: 'GUATEMALA', points: 600, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-8', name: 'CH ENZO MAC GREGOR', breed: 'AMERICAN BULLY', region: 'GUATEMALA', points: 400, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-9', name: 'CH TAI LUNG', breed: 'EXOTIC BULL', region: 'GUATEMALA', points: 400, title: 'CAMPEÓN GUATEMALTECO' },
  { id: 'chmp-10', name: 'Sugar Daddy', breed: 'EXOTIC BULL', region: 'TEXAS', points: 300, title: 'Puntos' },
  { id: 'chmp-11', name: 'Tomasa', breed: 'EXOTIC BULL', region: 'TEXAS', points: 300, title: 'Puntos' },
  { id: 'chmp-12', name: 'Cinisca', breed: 'AMERICAN BULLY', region: 'TEXAS', points: 200, title: 'Puntos' },
  { id: 'chmp-13', name: 'Supreme', breed: 'AMERICAN BULLY', region: 'TEXAS', points: 100, title: 'Puntos' },
  { id: 'chmp-14', name: 'Spartacus', breed: 'EXOTIC BULL', region: 'TEXAS', points: 100, title: 'Puntos' },
  { id: 'chmp-15', name: 'Taurus', breed: 'EXOTIC BULL', region: 'TEXAS', points: 40, title: 'Puntos' },
  { id: 'chmp-16', name: 'Bubbalo', breed: 'EXOTIC BULL', region: 'TEXAS', points: 40, title: 'Puntos' },
  { id: 'chmp-17', name: 'Shelby', breed: 'EXOTIC BULL FRENCH', region: 'TEXAS', points: 40, title: 'Puntos' },
];

export function mergeWithCanonicalChampions(incoming?: DynamicChampionItem[]): DynamicChampionItem[] {
  if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
    return [...CANONICAL_CHAMPIONS_LIST];
  }
  const clean = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingNames = new Set(incoming.map((c) => clean(c.name)));

  const result = [...incoming];
  for (const canon of CANONICAL_CHAMPIONS_LIST) {
    if (!existingNames.has(clean(canon.name))) {
      result.push(canon);
    }
  }
  return result;
}

export const DEFAULT_DYNAMIC_CONTENT: DynamicContentConfig = {
  textScale: 'normal',
  standardsPdfUrl: 'https://inbr-registry.org/standards/INBR_Official_Racial_Standards_2026.pdf',
  specialEditionBanner1: BREED_IMAGES.nanoBull,
  specialEditionBanner2: BREED_IMAGES.exoticBull,
  certificateOffsets: DEFAULT_CERTIFICATE_OFFSETS,
  certificateBackgroundUrl: '',
  certBackBackgroundUrl: '',
  litterBackgroundUrl: '',
  pvcBackgroundUrl: '',
  siteLogoUrl: '/logo-inbr.jpg',
  certificateOrientation: 'vertical',
  showPhotoOnCert: false,
  showNotarySealOnCert: false,
  showLogoOnCert: true,
  certCleanBackgroundMode: true,
  hideTreeBordersOnCert: false,
  championsList: CANONICAL_CHAMPIONS_LIST,
  specialEditionList: [
    {
      id: 'sp-1',
      name: 'PHENOM NANO BULLET',
      category: 'Nano Bull (<11 in)',
      regNumber: 'INBR-SP-001',
      owner: 'Jonathan Garcia',
      kennel: 'Imperial Bullyz International',
      height: '10.5 pulgadas',
      imageUrl: BREED_IMAGES.nanoBull,
      status: 'AUTORIZADO OFICIAL',
    },
    {
      id: 'sp-2',
      name: 'EXOTIC DIAMOND GHOST',
      category: 'Exotic Bull',
      regNumber: 'INBR-SP-002',
      owner: 'Carlos Otero',
      kennel: 'Lone Star Bullies',
      height: '12.0 pulgadas',
      imageUrl: BREED_IMAGES.exoticBull,
      status: 'AUTORIZADO OFICIAL',
    },
    {
      id: 'sp-3',
      name: 'MICRO BULLY TITAN',
      category: 'Micro Bully',
      regNumber: 'INBR-SP-003',
      owner: 'Criadero Titan Oficial',
      kennel: 'Titan Bullyz Oficial',
      height: '13.5 pulgadas',
      imageUrl: BREED_IMAGES.americanBully,
      status: 'AUTORIZADO OFICIAL',
    },
  ],
  // Hero
  heroTitleLine1: 'INTERNATIONAL',
  heroTitleLine2: 'BREEDS REGISTRY',
  heroSubtitle: 'Sistema internacional de registro genealógico, preservación morfológica y certificación de pedigrí oficial con trazabilidad genética.',
  heroBadge: 'AUTORIDAD CINOLÓGICA MUNDIAL • FAMILIA & PRESERVACIÓN',
  heroBannerUrl: BREED_IMAGES.heroBanner,
  bannerNotice: '¡Nuevas homologaciones directas habilitadas para la temporada 2026! Consulta el estado de autenticidad en tiempo real.',

  // Dynamic lists defaults
  breedsList: [
    {
      id: 'br-1',
      name: 'American Bully',
      variety: 'Pocket, Standard, Classic, XL',
      standard: 'Estructura ósea pesada, pecho amplio en barril y temperamento gentil.',
      image: BREED_IMAGES.americanBully,
    },
    {
      id: 'br-2',
      name: 'Exotic Bull',
      variety: 'Micro, Exotic, Nano Bull',
      standard: 'Hipertipicidad morfológica sin compromiso de vías respiratorias.',
      image: BREED_IMAGES.exoticBull,
    },
    {
      id: 'br-3',
      name: 'French Bulldog',
      variety: 'Fawn, Brindle, Pied, Fluffy',
      standard: 'Orejas de murciélago erguidas, cuerpo compacto y osamenta densa.',
      image: BREED_IMAGES.frenchBulldog,
    },
    {
      id: 'br-4',
      name: 'English Bulldog',
      variety: 'Standard Notariado',
      standard: 'Cabeza masiva simétrica, hombros amplios y marcha cadenciosa.',
      image: BREED_IMAGES.englishBulldog,
    },
  ],
  eventsList: [
    {
      id: 'ev-1',
      title: 'Houston International Bully World Cup 2026',
      date: '18 - 19 Abril 2026',
      location: 'NRG Park, Houston, Texas, USA',
      status: 'Inscripciones Abiertas',
      judges: 'Carlos Otero & Robert Felix',
      banner: BREED_IMAGES.heroBanner,
    },
    {
      id: 'ev-2',
      title: 'Gran Expo Cinológica Ciudad de México INBR',
      date: '23 - 24 Mayo 2026',
      location: 'WTC, Ciudad de México',
      status: 'Confirmado',
      judges: 'Michelle Lozano & Lic. Gallegos',
      banner: BREED_IMAGES.americanBully,
    },
    {
      id: 'ev-3',
      title: 'Circuito Sudamericano de Conformación',
      date: '11 - 12 Julio 2026',
      location: 'Lima / Guayaquil',
      status: 'Próximamente',
      judges: 'Yordi Supremacy & Panel Internacional',
      banner: BREED_IMAGES.exoticBull,
    },
  ],
  standardsList: [
    {
      id: 'std-1',
      breed: 'American Bully',
      variety: 'Standard / Pocket',
      height: 'Machos 17"-20", Hembras 16"-19"',
      head: 'Pesada, ancha, mejillas pronunciadas',
      bite: 'Tijera cerrada exacta',
      body: 'Costillas bien arqueadas, dorso nivelado',
    },
    {
      id: 'std-2',
      breed: 'Exotic Bull',
      variety: 'Micro / Nano Bull',
      height: 'Bajo 13.5 pulgadas a la cruz',
      head: 'Bloque masivo con stop a 90 grados',
      bite: 'Tijera o ligero prognatismo tolerable',
      body: 'Ultra compacto y centro de gravedad bajo',
    },
  ],
  certificationsList: [
    {
      id: 'cert-1',
      title: 'Certificación Genética Notariada de Pedigrí (4 y 8 Gen)',
      desc: 'Emisión oficial con validación criptográfica QR, firma holográfica y trazabilidad notarial ante el consejo INBR.',
      badge: 'VALIDEZ INTERNACIONAL',
    },
    {
      id: 'cert-2',
      title: 'Acreditación Oficial de Microchip ISO 11784/11785',
      desc: 'Registro único biométrico de 15 dígitos indexado a la base de datos de Supabase con consulta instantánea.',
      badge: 'BIOMETRÍA BLINDADA',
    },
    {
      id: 'cert-3',
      title: 'Homologación de Registros Internacionales',
      desc: 'Convalidación ágil de certificados emitidos por clubes caninos reconocidos hacia el libro de orígenes INBR.',
      badge: 'HOMOLOGACIÓN EXPEDITA',
    },
  ],
  hallOfFameList: [
    {
      id: 'hof-1',
      name: 'GR CH TAHONA • Gran Campeón Mundial',
      titles: 'Grand Champion Supreme & Reproductor de la Década',
      year: 'Consagrado 2023',
      owner: 'Jonathan García (Master CEO)',
      image: BREED_IMAGES.americanBully,
    },
    {
      id: 'hof-2',
      name: 'CH DIAMOND BEAST • Pilar Genético',
      titles: 'Champion de Estructura Morfológica',
      year: 'Consagrado 2024',
      owner: 'Criadero Élite INBR',
      image: BREED_IMAGES.exoticBull,
    },
  ],
  breedersList: [
    {
      id: 'brd-1',
      kennel: '777 Kennels Official',
      owner: 'Jonathan García',
      location: 'Houston, Texas / CDMX',
      phone: '+1 (832) 555-7777',
    },
    {
      id: 'brd-2',
      kennel: 'Supremacy Bullies',
      owner: 'Yordi Supremacy',
      location: 'Lima, Perú',
      phone: '+51 987 654 321',
    },
    {
      id: 'brd-3',
      kennel: 'Lone Star Bullies',
      owner: 'Carlos Otero',
      location: 'Texas, USA',
      phone: '+1 832 555 0199',
    },
  ],

  // Quiénes Somos
  aboutUsTitle: 'Nuestra Misión y Origen Internacional',
  aboutUsSubtitle: 'Fundado en 2022 para establecer un registro transparente, familiar y ético sin monopolios.',
  aboutUsParagraph1: 'International Breeds Registry (INBR) surge del anhelo de criadores consagrados que exigían un registro sin favoritismos, con bases de datos públicas verificables y trámites expeditos.',
  aboutUsParagraph2: 'Hoy avalamos criaderos en más de 12 países, con un equipo de jueces internacionales y el sistema de trazabilidad de sangre más moderno del mundo.',
  aboutUsPhoto: BREED_IMAGES.heroBanner,

  // Equipo Directivo & Jueces
  teamBadge: 'EQUIPO INBR • LIDERAZGO & TRAYECTORIA',
  teamTitle: 'Nuestro Equipo Directivo & Jueces',
  teamSubtitle: 'Conoce al cuerpo directivo, directores de área, representantes internacionales y jueces licenciados que rigen los destinos de la INBR.',
  executiveTeam: [
    {
      id: 'exec-1',
      name: 'Jonathan Garcia',
      title: 'CEO & Fundador',
      badge: 'Presidencia & Liderazgo',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-2',
      name: 'Mariana Palma',
      title: 'Vicepresidenta',
      badge: 'Operaciones Globales',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-3',
      name: 'MVZ Nesto Guerrero',
      title: 'Director General & Copresidente de México',
      badge: 'Dirección General',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-4',
      name: 'Robert Felix',
      title: 'Sub Director General & Copresidente de Mexico',
      badge: 'Dirección General',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-5',
      name: 'Chavid Hidalgo',
      title: 'Director Jueces',
      badge: 'Director Jueces',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-6',
      name: 'Michelle Lozano',
      title: 'Sub Director de Jueces',
      badge: 'Sub Directora de Jueces',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-7',
      name: 'Lic. Norma Yanai',
      title: 'Director Jurídico Legal',
      badge: 'Directora Depto Legal',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-1791131253950',
      name: 'Carlos Otero',
      title: 'Director vinculación',
      badge: 'Dirección Oficial',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-1791862770822',
      name: 'Alejandra Sosa',
      title: 'Cargo Directivo de Representantes',
      badge: 'Dirección Oficial',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-1792110844627',
      name: 'Joey Duran',
      title: 'Sub Director Vinculación',
      badge: 'Dirección Oficial',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'exec-11',
      name: 'MVZ Mari Jose Acevedo',
      title: 'Dirección Oficial',
      badge: 'Comisión Médica Veterinaria',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
  ],
  representativesList: [
    {
      id: 'rep-carlos-otero',
      name: 'Carlos Otero',
      country: 'Texas, USA',
      flag: '🇺🇸',
      role: 'Representante Oficial USA & Juez',
      contact: '+1 832 555 0199',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      username: 'carlos.otero',
      password: 'Texas2026!',
      canPrint: true,
      canUpload: true,
      isRevoked: false,
    },
    {
      id: 'rep-robert-felix',
      name: 'Robert Felix',
      country: 'Texas, USA',
      flag: '🇺🇸',
      role: 'Representante Oficial USA',
      contact: '+1 832 555 0200',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80',
      username: 'robert.felix',
      password: 'Texas2026!',
      canPrint: true,
      canUpload: true,
      isRevoked: false,
    },
    {
      id: 'rep-alejandra-sosa',
      name: 'Alejandra Sosa',
      country: 'México, Toluca',
      flag: '🇲🇽',
      role: 'Directora de Representantes',
      contact: '+52 722 555 0188',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      username: 'alejandra.sosa',
      password: 'Mexico2026!',
      canPrint: false,
      canUpload: true,
      isRevoked: false,
    },
    {
      id: 'rep-yordi',
      name: 'Yordi Supremacy',
      country: 'Perú / Internacional',
      flag: '🇵🇪',
      role: 'Representante & Promotor Internacional',
      contact: '+51 987 654 321',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
      username: 'yordi.supremacy',
      password: 'Peru2026!',
      canPrint: false,
      canUpload: true,
      isRevoked: false,
    },
    {
      id: 'rep-mendoza',
      name: 'Carlos Mendoza',
      country: 'México (CDMX / Centro)',
      flag: '🇲🇽',
      role: 'Representante Oficial México Centro',
      contact: '+52 55 9876 5432',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      username: 'carlos.mendoza',
      password: 'Mexico2026!',
      canPrint: false,
      canUpload: true,
      isRevoked: false,
    },
  ],
  judgesList: [
    {
      id: 'judge-1',
      name: 'Robert Felix',
      origin: 'Texas, USA',
      specialty: 'Juez Internacional All-Rounder',
      experience: '15 años de trayectoria',
      badge: 'Juez Internacional All-Rounder',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-2',
      name: 'Carlos Otero',
      origin: 'Texas, USA',
      specialty: 'Juez Internacional All-Rounder',
      experience: '30 años de experiencia cinológica',
      badge: 'Juez Internacional All-Rounder',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-4',
      name: 'Yordi Supremacy',
      origin: 'Perú',
      specialty: 'Juez Senior Internacional',
      experience: '15 años de trayectoria',
      badge: 'Juez Senior Internacional',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-chavid',
      name: 'Chavid Hidalgo',
      origin: 'México',
      specialty: 'Director y Juez de Conformación',
      experience: '10 años de arbitraje',
      badge: 'Director y Juez',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-nestor',
      name: 'Nestor Guerrero',
      origin: 'México',
      specialty: 'Juez Internacional All-Rounder',
      experience: '10 años en juzgamiento internacional',
      badge: 'Director y Juez',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-yanko',
      name: 'Yanko Uriel Rojas Miranda',
      origin: 'México',
      specialty: 'Juez Internacional All-Rounder',
      experience: '10 años en juzgamiento internacional',
      badge: 'Juez Internacional All-Rounder',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-michelle',
      name: 'Michelle Lozano',
      origin: 'México',
      specialty: 'Conformación Bull & Molosos',
      experience: '10 años en juzgamiento internacional',
      badge: 'Sub Directora y Juez',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'judge-armando',
      name: 'Lic. Armando Gallegos',
      origin: 'México',
      specialty: 'Estándar y Fisiología Canina',
      experience: '15 años de arbitraje cinológico',
      badge: 'Juez Titular & Comisario',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    },
  ],

  // Salón de la Fama
  hallOfFameTitle: 'Salón de la Fama Internacional',
  hallOfFameSubtitle: 'Los pilares genéticos y campeones mundiales que definen la excelencia morfológica de la INBR.',
  hallOfFameDescription: 'Homenaje permanente a los ejemplares fundadores que han dejado una huella indeleble en la cinofilia moderna con conformación estricta y salud respiratoria certificada.',
  hallOfFamePhoto1: BREED_IMAGES.americanBully,
  hallOfFamePhoto2: BREED_IMAGES.exoticBull,

  // Razas & Estándares
  bullBreedsTitle: 'Nuestras Razas Oficiales Reconocidas',
  bullBreedsSubtitle: 'Estándares morfofuncionales oficiales adaptados para la preservación, estructura ósea densa y temperamento estable.',
  bullBreedsList: [
    {
      id: 'american-bully',
      name: 'American Bully',
      category: 'bull',
      subtitle: 'Compañero Supremo y Estructura Muscular',
      description: 'Perro compacto, potente, con gran osamenta, temperamento afable y equilibrio biomecánico.',
      varieties: ['Pocket', 'Standard', 'Classic', 'XL'],
      image: BREED_IMAGES.americanBully,
    },
    {
      id: 'exotic-bull',
      name: 'Exotic Bull',
      category: 'bull',
      subtitle: 'Fenotipo Extremo y Agilidad Preservada',
      description: 'Evolución morfológica con máxima compactación, densidad ósea y apego al protocolo de salud INBR.',
      varieties: ['Micro Bully', 'Nano Bull', 'Exotic'],
      image: BREED_IMAGES.exoticBull,
    },
    {
      id: 'french-bulldog',
      name: 'French Bulldog',
      category: 'bull',
      subtitle: 'Moloso Compacto de Compañía',
      description: 'Cuerpo compacto, orejas de murciélago, pecho ancho y excelente respiración con narinas abiertas.',
      varieties: ['Estándar Fawn/Brindle', 'Fluffy', 'Visual Isabella'],
      image: BREED_IMAGES.frenchBulldog,
    },
    {
      id: 'english-bulldog',
      name: 'English Bulldog',
      category: 'bull',
      subtitle: 'Bulldog Inglés Oficial',
      description: 'Cuerpo ancho, pecho bajo y hombros poderosos. Cabeza masiva simétrica y marcha cadenciosa.',
      varieties: ['Show Classic', 'Tri-Color', 'Heavy Bone'],
      image: BREED_IMAGES.englishBulldog,
    },
    {
      id: 'cane-corso',
      name: 'Cane Corso Italiano',
      category: 'guard',
      subtitle: 'Moloso de Guardia y Protección Familiar',
      description: 'Moloso potente, atlético y majestuoso. Mordida en ligero prognatismo, cuello musculoso y aplomos de gran firmeza.',
      varieties: ['Negro', 'Gris Plomo', 'Leonado / Formentino'],
      image: BREED_IMAGES.caneCorso,
    },
    {
      id: 'pastor-aleman',
      name: 'Pastor Alemán',
      category: 'work',
      subtitle: 'Trabajo, Guardia e Inteligencia Cinológica',
      description: 'Perro pastor equilibrado, seguro de sí mismo, sumamente versátil en trabajo K9, obediencia y conformación oficial.',
      varieties: ['Línea de Trabajo', 'Línea de Belleza', 'Negro y Fuego'],
      image: BREED_IMAGES.pastorAleman,
    },
    {
      id: 'pastor-belga-malinois',
      name: 'Pastor Belga Malinois',
      category: 'work',
      subtitle: 'Trabajo Deportivo, K9 e Inteligencia Operativa',
      description: 'Canino de trabajo con potencia de mordida, máxima agilidad, impulsos equilibrados y líneas de trabajo consagradas.',
      varieties: ['Línea de Ring Francés', 'Mondioring', 'K9 Operativo'],
      image: BREED_IMAGES.pastorBelgaMalinois,
    },
    {
      id: 'doberman',
      name: 'Doberman Pinscher',
      category: 'guard',
      subtitle: 'Elegancia, Firmeza y Máximo Carácter',
      description: 'Silueta esculpida, porte noble y lealtad incondicional. Excelente dorso firme y trote amplio elástico.',
      varieties: ['Línea Europea', 'Línea Americana'],
      image: BREED_IMAGES.doberman,
    },
    {
      id: 'rottweiler',
      name: 'Rottweiler',
      category: 'guard',
      subtitle: 'Potencia, Determinación y Estructura Robusta',
      description: 'Canino de origen germano con cabeza potente, marcas de fuego delimitadas y temperamento equilibrado.',
      varieties: ['Línea ADRK', 'Línea de Belleza Internacional'],
      image: BREED_IMAGES.rottweiler,
    },
    {
      id: 'american-pit-bull',
      name: 'American Pit Bull Terrier',
      category: 'bull',
      subtitle: 'Raza Atlética de Rendimiento Histórico',
      description: 'Musculatura magra, impulsión posterior sobresaliente y tenacidad con enfoque deportivo oficial.',
      varieties: ['Red Nose', 'Conformación Deportiva'],
      image: BREED_IMAGES.apbt,
    },
  ],
  racialStandardsTitle: 'Estándares Raciales Oficiales Notariados',
  racialStandardsSubtitle: 'Descarga y consulta los manuales morfológicos aprobados ante el Comité Cinológico Internacional.',
  specialEditionTitle: 'Edición Especial: Preservación & Tipicidad',
  specialEditionSubtitle: 'Líneas exclusivas que representan el pináculo de la conformación corporal y la salud genética.',
  specialEditionPhoto: BREED_IMAGES.exoticBull,

  // Directorio Criadores & Eventos
  breedersTitle: 'Directorio Internacional de Criadores Verificados',
  breedersSubtitle: 'Kennels y criadores de élite con certificación ética, bienestar animal y excelencia morfológica.',
  eventsTitle: 'Calendario Oficial de Circuitos & Campeonatos',
  eventsSubtitle: 'Exposiciones de conformación y copas mundiales avaladas por el cuerpo de jueces de la INBR.',
  eventsNotice: 'Temporada Oficial 2026: Houston World Cup, Gran Expo CDMX y Sudamérica Dog Fest.',
  eventsBannerUrl: BREED_IMAGES.heroBanner,

  // Campeones & Verificación
  championsTitle: 'Tabla de Puntuación & Campeones Oficiales',
  championsSubtitle: 'Ranking por puntos de exposición acumulados para la obtención del título Champion (CH) y Grand Champion (GR CH).',
  verificationTitle: 'Consulta Segura de Autenticidad Notarial',
  verificationSubtitle: 'Ingresa el folio oficial o microchip ISO para consultar el estado de validez notarial y acceder a la documentación autorizada del ejemplar.',

  // Camadas & Formularios
  liveLitterTitle: 'Registro de Camada en Vivo con Validación de Cámara',
  liveLitterSubtitle: 'Módulo de auditoría audiovisual obligatorio para certificar la lactancia y el conteo exacto de cachorros recién nacidos.',
  formsTitle: 'Trámites Notariales, Homologaciones & Genograma',
  formsSubtitle: 'Emisión de registros F1, homologación con otros registros reconocidos y consulta de genograma de 4 generaciones.',

  // Certificaciones & Contacto
  certificationsTitle: 'Certificaciones Notariales & Avales Internacionales',
  certificationsSubtitle: 'Sellos de autenticidad criptográfica y respaldo de confederaciones cinológicas aliadas.',
  contactTitle: 'Oficinas Centrales & Contacto Directo',
  contactSubtitle: 'Comunícate con nuestra secretaría general o coordinadores de zona para resolver cualquier consulta de registro o evento.',
  contactPhone: '+52 9984996316',
  contactEmail: 'inbr.oficial@gmail.com',
  contactAddress: 'Cancún, Quintana Roo, México',

  // Galería Oficial
  galleryTitle: 'Galería Oficial de Campeones & Pistas',
  gallerySubtitle: 'Registro fotográfico oficial de exposiciones internacionales, copas mundiales, ejemplares consagrados y eventos de conformación.',
  galleryBadge: 'MEMORIAS & EXCELENCIA EN PISTA • INBR OFICIAL',
  galleryPhotos: [
    {
      id: 'gal-1',
      title: 'KING VULCAN • Grand Champion Supreme',
      category: 'champions',
      imageUrl: BREED_IMAGES.americanBully,
      description: 'American Bully Standard #1 del ranking internacional, estructura ósea densa y movimiento simétrico.',
      date: 'Temporada 2026',
    },
    {
      id: 'gal-2',
      title: 'QUEEN BELLA • Mejor de Exposición CDMX',
      category: 'champions',
      imageUrl: BREED_IMAGES.exoticBull,
      description: 'Exotic Bull con fenotipo impecable y temperamento noble en ring.',
      date: 'Gran Expo CDMX',
    },
    {
      id: 'gal-3',
      title: 'Houston World Cup Ring de Juzgamiento',
      category: 'rings',
      imageUrl: BREED_IMAGES.heroBanner,
      description: 'Cuerpo de jueces licenciados evaluando la mordida tijera y angulaciones de corvejón.',
      date: 'Houston, Texas',
    },
    {
      id: 'gal-4',
      title: 'Nano Bull • Línea Exclusiva INBR',
      category: 'litters',
      imageUrl: BREED_IMAGES.nanoBull,
      description: 'Ejemplar compacto Nano Bull con validación biométrica ISO 11784.',
      date: 'Auditado 2026',
    },
    {
      id: 'gal-5',
      title: 'Circuito Sudamericano Lima Rings',
      category: 'events',
      imageUrl: BREED_IMAGES.apbt,
      description: 'Competencia abierta de Exotic Bull, American Bully y conformación funcional.',
      date: 'Lima, Perú',
    },
    {
      id: 'gal-6',
      title: 'IMPERIAL CORSAN • French Bulldog Champion',
      category: 'champions',
      imageUrl: BREED_IMAGES.frenchBulldog,
      description: 'Conformación compacta con vías respiratorias libres certificadas y ADN verificado.',
      date: 'Torneo Internacional',
    },
  ],

  // Mi Perfil
  profileTitle: 'Mi Perfil de Criador & Propietario',
  profileSubtitle: 'Consulta tus ejemplares notariados, descarga de certificados digitales, credenciales PVC y seguimiento de trámites.',
  profileBadge: 'PORTAL DE AFILIADO & AUTENTICACIÓN',

  // Footer
  footerMotto: 'International Breeds Registry • The New Era is Here • Familia, Ética & Preservación',
  footerCopyright: '© 2022 - 2026 International Breeds Registry (INBR). Todos los derechos reservados.',

  // Section Visibilities
  sectionVisibility: {
    hero: true,
    threeCards: true,
    aboutUs: true,
    team: true,
    bullBreeds: true,
    specialEdition: true,
    racialStandards: true,
    breeders: true,
    events: true,
    champions: true,
    verification: true,
    hallOfFame: true,
    liveLitter: true,
    forms: true,
    certifications: true,
    contact: true,
    gallery: true,
    profile: true,
  },
  customTextOverrides: {},
};

const STORAGE_KEY = 'inbr_dynamic_content_v2';
const EVENT_KEY = 'inbr_dynamic_content_updated_v2';

export function applyTextScaleToDom(scale?: 'small' | 'normal' | 'large' | 'xlarge') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('text-scale-small', 'text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
  if (scale && scale !== 'normal') {
    root.classList.add(`text-scale-${scale}`);
  }
}

export function applyCustomTextOverridesToDom(overrides?: Record<string, string>) {
  if (typeof document === 'undefined' || !overrides) return;
  Object.entries(overrides).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    try {
      // 1. Selector by data-cms-key or data-dom-id
      const el = document.querySelector(`[data-cms-key="${key}"], [data-dom-id="${key}"]`);
      if (el && el.textContent !== val) {
        el.textContent = val;
        return;
      }
      // 2. CSS selector if valid
      if (key.startsWith('#') || key.startsWith('.')) {
        const elSel = document.querySelector(key);
        if (elSel && elSel.textContent !== val) {
          elSel.textContent = val;
        }
      }
    } catch {}
  });
}

// Active in-memory cache to guarantee instant reactivity, prevent data loss, and survive reload
let inMemoryConfig: DynamicContentConfig | null = null;

/**
 * Safely persists configuration to LocalStorage.
 * If base64 images exceed browser's 5MB quota, it sanitizes heavy strings
 * so the local cache never corrupts or throws QuotaExceededError.
 */
function safeSetLocalStorage(key: string, config: DynamicContentConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (err) {
    console.warn('LocalStorage quota reached. Trimming heavy images for browser cache:', err);
    try {
      const trimmed = { ...config };
      if (Array.isArray(trimmed.executiveTeam)) {
        trimmed.executiveTeam = trimmed.executiveTeam.map((m) => ({
          ...m,
          image: m.image && m.image.startsWith('data:') && m.image.length > 40000 ? '' : m.image,
        }));
      }
      if (Array.isArray(trimmed.judgesList)) {
        trimmed.judgesList = trimmed.judgesList.map((j) => ({
          ...j,
          image: j.image && j.image.startsWith('data:') && j.image.length > 40000 ? '' : j.image,
        }));
      }
      if (Array.isArray(trimmed.representativesList)) {
        trimmed.representativesList = trimmed.representativesList.map((r) => ({
          ...r,
          image: r.image && r.image.startsWith('data:') && r.image.length > 40000 ? '' : r.image,
        }));
      }
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (fallbackErr) {
      console.warn('LocalStorage unavailable for dynamic content cache:', fallbackErr);
    }
  }
}

export function sanitizeCertificateOffsets(
  rawOffsets?: Partial<CertificateLayoutOffsets>,
  hasCustomFrontBg?: boolean,
  hasCustomBackBg?: boolean
): CertificateLayoutOffsets {
  const merged: CertificateLayoutOffsets = {
    ...DEFAULT_CERTIFICATE_OFFSETS,
    ...(rawOffsets || {}),
  };

  // Detect corrupted extreme test offsets saved before background separation fix
  const logoX = Math.abs(merged.logoOffset?.x || 0);
  const logoY = Math.abs(merged.logoOffset?.y || 0);
  const regY = Math.abs(merged.regNumberOffset?.y || 0);
  const dogX = Math.abs(merged.dogNameOffset?.x || 0);
  const gpFont = merged.grandparentsOffset?.fontSize || 11;

  const isLegacyBroken =
    (!hasCustomFrontBg && (logoX > 260 || logoY > 200 || regY > 160 || dogX > 220)) ||
    (!hasCustomBackBg && gpFont > 20);

  if (isLegacyBroken) {
    return { ...DEFAULT_CERTIFICATE_OFFSETS };
  }

  // Clamp individual coordinates to sane sheet bounds so fields never overlap footer signature or vanish off-sheet
  const clampXY = (item: LayoutOffsetItem | undefined, maxX = 240, maxY = 180, minFont = 7, maxFont = 36): LayoutOffsetItem => {
    const base = item || { x: 0, y: 0, fontSize: 13 };
    return {
      ...base,
      x: Math.max(-maxX, Math.min(maxX, Number(base.x) || 0)),
      y: Math.max(-maxY, Math.min(maxY, Number(base.y) || 0)),
      fontSize: Math.max(minFont, Math.min(maxFont, Number(base.fontSize) || 13)),
    };
  };

  return {
    ...merged,
    dogNameOffset: clampXY(merged.dogNameOffset, 220, 140, 14, 34),
    regNumberOffset: clampXY(merged.regNumberOffset, 200, 110, 9, 22),
    microchipOffset: clampXY(merged.microchipOffset, 200, 110, 9, 20),
    breedOffset: clampXY(merged.breedOffset, 200, 110, 9, 20),
    ownerOffset: clampXY(merged.ownerOffset, 200, 100, 9, 20),
    breederOffset: clampXY(merged.breederOffset, 200, 100, 9, 20),
    dobOffset: clampXY(merged.dobOffset, 200, 110, 9, 20),
    colorOffset: clampXY(merged.colorOffset, 200, 110, 9, 20),
    genderOffset: clampXY(merged.genderOffset, 200, 110, 9, 20),
    dateOffset: clampXY(merged.dateOffset, 180, 60, 10, 22),
    logoOffset: clampXY(merged.logoOffset, 260, 150, 9, 24),
    qrOffset: { ...clampXY(merged.qrOffset, 220, 140, 10, 20), hidden: false },
    sealOffset: clampXY(merged.sealOffset, 220, 140, 10, 22),
    headerTitleOffset: clampXY(merged.headerTitleOffset, 180, 80, 14, 32),
    grandparentsOffset: clampXY(merged.grandparentsOffset, 180, 120, 8, 16),
  };
}

function sanitizeDynamicConfig(config: DynamicContentConfig): DynamicContentConfig {
  const isMauro = (str?: string) => {
    if (!str) return false;
    const s = str.toLowerCase();
    return s.includes('mauro silva') || s.includes('mauro') || s.includes('silva mauro');
  };

  const sanitizeImage = (img?: string) => {
    // Only strip if corrupted or huge local base64 (>300KB)
    if (img && img.startsWith('data:image') && img.length > 300000) {
      return '';
    }
    return img || '';
  };

  const cleanBreedTerm = (text?: string) => {
    if (!text) return '';
    return text
      .replace(/Exotic\s*Bully/gi, 'Exotic Bull')
      .replace(/Nano\s*Bully/gi, 'Nano Bull')
      .replace(/Clean\s*Exotic/gi, 'Exotic Bull')
      .replace(/Extreme\s*Pocket/gi, 'Micro Bully');
  };

  const execList = Array.isArray(config.executiveTeam) ? config.executiveTeam : DEFAULT_DYNAMIC_CONTENT.executiveTeam;
  const repList = Array.isArray(config.representativesList) ? config.representativesList : DEFAULT_DYNAMIC_CONTENT.representativesList;
  const judList = Array.isArray(config.judgesList) ? config.judgesList : DEFAULT_DYNAMIC_CONTENT.judgesList;
  const evList = Array.isArray(config.eventsList) ? config.eventsList : DEFAULT_DYNAMIC_CONTENT.eventsList;
  const brdList = Array.isArray(config.breedersList) ? config.breedersList : DEFAULT_DYNAMIC_CONTENT.breedersList;
  const spList = Array.isArray(config.specialEditionList) ? config.specialEditionList : DEFAULT_DYNAMIC_CONTENT.specialEditionList;
  const bullList = Array.isArray(config.bullBreedsList) && config.bullBreedsList.length > 0
    ? config.bullBreedsList
    : DEFAULT_DYNAMIC_CONTENT.bullBreedsList;
  const galList = Array.isArray(config.galleryPhotos) ? config.galleryPhotos : DEFAULT_DYNAMIC_CONTENT.galleryPhotos;
  const rawOverrides = config.customTextOverrides || {};

  const cleanOverrides: Record<string, string> = {};
  Object.entries(rawOverrides).forEach(([k, v]) => {
    if (!isMauro(k) && !isMauro(String(v))) {
      cleanOverrides[k] = v;
    }
  });

  // Migrate breed cards: clean terminology, replace legacy Unsplash stock photos with exact breed photos, ensure Pastor Alemán exists
  const migratedBullBreeds = bullList.map((b) => {
    const cleanedName = cleanBreedTerm(b.name);
    const cleanedVarieties = (b.varieties || [])
      .map((v) => {
        const lower = v.trim().toLowerCase();
        if (lower === 'clean exotic' || lower === 'clean') return 'Exotic';
        if (lower === 'extreme pocket') return 'Pocket';
        if (lower === 'nano' || lower === 'nano bully') return 'Nano Bull';
        return cleanBreedTerm(v);
      })
      .filter((v, idx, arr) => v && arr.indexOf(v) === idx);

    const img = isLegacyStockUrl(b.image)
      ? getBreedImageByIdOrName(`${b.id} ${cleanedName}`)
      : sanitizeImage(b.image);

    return {
      ...b,
      name: cleanedName,
      subtitle: cleanBreedTerm(b.subtitle),
      description: cleanBreedTerm(b.description),
      varieties: cleanedVarieties,
      image: img,
    };
  });

  const hasPastorAleman = migratedBullBreeds.some(
    (b) => b.id === 'pastor-aleman' || b.name.toLowerCase().includes('pastor alemán') || b.name.toLowerCase().includes('pastor aleman')
  );
  if (!hasPastorAleman) {
    const pastorDefault = DEFAULT_DYNAMIC_CONTENT.bullBreedsList.find((b) => b.id === 'pastor-aleman');
    if (pastorDefault) {
      migratedBullBreeds.push(pastorDefault);
    }
  }

  return {
    ...config,
    certificateOffsets: sanitizeCertificateOffsets(
      config.certificateOffsets,
      Boolean(config.certificateBackgroundUrl),
      Boolean(config.certBackBackgroundUrl)
    ),
    heroBannerUrl: isLegacyStockUrl(config.heroBannerUrl)
      ? DEFAULT_DYNAMIC_CONTENT.heroBannerUrl
      : sanitizeImage(config.heroBannerUrl) || DEFAULT_DYNAMIC_CONTENT.heroBannerUrl,
    eventsBannerUrl: isLegacyStockUrl(config.eventsBannerUrl)
      ? DEFAULT_DYNAMIC_CONTENT.eventsBannerUrl
      : sanitizeImage(config.eventsBannerUrl) || DEFAULT_DYNAMIC_CONTENT.eventsBannerUrl,
    aboutUsPhoto: isLegacyStockUrl(config.aboutUsPhoto)
      ? DEFAULT_DYNAMIC_CONTENT.aboutUsPhoto
      : sanitizeImage(config.aboutUsPhoto) || DEFAULT_DYNAMIC_CONTENT.aboutUsPhoto,
    specialEditionBanner1: isLegacyStockUrl(config.specialEditionBanner1)
      ? DEFAULT_DYNAMIC_CONTENT.specialEditionBanner1
      : sanitizeImage(config.specialEditionBanner1) || DEFAULT_DYNAMIC_CONTENT.specialEditionBanner1,
    specialEditionBanner2: isLegacyStockUrl(config.specialEditionBanner2)
      ? DEFAULT_DYNAMIC_CONTENT.specialEditionBanner2
      : sanitizeImage(config.specialEditionBanner2) || DEFAULT_DYNAMIC_CONTENT.specialEditionBanner2,
    specialEditionPhoto: isLegacyStockUrl(config.specialEditionPhoto)
      ? DEFAULT_DYNAMIC_CONTENT.specialEditionPhoto
      : sanitizeImage(config.specialEditionPhoto) || DEFAULT_DYNAMIC_CONTENT.specialEditionPhoto,
    hallOfFamePhoto1: isLegacyStockUrl(config.hallOfFamePhoto1)
      ? DEFAULT_DYNAMIC_CONTENT.hallOfFamePhoto1
      : sanitizeImage(config.hallOfFamePhoto1) || DEFAULT_DYNAMIC_CONTENT.hallOfFamePhoto1,
    hallOfFamePhoto2: isLegacyStockUrl(config.hallOfFamePhoto2)
      ? DEFAULT_DYNAMIC_CONTENT.hallOfFamePhoto2
      : sanitizeImage(config.hallOfFamePhoto2) || DEFAULT_DYNAMIC_CONTENT.hallOfFamePhoto2,
    bullBreedsList: migratedBullBreeds,
    galleryPhotos: (galList || []).map((g) => ({
      ...g,
      title: cleanBreedTerm(g.title),
      description: cleanBreedTerm(g.description),
      imageUrl: isLegacyStockUrl(g.imageUrl)
        ? getBreedImageByIdOrName(`${g.title} ${g.description || ''}`)
        : sanitizeImage(g.imageUrl) || BREED_IMAGES.americanBully,
    })),
    executiveTeam: execList
      .filter((e) => !isMauro(e.name) && !isMauro(e.title))
      .map((e) => ({ ...e, image: sanitizeImage(e.image) })),
    representativesList: repList
      .filter((r) => !isMauro(r.name) && !isMauro(r.username) && !isMauro(r.role))
      .map((r) => ({ ...r, image: sanitizeImage(r.image) })),
    judgesList: judList
      .filter((j) => !isMauro(j.name))
      .map((j) => ({ ...j, image: sanitizeImage(j.image) })),
    eventsList: (evList || []).map((ev) => ({
      ...ev,
      judges: (ev.judges || '').replace(/Mauro\s*Silva/gi, 'Carlos Otero & Juez Oficial'),
      title: (ev.title || '').replace(/Mauro\s*Silva/gi, 'Directiva Oficial INBR'),
      banner: isLegacyStockUrl(ev.banner) ? BREED_IMAGES.heroBanner : sanitizeImage(ev.banner),
    })),
    breedersList: (brdList || [])
      .filter((b) => !isMauro(b.owner) && !isMauro(b.kennel)),
    specialEditionList: (spList || [])
      .filter((s) => !isMauro(s.owner))
      .map((s) => {
        const cleanCat = cleanBreedTerm(s.category);
        const cleanName = s.name
          .replace(/CLEAN DIAMOND GHOST/i, 'EXOTIC DIAMOND GHOST')
          .replace(/EXTREME POCKET TITAN/i, 'MICRO BULLY TITAN');
        return {
          ...s,
          name: cleanName,
          category: cleanCat,
          imageUrl: isLegacyStockUrl(s.imageUrl)
            ? getBreedImageByIdOrName(`${cleanCat} ${cleanName}`)
            : sanitizeImage(s.imageUrl) || BREED_IMAGES.exoticBull,
        };
      }),
    customTextOverrides: cleanOverrides,
  };
}

export function getDynamicContent(): DynamicContentConfig {
  if (inMemoryConfig) return sanitizeDynamicConfig(inMemoryConfig);
  if (typeof window === 'undefined') return DEFAULT_DYNAMIC_CONTENT;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawMerged: DynamicContentConfig = { 
        ...DEFAULT_DYNAMIC_CONTENT, 
        ...parsed,
        customTextOverrides: parsed.customTextOverrides || {},
        executiveTeam: Array.isArray(parsed.executiveTeam)
          ? parsed.executiveTeam
          : DEFAULT_DYNAMIC_CONTENT.executiveTeam,
        representativesList: Array.isArray(parsed.representativesList)
          ? parsed.representativesList
          : DEFAULT_DYNAMIC_CONTENT.representativesList,
        judgesList: Array.isArray(parsed.judgesList)
          ? parsed.judgesList
          : DEFAULT_DYNAMIC_CONTENT.judgesList,
        galleryPhotos: Array.isArray(parsed.galleryPhotos)
          ? parsed.galleryPhotos
          : DEFAULT_DYNAMIC_CONTENT.galleryPhotos,
        breedsList: Array.isArray(parsed.breedsList)
          ? parsed.breedsList
          : DEFAULT_DYNAMIC_CONTENT.breedsList,
        eventsList: Array.isArray(parsed.eventsList)
          ? parsed.eventsList
          : DEFAULT_DYNAMIC_CONTENT.eventsList,
        standardsList: Array.isArray(parsed.standardsList)
          ? parsed.standardsList
          : DEFAULT_DYNAMIC_CONTENT.standardsList,
        certificationsList: Array.isArray(parsed.certificationsList)
          ? parsed.certificationsList
          : DEFAULT_DYNAMIC_CONTENT.certificationsList,
        hallOfFameList: Array.isArray(parsed.hallOfFameList)
          ? parsed.hallOfFameList
          : DEFAULT_DYNAMIC_CONTENT.hallOfFameList,
        breedersList: Array.isArray(parsed.breedersList)
          ? parsed.breedersList
          : DEFAULT_DYNAMIC_CONTENT.breedersList,
        championsList: mergeWithCanonicalChampions(parsed.championsList),
        specialEditionList: Array.isArray(parsed.specialEditionList)
          ? parsed.specialEditionList
          : DEFAULT_DYNAMIC_CONTENT.specialEditionList,
        certificateOffsets: parsed.certificateOffsets || DEFAULT_DYNAMIC_CONTENT.certificateOffsets,
        sectionVisibility: {
          ...DEFAULT_DYNAMIC_CONTENT.sectionVisibility,
          ...(parsed.sectionVisibility || {})
        }
      };
      inMemoryConfig = sanitizeDynamicConfig(rawMerged);
      return inMemoryConfig;
    }
  } catch (e) {
    console.warn('Error reading dynamic content from localStorage', e);
  }

  inMemoryConfig = { ...DEFAULT_DYNAMIC_CONTENT };
  return inMemoryConfig!;
}

export async function fetchDynamicContentFromSupabase(): Promise<DynamicContentConfig> {
  try {
    const res = await fetchCmsConfigDirect();

    if (res.success && res.data) {
      try {
        const parsed = JSON.parse(res.data);
        const merged: DynamicContentConfig = {
          ...DEFAULT_DYNAMIC_CONTENT,
          ...parsed,
          customTextOverrides: parsed.customTextOverrides || {},
          executiveTeam: Array.isArray(parsed.executiveTeam)
            ? parsed.executiveTeam
            : DEFAULT_DYNAMIC_CONTENT.executiveTeam,
          representativesList: Array.isArray(parsed.representativesList)
            ? parsed.representativesList
            : DEFAULT_DYNAMIC_CONTENT.representativesList,
          judgesList: Array.isArray(parsed.judgesList)
            ? parsed.judgesList
            : DEFAULT_DYNAMIC_CONTENT.judgesList,
          galleryPhotos: Array.isArray(parsed.galleryPhotos)
            ? parsed.galleryPhotos
            : DEFAULT_DYNAMIC_CONTENT.galleryPhotos,
          breedsList: Array.isArray(parsed.breedsList)
            ? parsed.breedsList
            : DEFAULT_DYNAMIC_CONTENT.breedsList,
          eventsList: Array.isArray(parsed.eventsList)
            ? parsed.eventsList
            : DEFAULT_DYNAMIC_CONTENT.eventsList,
          standardsList: Array.isArray(parsed.standardsList)
            ? parsed.standardsList
            : DEFAULT_DYNAMIC_CONTENT.standardsList,
          certificationsList: Array.isArray(parsed.certificationsList)
            ? parsed.certificationsList
            : DEFAULT_DYNAMIC_CONTENT.certificationsList,
          hallOfFameList: Array.isArray(parsed.hallOfFameList)
            ? parsed.hallOfFameList
            : DEFAULT_DYNAMIC_CONTENT.hallOfFameList,
          breedersList: Array.isArray(parsed.breedersList)
            ? parsed.breedersList
            : DEFAULT_DYNAMIC_CONTENT.breedersList,
          championsList: mergeWithCanonicalChampions(parsed.championsList),
          specialEditionList: Array.isArray(parsed.specialEditionList)
            ? parsed.specialEditionList
            : DEFAULT_DYNAMIC_CONTENT.specialEditionList,
          certificateOffsets: parsed.certificateOffsets || DEFAULT_DYNAMIC_CONTENT.certificateOffsets,
          sectionVisibility: {
            ...DEFAULT_DYNAMIC_CONTENT.sectionVisibility,
            ...(parsed.sectionVisibility || {})
          }
        };

        const cleanConfig = sanitizeDynamicConfig(merged);
        inMemoryConfig = cleanConfig;
        safeSetLocalStorage(STORAGE_KEY, cleanConfig);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cleanConfig }));
        }
        return cleanConfig;
      } catch (parseErr) {
        console.warn('Error parsing CMS json from Supabase:', parseErr);
      }
    }
  } catch (err) {
    console.warn('Network error fetching dynamic content from Supabase:', err);
  }
  return getDynamicContent();
}

/**
 * Saves dynamic content both locally (immediate synchronous update in React state)
 * and directly to the Supabase cloud database with full awaiting and error reporting.
 */
export async function saveDynamicContentRealtime(
  content: Partial<DynamicContentConfig>
): Promise<{ success: boolean; data: DynamicContentConfig; error?: string }> {
  const current = getDynamicContent();
  const updated: DynamicContentConfig = {
    ...current,
    ...content,
    championsList: content.championsList ? mergeWithCanonicalChampions(content.championsList) : current.championsList,
    sectionVisibility: {
      ...current.sectionVisibility,
      ...(content.sectionVisibility || {})
    }
  };

  const cleanConfig = sanitizeDynamicConfig(updated);
  inMemoryConfig = cleanConfig;

  // Immediately notify all active React components in this window/tab
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cleanConfig }));
    } catch {}
    safeSetLocalStorage(STORAGE_KEY, cleanConfig);
  }

  // Persist directly to Supabase cloud table 'franquicias' (prefijo: 'CMS_CONFIG')
  const jsonStr = JSON.stringify(cleanConfig);
  const result = await saveCmsConfigDirect(jsonStr);

  if (!result.success) {
    console.error('saveDynamicContentRealtime Supabase error:', result.error);
    return {
      success: false,
      data: cleanConfig,
      error: result.error || 'No se pudo guardar en Supabase. Verifica tu conexión.'
    };
  }

  return { success: true, data: cleanConfig };
}

/**
 * Synchronous local save + background Supabase write for backward compatibility
 */
export function saveDynamicContent(content: Partial<DynamicContentConfig>): DynamicContentConfig {
  const current = getDynamicContent();
  const updated: DynamicContentConfig = {
    ...current,
    ...content,
    championsList: content.championsList ? mergeWithCanonicalChampions(content.championsList) : current.championsList,
    sectionVisibility: {
      ...current.sectionVisibility,
      ...(content.sectionVisibility || {})
    }
  };

  const cleanConfig = sanitizeDynamicConfig(updated);
  inMemoryConfig = cleanConfig;

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cleanConfig }));
    } catch {}
    safeSetLocalStorage(STORAGE_KEY, cleanConfig);
  }

  // Background write to Supabase
  const jsonStr = JSON.stringify(cleanConfig);
  saveCmsConfigDirect(jsonStr).then((res) => {
    if (!res.success) {
      console.warn('Background Supabase write warning:', res.error);
    }
  });

  return cleanConfig;
}

/**
 * Awaited save to Supabase that returns the updated configuration
 */
export async function saveDynamicContentAsync(content: Partial<DynamicContentConfig>): Promise<DynamicContentConfig> {
  const res = await saveDynamicContentRealtime(content);
  return res.data;
}

/**
 * Synchronizes champions list directly to Supabase DB and local state
 */
export async function syncChampionsToSupabase(
  championsList: DynamicChampionItem[]
): Promise<{ success: boolean; data: DynamicChampionItem[]; error?: string }> {
  try {
    const mergedChampions = mergeWithCanonicalChampions(championsList);
    const res = await saveDynamicContentRealtime({ championsList: mergedChampions });
    return { success: res.success, data: mergedChampions, error: res.error };
  } catch (err: any) {
    console.error('Error synchronizing champions to Supabase:', err);
    return { success: false, data: championsList, error: err?.message || 'Error de sincronización' };
  }
}

/**
 * Synchronizes team members (directivos, representantes, jueces) directly to Supabase DB
 * and broadcasts changes to all active components.
 */
export async function syncTeamToSupabase(teamData: {
  executiveTeam?: ExecutiveTeamMember[];
  representativesList?: TeamRepresentative[];
  judgesList?: TeamJudge[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const patch: Partial<DynamicContentConfig> = {};
    if (teamData.executiveTeam) patch.executiveTeam = teamData.executiveTeam;
    if (teamData.representativesList) patch.representativesList = teamData.representativesList;
    if (teamData.judgesList) patch.judgesList = teamData.judgesList;

    const res = await saveDynamicContentRealtime(patch);
    return { success: res.success, error: res.error };
  } catch (err: any) {
    console.error('Error synchronizing team to Supabase:', err);
    return { success: false, error: err?.message || 'Error de sincronización' };
  }
}

/**
 * Compresses an image file client-side so base64 strings stay below 40KB
 */
async function compressImageFile(file: File, maxDim: number = 600, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a CMS image directly to Supabase Storage bucket 'fotos-registros'
 * via the server endpoint (using service_role key to bypass storage RLS)
 * or falls back to direct client Supabase upload / compressed DataURL.
 */
export async function uploadCmsImage(file: File): Promise<string> {
  // Compress image first for quick transfer and optimal performance
  const compressedDataUrl = await compressImageFile(file, 800, 0.85);

  // 1. Primary: Server-side Supabase Storage upload (bypasses browser RLS and guarantees public URL in fotos-registros)
  try {
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: compressedDataUrl,
        filename: file.name || 'image.jpg',
        bucket: 'fotos-registros',
        contentType: file.type || 'image/jpeg',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (serverErr) {
    console.warn('Server storage upload endpoint fallback:', serverErr);
  }

  // 2. Direct browser upload to Supabase storage fallback
  try {
    const ext = file.name?.split('.').pop() || 'jpg';
    const filePath = `cms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const blob = await (await fetch(compressedDataUrl)).blob();
    const { data, error } = await supabase.storage
      .from('fotos-registros')
      .upload(filePath, blob, { cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg' });

    if (!error && data?.path) {
      const { data: urlData } = supabase.storage
        .from('fotos-registros')
        .getPublicUrl(data.path);
      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload fallback to compressed DataURL:', err);
  }

  return compressedDataUrl;
}

export function resetDynamicContent(): DynamicContentConfig {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: DEFAULT_DYNAMIC_CONTENT }));
    } catch (e) {}
  }

  // Also reset in Supabase
  try {
    const jsonStr = JSON.stringify(DEFAULT_DYNAMIC_CONTENT);
    saveCmsConfigDirect(jsonStr).then();
  } catch (err) {}

  inMemoryConfig = DEFAULT_DYNAMIC_CONTENT;
  return DEFAULT_DYNAMIC_CONTENT;
}

export function useDynamicContent() {
  const [content, setContent] = useState<DynamicContentConfig>(getDynamicContent);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setContent(getDynamicContent());
    };
    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // 1. Initial hydration from Supabase on mount
    setIsLoadingSupabase(true);
    fetchDynamicContentFromSupabase()
      .then((remoteConfig) => {
        setContent(remoteConfig);
      })
      .finally(() => {
        setIsLoadingSupabase(false);
      });

    // 2. Real-time subscription: syncs when anyone saves from any browser/device
    const unsubscribeRealtime = subscribeToCmsConfig((newJsonStr) => {
      try {
        const parsed = JSON.parse(newJsonStr);
        const merged: DynamicContentConfig = {
          ...DEFAULT_DYNAMIC_CONTENT,
          ...parsed,
          customTextOverrides: parsed.customTextOverrides || {},
          executiveTeam: Array.isArray(parsed.executiveTeam)
            ? parsed.executiveTeam
            : DEFAULT_DYNAMIC_CONTENT.executiveTeam,
          representativesList: Array.isArray(parsed.representativesList)
            ? parsed.representativesList
            : DEFAULT_DYNAMIC_CONTENT.representativesList,
          judgesList: Array.isArray(parsed.judgesList)
            ? parsed.judgesList
            : DEFAULT_DYNAMIC_CONTENT.judgesList,
          galleryPhotos: Array.isArray(parsed.galleryPhotos)
            ? parsed.galleryPhotos
            : DEFAULT_DYNAMIC_CONTENT.galleryPhotos,
          breedsList: Array.isArray(parsed.breedsList)
            ? parsed.breedsList
            : DEFAULT_DYNAMIC_CONTENT.breedsList,
          eventsList: Array.isArray(parsed.eventsList)
            ? parsed.eventsList
            : DEFAULT_DYNAMIC_CONTENT.eventsList,
          standardsList: Array.isArray(parsed.standardsList)
            ? parsed.standardsList
            : DEFAULT_DYNAMIC_CONTENT.standardsList,
          certificationsList: Array.isArray(parsed.certificationsList)
            ? parsed.certificationsList
            : DEFAULT_DYNAMIC_CONTENT.certificationsList,
          hallOfFameList: Array.isArray(parsed.hallOfFameList)
            ? parsed.hallOfFameList
            : DEFAULT_DYNAMIC_CONTENT.hallOfFameList,
          breedersList: Array.isArray(parsed.breedersList)
            ? parsed.breedersList
            : DEFAULT_DYNAMIC_CONTENT.breedersList,
          championsList: mergeWithCanonicalChampions(parsed.championsList),
          specialEditionList: Array.isArray(parsed.specialEditionList)
            ? parsed.specialEditionList
            : DEFAULT_DYNAMIC_CONTENT.specialEditionList,
          certificateOffsets: parsed.certificateOffsets || DEFAULT_DYNAMIC_CONTENT.certificateOffsets,
          sectionVisibility: {
            ...DEFAULT_DYNAMIC_CONTENT.sectionVisibility,
            ...(parsed.sectionVisibility || {})
          }
        };

        const cleanConfig = sanitizeDynamicConfig(merged);
        inMemoryConfig = cleanConfig;
        safeSetLocalStorage(STORAGE_KEY, cleanConfig);
        setContent(cleanConfig);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cleanConfig }));
        }
      } catch (err) {
        console.warn('Realtime parse incoming config error:', err);
      }
    });

    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      unsubscribeRealtime();
    };
  }, []);

  useEffect(() => {
    if (content.customTextOverrides) {
      applyCustomTextOverridesToDom(content.customTextOverrides);
    }
    applyTextScaleToDom(content.textScale);
  }, [content.customTextOverrides, content.textScale]);

  const saveContentRealtime = async (patch: Partial<DynamicContentConfig>) => {
    setIsSaving(true);
    try {
      const res = await saveDynamicContentRealtime(patch);
      return res;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    content,
    updateContent: saveDynamicContent,
    saveContentRealtime,
    saveDynamicContentRealtime,
    resetContent: resetDynamicContent,
    refreshFromSupabase: fetchDynamicContentFromSupabase,
    isLoadingSupabase,
    isSaving,
  };
}

