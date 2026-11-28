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
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function normalizePedigreeAlnum(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/\*/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
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
    n.startsWith('INBR-G3-') ||
    n.startsWith('INBR-G4-') ||
    n.startsWith('INBR-G5-') ||
    n.startsWith('INBR-G6-') ||
    n.startsWith('INBR-G7-') ||
    n.startsWith('INBR-G8-') ||
    n.startsWith('REG-')
  );
}

export function isCamadaPuppyRecord(d: DogRecord): boolean {
  const reg = normalizePedigreeText(d.regNumber);
  const name = normalizePedigreeText(d.name);
  if (/^CA\d/.test(reg)) return true;
  if (name.startsWith('CACHORRO')) return true;
  if ((d.variety || '').toLowerCase().includes('camada')) return true;
  return false;
}

function ancestorCandidateScore(candidate: DogRecord, childDog?: DogRecord): number {
  let score = 0;
  if (!isCamadaPuppyRecord(candidate)) score += 20;
  if (!isPlaceholderAncestor(candidate.sire)) score += 6;
  if (!isPlaceholderAncestor(candidate.dam)) score += 6;
  if (candidate.microchip && !candidate.microchip.startsWith('INBR-CHIP-') && candidate.microchip !== 'XXX') {
    score += 4;
  }
  if (candidate.genogram?.sire?.name || candidate.genogram?.dam?.name) score += 5;
  if (childDog?.breed && candidate.breed) {
    const cb = normalizePedigreeText(childDog.breed);
    const db = normalizePedigreeText(candidate.breed);
    if (cb === db || cb.includes(db) || db.includes(cb)) {
      score += 8;
    }
  }
  if (candidate.owner && candidate.owner !== 'Criadero Oficial INBR') score += 2;
  return score;
}

export function createAncestorLookup(allDogs: DogRecord[]) {
  const regMap = new Map<string, DogRecord[]>();
  const nameMap = new Map<string, DogRecord[]>();

  allDogs.forEach((d) => {
    if (!d) return;
    const regKey = normalizePedigreeAlnum(d.regNumber);
    if (regKey) {
      const existing = regMap.get(regKey) || [];
      existing.push(d);
      regMap.set(regKey, existing);
    }

    if (!isCamadaPuppyRecord(d)) {
      const nameKey = normalizePedigreeText(d.name);
      if (nameKey && !isPlaceholderAncestor(nameKey) && !nameKey.startsWith('EJEMPLAR INBR')) {
        const existing = nameMap.get(nameKey) || [];
        existing.push(d);
        nameMap.set(nameKey, existing);
      }
    }
  });

  const findAncestor = (
    regOrName: string | undefined,
    childDog?: DogRecord,
    visitedAlnum?: Set<string>
  ): DogRecord | undefined => {
    if (!regOrName || isPlaceholderAncestor(regOrName)) return undefined;

    const cleanName = normalizePedigreeText(regOrName);
    const cleanAlnum = normalizePedigreeAlnum(regOrName);
    const strippedRegAlnum = normalizePedigreeAlnum(cleanName.replace(/^(INBR|REG)[-_\s:]*/i, ''));

    const isAllowed = (cand: DogRecord): boolean => {
      const candRegAlnum = normalizePedigreeAlnum(cand.regNumber);
      if (!candRegAlnum) return false;
      if (visitedAlnum && visitedAlnum.has(candRegAlnum)) return false;
      if (childDog && candRegAlnum === normalizePedigreeAlnum(childDog.regNumber)) return false;
      if (isCamadaPuppyRecord(cand)) return false;
      return true;
    };

    // 1. Strict exact registration match (handles *B10081*, B10081, INBR-B10081)
    const regCandidates: DogRecord[] = [];
    if (cleanAlnum && regMap.has(cleanAlnum)) {
      regCandidates.push(...(regMap.get(cleanAlnum) || []));
    }
    if (strippedRegAlnum && strippedRegAlnum !== cleanAlnum && regMap.has(strippedRegAlnum)) {
      regCandidates.push(...(regMap.get(strippedRegAlnum) || []));
    }
    const validRegCandidates = regCandidates.filter(isAllowed);
    if (validRegCandidates.length > 0) {
      validRegCandidates.sort((a, b) => ancestorCandidateScore(b, childDog) - ancestorCandidateScore(a, childDog));
      return validRegCandidates[0];
    }

    // 2. Exact normalized adult name match (picks highest quality same-breed candidate)
    const nameCandidates = (nameMap.get(cleanName) || []).filter(isAllowed);
    if (nameCandidates.length > 0) {
      nameCandidates.sort((a, b) => ancestorCandidateScore(b, childDog) - ancestorCandidateScore(a, childDog));
      return nameCandidates[0];
    }

    return undefined;
  };

  return { findAncestor };
}

function emptyPedigreeNode(): PedigreeNode {
  return {
    name: 'SIN REGISTRO',
    regNumber: '—',
    color: 'Por registrar',
  };
}

export function buildEightGenPedigree(dog: DogRecord, allDogs: DogRecord[]): EightGenPedigree {
  const { findAncestor } = createAncestorLookup(allDogs);
  const rootVisited = new Set<string>();
  const rootReg = normalizePedigreeAlnum(dog.regNumber);
  if (rootReg) rootVisited.add(rootReg);

  // Resolve Gen 1 (Sire & Dam)
  const sireVisited = new Set(rootVisited);
  const sireObj =
    findAncestor(dog.sireReg, dog, rootVisited) ||
    findAncestor(dog.sire, dog, rootVisited);
  if (sireObj?.regNumber) sireVisited.add(normalizePedigreeAlnum(sireObj.regNumber));

  const damVisited = new Set(rootVisited);
  const damObj =
    findAncestor(dog.damReg, dog, rootVisited) ||
    findAncestor(dog.dam, dog, rootVisited);
  if (damObj?.regNumber) damVisited.add(normalizePedigreeAlnum(damObj.regNumber));

  const explicitSireName = !isPlaceholderAncestor(dog.sire) ? dog.sire!.trim() : '';
  const explicitDamName = !isPlaceholderAncestor(dog.dam) ? dog.dam!.trim() : '';
  const explicitSireReg =
    !isPlaceholderAncestor(dog.sireReg) && normalizePedigreeAlnum(dog.sireReg) !== rootReg
      ? dog.sireReg!.trim()
      : '';
  const explicitDamReg =
    !isPlaceholderAncestor(dog.damReg) && normalizePedigreeAlnum(dog.damReg) !== rootReg
      ? dog.damReg!.trim()
      : '';

  const genogramSire = dog.genogram?.sire;
  const genogramDam = dog.genogram?.dam;

  const sire: PedigreeNode = {
    name: sireObj?.name || explicitSireName || genogramSire?.name || 'SIN REGISTRO',
    regNumber: sireObj?.regNumber || explicitSireReg || genogramSire?.reg || '—',
    color: sireObj?.color || 'Por registrar',
    breed: sireObj?.breed || dog.breed,
    titles: sireObj?.titles || genogramSire?.titles || [],
    dogRecord: sireObj,
  };

  const dam: PedigreeNode = {
    name: damObj?.name || explicitDamName || genogramDam?.name || 'SIN REGISTRO',
    regNumber: damObj?.regNumber || explicitDamReg || genogramDam?.reg || '—',
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
        findAncestor(refReg, childObj, branchVisited) ||
        findAncestor(refName, childObj, branchVisited);
    } else if (curatedName || curatedReg) {
      found =
        findAncestor(curatedReg, undefined, branchVisited) ||
        findAncestor(curatedName, undefined, branchVisited);
    }

    if (found?.regNumber) {
      nextVisited.add(normalizePedigreeAlnum(found.regNumber));
    }

    const fallbackName = !isPlaceholderAncestor(refName)
      ? refName!.trim()
      : !isPlaceholderAncestor(curatedName)
      ? curatedName!.trim()
      : '';

    const fallbackReg = !isPlaceholderAncestor(refReg)
      ? refReg!.trim()
      : !isPlaceholderAncestor(curatedReg)
      ? curatedReg!.trim()
      : '';

    if (!found && !fallbackName) {
      return { node: emptyPedigreeNode(), record: undefined, nextVisited };
    }

    return {
      record: found,
      nextVisited,
      node: {
        name: found?.name || fallbackName || 'SIN REGISTRO',
        regNumber: found?.regNumber || fallbackReg || '—',
        color: found?.color || 'Por registrar',
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
