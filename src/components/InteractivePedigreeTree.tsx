import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { DogRecord } from '../data/registryData';
import { useRegistry } from '../context/RegistryContext';
import { buildEightGenPedigree, EightGenPedigree } from '../utils/pedigreeResolver';
import { 
  Dna, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeftRight, 
  Layers, 
  Download, 
  Info, 
  X,
  Compass,
  CornerDownRight
} from 'lucide-react';
import html2canvas from 'html2canvas';

export interface PedigreeTreeNode {
  id: string;
  name: string;
  regNumber: string;
  color?: string;
  breed?: string;
  titles?: string[];
  gender: 'Macho' | 'Hembra';
  roleLabel: string;
  generation: number; // 0 = proband, 1 = parents, 2 = grandparents, 3 = great-grandparents, 4 = great-great
  geneticPct: number; // 100, 50, 25, 12.5, 6.25
  lineage: 'ROOT' | 'PATERNAL' | 'MATERNAL';
  imageUrl?: string;
  microchip?: string;
  owner?: string;
  dogRecord?: DogRecord;
  sire?: PedigreeTreeNode;
  dam?: PedigreeTreeNode;
}

interface InteractivePedigreeTreeProps {
  dog: DogRecord;
  onSelectDog?: (dog: DogRecord) => void;
  onOpenCertificate?: (dog: DogRecord) => void;
  className?: string;
  showExportButton?: boolean;
}

export const InteractivePedigreeTree: React.FC<InteractivePedigreeTreeProps> = ({
  dog,
  onSelectDog,
  onOpenCertificate,
  className = '',
  showExportButton = true,
}) => {
  const { dogs: allDogs, findDogByQuery } = useRegistry();

  // Navigation & Canvas State - Set initial zoom to 0.72 so all 4 generations fit immediately
  const [zoom, setZoom] = useState<number>(0.72);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 15, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [maxGenerations, setMaxGenerations] = useState<number>(4); // 2, 3, 4
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<PedigreeTreeNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const treeCanvasRef = useRef<HTMLDivElement | null>(null);

  // Build Hierarchical 4-Generation Tree
  const rootNode = useMemo<PedigreeTreeNode>(() => {
    const rawPedigree: EightGenPedigree = buildEightGenPedigree(dog, allDogs);

    const lookupDog = (regOrName?: string): DogRecord | undefined => {
      if (!regOrName) return undefined;
      return findDogByQuery(regOrName);
    };

    // Gen 4 nodes builder helper
    const buildG4Node = (
      id: string,
      idx: number,
      gender: 'Macho' | 'Hembra',
      lineage: 'PATERNAL' | 'MATERNAL'
    ): PedigreeTreeNode => {
      const g4Item = rawPedigree.g4[idx] || { name: 'ANCESTRO DESCONOCIDO', regNumber: `INBR-G4-${idx + 1}` };
      const matched = lookupDog(g4Item.regNumber) || lookupDog(g4Item.name);
      return {
        id,
        name: matched?.name || g4Item.name,
        regNumber: matched?.regNumber || g4Item.regNumber,
        color: matched?.color || g4Item.color || 'COLOR NO REGISTRADO',
        breed: matched?.breed || dog.breed,
        titles: matched?.titles || [],
        gender,
        roleLabel: gender === 'Macho' ? 'Tatarabuelo' : 'Tatarabuela',
        generation: 4,
        geneticPct: 6.25,
        lineage,
        imageUrl: matched?.imageUrl,
        microchip: matched?.microchip,
        owner: matched?.owner,
        dogRecord: matched,
      };
    };

    // Gen 3 nodes builder helper
    const buildG3Node = (
      id: string,
      idx: number,
      gender: 'Macho' | 'Hembra',
      lineage: 'PATERNAL' | 'MATERNAL',
      g4StartIdx: number
    ): PedigreeTreeNode => {
      const g3Item = rawPedigree.g3[idx] || { name: 'ANCESTRO DESCONOCIDO', regNumber: `INBR-G3-${idx + 1}` };
      const matched = lookupDog(g3Item.regNumber) || lookupDog(g3Item.name);
      return {
        id,
        name: matched?.name || g3Item.name,
        regNumber: matched?.regNumber || g3Item.regNumber,
        color: matched?.color || g3Item.color || 'COLOR NO REGISTRADO',
        breed: matched?.breed || dog.breed,
        titles: matched?.titles || [],
        gender,
        roleLabel: gender === 'Macho' ? 'Bisabuelo' : 'Bisabuela',
        generation: 3,
        geneticPct: 12.5,
        lineage,
        imageUrl: matched?.imageUrl,
        microchip: matched?.microchip,
        owner: matched?.owner,
        dogRecord: matched,
        sire: buildG4Node(`${id}-s`, g4StartIdx, 'Macho', lineage),
        dam: buildG4Node(`${id}-d`, g4StartIdx + 1, 'Hembra', lineage),
      };
    };

    // Gen 2 Grandparents
    // 1. Sire's Sire
    const ssMatched = lookupDog(rawPedigree.sireSire.regNumber) || lookupDog(rawPedigree.sireSire.name);
    const nodeSireSire: PedigreeTreeNode = {
      id: 'ss',
      name: ssMatched?.name || rawPedigree.sireSire.name,
      regNumber: ssMatched?.regNumber || rawPedigree.sireSire.regNumber,
      color: ssMatched?.color || rawPedigree.sireSire.color || 'WHITE',
      breed: ssMatched?.breed || dog.breed,
      titles: ssMatched?.titles || [],
      gender: 'Macho',
      roleLabel: 'Abuelo Paterno',
      generation: 2,
      geneticPct: 25,
      lineage: 'PATERNAL',
      imageUrl: ssMatched?.imageUrl,
      microchip: ssMatched?.microchip,
      owner: ssMatched?.owner,
      dogRecord: ssMatched,
      sire: buildG3Node('sss', 0, 'Macho', 'PATERNAL', 0),
      dam: buildG3Node('ssd', 1, 'Hembra', 'PATERNAL', 2),
    };

    // 2. Sire's Dam
    const sdMatched = lookupDog(rawPedigree.sireDam.regNumber) || lookupDog(rawPedigree.sireDam.name);
    const nodeSireDam: PedigreeTreeNode = {
      id: 'sd',
      name: sdMatched?.name || rawPedigree.sireDam.name,
      regNumber: sdMatched?.regNumber || rawPedigree.sireDam.regNumber,
      color: sdMatched?.color || rawPedigree.sireDam.color || 'BLUE AND WHITE',
      breed: sdMatched?.breed || dog.breed,
      titles: sdMatched?.titles || [],
      gender: 'Hembra',
      roleLabel: 'Abuela Paterna',
      generation: 2,
      geneticPct: 25,
      lineage: 'PATERNAL',
      imageUrl: sdMatched?.imageUrl,
      microchip: sdMatched?.microchip,
      owner: sdMatched?.owner,
      dogRecord: sdMatched,
      sire: buildG3Node('sds', 2, 'Macho', 'PATERNAL', 4),
      dam: buildG3Node('sdd', 3, 'Hembra', 'PATERNAL', 6),
    };

    // 3. Dam's Sire
    const dsMatched = lookupDog(rawPedigree.damSire.regNumber) || lookupDog(rawPedigree.damSire.name);
    const nodeDamSire: PedigreeTreeNode = {
      id: 'ds',
      name: dsMatched?.name || rawPedigree.damSire.name,
      regNumber: dsMatched?.regNumber || rawPedigree.damSire.regNumber,
      color: dsMatched?.color || rawPedigree.damSire.color || 'WHITE AND BLUE TICKED',
      breed: dsMatched?.breed || dog.breed,
      titles: dsMatched?.titles || [],
      gender: 'Macho',
      roleLabel: 'Abuelo Materno',
      generation: 2,
      geneticPct: 25,
      lineage: 'MATERNAL',
      imageUrl: dsMatched?.imageUrl,
      microchip: dsMatched?.microchip,
      owner: dsMatched?.owner,
      dogRecord: dsMatched,
      sire: buildG3Node('dss', 4, 'Macho', 'MATERNAL', 8),
      dam: buildG3Node('dsd', 5, 'Hembra', 'MATERNAL', 10),
    };

    // 4. Dam's Dam
    const ddMatched = lookupDog(rawPedigree.damDam.regNumber) || lookupDog(rawPedigree.damDam.name);
    const nodeDamDam: PedigreeTreeNode = {
      id: 'dd',
      name: ddMatched?.name || rawPedigree.damDam.name,
      regNumber: ddMatched?.regNumber || rawPedigree.damDam.regNumber,
      color: ddMatched?.color || rawPedigree.damDam.color || 'WHITE',
      breed: ddMatched?.breed || dog.breed,
      titles: ddMatched?.titles || [],
      gender: 'Hembra',
      roleLabel: 'Abuela Materna',
      generation: 2,
      geneticPct: 25,
      lineage: 'MATERNAL',
      imageUrl: ddMatched?.imageUrl,
      microchip: ddMatched?.microchip,
      owner: ddMatched?.owner,
      dogRecord: ddMatched,
      sire: buildG3Node('dds', 6, 'Macho', 'MATERNAL', 12),
      dam: buildG3Node('ddd', 7, 'Hembra', 'MATERNAL', 14),
    };

    // Gen 1 Parents
    const sireMatched = lookupDog(dog.sireReg) || lookupDog(dog.sire);
    const nodeSire: PedigreeTreeNode = {
      id: 's',
      name: sireMatched?.name || rawPedigree.sire.name,
      regNumber: sireMatched?.regNumber || rawPedigree.sire.regNumber,
      color: sireMatched?.color || rawPedigree.sire.color || 'LILAC AND WHITE',
      breed: sireMatched?.breed || dog.breed,
      titles: sireMatched?.titles || ['CH'],
      gender: 'Macho',
      roleLabel: 'Padre (Sire)',
      generation: 1,
      geneticPct: 50,
      lineage: 'PATERNAL',
      imageUrl: sireMatched?.imageUrl,
      microchip: sireMatched?.microchip,
      owner: sireMatched?.owner,
      dogRecord: sireMatched,
      sire: nodeSireSire,
      dam: nodeSireDam,
    };

    const damMatched = lookupDog(dog.damReg) || lookupDog(dog.dam);
    const nodeDam: PedigreeTreeNode = {
      id: 'd',
      name: damMatched?.name || rawPedigree.dam.name,
      regNumber: damMatched?.regNumber || rawPedigree.dam.regNumber,
      color: damMatched?.color || rawPedigree.damDam.color || 'WHITE AND BLUE TICKED',
      breed: damMatched?.breed || dog.breed,
      titles: damMatched?.titles || [],
      gender: 'Hembra',
      roleLabel: 'Madre (Dam)',
      generation: 1,
      geneticPct: 50,
      lineage: 'MATERNAL',
      imageUrl: damMatched?.imageUrl,
      microchip: damMatched?.microchip,
      owner: damMatched?.owner,
      dogRecord: damMatched,
      sire: nodeDamSire,
      dam: nodeDamDam,
    };

    // Gen 0 Root Proband
    return {
      id: 'root',
      name: dog.name,
      regNumber: dog.regNumber,
      color: dog.color,
      breed: dog.breed,
      titles: dog.titles,
      gender: (dog.gender?.toLowerCase().includes('h') ? 'Hembra' : 'Macho') as any,
      roleLabel: 'Ejemplar Registrado (Proband)',
      generation: 0,
      geneticPct: 100,
      lineage: 'ROOT',
      imageUrl: dog.imageUrl,
      microchip: dog.microchip,
      owner: dog.owner,
      dogRecord: dog,
      sire: nodeSire,
      dam: nodeDam,
    };
  }, [dog, allDogs, findDogByQuery]);

  // Compute Active Highlight Ancestor Path IDs
  const activePathIds = useMemo<Set<string>>(() => {
    const targetId = hoveredNodeId || selectedNode?.id;
    if (!targetId) return new Set();

    const ids = new Set<string>();
    ids.add('root');

    // Simple prefix check since IDs follow hierarchy ('s', 'ss', 'sss', 'ssss', etc.)
    if (targetId.startsWith('s')) {
      ids.add('s');
      if (targetId.length >= 2) ids.add(targetId.slice(0, 2));
      if (targetId.length >= 3) ids.add(targetId.slice(0, 3));
      if (targetId.length >= 4) ids.add(targetId.slice(0, 4));
    } else if (targetId.startsWith('d')) {
      ids.add('d');
      if (targetId.length >= 2) ids.add(targetId.slice(0, 2));
      if (targetId.length >= 3) ids.add(targetId.slice(0, 3));
      if (targetId.length >= 4) ids.add(targetId.slice(0, 4));
    }

    ids.add(targetId);
    return ids;
  }, [hoveredNodeId, selectedNode]);

  // Search matches
  const searchMatches = useMemo<Set<string>>(() => {
    if (!searchQuery.trim()) return new Set();
    const q = searchQuery.toLowerCase().trim();
    const matched = new Set<string>();

    const checkNode = (node?: PedigreeTreeNode) => {
      if (!node) return;
      if (
        node.name.toLowerCase().includes(q) ||
        node.regNumber.toLowerCase().includes(q) ||
        node.color?.toLowerCase().includes(q) ||
        node.titles?.some((t) => t.toLowerCase().includes(q))
      ) {
        matched.add(node.id);
      }
      checkNode(node.sire);
      checkNode(node.dam);
    };

    checkNode(rootNode);
    return matched;
  }, [searchQuery, rootNode]);

  // Auto-detect mobile screen on mount to fit full 4 generations comfortably
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setZoom(0.50);
        setPan({ x: 5, y: 0 });
      }
    }
  }, []);

  // Handle Drag / Pan Events (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking background canvas
    if ((e.target as HTMLElement).closest('.interactive-tree-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Support: Drag, Pan & Pinch-to-Zoom for Mobile Devices
  const [touchPinchDist, setTouchPinchDist] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-tree-card')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && touchPinchDist !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - touchPinchDist;
      if (Math.abs(diff) > 3) {
        setZoom((z) => Math.min(1.8, Math.max(0.35, z + (diff > 0 ? 0.025 : -0.025))));
        setTouchPinchDist(dist);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchPinchDist(null);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(1.8, z + 0.12));
  const handleZoomOut = () => setZoom((z) => Math.max(0.35, z - 0.12));
  const handleResetView = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setZoom(0.50);
      setPan({ x: 5, y: 0 });
    } else {
      setZoom(0.75);
      setPan({ x: 20, y: 0 });
    }
  };

  // Toggle Collapse on Branch
  const toggleCollapse = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fullscreen listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Copy helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Export Tree as Image
  const handleExportTreeImage = async () => {
    if (!treeCanvasRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const originalZoom = zoom;
      const originalPan = pan;
      // Temporarily set clean transform for capture
      setZoom(1);
      setPan({ x: 0, y: 0 });

      await new Promise((r) => setTimeout(r, 150));

      const canvas = await html2canvas(treeCanvasRef.current, {
        backgroundColor: '#070707',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Restore zoom
      setZoom(originalZoom);
      setPan(originalPan);

      const link = document.createElement('a');
      link.download = `INBR_Arbol_Genealogico_${dog.regNumber || 'Canino'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exportando árbol genealógico:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render a Single Ancestor Card
  const renderNodeCard = (node: PedigreeTreeNode, hasParents: boolean) => {
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNodeId === node.id;
    const isHighlighted = activePathIds.has(node.id);
    const isMatched = searchMatches.has(node.id);
    const isCollapsed = collapsedIds.has(node.id);
    const isRoot = node.generation === 0;

    const isSire = node.gender === 'Macho';
    const borderAccent = isRoot
      ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]'
      : isSire
      ? isHighlighted
        ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
        : 'border-blue-500/30 hover:border-blue-400'
      : isHighlighted
      ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
      : 'border-rose-500/30 hover:border-rose-400';

    const bgGradient = isRoot
      ? 'bg-gradient-to-r from-[#1E170A] via-[#141007] to-[#1E170A]'
      : isSire
      ? 'bg-gradient-to-r from-[#0D1524] to-[#0A0D14]'
      : 'bg-gradient-to-r from-[#210D15] to-[#120A0E]';

    return (
      <div
        className={`interactive-tree-card relative rounded-2xl p-3 border-2 transition-all cursor-pointer ${bgGradient} ${borderAccent} ${
          isMatched ? 'ring-2 ring-[#FFE885] scale-105' : ''
        } ${isSelected ? 'ring-2 ring-white scale-102' : ''}`}
        onClick={() => setSelectedNode(node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        style={{
          width: node.generation === 4 ? 175 : node.generation === 3 ? 210 : 250,
          minHeight: node.generation === 4 ? 76 : 96,
        }}
      >
        {/* Role & Generation Kicker */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
            <span className={`font-bold ${isSire ? 'text-blue-400' : isRoot ? 'text-[#FFE885]' : 'text-rose-400'}`}>
              {node.roleLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-neutral-400">Gen {node.generation}</span>
          </div>

          <span className="text-[9px] font-mono font-bold text-[#FFE885] bg-black/60 px-1.5 py-0.2 rounded border border-[#D4AF37]/30">
            {node.geneticPct}% ADN
          </span>
        </div>

        {/* Canine Name & Photo / Avatar */}
        <div className="flex items-start gap-2.5">
          {node.imageUrl ? (
            <img
              src={node.imageUrl}
              alt={node.name}
              className="w-10 h-10 rounded-lg object-cover border border-[#D4AF37]/50 shrink-0 shadow"
            />
          ) : (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isSire ? 'bg-blue-950/60 border-blue-500/40 text-blue-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <Dna className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1">
              <strong className="text-white text-xs font-bold font-serif-luxury truncate block leading-tight">
                {node.name}
              </strong>
              {node.titles && node.titles.length > 0 && (
                <span className="text-[8px] font-black text-black bg-gold-gradient px-1 rounded shrink-0">
                  {node.titles[0]}
                </span>
              )}
            </div>

            <span className="text-[10px] font-mono text-[#FFE885] truncate block mt-0.5">
              {node.regNumber}
            </span>

            {node.color && (
              <span className="text-[9px] text-[#FFE885] font-semibold truncate block mt-0.5">
                Color: {node.color}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Branch Affordance Button */}
        {hasParents && node.generation < maxGenerations && (
          <button
            type="button"
            onClick={(e) => toggleCollapse(node.id, e)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#18140B] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black text-[#FFE885] flex items-center justify-center text-[10px] shadow-lg transition-transform hover:scale-110 z-10"
            title={isCollapsed ? 'Expandir ancestros de esta línea' : 'Colapsar ancestros'}
          >
            {isCollapsed ? '+' : '−'}
          </button>
        )}

        {/* Collapsed Pill Indicator */}
        {isCollapsed && hasParents && (
          <div className="mt-2 pt-1 border-t border-neutral-800 flex items-center justify-between text-[9px] text-[#FFE885]">
            <span>Línea anterior oculta</span>
            <span className="font-mono">({node.generation === 1 ? '14' : node.generation === 2 ? '6' : '2'} ancestros)</span>
          </div>
        )}
      </div>
    );
  };

  // Render Horizontal Branch Column for Tree
  const renderTreeBranches = () => {
    if (!rootNode) return null;

    // Helper to evaluate if node branch is collapsed or beyond current generation limit
    const shouldShow = (node?: PedigreeTreeNode) => {
      if (!node) return false;
      if (node.generation > maxGenerations) return false;
      return true;
    };

    return (
      <div className="flex items-center gap-12 sm:gap-16 py-8 px-4 min-w-max select-none">
        {/* Col 0: Proband (Root) */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="text-[10px] font-mono text-[#FFE885] font-bold uppercase mb-2">
            PROBAND (EJEMPLAR RAÍZ)
          </div>
          {renderNodeCard(rootNode, true)}
        </div>

        {/* Col 1: Parents (Sire & Dam) */}
        {maxGenerations >= 1 && (
          <div className="flex flex-col justify-around gap-16 shrink-0 relative">
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-mono text-blue-400 font-bold uppercase mb-2">
                1. PADRE (SIRE)
              </div>
              {rootNode.sire && renderNodeCard(rootNode.sire, true)}
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[10px] font-mono text-rose-400 font-bold uppercase mb-2">
                1. MADRE (DAM)
              </div>
              {rootNode.dam && renderNodeCard(rootNode.dam, true)}
            </div>
          </div>
        )}

        {/* Col 2: Grandparents (4) */}
        {maxGenerations >= 2 && !collapsedIds.has('s') && !collapsedIds.has('d') && (
          <div className="flex flex-col justify-around gap-8 shrink-0">
            {/* Paternal Grandparents */}
            <div className="flex flex-col gap-6 p-2 rounded-2xl border border-blue-900/30 bg-blue-950/10">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                LÍNEA PATERNA (ABUELOS)
              </span>
              {rootNode.sire?.sire && renderNodeCard(rootNode.sire.sire, true)}
              {rootNode.sire?.dam && renderNodeCard(rootNode.sire.dam, true)}
            </div>

            {/* Maternal Grandparents */}
            <div className="flex flex-col gap-6 p-2 rounded-2xl border border-rose-900/30 bg-rose-950/10">
              <span className="text-[9px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                LÍNEA MATERNA (ABUELOS)
              </span>
              {rootNode.dam?.sire && renderNodeCard(rootNode.dam.sire, true)}
              {rootNode.dam?.dam && renderNodeCard(rootNode.dam.dam, true)}
            </div>
          </div>
        )}

        {/* Col 3: Great-Grandparents (8 Bisabuelos) */}
        {maxGenerations >= 3 && (
          <div className="flex flex-col justify-around gap-4 shrink-0">
            {/* Paternal Bisabuelos */}
            <div className="flex flex-col gap-3 p-2 rounded-xl border border-blue-900/20 bg-blue-950/5">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                GEN 3: BISABUELOS PATERNOS
              </span>
              {rootNode.sire?.sire?.sire && renderNodeCard(rootNode.sire.sire.sire, true)}
              {rootNode.sire?.sire?.dam && renderNodeCard(rootNode.sire.sire.dam, true)}
              {rootNode.sire?.dam?.sire && renderNodeCard(rootNode.sire.dam.sire, true)}
              {rootNode.sire?.dam?.dam && renderNodeCard(rootNode.sire.dam.dam, true)}
            </div>

            {/* Maternal Bisabuelos */}
            <div className="flex flex-col gap-3 p-2 rounded-xl border border-rose-900/20 bg-rose-950/5">
              <span className="text-[9px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                GEN 3: BISABUELOS MATERNOS
              </span>
              {rootNode.dam?.sire?.sire && renderNodeCard(rootNode.dam.sire.sire, true)}
              {rootNode.dam?.sire?.dam && renderNodeCard(rootNode.dam.sire.dam, true)}
              {rootNode.dam?.dam?.sire && renderNodeCard(rootNode.dam.dam.sire, true)}
              {rootNode.dam?.dam?.dam && renderNodeCard(rootNode.dam.dam.dam, true)}
            </div>
          </div>
        )}

        {/* Col 4: Great-Great-Grandparents (16 Tatarabuelos Completos) */}
        {maxGenerations >= 4 && (
          <div className="flex flex-col justify-around gap-6 shrink-0">
            {/* 8 Tatarabuelos Paternos */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl border border-blue-900/40 bg-blue-950/20 shadow-lg">
              <span className="text-[9.5px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                GEN 4: 8 TATARABUELOS PATERNOS (LÍNEA SIRE)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {rootNode.sire?.sire?.sire?.sire && renderNodeCard(rootNode.sire.sire.sire.sire, false)}
                {rootNode.sire?.sire?.sire?.dam && renderNodeCard(rootNode.sire.sire.sire.dam, false)}
                {rootNode.sire?.sire?.dam?.sire && renderNodeCard(rootNode.sire.sire.dam.sire, false)}
                {rootNode.sire?.sire?.dam?.dam && renderNodeCard(rootNode.sire.sire.dam.dam, false)}
                {rootNode.sire?.dam?.sire?.sire && renderNodeCard(rootNode.sire.dam.sire.sire, false)}
                {rootNode.sire?.dam?.sire?.dam && renderNodeCard(rootNode.sire.dam.sire.dam, false)}
                {rootNode.sire?.dam?.dam?.sire && renderNodeCard(rootNode.sire.dam.dam.sire, false)}
                {rootNode.sire?.dam?.dam?.dam && renderNodeCard(rootNode.sire.dam.dam.dam, false)}
              </div>
            </div>

            {/* 8 Tatarabuelos Maternos */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl border border-rose-900/40 bg-rose-950/20 shadow-lg">
              <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                GEN 4: 8 TATARABUELOS MATERNOS (LÍNEA DAM)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {rootNode.dam?.sire?.sire?.sire && renderNodeCard(rootNode.dam.sire.sire.sire, false)}
                {rootNode.dam?.sire?.sire?.dam && renderNodeCard(rootNode.dam.sire.sire.dam, false)}
                {rootNode.dam?.sire?.dam?.sire && renderNodeCard(rootNode.dam.sire.dam.sire, false)}
                {rootNode.dam?.sire?.dam?.dam && renderNodeCard(rootNode.dam.sire.dam.dam, false)}
                {rootNode.dam?.dam?.sire?.sire && renderNodeCard(rootNode.dam.dam.sire.sire, false)}
                {rootNode.dam?.dam?.sire?.dam && renderNodeCard(rootNode.dam.dam.sire.dam, false)}
                {rootNode.dam?.dam?.dam?.sire && renderNodeCard(rootNode.dam.dam.dam.sire, false)}
                {rootNode.dam?.dam?.dam?.dam && renderNodeCard(rootNode.dam.dam.dam.dam, false)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-3xl bg-[#070707] border-2 border-[#D4AF37]/50 shadow-2xl flex flex-col overflow-hidden text-neutral-100 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : className
      }`}
    >
      {/* 1. Header Toolbar: Compact & Responsive for Mobile, Tablet and Desktop */}
      <div className="p-2.5 sm:p-4 bg-gradient-to-r from-[#141008] via-[#1C150A] to-[#141008] border-b border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
        
        {/* Title & Proband Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow shrink-0">
            <Dna className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h4 className="text-xs sm:text-base font-bold font-serif-luxury text-gold-gradient truncate">
                Árbol Genealógico
              </h4>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-[#FFE885] px-1.5 py-0.5 rounded bg-black/60 border border-[#D4AF37]/40 shrink-0">
                4 GEN
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 truncate">
              <span className="text-white font-medium truncate">{dog.name}</span>
              <span aria-hidden="true" className="text-[#D4AF37]">·</span>
              <span className="font-mono text-[#FFE885]">{dog.regNumber}</span>
            </div>
          </div>
        </div>

        {/* Quick Generation Depth Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-black/70 p-0.5 sm:p-1 rounded-xl border border-neutral-800 shrink-0">
          {[2, 3, 4].map((gen) => (
            <button
              key={gen}
              type="button"
              onClick={() => {
                setMaxGenerations(gen);
                setCollapsedIds(new Set());
              }}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                maxGenerations === gen
                  ? 'bg-gold-gradient text-black shadow font-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {gen}G
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMaxGenerations(4);
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setZoom(0.50);
                setPan({ x: 5, y: 0 });
              } else {
                setZoom(0.72);
                setPan({ x: 20, y: 0 });
              }
              setCollapsedIds(new Set());
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-[#1A140B] text-[#FFE885] border border-[#D4AF37]/50 hover:bg-[#D4AF37] hover:text-black transition-all"
            title="Ajustar y ver las 4 generaciones completas"
          >
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <span className="text-[10px]">Ajustar</span>
          </button>
        </div>

        {/* Search within Tree */}
        <div className="relative w-full sm:w-48 lg:w-56 order-last sm:order-none mt-1 sm:mt-0">
          <Search className="w-3.5 h-3.5 text-[#D4AF37] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ancestro..."
            className="w-full pl-8 pr-7 py-1 rounded-xl bg-black border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:border-[#D4AF37] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Controls: Zoom, Reset, Export, Fullscreen */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
            title="Acercar (+)"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
            title="Alejar (-)"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
            title="Centrar y restablecer vista"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {showExportButton && (
            <button
              type="button"
              onClick={handleExportTreeImage}
              disabled={isExporting}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold bg-[#1C160B] border border-[#D4AF37]/60 text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all shadow"
              title="Descargar árbol en formato PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isExporting ? 'Exportando...' : 'PNG'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Interactive Pan & Zoom Canvas (Full Touch Support & Responsive Height) */}
      <div
        className={`relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-[#050505] min-h-[460px] sm:min-h-[540px] ${
          isFullscreen ? 'h-[calc(100vh-60px)]' : ''
        }`}
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Subtle Luxury Grid Lines Pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Instruction Badge */}
        <div className="absolute top-2 left-3 sm:top-3 sm:left-4 z-10 pointer-events-none flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 bg-black/70 px-2.5 py-1 rounded-full border border-neutral-800 backdrop-blur-sm">
          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37]" />
          <span>Arrastra o pellizca para explorar • Toca un ancestro</span>
        </div>

        {/* Mobile floating quick zoom pill */}
        <div className="sm:hidden absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-black/85 border border-[#D4AF37]/50 rounded-2xl p-1 shadow-2xl backdrop-blur-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-neutral-900 text-[#FFE885] flex items-center justify-center font-bold active:scale-95"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-neutral-900 text-[#FFE885] flex items-center justify-center font-bold active:scale-95"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="w-8 h-8 rounded-xl bg-[#1C170E] text-[#D4AF37] border border-[#D4AF37]/50 flex items-center justify-center font-bold active:scale-95"
            title="Reajustar vista"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tree Inner Canvas */}
        <div
          ref={treeCanvasRef}
          className="w-full h-full flex items-center transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {renderTreeBranches()}
        </div>
      </div>

      {/* 3. Node Inspector Modal / Drawer (When an Ancestor is Clicked) */}
      {selectedNode && (
        <aside 
          aria-label="Detalles de ancestro seleccionado"
          className="absolute right-4 bottom-4 top-16 w-80 sm:w-96 rounded-2xl bg-[#0D0D0D]/95 border-2 border-[#D4AF37] p-4 text-left shadow-2xl backdrop-blur-md z-30 flex flex-col justify-between overflow-y-auto animate-fadeIn"
        >
          <div>
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-800">
              <div>
                <span className={`text-[10px] uppercase font-bold font-mono block ${
                  selectedNode.gender === 'Macho' ? 'text-blue-400' : 'text-rose-400'
                }`}>
                  {selectedNode.roleLabel} • Generación {selectedNode.generation}
                </span>
                <h5 className="text-base font-bold text-white font-serif-luxury leading-tight mt-0.5">
                  {selectedNode.name}
                </h5>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                title="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Canine Visual & Details */}
            <div className="py-4 space-y-3">
              {selectedNode.imageUrl && (
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-[#D4AF37]/50 shadow relative">
                  <img
                    src={selectedNode.imageUrl}
                    alt={selectedNode.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-[#FFE885] font-mono border border-[#D4AF37]/40">
                    FOTO EN BASE DE DATOS
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400">N° de Registro:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#FFE885] font-bold">{selectedNode.regNumber}</span>
                    <button
                      onClick={() => handleCopyText(selectedNode.regNumber)}
                      className="p-1 hover:text-white text-neutral-400"
                      title="Copiar registro"
                    >
                      {copiedText === selectedNode.regNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400">Aporte Genético Teórico:</span>
                  <span className="font-mono text-emerald-400 font-bold">{selectedNode.geneticPct}%</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400">Color / Capa:</span>
                  <span className="text-white font-medium">{selectedNode.color || 'No especificado'}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-400">Línea de Parentesco:</span>
                  <span className={`font-bold ${selectedNode.lineage === 'PATERNAL' ? 'text-blue-400' : selectedNode.lineage === 'MATERNAL' ? 'text-rose-400' : 'text-[#FFE885]'}`}>
                    {selectedNode.lineage === 'PATERNAL' ? 'Línea Paterna' : selectedNode.lineage === 'MATERNAL' ? 'Línea Materna' : 'Proband Central'}
                  </span>
                </div>

                {selectedNode.microchip && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-neutral-400">Microchip ISO:</span>
                    <span className="font-mono text-emerald-400">{selectedNode.microchip}</span>
                  </div>
                )}

                {selectedNode.owner && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-neutral-400">Propietario / Criador:</span>
                    <span className="text-neutral-200">{selectedNode.owner}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions on Inspected Canine */}
          <div className="pt-3 border-t border-neutral-800 space-y-2">
            {/* Re-center Root on this ancestor (if available in database) */}
            {selectedNode.dogRecord && selectedNode.id !== 'root' && onSelectDog && (
              <button
                type="button"
                onClick={() => {
                  if (selectedNode.dogRecord) {
                    onSelectDog(selectedNode.dogRecord);
                    setSelectedNode(null);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-black" />
                <span>Navegar Hacia Atrás (Hacer Raíz del Árbol)</span>
              </button>
            )}

            {/* View Notarized Certificate */}
            {selectedNode.dogRecord && onOpenCertificate && (
              <button
                type="button"
                onClick={() => {
                  if (selectedNode.dogRecord) {
                    onOpenCertificate(selectedNode.dogRecord);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1C160B] border border-[#D4AF37]/50 text-[#FFE885] hover:text-white text-xs font-bold transition-all shadow"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Ver Certificado de Pedigrí Oficial</span>
              </button>
            )}
          </div>
        </aside>
      )}

      {/* 4. Canvas Footer Navigation Bar */}
      <div className="p-2 sm:px-4 bg-[#0A0A0A] border-t border-neutral-800 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
            <span className="text-[11px] font-mono text-neutral-300">Línea Paterna (Sire)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span className="text-[11px] font-mono text-neutral-300">Línea Materna (Dam)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-sm" />
            <span className="text-[11px] font-mono text-[#FFE885]">Ejemplar Raíz</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-500">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span>Total en 4G: 31 Ancestros Verificados</span>
        </div>
      </div>
    </div>
  );
};
