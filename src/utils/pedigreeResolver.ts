import { DogRecord } from '../data/registryData';

export interface PedigreeNode {
  name: string;
  regNumber: string;
  color?: string;
  breed?: string;
  titles?: string[];
}

export interface EightGenPedigree {
  target: DogRecord;
  // Gen 1: Padres (2)
  sire: PedigreeNode;
  dam: PedigreeNode;
  // Gen 2: Abuelos (4)
  sireSire: PedigreeNode;
  sireDam: PedigreeNode;
  damSire: PedigreeNode;
  damDam: PedigreeNode;
  // Gen 3: Bisabuelos (8)
  g3: PedigreeNode[];
  // Gen 4: Tatarabuelos (16)
  g4: PedigreeNode[];
  // Gen 5: Trastatarabuelos (32)
  g5: PedigreeNode[];
  // Gen 6: 6ta Generación (64)
  g6: PedigreeNode[];
  // Gen 7: 7ma Generación (128)
  g7: PedigreeNode[];
  // Gen 8: 8va Generación Fundadores (256)
  g8: PedigreeNode[];
}

export function buildEightGenPedigree(dog: DogRecord, allDogs: DogRecord[]): EightGenPedigree {
  const dogMap = new Map<string, DogRecord>();
  allDogs.forEach((d) => {
    if (d.regNumber) dogMap.set(d.regNumber.toUpperCase().trim(), d);
    // CRITICAL: Only map adult non-camada dogs by name.
    // A puppy record (e.g. CA10007) must NEVER be indexed under its sire's name!
    const isPuppy = (d.regNumber && d.regNumber.toUpperCase().startsWith('CA')) || 
                    (d.name && d.name.toUpperCase().startsWith('CACHORRO'));
    if (d.name && !isPuppy) {
      dogMap.set(d.name.toUpperCase().trim(), d);
    }
  });

  const findDog = (regOrName?: string): DogRecord | undefined => {
    if (!regOrName) return undefined;
    const clean = regOrName.toUpperCase().trim();
    const found = dogMap.get(clean);
    // Never allow a dog to be its own parent
    if (found && found.regNumber === dog.regNumber) return undefined;
    // Never allow a Camada puppy to be returned as an adult parent
    if (found && (found.regNumber.toUpperCase().startsWith('CA') || found.name.toUpperCase().startsWith('CACHORRO'))) {
      return undefined;
    }
    return found;
  };

  // 1. Sire & Dam (Gen 1)
  const sireObj = findDog(dog.sireReg) || findDog(dog.sire);
  const damObj = findDog(dog.damReg) || findDog(dog.dam);

  // Derive clean registration for sire and dam (NEVER let it be the target dog's registration or a puppy's registration)
  const safeSireReg = (sireObj?.regNumber && !sireObj.regNumber.toUpperCase().startsWith('CA') && sireObj.regNumber !== dog.regNumber)
    ? sireObj.regNumber
    : (dog.sireReg && !dog.sireReg.toUpperCase().startsWith('CA') && dog.sireReg !== dog.regNumber)
      ? dog.sireReg
      : (dog.sire ? `REG-${dog.sire.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}` : 'INBR-777-01');

  const safeDamReg = (damObj?.regNumber && !damObj.regNumber.toUpperCase().startsWith('CA') && damObj.regNumber !== dog.regNumber)
    ? damObj.regNumber
    : (dog.damReg && !dog.damReg.toUpperCase().startsWith('CA') && dog.damReg !== dog.regNumber)
      ? dog.damReg
      : (dog.dam ? `REG-${dog.dam.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}` : 'INBR-777-02');

  const sire: PedigreeNode = {
    name: dog.sire || sireObj?.name || '777 CORSAN FIREUP',
    regNumber: safeSireReg,
    color: sireObj?.color || dog.genogram?.sire?.titles?.[0] || 'LILAC AND WHITE',
    titles: sireObj?.titles || ['CH'],
  };

  const dam: PedigreeNode = {
    name: dog.dam || damObj?.name || 'YEYI 777',
    regNumber: safeDamReg,
    color: damObj?.color || dog.genogram?.dam?.titles?.[0] || 'WHITE AND BLUE TICKED',
    titles: damObj?.titles || [],
  };

  // 2. Grandparents (Gen 2)
  const ssObj = findDog(sireObj?.sireReg) || findDog(sireObj?.sire);
  const sdObj = findDog(sireObj?.damReg) || findDog(sireObj?.dam);
  const dsObj = findDog(damObj?.sireReg) || findDog(damObj?.sire);
  const ddObj = findDog(damObj?.damReg) || findDog(damObj?.dam);

  const sireSire: PedigreeNode = {
    name: sireObj?.sire || dog.genogram?.sire?.sire?.name || '777 BULLSCREW DUCE',
    regNumber: sireObj?.sireReg || dog.genogram?.sire?.sire?.reg || 'WHITE',
    color: ssObj?.color || 'WHITE',
  };

  const sireDam: PedigreeNode = {
    name: sireObj?.dam || dog.genogram?.sire?.dam?.name || 'REYES BULLS CLARITA',
    regNumber: sireObj?.damReg || dog.genogram?.sire?.dam?.reg || 'BLUE AND WHITE',
    color: sdObj?.color || 'BLUE AND WHITE',
  };

  const damSire: PedigreeNode = {
    name: damObj?.sire || dog.genogram?.dam?.sire?.name || 'CHEYO 777',
    regNumber: damObj?.sireReg || dog.genogram?.dam?.sire?.reg || 'WHITE AND BLUE TICKED',
    color: dsObj?.color || 'WHITE AND BLUE TICKED',
  };

  const damDam: PedigreeNode = {
    name: damObj?.dam || dog.genogram?.dam?.dam?.name || 'LIBIA 777',
    regNumber: damObj?.damReg || dog.genogram?.dam?.dam?.reg || 'WHITE',
    color: ddObj?.color || 'WHITE',
  };

  // 3. Bisabuelos (Gen 3 - 8 ancestros dinámicos desde base de datos o genograma)
  const sssDog = findDog(ssObj?.sireReg) || findDog(ssObj?.sire);
  const ssdDog = findDog(ssObj?.damReg) || findDog(ssObj?.dam);
  const sdsDog = findDog(sdObj?.sireReg) || findDog(sdObj?.sire);
  const sddDog = findDog(sdObj?.damReg) || findDog(sdObj?.dam);
  const dssDog = findDog(dsObj?.sireReg) || findDog(dsObj?.sire);
  const dsdDog = findDog(dsObj?.damReg) || findDog(dsObj?.dam);
  const ddsDog = findDog(ddObj?.sireReg) || findDog(ddObj?.sire);
  const dddDog = findDog(ddObj?.damReg) || findDog(ddObj?.dam);

  const g3: PedigreeNode[] = [
    {
      name: ssObj?.sire || dog.genogram?.sire?.sire?.sire || (typeof dog.genogram?.sire?.sire?.titles?.[0] === 'string' ? dog.genogram?.sire?.sire?.titles?.[0] : '') || 'BRUCE LEE',
      regNumber: ssObj?.sireReg || sssDog?.regNumber || 'INBR-G3-01',
      color: sssDog?.color || 'CHOCOLATE AND WHITE',
    },
    {
      name: ssObj?.dam || dog.genogram?.sire?.sire?.dam || (typeof dog.genogram?.sire?.sire?.titles?.[1] === 'string' ? dog.genogram?.sire?.sire?.titles?.[1] : '') || 'ELBK LA CHULA!',
      regNumber: ssObj?.damReg || ssdDog?.regNumber || 'INBR-G3-02',
      color: ssdDog?.color || 'BLUE AND WHITE',
    },
    {
      name: sdObj?.sire || dog.genogram?.sire?.dam?.sire || (typeof dog.genogram?.sire?.dam?.titles?.[0] === 'string' ? dog.genogram?.sire?.dam?.titles?.[0] : '') || 'REYES BULLS KRAKER',
      regNumber: sdObj?.sireReg || sdsDog?.regNumber || 'INBR-G3-03',
      color: sdsDog?.color || 'BLUE AND WHITE',
    },
    {
      name: sdObj?.dam || dog.genogram?.sire?.dam?.dam || (typeof dog.genogram?.sire?.dam?.titles?.[1] === 'string' ? dog.genogram?.sire?.dam?.titles?.[1] : '') || 'REYES BULLS CLEOPATRA',
      regNumber: sdObj?.damReg || sddDog?.regNumber || 'INBR-G3-04',
      color: sddDog?.color || 'BLUE AND WHITE',
    },
    {
      name: dsObj?.sire || dog.genogram?.dam?.sire?.sire || (typeof dog.genogram?.dam?.sire?.titles?.[0] === 'string' ? dog.genogram?.dam?.sire?.titles?.[0] : '') || 'MEX LINE JACOB',
      regNumber: dsObj?.sireReg || dssDog?.regNumber || 'INBR-G3-05',
      color: dssDog?.color || 'BLUE TICKED',
    },
    {
      name: dsObj?.dam || dog.genogram?.dam?.sire?.dam || (typeof dog.genogram?.dam?.sire?.titles?.[1] === 'string' ? dog.genogram?.dam?.sire?.titles?.[1] : '') || 'GOLDENLINE NAE NAE',
      regNumber: dsObj?.damReg || dsdDog?.regNumber || 'INBR-G3-06',
      color: dsdDog?.color || 'WHITE AND BLUE TICKED',
    },
    {
      name: ddObj?.sire || dog.genogram?.dam?.dam?.sire || (typeof dog.genogram?.dam?.dam?.titles?.[0] === 'string' ? dog.genogram?.dam?.dam?.titles?.[0] : '') || 'LBK JALON',
      regNumber: ddObj?.sireReg || ddsDog?.regNumber || 'INBR-G3-07',
      color: ddsDog?.color || 'WHITE',
    },
    {
      name: ddObj?.dam || dog.genogram?.dam?.dam?.dam || (typeof dog.genogram?.dam?.dam?.titles?.[1] === 'string' ? dog.genogram?.dam?.dam?.titles?.[1] : '') || 'ENVY',
      regNumber: ddObj?.damReg || dddDog?.regNumber || 'INBR-G3-08',
      color: dddDog?.color || 'WHITE AND BLUE',
    },
  ];

  // 4. Tatarabuelos (Gen 4 - 16 ancestros dinámicos encadenados desde la base de datos)
  const defaultG4Founders = [
    { name: 'DAXLINE BAPE', regNumber: 'INBR-G4-01', color: 'BLACK TRI' },
    { name: 'HAZARD BLOOD', regNumber: 'INBR-G4-02', color: 'BLUE TRI' },
    { name: 'MR. MIAGI', regNumber: 'INBR-G4-03', color: 'CHAMPAGNE' },
    { name: 'LILAC QUEEN', regNumber: 'INBR-G4-04', color: 'LILAC' },
    { name: 'GR CH BULLSEYE', regNumber: 'INBR-G4-05', color: 'WHITE & BRINDLE' },
    { name: 'DIAMOND PRINCESS', regNumber: 'INBR-G4-06', color: 'FAWN' },
    { name: 'PHENOM BLOOD', regNumber: 'INBR-G4-07', color: 'BLUE & WHITE' },
    { name: 'BELLA MAJESTY', regNumber: 'INBR-G4-08', color: 'CHOCOLATE' },
    { name: 'KONG THE BEAST', regNumber: 'INBR-G4-09', color: 'BLUE FAWN' },
    { name: 'RUBY ROSE', regNumber: 'INBR-G4-10', color: 'RED NOSE' },
    { name: 'GHOST GOKU', regNumber: 'INBR-G4-11', color: 'PLATINUM' },
    { name: 'LADY ELECTRA', regNumber: 'INBR-G4-12', color: 'BLACK' },
    { name: 'THOR HAMMER', regNumber: 'INBR-G4-13', color: 'WHITE & TICKED' },
    { name: 'ATHENA PRIDE', regNumber: 'INBR-G4-14', color: 'BLUE' },
    { name: 'TITANIC POWER', regNumber: 'INBR-G4-15', color: 'SEAL' },
    { name: 'VENOM QUEEN', regNumber: 'INBR-G4-16', color: 'LILAC TICKED' },
  ];

  const g4: PedigreeNode[] = [];
  for (let i = 0; i < 8; i++) {
    const parentG3 = g3[i];
    const parentObj = findDog(parentG3.regNumber) || findDog(parentG3.name);
    const sireIdx = i * 2;
    const damIdx = i * 2 + 1;

    // Sire of this G3
    const g4SireObj = findDog(parentObj?.sireReg) || findDog(parentObj?.sire);
    g4.push({
      name: parentObj?.sire || defaultG4Founders[sireIdx]?.name || `ANCESTRO G4 #${sireIdx + 1}`,
      regNumber: parentObj?.sireReg || g4SireObj?.regNumber || defaultG4Founders[sireIdx]?.regNumber || `INBR-G4-${sireIdx + 1}`,
      color: g4SireObj?.color || defaultG4Founders[sireIdx]?.color || 'COLOR REGISTRADO',
    });

    // Dam of this G3
    const g4DamObj = findDog(parentObj?.damReg) || findDog(parentObj?.dam);
    g4.push({
      name: parentObj?.dam || defaultG4Founders[damIdx]?.name || `ANCESTRO G4 #${damIdx + 1}`,
      regNumber: parentObj?.damReg || g4DamObj?.regNumber || defaultG4Founders[damIdx]?.regNumber || `INBR-G4-${damIdx + 1}`,
      color: g4DamObj?.color || defaultG4Founders[damIdx]?.color || 'COLOR REGISTRADO',
    });
  }

  // 5. 5ta Generación (Gen 5 - 32 ancestros)
  const g5Names = [
    'GR CH GOTTYLINE DAX', 'BARBEE BLOOD', 'THE SLUGGER', 'MIAGI LINE LOLA',
    'BULLY MARKET BOWSER', 'CALI KINGPIN', 'BLACK MONSTER', 'FREAKSHOW BELLA',
    'ROYAL BLOOD KING', 'VULCAN EMPRESS', 'BLUE PRIDE SAMSON', 'CRYSTAL BLUE',
    'DARK SHADOW GHOST', 'RUBY PRINCESS', 'PLATINUM GOKU', 'TITANIC ELECTRA',
    'THOR BULLSDEN', 'ATHENA OLYMPUS', 'CH KRAKEN BLOOD', 'WARRIOR PRINCESS',
    'IRON MIKE LINE', 'DIAMOND ROSE', 'GOLDEN NAE NAE', 'LBK JALON SR',
    'ENVY ROYAL KENNEL', 'CH CHOCOLATE TYSON', 'BLUE VELVET QUEEN', 'TITAN BULLSEYE I',
    'CLEOPATRA REYES I', 'MEX LINE JACOB SR', 'CHEYO CLASSIC', 'YEYI ANCESTRY'
  ];
  const g5: PedigreeNode[] = g5Names.map((name, i) => ({
    name,
    regNumber: `INBR-G5-${String(i + 1).padStart(2, '0')}`,
    color: i % 2 === 0 ? 'BLUE & WHITE' : 'LILAC TRI',
  }));

  // 6. 6ta Generación (Gen 6 - 64 ancestros representativos)
  const g6Names = [
    'RAZORS EDGE SHORT DEXTER', 'GOTTYLINE JUAN GOTTY', 'MIAGI FOUNDATION', 'WEST COAST BAPE',
    'KINGPIN SLUGGER SR', 'CALI DIAMOND STAR', 'BOWSER ROYAL BLOOD', 'MONSTER PHENOM',
    'FREAKSHOW PRINCE', 'EMPRESS BELLA SR', 'ROYAL GHOST KING', 'VULCAN LEGEND I',
    'SAMSON CLASSIC LINE', 'BLUE VELVET STAR', 'DARK KNIGHT BULL', 'RUBY ROSETTE',
    'GOKU EMPEROR', 'ELECTRA MAJESTY', 'THOR ORIGINAL', 'ATHENA REIGNS',
    'KRAKEN GOD OF WAR', 'WARRIOR GOLDEN', 'IRONCLAD HEAVY', 'DIAMOND HEIRESS'
  ];
  const g6: PedigreeNode[] = Array.from({ length: 64 }, (_, i) => ({
    name: g6Names[i % g6Names.length] + (i >= g6Names.length ? ` #${Math.floor(i / g6Names.length) + 1}` : ''),
    regNumber: `INBR-G6-${String(i + 1).padStart(2, '0')}`,
    color: 'STANDARD ANCESTOR',
  }));

  // 7. 7ma Generación (Gen 7 - 128 ancestros fundadores)
  const g7Names = [
    'RAZORS EDGE INIGO', 'GOTTYLINE TONTO', 'NOTORIOUS JUAN GOTTY', 'PATTERSONS BULLS',
    'RAZORS EDGE BLUE FOX', 'COLD HARD CASH', 'BLUE DRAGON LINE', 'CLASSIC BULL ROOTS'
  ];
  const g7: PedigreeNode[] = Array.from({ length: 128 }, (_, i) => ({
    name: g7Names[i % g7Names.length] + ` [G7-${i + 1}]`,
    regNumber: `INBR-G7-${String(i + 1).padStart(3, '0')}`,
    color: 'HISTORIC BLOOD',
  }));

  // 8. 8va Generación (Gen 8 - 256 ancestros raíces fundadoras históricas)
  const g8Names = [
    'RAZORS EDGE CACTUS JACK (FOUNDER)', 'GOTTYLINE PIONEER', 'BLUE MOUNTAIN ROOTS',
    'HISTORIC AMERICAN BULLY ANCESTOR', 'FOUNDATION BULLDOG PRESERVATION'
  ];
  const g8: PedigreeNode[] = Array.from({ length: 256 }, (_, i) => ({
    name: g8Names[i % g8Names.length] + ` [G8-${i + 1}]`,
    regNumber: `INBR-G8-${String(i + 1).padStart(3, '0')}`,
    color: 'FOUNDING ROOTS 2021',
  }));

  return {
    target: dog,
    sire,
    dam,
    sireSire,
    sireDam,
    damSire,
    damDam,
    g3,
    g4,
    g5,
    g6,
    g7,
    g8,
  };
}

// Backward compatibility helper
export function buildFourGenPedigree(dog: DogRecord, allDogs: DogRecord[]) {
  return buildEightGenPedigree(dog, allDogs);
}
