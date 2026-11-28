import { BREED_IMAGES } from '../utils/breedImages';

export interface DogRecord {
  regNumber: string;
  microchip: string;
  name: string;
  breed: string;
  variety: string;
  gender: 'Macho' | 'Hembra' | 'Male' | 'Female';
  dob: string;
  color: string;
  owner: string;
  breeder: string;
  country: string;
  sire: string;
  sireReg: string;
  dam: string;
  damReg: string;
  points: number;
  titles: string[];
  imageUrl: string;
  status: 'ACTIVE_VALIDATED' | 'CHAMPION' | 'PENDING';
  genogram?: {
    sire: {
      name: string;
      reg: string;
      titles: string[];
      sire: { name: string; reg: string; titles: string[]; sire: string; dam: string };
      dam: { name: string; reg: string; titles: string[]; sire: string; dam: string };
    };
    dam: {
      name: string;
      reg: string;
      titles: string[];
      sire: { name: string; reg: string; titles: string[]; sire: string; dam: string };
      dam: { name: string; reg: string; titles: string[]; sire: string; dam: string };
    };
  };
}

export const SAMPLE_DOGS: DogRecord[] = [];

export const EXECUTIVE_TEAM = [
  {
    id: 'exec-1',
    name: 'Jonathan Garcia',
    roleKey: 'ceo',
    title: 'CEO & Fundador',
    badge: 'Fundación & Liderazgo',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-2',
    name: 'Mariana Palma',
    roleKey: 'vp',
    title: 'Vicepresidenta',
    badge: 'Operaciones Globales',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-3',
    name: 'MVZ Nesto Guerrero',
    roleKey: 'vet',
    title: 'Director General & Copresidente de México',
    badge: 'Dirección General',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-4',
    name: 'Robert Felix',
    roleKey: 'director',
    title: 'Sub Director General & Copresidente de Mexico',
    badge: 'Dirección General',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-5',
    name: 'Chavid Hidalgo',
    roleKey: 'tech',
    title: 'Director Jueces',
    badge: 'Director Jueces',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-6',
    name: 'Michelle Lozano',
    roleKey: 'subdirector_jueces',
    title: 'Sub Director de Jueces',
    badge: 'Sub Directora de Jueces',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-7',
    name: 'Lic. Norma Yanai',
    roleKey: 'legal',
    title: 'Director Jurídico Legal',
    badge: 'Directora Depto Legal',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-1791131253950',
    name: 'Carlos Otero',
    roleKey: 'vinculacion',
    title: ' Director vinculación ',
    badge: 'Dirección Oficial',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-1791862770822',
    name: 'Alejandra Sosa ',
    roleKey: 'directivo_reps',
    title: 'Cargo Directivo de Representanrtes ',
    badge: 'Dirección Oficial',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'exec-1792110844627',
    name: 'Joey Duran',
    roleKey: 'sub_vinculacion',
    title: 'Sub Drector Vinculación',
    badge: 'Dirección Oficial',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
];

export const REPRESENTATIVES = [
  {
    name: 'Carlos Otero',
    country: 'Texas, USA',
    flag: '🇺🇸',
    role: 'Representante Oficial USA & Juez',
    contact: '+1 832 555 0199',
  },
  {
    name: 'Robert Felix',
    country: 'Texas, USA',
    flag: '🇺🇸',
    role: 'Representante Oficial USA',
    contact: '+1 832 555 0200',
  },
  {
    name: 'Alejandra Sosa',
    country: 'México, Toluca',
    flag: '🇲🇽',
    role: 'Directora de Representantes',
    contact: '+52 722 555 0188',
  },
  {
    name: 'Yordi Supremacy',
    country: 'Perú / Internacional',
    flag: '🇵🇪',
    role: 'Representante & Promotor Internacional',
    contact: '+51 987 654 321',
  },
];

export const OFFICIAL_JUDGES = [
  {
    name: 'Robert Felix',
    origin: 'México / USA',
    specialty: 'American Bully & Exotic Bull All-Rounder',
    experience: '18 años de trayectoria internacional',
    badge: 'Juez Senior Licenciado',
  },
  {
    name: 'Carlos Otero',
    origin: 'Texas, USA',
    specialty: 'American Bully XL, Pocket & APBT',
    experience: '12 años de trayectoria y criador máster',
    badge: 'Juez Internacional',
  },
  {
    name: 'Joey Duran',
    origin: 'Colombia',
    specialty: 'Estructura & Movimiento Biomecánico',
    experience: '10 años en juzgamiento canófilo',
    badge: 'Juez Certificado',
  },
  {
    name: 'Miguel Negrón',
    origin: 'Puerto Rico / USA',
    specialty: 'English Bulldog, French Bulldog & Shorty Bull',
    experience: '15 años como expositor y juez',
    badge: 'Juez de Especialidad',
  },
  {
    name: 'Michelle Lozano',
    origin: 'México',
    specialty: 'Conformación, Carácter & Variedades Exóticas',
    experience: '11 años en desarrollo de estándares',
    badge: 'Juez Internacional',
  },
];

export const BULL_BREEDS = [
  {
    id: 'american-bully',
    name: 'American Bully',
    subtitle: 'Standard, Pocket, Classic, XL',
    description: 'Raza atlética, musculosa y con una cabeza imponente, con carácter dócil y leal hacia la familia humana.',
    image: BREED_IMAGES.americanBully,
    varieties: ['Standard (17"-20")', 'Pocket (14"-17")', 'Classic (Línea esbelta)', 'XL (20"-23")'],
  },
  {
    id: 'exotic-bull',
    name: 'Exotic Bull',
    subtitle: 'Micro, Nano Bull & Exotic Standard',
    description: 'Morfología compacta con gran densidad ósea. En INBR se prioriza la respiración limpia y la movilidad ágil.',
    image: BREED_IMAGES.exoticBull,
    varieties: ['Micro Exotic', 'Nano Bull', 'Exotic Standard'],
  },
  {
    id: 'french-bulldog',
    name: 'French Bulldog',
    subtitle: 'Bouledogue Français',
    description: 'Compacto, orejas de murciélago erguidas, estructura ósea densa y carácter vivaz sumamente sociable.',
    image: BREED_IMAGES.frenchBulldog,
    varieties: ['Standard Color', 'Fluffy', 'Visual Isabella / Platinum'],
  },
  {
    id: 'english-bulldog',
    name: 'English Bulldog',
    subtitle: 'Bulldog Inglés Oficial',
    description: 'Cuerpo ancho, pecho bajo y hombros poderosos. Cabeza masiva con arrugas moderadas y mordida en prognatismo.',
    image: BREED_IMAGES.englishBulldog,
    varieties: ['Show Classic', 'Tri-Color', 'Heavy Bone'],
  },
  {
    id: 'cane-corso',
    name: 'Cane Corso Italiano',
    subtitle: 'Moloso de Guardia y Protección',
    description: 'Moloso potente, atlético y majestuoso. Cuello musculoso, cabeza imponente y aplomos firmes.',
    image: BREED_IMAGES.caneCorso,
    varieties: ['Negro', 'Gris Plomo', 'Leonado / Formentino'],
  },
  {
    id: 'pastor-aleman',
    name: 'Pastor Alemán',
    subtitle: 'Trabajo, Guardia y Conformación',
    description: 'Canino versátil de dorso sólido, trote amplio y carácter equilibrado de alta utilidad.',
    image: BREED_IMAGES.pastorAleman,
    varieties: ['Línea de Trabajo', 'Línea de Show', 'Negro / Sable'],
  },
  {
    id: 'pastor-belga-malinois',
    name: 'Pastor Belga Malinois',
    subtitle: 'Trabajo Deportivo y K9',
    description: 'Canino ágil de alto impulso, mordida firme e inteligencia operativa superior.',
    image: BREED_IMAGES.pastorBelgaMalinois,
    varieties: ['Ring Francés', 'Mondioring', 'K9 Operativo'],
  },
  {
    id: 'apbt',
    name: 'American Pit Bull Terrier (APBT)',
    subtitle: 'Atleta de Alto Rendimiento',
    description: 'El epítome de la agilidad, fuerza e inteligencia canina. Estructura proporcionada y temperamento equilibrado.',
    image: BREED_IMAGES.apbt,
    varieties: ['Red Nose', 'Black / Blue', 'Traditional Athletic'],
  },
  {
    id: 'doberman',
    name: 'Doberman Pinscher',
    subtitle: 'Elegancia y Máximo Carácter',
    description: 'Silueta atlética esculpida, porte noble y lealtad incondicional.',
    image: BREED_IMAGES.doberman,
    varieties: ['Línea Europea', 'Línea Americana'],
  },
  {
    id: 'rottweiler',
    name: 'Rottweiler',
    subtitle: 'Potencia y Estructura Robusta',
    description: 'Canino germano con cabeza potente, marcas de fuego delimitadas y temperamento seguro.',
    image: BREED_IMAGES.rottweiler,
    varieties: ['Línea ADRK', 'Línea Internacional'],
  },
];

export const RACIAL_STANDARDS_DATA: Record<string, {
  head: string;
  bite: string;
  neck: string;
  body: string;
  limbs: string;
  faults: string;
}> = {
  'american-bully': {
    head: 'Cráneo mediano a grande, ancho y bien cincelado con mejillas pronunciadas. Stop profundo y definido. Hocico corto a mediano, redondeado en la parte superior.',
    bite: 'Mordida en tijera preferente; se acepta mordida en pinza o ligero prognatismo inferior no mayor a 1/4 de pulgada sin dientes visibles con la boca cerrada.',
    neck: 'Musculoso, pesado, ligeramente arqueado, afinándose gradualmente desde los hombros hasta la base del cráneo. Sin piel suelta excesiva.',
    body: 'Costillas bien arqueadas, pecho profundo y ancho ("pecho en barril"). Línea dorsal nivelada con una ligera caída hacia la grupa.',
    limbs: 'Patas delanteras rectas y fuertes, huesos anchos y redondos. Tren posterior angulado adecuadamente, corvejones bien descendidos para propulsión potente.',
    faults: 'Enognatismo, ojos saltones albinos, cola enroscada o con nudos graves, falta de masa muscular o timidez extrema.',
  },
  'exotic-bull': {
    head: 'Extremadamente ancha y maciza, stop en ángulo de 90°. Expresión limpia, sin entropión ni ectropión severo.',
    bite: 'Ligero prognatismo inferior permitido. Dientes alineados sin desviación lateral pronunciada.',
    neck: 'Corto a mediano, con fuerte inserción y cuello despejado.',
    body: 'Ultracompacto, dorso corto, gran densidad torácica con espacio adecuado entre extremidades para locomoción libre.',
    limbs: 'Hueso sumamente grueso pero aplomos verticales. Las muñecas no deben colapsar (pasterns vencidos).',
    faults: 'Dificultad respiratoria audible o estridor, patas torcidas en exceso ("east/west" severo), columna deformada.',
  },
  'french-bulldog': {
    head: 'Cráneo plano entre las orejas, frente ligeramente abombada. Stop muy marcado. Hocico corto y ancho con pliegues simétricos.',
    bite: 'Prognatismo moderado obligatorio con buen cierre labial.',
    neck: 'Corto, ligeramente curvado y sin papada.',
    body: 'Línea dorsal ascendente ("roach back"), costillas redondeadas, vientre recogido en flancos.',
    limbs: 'Extremidades posteriores más largas que las anteriores, elevando el lomo de forma típica.',
    faults: 'Orejas no erguidas, color marrón hígado o albinismo, agresividad injustificada.',
  },
};

export const BREEDERS_DIRECTORY = [
  {
    name: 'Imperial Bullyz International',
    owner: 'Jonathan Garcia',
    breed: 'American Bully (Pocket & Standard)',
    country: 'USA / México',
    city: 'Houston / CDMX',
    verified: true,
    whatsapp: '+18327454627',
    stars: 5,
    membersSince: '2016',
    specialties: 'Líneas Tri-Color de Élite y Campeones de Ring',
  },
  {
    name: 'Palma Dynasties Kennel',
    owner: 'Mariana Palma',
    breed: 'Exotic Bull & Micro Bully',
    country: 'México',
    city: 'Guadalajara, Jalisco',
    verified: true,
    whatsapp: '+523318920192',
    stars: 5,
    membersSince: '2018',
    specialties: 'Exotic Bull con certificación cardiorrespiratoria',
  },
  {
    name: 'Lone Star Bullyz Texas',
    owner: 'Carlos Otero',
    breed: 'American Bully XL & Pocket',
    country: 'USA',
    city: 'San Antonio, Texas',
    verified: true,
    whatsapp: '+18325550199',
    stars: 5,
    membersSince: '2015',
    specialties: 'Gigantes gentiles con osamenta densa',
  },
  {
    name: 'Supremacy Kennel Internacional',
    owner: 'Yordi Supremacy',
    breed: 'French Bulldog & Shorty Bull',
    country: 'Perú',
    city: 'Lima',
    verified: true,
    whatsapp: '+51987654321',
    stars: 5,
    membersSince: '2019',
    specialties: 'Fluffy importados y sangre europea',
  },
  {
    name: 'Andes Kennel Oficial',
    owner: 'Criadero Andes Oficial',
    breed: 'English Bulldog & APBT',
    country: 'Ecuador',
    city: 'Guayaquil',
    verified: true,
    whatsapp: '+593990000000',
    stars: 5,
    membersSince: '2020',
    specialties: 'Preservación de morfología clásica y temperamento',
  },
  {
    name: 'Duran Iron Kennels',
    owner: 'Tonny Duran',
    breed: 'American Pit Bull Terrier & Bully Classic',
    country: 'Colombia',
    city: 'Medellín',
    verified: true,
    whatsapp: '+573001239876',
    stars: 5,
    membersSince: '2017',
    specialties: 'Atletas de salto, conformación y obediencia',
  },
];

export const UPCOMING_EVENTS = [
  {
    id: 'evt-1',
    title: 'INBR World Championship Cup Houston 2026',
    date: '18 - 19 Octubre, 2026',
    location: 'NRG Center, Houston, Texas, USA',
    judges: ['Robert Felix (Senior Judge)', 'Carlos Otero (USA)', 'Joey Duran (COL)'],
    categories: ['American Bully (Pocket, Standard, XL)', 'Exotic Bull', 'French Bulldog', 'Best in Show Intercontinental'],
    pointsMultiplier: 'Puntaje Triple (3X)',
    status: 'Inscripciones Abiertas',
  },
  {
    id: 'evt-2',
    title: 'Gran Expo Nacional Bullyz CDMX 2026',
    date: '14 - 15 Noviembre, 2026',
    location: 'Expo Reforma, Ciudad de México, México',
    judges: ['Michelle Lozano (MEX)', 'Miguel Negrón (PR)', 'Robert Felix (MEX)'],
    categories: ['Todas las Razas Tipo Bull', 'Cachorros F1', 'Edición Especial Nano Bull'],
    pointsMultiplier: 'Puntaje Doble (2X)',
    status: 'Inscripciones Abiertas',
  },
  {
    id: 'evt-3',
    title: 'Sudamérica Supremacy Dog Fest Guayaquil 2026',
    date: '05 Diciembre, 2026',
    location: 'Centro de Convenciones, Guayaquil, Ecuador',
    judges: ['Robert Felix (Comité)', 'Joey Duran (COL)', 'Carlos Otero (USA)'],
    categories: ['American Bully', 'English Bulldog', 'APBT Conformation'],
    pointsMultiplier: 'Puntaje Oficial (1X)',
    status: 'Próximamente',
  },
];
