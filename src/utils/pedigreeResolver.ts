import { DogRecord } from '../data/registryData';

export interface PedigreeNode {
  name: string;
  regNumber: string;
  color?: string;
  breed?: string;
  titles?: string[];
  dogRecord?: DogRecord;
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
  // Gen 5-8: Extensiones históricas (se resuelven si existen en base de datos; sin inventar datos falsos)
  g5: PedigreeNode[];
  g6: PedigreeNode[];
  g7: PedigreeNode[];
  g8: PedigreeNode[];
}

export function normalizePedigreeText(val?: string | null): string {
  if (!val) return '';
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function normalizePedigreeAlnum(val?: string | null): string {
  if (!val) return '';
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\*/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

export function isSyntheticRegFallback(val?: string | null): boolean {
  const n = normalizePedigreeText(val);
  return /^REG-/.test(n);
}

export function isPlaceholderAncestor(val?: string | null): boolean {
  const n = normalizePedigreeText(val);
  if (!n) return true;
  return (
    n === 'XXX' ||
    n === 'X' ||
    n === '—' ||
    n === '-' ||
    n === 'N/A' ||
    n === 'NONE' ||
    n === 'NO' ||
    n === 'SIN REGISTRO' ||
    n === 'NO REGISTRADO' ||
    n === 'POR REGISTRAR' ||
    n === 'DESCONOCIDO' ||
    n === 'ANCESTRO DESCONOCIDO' ||
    n === 'LINAJE FUNDADOR INBR' ||
    n.startsWith('INBR-FOUNDER') ||
    n.startsWith('INBR CHAMPION') ||
    n.startsWith('INBR-G3-') ||
    n.startsWith('INBR-G4-') ||
    n.startsWith('INBR-G5-') ||
    n.startsWith('INBR-G6-') ||
    n.startsWith('INBR-G7-') ||
    n.startsWith('INBR-G8-')
  );
}

export function isCamadaPuppyRecord(d: DogRecord): boolean {
  const reg = normalizePedigreeText(d.regNumber);
  const name = normalizePedigreeText(d.name);
  const regAlnum = normalizePedigreeAlnum(d.regNumber);
  const nameAlnum = normalizePedigreeAlnum(d.name);

  // Litter registration prefixes in INBR dataset (C*, CA*, CU*, CPR*, CGTB*, CKM*, CTRI*, SBCC*)
  // Note: CC* (Cane Corso) and CH* (Chihuahua) are individual adult registrations.
  if (/^(CA|C|CU|CPR|CGTB|CKM|CTRI|SBCC)\d/.test(reg)) return true;
  if (name.startsWith('CACHORRO')) return true;
  if (regAlnum && nameAlnum && regAlnum === nameAlnum) return true;
  if ((d.variety || '').toLowerCase().includes('camada')) return true;

  // Mis-imported litter rows where the puppy's name was filled with its sire's or dam's name
  if (!isPlaceholderAncestor(d.sire) && nameAlnum && nameAlnum === normalizePedigreeAlnum(d.sire)) {
    return true;
  }
  if (!isPlaceholderAncestor(d.dam) && nameAlnum && nameAlnum === normalizePedigreeAlnum(d.dam)) {
    return true;
  }

  return false;
}

function breedsCompatible(a?: string, b?: string): boolean {
  const ca = normalizePedigreeText(a);
  const cb = normalizePedigreeText(b);
  if (!ca || !cb) return true;
  if (ca === cb || ca.includes(cb) || cb.includes(ca)) return true;
  const bullyGroup = ['AMERICAN BULLY', 'EXOTIC BULL', 'BULLY NANO', 'BULLY POKET', 'BULLY POCKET', 'MICRO BULLY', 'MICRO EXOTIC'];
  const aBully = bullyGroup.some((g) => ca.includes(g));
  const bBully = bullyGroup.some((g) => cb.includes(g));
  return aBully && bBully;
}

function ancestorCandidateScore(
  candidate: DogRecord,
  childDog?: DogRecord,
  expectedSide?: 'sire' | 'dam'
): number {
  let score = 0;
  if (!isCamadaPuppyRecord(candidate)) score += 25;

  const regUpper = normalizePedigreeText(candidate.regNumber);
  if (!regUpper.startsWith('INBR-EXCEL-')) score += 5;

  if (expectedSide) {
    const g = (candidate.gender || '').toUpperCase();
    const isFem = g.includes('H') || g.includes('F');
    const isMale = g.includes('M') && !g.includes('HEMBRA');
    if (expectedSide === 'sire') {
      if (isMale) score += 24;
      else if (isFem) score -= 18;
    } else if (expectedSide === 'dam') {
      if (isFem) score += 24;
      else if (isMale) score -= 18;
    }
  }

  if (!isPlaceholderAncestor(candidate.sire)) score += 10;
  if (!isPlaceholderAncestor(candidate.dam)) score += 10;
  if (candidate.microchip && !candidate.microchip.startsWith('INBR-CHIP-') && candidate.microchip !== 'XXX') {
    score += 4;
  }
  if (candidate.genogram?.sire?.name || candidate.genogram?.dam?.name) score += 5;
  if (childDog?.breed && candidate.breed && breedsCompatible(childDog.breed, candidate.breed)) {
    score += 10;
  }
  if (candidate.owner && candidate.owner !== 'Criadero Oficial INBR') score += 2;
  return score;
}

function extractParenContent(raw?: string | null): { base: string; paren: string } {
  if (!raw) return { base: '', paren: '' };
  const match = raw.match(/\(([^)]+)\)/);
  if (!match) return { base: raw.trim(), paren: '' };
  const base = raw.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  return { base, paren: match[1].trim() };
}

function looksLikeColorHint(val: string): boolean {
  const n = normalizePedigreeText(val);
  if (!n) return false;
  return /(BLUE|WHITE|BLACK|CHOCOLATE|LILAC|CHAMPAGNE|TRI|MERLE|FAWN|BRINDLE|RED|TAN|GOLD|SABLE|TICKED|PIED|CREAM|NEGRO|BLANCO|CAFÉ|CAFE|ROJO|GRIS|ATIGRADO|VACA|PINTO|TRICOLOR)/i.test(n);
}

export function createAncestorLookup(allDogs: DogRecord[]) {
  const regMap = new Map<string, DogRecord[]>();
  const chipMap = new Map<string, DogRecord[]>();
  const nameMap = new Map<string, DogRecord[]>();
  const alnumNameMap = new Map<string, DogRecord[]>();

  allDogs.forEach((d) => {
    if (!d) return;
    const regKey = normalizePedigreeAlnum(d.regNumber);
    if (regKey) {
      const existing = regMap.get(regKey) || [];
      existing.push(d);
      regMap.set(regKey, existing);
    }

    const chipDigits = (d.microchip || '').replace(/\D/g, '');
    if (chipDigits.length >= 8 && !(d.microchip || '').toUpperCase().startsWith('INBR-CHIP-')) {
      const existing = chipMap.get(chipDigits) || [];
      existing.push(d);
      chipMap.set(chipDigits, existing);
    }

    if (!isCamadaPuppyRecord(d)) {
      const nameKey = normalizePedigreeText(d.name);
      const nameAlnum = normalizePedigreeAlnum(d.name);
      if (nameKey && !isPlaceholderAncestor(nameKey) && !nameKey.startsWith('EJEMPLAR INBR')) {
        const existing = nameMap.get(nameKey) || [];
        existing.push(d);
        nameMap.set(nameKey, existing);
      }
      if (nameAlnum && !isPlaceholderAncestor(nameKey) && !nameKey.startsWith('EJEMPLAR INBR')) {
        const existing = alnumNameMap.get(nameAlnum) || [];
        existing.push(d);
        alnumNameMap.set(nameAlnum, existing);
      }
    }
  });

  const pickBest = (
    candidates: DogRecord[],
    childDog?: DogRecord,
    expectedSide?: 'sire' | 'dam'
  ): DogRecord | undefined => {
    if (candidates.length === 0) return undefined;
    const sorted = [...candidates].sort(
      (a, b) => ancestorCandidateScore(b, childDog, expectedSide) - ancestorCandidateScore(a, childDog, expectedSide)
    );
    return sorted[0];
  };

  const findAncestor = (
    regOrName: string | undefined,
    childDog?: DogRecord,
    visitedAlnum?: Set<string>,
    expectedSide?: 'sire' | 'dam'
  ): DogRecord | undefined => {
    if (!regOrName || isPlaceholderAncestor(regOrName)) return undefined;

    const cleanName = normalizePedigreeText(regOrName);
    const cleanAlnum = normalizePedigreeAlnum(regOrName);
    const strippedRegAlnum = normalizePedigreeAlnum(cleanName.replace(/^(INBR|REG)[-_\s:]*/i, ''));
    const { base: baseNoParen, paren } = extractParenContent(regOrName);

    const isAllowed = (cand: DogRecord): boolean => {
      const candRegAlnum = normalizePedigreeAlnum(cand.regNumber);
      if (!candRegAlnum) return false;
      if (visitedAlnum && visitedAlnum.has(candRegAlnum)) return false;
      if (childDog && candRegAlnum === normalizePedigreeAlnum(childDog.regNumber)) return false;
      return true;
    };

    const isAdultAllowed = (cand: DogRecord): boolean => isAllowed(cand) && !isCamadaPuppyRecord(cand);

    // 1. Exact registration folio match (supports *B10081*, B10081, INBR-B10081, REG-MAYA, or folio inside parentheses)
    const regCandidates: DogRecord[] = [];
    if (cleanAlnum && regMap.has(cleanAlnum)) {
      regCandidates.push(...(regMap.get(cleanAlnum) || []));
    }
    if (strippedRegAlnum && strippedRegAlnum !== cleanAlnum && regMap.has(strippedRegAlnum)) {
      regCandidates.push(...(regMap.get(strippedRegAlnum) || []));
    }
    if (paren) {
      const parenAlnum = normalizePedigreeAlnum(paren);
      if (parenAlnum.length >= 4 && regMap.has(parenAlnum)) {
        regCandidates.push(...(regMap.get(parenAlnum) || []));
      }
    }
    const validRegCandidates = regCandidates.filter(isAdultAllowed);
    if (validRegCandidates.length > 0) {
      return pickBest(validRegCandidates, childDog, expectedSide);
    }

    // 2. Microchip match (if parent field stores a numeric ISO microchip like 939000002517301)
    const queryDigits = regOrName.replace(/\D/g, '');
    if (queryDigits.length >= 8 && queryDigits.length === cleanAlnum.replace(/^(CHIP|ISO)/i, '').length) {
      const chipCandidates = (chipMap.get(queryDigits) || []).filter(isAdultAllowed);
      if (chipCandidates.length > 0) {
        return pickBest(chipCandidates, childDog, expectedSide);
      }
    }

    // 3. Exact normalized adult name match (diacritic-insensitive)
    const nameCandidates = (nameMap.get(cleanName) || []).filter(isAdultAllowed);
    if (nameCandidates.length > 0) {
      return pickBest(nameCandidates, childDog, expectedSide);
    }

    // 4. Compact alphanumeric name match (handles apostrophes, acute accents, commas, hyphens, extra spaces)
    if (cleanAlnum.length >= 3) {
      const alnumCandidates = (alnumNameMap.get(cleanAlnum) || []).filter(isAdultAllowed);
      if (alnumCandidates.length > 0) {
        return pickBest(alnumCandidates, childDog, expectedSide);
      }
    }

    // 5. Title-prefix stripped match (e.g. "CH SENSEI BULLS AMY LEE" -> "SENSEIBULLS AMY LEE")
    const titleStripped = cleanName.replace(/^(GR\.?\s*CH\.?|CH\.?)\s+/i, '').trim();
    if (titleStripped && titleStripped !== cleanName) {
      const titleAlnum = normalizePedigreeAlnum(titleStripped);
      const tCandidates = [
        ...(nameMap.get(titleStripped) || []),
        ...(titleAlnum ? alnumNameMap.get(titleAlnum) || [] : []),
      ].filter(isAdultAllowed);
      if (tCandidates.length > 0) {
        return pickBest(tCandidates, childDog, expectedSide);
      }
    }

    // 6. Parenthetical-stripped fallback (e.g. "BRUCE LEE (CHOCOLATE AND WHITE)" -> "BRUCE LEE")
    if (baseNoParen && baseNoParen !== regOrName) {
      const cleanBase = normalizePedigreeText(baseNoParen);
      const baseAlnum = normalizePedigreeAlnum(baseNoParen);
      const isSingleWord = !cleanBase.includes(' ');
      const pCandidates = [
        ...(nameMap.get(cleanBase) || []),
        ...(baseAlnum ? alnumNameMap.get(baseAlnum) || [] : []),
      ].filter((cand) => {
        if (!isAdultAllowed(cand)) return false;
        if (isSingleWord && childDog?.breed && !breedsCompatible(childDog.breed, cand.breed)) {
          return false;
        }
        return true;
      });
      if (pCandidates.length > 0) {
        return pickBest(pCandidates, childDog, expectedSide);
      }
    }

    return undefined;
  };

  return { findAncestor, hasReg: (reg?: string) => Boolean(reg && regMap.has(normalizePedigreeAlnum(reg))) };
}

function emptyPedigreeNode(): PedigreeNode {
  return {
    name: 'SIN REGISTRO',
    regNumber: '—',
    color: 'Por registrar',
  };
}

export function buildEightGenPedigree(dog: DogRecord, allDogs: DogRecord[]): EightGenPedigree {
  const { findAncestor, hasReg } = createAncestorLookup(allDogs);
  const rootVisited = new Set<string>();
  const rootReg = normalizePedigreeAlnum(dog.regNumber);
  if (rootReg) rootVisited.add(rootReg);

  const safeDisplayReg = (reg?: string | null): string => {
    if (!reg || isPlaceholderAncestor(reg)) return '';
    const trimmed = reg.trim();
    if (isSyntheticRegFallback(trimmed) && !hasReg(trimmed)) return '';
    return trimmed;
  };

  // Resolve Gen 1 (Sire & Dam)
  const sireVisited = new Set(rootVisited);
  const sireObj =
    findAncestor(safeDisplayReg(dog.sireReg) || undefined, dog, rootVisited, 'sire') ||
    findAncestor(dog.sire, dog, rootVisited, 'sire');
  if (sireObj?.regNumber) sireVisited.add(normalizePedigreeAlnum(sireObj.regNumber));

  const damVisited = new Set(rootVisited);
  const damObj =
    findAncestor(safeDisplayReg(dog.damReg) || undefined, dog, rootVisited, 'dam') ||
    findAncestor(dog.dam, dog, rootVisited, 'dam');
  if (damObj?.regNumber) damVisited.add(normalizePedigreeAlnum(damObj.regNumber));

  const explicitSireName = !isPlaceholderAncestor(dog.sire) ? dog.sire!.trim() : '';
  const explicitDamName = !isPlaceholderAncestor(dog.dam) ? dog.dam!.trim() : '';
  const explicitSireReg =
    safeDisplayReg(dog.sireReg) && normalizePedigreeAlnum(dog.sireReg) !== rootReg
      ? safeDisplayReg(dog.sireReg)
      : '';
  const explicitDamReg =
    safeDisplayReg(dog.damReg) && normalizePedigreeAlnum(dog.damReg) !== rootReg
      ? safeDisplayReg(dog.damReg)
      : '';

  const genogramSire = dog.genogram?.sire;
  const genogramDam = dog.genogram?.dam;

  const sire: PedigreeNode = {
    name: sireObj?.name || explicitSireName || genogramSire?.name || 'SIN REGISTRO',
    regNumber: sireObj?.regNumber || explicitSireReg || safeDisplayReg(genogramSire?.reg) || '—',
    color: sireObj?.color || 'Por registrar',
    breed: sireObj?.breed || dog.breed,
    titles: sireObj?.titles || genogramSire?.titles || [],
    dogRecord: sireObj,
  };

  const dam: PedigreeNode = {
    name: damObj?.name || explicitDamName || genogramDam?.name || 'SIN REGISTRO',
    regNumber: damObj?.regNumber || explicitDamReg || safeDisplayReg(genogramDam?.reg) || '—',
    color: damObj?.color || 'Por registrar',
    breed: damObj?.breed || dog.breed,
    titles: damObj?.titles || genogramDam?.titles || [],
    dogRecord: damObj,
  };

  // Helper to resolve a child's parent (Sire or Dam) strictly from DB + optional curated genogram node
  const resolveParent = (
    childObj: DogRecord | undefined,
    side: 'sire' | 'dam',
    branchVisited: Set<string>,
    curatedName?: string,
    curatedReg?: string
  ): { node: PedigreeNode; record?: DogRecord; nextVisited: Set<string> } => {
    const nextVisited = new Set(branchVisited);
    const refReg = side === 'sire' ? childObj?.sireReg : childObj?.damReg;
    const refName = side === 'sire' ? childObj?.sire : childObj?.dam;

    let found: DogRecord | undefined;
    if (childObj) {
      found =
        findAncestor(safeDisplayReg(refReg) || undefined, childObj, branchVisited, side) ||
        findAncestor(refName, childObj, branchVisited, side);
    }

    if (!found && (curatedName || curatedReg)) {
      found =
        findAncestor(safeDisplayReg(curatedReg) || undefined, childObj, branchVisited, side) ||
        findAncestor(curatedName, childObj, branchVisited, side);
    }

    if (found?.regNumber) {
      nextVisited.add(normalizePedigreeAlnum(found.regNumber));
    }

    const rawFallbackName = !isPlaceholderAncestor(refName)
      ? refName!.trim()
      : !isPlaceholderAncestor(curatedName)
      ? curatedName!.trim()
      : '';

    const { base: cleanedFallbackBase, paren: fallbackParen } = extractParenContent(rawFallbackName);
    const parenIsColor = Boolean(fallbackParen && looksLikeColorHint(fallbackParen));
    const parenIsFolio = Boolean(fallbackParen && /^[A-Z]{1,4}[-_\s]?\d{3,}/i.test(fallbackParen));

    const fallbackName = parenIsColor || parenIsFolio ? cleanedFallbackBase : rawFallbackName;
    const fallbackReg =
      safeDisplayReg(refReg) ||
      safeDisplayReg(curatedReg) ||
      (parenIsFolio ? fallbackParen.toUpperCase() : '') ||
      '—';

    if (!found && !fallbackName) {
      return { node: emptyPedigreeNode(), record: undefined, nextVisited };
    }

    return {
      record: found,
      nextVisited,
      node: {
        name: found?.name || fallbackName || 'SIN REGISTRO',
        regNumber: found?.regNumber || fallbackReg || '—',
        color: found?.color || (parenIsColor ? fallbackParen : 'Por registrar'),
        breed: found?.breed || childObj?.breed || dog.breed,
        titles: found?.titles || [],
        dogRecord: found,
      },
    };
  };

  // Resolve Gen 2: 4 Grandparents
  const ssRes = resolveParent(sireObj, 'sire', sireVisited, genogramSire?.sire?.name, genogramSire?.sire?.reg);
  const sdRes = resolveParent(sireObj, 'dam', sireVisited, genogramSire?.dam?.name, genogramSire?.dam?.reg);
  const dsRes = resolveParent(damObj, 'sire', damVisited, genogramDam?.sire?.name, genogramDam?.sire?.reg);
  const ddRes = resolveParent(damObj, 'dam', damVisited, genogramDam?.dam?.name, genogramDam?.dam?.reg);

  // Resolve Gen 3: 8 Great-Grandparents
  const g3Sources = [
    { parent: ssRes, side: 'sire' as const, curated: genogramSire?.sire?.sire },
    { parent: ssRes, side: 'dam' as const, curated: genogramSire?.sire?.dam },
    { parent: sdRes, side: 'sire' as const, curated: genogramSire?.dam?.sire },
    { parent: sdRes, side: 'dam' as const, curated: genogramSire?.dam?.dam },
    { parent: dsRes, side: 'sire' as const, curated: genogramDam?.sire?.sire },
    { parent: dsRes, side: 'dam' as const, curated: genogramDam?.sire?.dam },
    { parent: ddRes, side: 'sire' as const, curated: genogramDam?.dam?.sire },
    { parent: ddRes, side: 'dam' as const, curated: genogramDam?.dam?.dam },
  ];

  const g3Resolved = g3Sources.map((src) =>
    resolveParent(src.parent.record, src.side, src.parent.nextVisited, src.curated)
  );
  const g3: PedigreeNode[] = g3Resolved.map((r) => r.node);

  // Resolve Gen 4: 16 Great-Great-Grandparents
  const g4Resolved: Array<{ node: PedigreeNode; record?: DogRecord; nextVisited: Set<string> }> = [];
  for (let i = 0; i < g3Resolved.length; i++) {
    const parentG3 = g3Resolved[i];
    g4Resolved.push(resolveParent(parentG3.record, 'sire', parentG3.nextVisited));
    g4Resolved.push(resolveParent(parentG3.record, 'dam', parentG3.nextVisited));
  }
  const g4: PedigreeNode[] = g4Resolved.map((r) => r.node);

  // Resolve Gen 5: 32 Ancestors dynamically if linked in DB, otherwise empty
  const g5: PedigreeNode[] = [];
  for (let i = 0; i < g4Resolved.length; i++) {
    const parentG4 = g4Resolved[i];
    g5.push(resolveParent(parentG4.record, 'sire', parentG4.nextVisited).node);
    g5.push(resolveParent(parentG4.record, 'dam', parentG4.nextVisited).node);
  }

  const g6: PedigreeNode[] = Array.from({ length: 64 }, () => emptyPedigreeNode());
  const g7: PedigreeNode[] = Array.from({ length: 128 }, () => emptyPedigreeNode());
  const g8: PedigreeNode[] = Array.from({ length: 256 }, () => emptyPedigreeNode());

  return {
    target: dog,
    sire,
    dam,
    sireSire: ssRes.node,
    sireDam: sdRes.node,
    damSire: dsRes.node,
    damDam: ddRes.node,
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
