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
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeftRight,
  Download,
  X,
  Compass,
  ArrowLeft,
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
  const { dogs: allDogs } = useRegistry();

  // Active root dog (supports internal backward navigation to inspect any ancestor's 4G tree)
  const [activeDog, setActiveDog] = useState<DogRecord>(dog);

  useEffect(() => {
    setActiveDog(dog);
    setSelectedNode(null);
    setCollapsedIds(new Set());
  }, [dog]);

  // Navigation & Canvas State
  const [zoom, setZoom] = useState<number>(0.62);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const treeCanvasRef = useRef<HTMLDivElement | null>(null);
  const treeContentRef = useRef<HTMLDivElement | null>(null);

  // Build Hierarchical 4-Generation Tree strictly from resolved lineage
  const rootNode = useMemo<PedigreeTreeNode>(() => {
    const rawPedigree: EightGenPedigree = buildEightGenPedigree(activeDog, allDogs);

    const buildG4Node = (
      id: string,
      idx: number,
      gender: 'Macho' | 'Hembra',
      lineage: 'PATERNAL' | 'MATERNAL'
    ): PedigreeTreeNode => {
      const g4Item = rawPedigree.g4[idx] || { name: 'SIN REGISTRO', regNumber: '—', color: 'Por registrar' };
      const matched = g4Item.dogRecord;
      return {
        id,
        name: matched?.name || g4Item.name,
        regNumber: matched?.regNumber || g4Item.regNumber,
        color: matched?.color || g4Item.color || 'Por registrar',
        breed: matched?.breed || g4Item.breed || activeDog.breed,
        titles: matched?.titles || g4Item.titles || [],
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

    const buildG3Node = (
      id: string,
      idx: number,
      gender: 'Macho' | 'Hembra',
      lineage: 'PATERNAL' | 'MATERNAL',
      g4StartIdx: number
    ): PedigreeTreeNode => {
      const g3Item = rawPedigree.g3[idx] || { name: 'SIN REGISTRO', regNumber: '—', color: 'Por registrar' };
      const matched = g3Item.dogRecord;
      return {
        id,
        name: matched?.name || g3Item.name,
        regNumber: matched?.regNumber || g3Item.regNumber,
        color: matched?.color || g3Item.color || 'Por registrar',
        breed: matched?.breed || g3Item.breed || activeDog.breed,
        titles: matched?.titles || g3Item.titles || [],
        gender,
        roleLabel: gender === 'Macho' ? 'Bisabuelo' : 'Bisabuela',
        generation: 3,
        geneticPct: 12.5,
        lineage,
        imageUrl: matched?.imageUrl,
        microchip: matched?.microchip,
        owner: matched?.owner,
        dogRecord: matched,
        sire: buildG4Node(`${id}s`, g4StartIdx, 'Macho', lineage),
        dam: buildG4Node(`${id}d`, g4StartIdx + 1, 'Hembra', lineage),
      };
    };

    // Gen 2 Grandparents
    const ssMatched = rawPedigree.sireSire.dogRecord;
    const nodeSireSire: PedigreeTreeNode = {
      id: 'ss',
      name: ssMatched?.name || rawPedigree.sireSire.name,
      regNumber: ssMatched?.regNumber || rawPedigree.sireSire.regNumber,
      color: ssMatched?.color || rawPedigree.sireSire.color || 'Por registrar',
      breed: ssMatched?.breed || rawPedigree.sireSire.breed || activeDog.breed,
      titles: ssMatched?.titles || rawPedigree.sireSire.titles || [],
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

    const sdMatched = rawPedigree.sireDam.dogRecord;
    const nodeSireDam: PedigreeTreeNode = {
      id: 'sd',
      name: sdMatched?.name || rawPedigree.sireDam.name,
      regNumber: sdMatched?.regNumber || rawPedigree.sireDam.regNumber,
      color: sdMatched?.color || rawPedigree.sireDam.color || 'Por registrar',
      breed: sdMatched?.breed || rawPedigree.sireDam.breed || activeDog.breed,
      titles: sdMatched?.titles || rawPedigree.sireDam.titles || [],
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

    const dsMatched = rawPedigree.damSire.dogRecord;
    const nodeDamSire: PedigreeTreeNode = {
      id: 'ds',
      name: dsMatched?.name || rawPedigree.damSire.name,
      regNumber: dsMatched?.regNumber || rawPedigree.damSire.regNumber,
      color: dsMatched?.color || rawPedigree.damSire.color || 'Por registrar',
      breed: dsMatched?.breed || rawPedigree.damSire.breed || activeDog.breed,
      titles: dsMatched?.titles || rawPedigree.damSire.titles || [],
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

    const ddMatched = rawPedigree.damDam.dogRecord;
    const nodeDamDam: PedigreeTreeNode = {
      id: 'dd',
      name: ddMatched?.name || rawPedigree.damDam.name,
      regNumber: ddMatched?.regNumber || rawPedigree.damDam.regNumber,
      color: ddMatched?.color || rawPedigree.damDam.color || 'Por registrar',
      breed: ddMatched?.breed || rawPedigree.damDam.breed || activeDog.breed,
      titles: ddMatched?.titles || rawPedigree.damDam.titles || [],
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
    const sireMatched = rawPedigree.sire.dogRecord;
    const nodeSire: PedigreeTreeNode = {
      id: 's',
      name: sireMatched?.name || rawPedigree.sire.name,
      regNumber: sireMatched?.regNumber || rawPedigree.sire.regNumber,
      color: sireMatched?.color || rawPedigree.sire.color || 'Por registrar',
      breed: sireMatched?.breed || rawPedigree.sire.breed || activeDog.breed,
      titles: sireMatched?.titles || rawPedigree.sire.titles || [],
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

    const damMatched = rawPedigree.dam.dogRecord;
    const nodeDam: PedigreeTreeNode = {
      id: 'd',
      name: damMatched?.name || rawPedigree.dam.name,
      regNumber: damMatched?.regNumber || rawPedigree.dam.regNumber,
      color: damMatched?.color || rawPedigree.dam.color || 'Por registrar',
      breed: damMatched?.breed || rawPedigree.dam.breed || activeDog.breed,
      titles: damMatched?.titles || rawPedigree.dam.titles || [],
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
      name: activeDog.name,
      regNumber: activeDog.regNumber,
      color: activeDog.color,
      breed: activeDog.breed,
      titles: activeDog.titles,
      gender: (activeDog.gender?.toLowerCase().includes('h') ? 'Hembra' : 'Macho') as 'Macho' | 'Hembra',
      roleLabel: 'Ejemplar Registrado (Proband)',
      generation: 0,
      geneticPct: 100,
      lineage: 'ROOT',
      imageUrl: activeDog.imageUrl,
      microchip: activeDog.microchip,
      owner: activeDog.owner,
      dogRecord: activeDog,
      sire: nodeSire,
      dam: nodeDam,
    };
  }, [activeDog, allDogs]);

  // Real ancestor count across G1-G4
  const verifiedAncestorsCount = useMemo(() => {
    let count = 0;
    const isFilled = (n?: PedigreeTreeNode) => Boolean(n && n.name && n.name !== 'SIN REGISTRO');
    const walk = (n?: PedigreeTreeNode) => {
      if (!n) return;
      if (n.generation >= 1 && n.generation <= 4 && isFilled(n)) {
        count++;
      }
      if (n.generation < 4) {
        walk(n.sire);
        walk(n.dam);
      }
    };
    walk(rootNode.sire);
    walk(rootNode.dam);
    return count;
  }, [rootNode]);

  // Compute Active Highlight Ancestor Path IDs
  const activePathIds = useMemo<Set<string>>(() => {
    const targetId = hoveredNodeId || selectedNode?.id;
    if (!targetId) return new Set();

    const ids = new Set<string>();
    ids.add('root');

    if (targetId.startsWith('s') || targetId.startsWith('d')) {
      for (let len = 1; len <= Math.min(4, targetId.length); len++) {
        ids.add(targetId.slice(0, len));
      }
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

  // Fit entire 4-generation tree comfortably inside viewport without clipping G3/G4
  const fitTreeToViewport = useCallback(() => {
    const vp = viewportRef.current;
    const content = treeContentRef.current;
    if (!vp || !content) return;

    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = content.scrollWidth;
    const ch = content.scrollHeight;
    if (!vw || !vh || !cw || !ch) return;

    const padX = vw < 640 ? 16 : 36;
    const padY = vw < 640 ? 28 : 36;
    const rawFit = Math.min((vw - padX) / cw, (vh - padY) / ch);
    const fitZoom = Math.max(0.24, Math.min(0.95, rawFit));

    const scaledW = cw * fitZoom;
    const scaledH = ch * fitZoom;
    const nextX = Math.max(8, Math.round((vw - scaledW) / 2));
    const nextY = Math.max(24, Math.round((vh - scaledH) / 2));

    setZoom(fitZoom);
    setPan({ x: nextX, y: nextY });
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      fitTreeToViewport();
    });
    return () => cancelAnimationFrame(raf);
  }, [activeDog, maxGenerations, isFullscreen, collapsedIds, fitTreeToViewport]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      fitTreeToViewport();
    });
    observer.observe(vp);
    return () => observer.disconnect();
  }, [fitTreeToViewport]);

  // Handle Drag / Pan Events (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
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
        setZoom((z) => Math.min(1.8, Math.max(0.24, z + (diff > 0 ? 0.025 : -0.025))));
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
  const handleZoomOut = () => setZoom((z) => Math.max(0.24, z - 0.12));
  const handleResetView = () => {
    fitTreeToViewport();
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

  // Export Full 4G Tree as Unclipped PNG Image
  const handleExportTreeImage = async () => {
    if (!treeContentRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const originalZoom = zoom;
      const originalPan = pan;
      setZoom(1);
      setPan({ x: 0, y: 0 });

      await new Promise((r) => setTimeout(r, 180));

      const targetEl = treeContentRef.current;
      const canvas = await html2canvas(targetEl, {
        backgroundColor: '#070707',
        scale: 2,
        width: targetEl.scrollWidth,
        height: targetEl.scrollHeight,
        windowWidth: targetEl.scrollWidth,
        windowHeight: targetEl.scrollHeight,
        useCORS: true,
        logging: false,
      });

      setZoom(originalZoom);
      setPan(originalPan);

      const link = document.createElement('a');
      link.download = `INBR_Arbol_Genealogico_4G_${activeDog.regNumber || 'Canino'}.png`;
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
    const isHighlighted = activePathIds.has(node.id);
    const isMatched = searchMatches.has(node.id);
    const isCollapsed = collapsedIds.has(node.id);
    const isRoot = node.generation === 0;
    const isEmpty = node.name === 'SIN REGISTRO';

    const isSire = node.gender === 'Macho';
    const borderAccent = isRoot
      ? 'border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]'
      : isEmpty
      ? isSire
        ? 'border-blue-500/20 border-dashed opacity-55 hover:opacity-85'
        : 'border-rose-500/20 border-dashed opacity-55 hover:opacity-85'
      : isSire
      ? isHighlighted
        ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.45)]'
        : 'border-blue-500/45 hover:border-blue-400'
      : isHighlighted
      ? 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.45)]'
      : 'border-rose-500/45 hover:border-rose-400';

    const bgGradient = isRoot
      ? 'bg-gradient-to-r from-[#1E170A] via-[#141007] to-[#1E170A]'
      : isEmpty
      ? 'bg-[#09090B]'
      : isSire
      ? 'bg-gradient-to-r from-[#0D1524] to-[#0A0D14]'
      : 'bg-gradient-to-r from-[#210D15] to-[#120A0E]';

    const cardWidth = node.generation === 4 ? 195 : node.generation === 3 ? 215 : 245;
    const cardMinHeight = node.generation === 4 ? 68 : node.generation === 3 ? 78 : 92;

    return (
      <div
        className={`interactive-tree-card relative rounded-2xl p-2.5 border-2 transition-all cursor-pointer ${bgGradient} ${borderAccent} ${
          isMatched ? 'ring-2 ring-[#FFE885] scale-105' : ''
        } ${isSelected ? 'ring-2 ring-white scale-102' : ''}`}
        onClick={() => setSelectedNode(node)}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        style={{
          width: cardWidth,
          minHeight: cardMinHeight,
        }}
      >
        {/* Role & Generation Kicker */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 text-[9.5px] text-neutral-400 truncate">
            <span className={`font-bold ${isSire ? 'text-blue-400' : isRoot ? 'text-[#FFE885]' : 'text-rose-400'}`}>
              {node.roleLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-neutral-500">G{node.generation}</span>
          </div>

          <span className="text-[8.5px] font-mono font-bold text-[#FFE885] bg-black/60 px-1.5 py-0.2 rounded border border-[#D4AF37]/30 shrink-0">
            {node.geneticPct}%
          </span>
        </div>

        {/* Canine Name & Photo / Avatar */}
        <div className="flex items-start gap-2">
          {node.imageUrl ? (
            <img
              src={node.imageUrl}
              alt={node.name}
              className="w-8 h-8 rounded-lg object-cover border border-[#D4AF37]/50 shrink-0 shadow"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                isSire ? 'bg-blue-950/60 border-blue-500/40 text-blue-300' : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1">
              <strong className={`text-[11px] font-bold font-serif-luxury truncate block leading-tight ${isEmpty ? 'text-neutral-500' : 'text-white'}`}>
                {node.name}
              </strong>
              {node.titles && node.titles.length > 0 && !isEmpty && (
                <span className="text-[8px] font-black text-black bg-gold-gradient px-1 rounded shrink-0">
                  {node.titles[0]}
                </span>
              )}
            </div>

            <span className={`text-[9.5px] font-mono truncate block mt-0.5 ${isEmpty ? 'text-neutral-600' : 'text-[#FFE885]'}`}>
              {node.regNumber}
            </span>

            {node.color && !isEmpty && (
              <span className="text-[8.5px] text-neutral-300 font-medium truncate block">
                {node.color}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Branch Affordance Button */}
        {hasParents && node.generation < maxGenerations && (
          <button
            type="button"
            onClick={(e) => toggleCollapse(node.id, e)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#18140B] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black text-[#FFE885] flex items-center justify-center text-[10px] shadow-lg transition-transform hover:scale-110 z-10"
            title={isCollapsed ? 'Expandir ancestros de esta línea' : 'Colapsar ancestros'}
          >
            {isCollapsed ? '+' : '−'}
          </button>
        )}

        {/* Collapsed Indicator */}
        {isCollapsed && hasParents && (
          <div className="mt-1.5 pt-1 border-t border-neutral-800 flex items-center justify-between text-[8.5px] text-[#FFE885]">
            <span>Línea oculta</span>
            <span className="font-mono">({node.generation === 1 ? '14' : node.generation === 2 ? '6' : '2'})</span>
          </div>
        )}
      </div>
    );
  };

  // Render Horizontal 4-Generation Column Tree
  const renderTreeBranches = () => {
    if (!rootNode) return null;

    const showSireBranch = !collapsedIds.has('s');
    const showDamBranch = !collapsedIds.has('d');
    const showGen2 = maxGenerations >= 2 && (showSireBranch || showDamBranch);

    const showSS = showSireBranch && !collapsedIds.has('ss');
    const showSD = showSireBranch && !collapsedIds.has('sd');
    const showDS = showDamBranch && !collapsedIds.has('ds');
    const showDD = showDamBranch && !collapsedIds.has('dd');
    const showGen3 = maxGenerations >= 3 && (showSS || showSD || showDS || showDD);

    const showSSS = showSS && !collapsedIds.has('sss');
    const showSSD = showSS && !collapsedIds.has('ssd');
    const showSDS = showSD && !collapsedIds.has('sds');
    const showSDD = showSD && !collapsedIds.has('sdd');
    const showDSS = showDS && !collapsedIds.has('dss');
    const showDSD = showDS && !collapsedIds.has('dsd');
    const showDDS = showDD && !collapsedIds.has('dds');
    const showDDD = showDD && !collapsedIds.has('ddd');
    const showGen4 =
      maxGenerations >= 4 &&
      (showSSS || showSSD || showSDS || showSDD || showDSS || showDSD || showDDS || showDDD);

    const renderG4Pair = (
      visible: boolean,
      bisabueloNode?: PedigreeTreeNode,
      accent: 'blue' | 'rose' = 'blue'
    ) => {
      if (!visible || !bisabueloNode) return null;
      const borderCol = accent === 'blue' ? 'border-blue-800/40 bg-blue-950/15' : 'border-rose-800/40 bg-rose-950/15';
      const labelCol = accent === 'blue' ? 'text-blue-300' : 'text-rose-300';
      return (
        <div className={`p-1.5 rounded-xl border ${borderCol} space-y-1`}>
          <div className={`text-[8.5px] font-mono font-bold uppercase truncate px-1 ${labelCol}`}>
            Padres de: {bisabueloNode.name}
          </div>
          <div className="flex items-center gap-1.5">
            {bisabueloNode.sire && renderNodeCard(bisabueloNode.sire, false)}
            {bisabueloNode.dam && renderNodeCard(bisabueloNode.dam, false)}
          </div>
        </div>
      );
    };

    return (
      <div
        ref={treeContentRef}
        className="flex items-stretch gap-8 sm:gap-10 py-6 px-6 min-w-max select-none"
      >
        {/* Col 0: Proband (Root) */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="text-[10px] font-mono text-[#FFE885] font-bold uppercase mb-2 tracking-wider">
            RAÍZ · PROBAND (G0)
          </div>
          {renderNodeCard(rootNode, true)}
        </div>

        {/* Col 1: Parents (Sire & Dam) */}
        {maxGenerations >= 1 && (
          <div className="flex flex-col justify-around gap-12 shrink-0 relative">
            <div className="flex flex-col items-center">
              <div className="text-[10px] font-mono text-blue-400 font-bold uppercase mb-2 tracking-wider">
                GEN 1 · PADRE (SIRE)
              </div>
              {rootNode.sire && renderNodeCard(rootNode.sire, true)}
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[10px] font-mono text-rose-400 font-bold uppercase mb-2 tracking-wider">
                GEN 1 · MADRE (DAM)
              </div>
              {rootNode.dam && renderNodeCard(rootNode.dam, true)}
            </div>
          </div>
        )}

        {/* Col 2: Grandparents (4 Abuelos) */}
        {showGen2 && (
          <div className="flex flex-col justify-around gap-6 shrink-0">
            {showSireBranch && (
              <div className="flex flex-col gap-4 p-2.5 rounded-2xl border border-blue-900/40 bg-blue-950/10">
                <span className="text-[9.5px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                  GEN 2 · ABUELOS PATERNOS
                </span>
                {rootNode.sire?.sire && renderNodeCard(rootNode.sire.sire, true)}
                {rootNode.sire?.dam && renderNodeCard(rootNode.sire.dam, true)}
              </div>
            )}

            {showDamBranch && (
              <div className="flex flex-col gap-4 p-2.5 rounded-2xl border border-rose-900/40 bg-rose-950/10">
                <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                  GEN 2 · ABUELOS MATERNOS
                </span>
                {rootNode.dam?.sire && renderNodeCard(rootNode.dam.sire, true)}
                {rootNode.dam?.dam && renderNodeCard(rootNode.dam.dam, true)}
              </div>
            )}
          </div>
        )}

        {/* Col 3: Great-Grandparents (8 Bisabuelos) */}
        {showGen3 && (
          <div className="flex flex-col justify-around gap-4 shrink-0">
            {(showSS || showSD) && (
              <div className="flex flex-col gap-2.5 p-2.5 rounded-2xl border border-blue-900/35 bg-blue-950/10">
                <span className="text-[9.5px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                  GEN 3 · BISABUELOS PATERNOS (4)
                </span>
                {showSS && rootNode.sire?.sire?.sire && renderNodeCard(rootNode.sire.sire.sire, true)}
                {showSS && rootNode.sire?.sire?.dam && renderNodeCard(rootNode.sire.sire.dam, true)}
                {showSD && rootNode.sire?.dam?.sire && renderNodeCard(rootNode.sire.dam.sire, true)}
                {showSD && rootNode.sire?.dam?.dam && renderNodeCard(rootNode.sire.dam.dam, true)}
              </div>
            )}

            {(showDS || showDD) && (
              <div className="flex flex-col gap-2.5 p-2.5 rounded-2xl border border-rose-900/35 bg-rose-950/10">
                <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                  GEN 3 · BISABUELOS MATERNOS (4)
                </span>
                {showDS && rootNode.dam?.sire?.sire && renderNodeCard(rootNode.dam.sire.sire, true)}
                {showDS && rootNode.dam?.sire?.dam && renderNodeCard(rootNode.dam.sire.dam, true)}
                {showDD && rootNode.dam?.dam?.sire && renderNodeCard(rootNode.dam.dam.sire, true)}
                {showDD && rootNode.dam?.dam?.dam && renderNodeCard(rootNode.dam.dam.dam, true)}
              </div>
            )}
          </div>
        )}

        {/* Col 4: Great-Great-Grandparents (16 Tatarabuelos Completos en pares ligados a cada Bisabuelo) */}
        {showGen4 && (
          <div className="flex flex-col justify-around gap-4 shrink-0">
            {(showSSS || showSSD || showSDS || showSDD) && (
              <div className="flex flex-col gap-2 p-2.5 rounded-2xl border border-blue-900/45 bg-blue-950/15 shadow-lg">
                <span className="text-[9.5px] font-mono font-bold text-blue-400 uppercase text-left pl-1">
                  GEN 4 · 8 TATARABUELOS PATERNOS
                </span>
                <div className="flex flex-col gap-2">
                  {renderG4Pair(showSSS, rootNode.sire?.sire?.sire, 'blue')}
                  {renderG4Pair(showSSD, rootNode.sire?.sire?.dam, 'blue')}
                  {renderG4Pair(showSDS, rootNode.sire?.dam?.sire, 'blue')}
                  {renderG4Pair(showSDD, rootNode.sire?.dam?.dam, 'blue')}
                </div>
              </div>
            )}

            {(showDSS || showDSD || showDDS || showDDD) && (
              <div className="flex flex-col gap-2 p-2.5 rounded-2xl border border-rose-900/45 bg-rose-950/15 shadow-lg">
                <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase text-left pl-1">
                  GEN 4 · 8 TATARABUELOS MATERNOS
                </span>
                <div className="flex flex-col gap-2">
                  {renderG4Pair(showDSS, rootNode.dam?.sire?.sire, 'rose')}
                  {renderG4Pair(showDSD, rootNode.dam?.sire?.dam, 'rose')}
                  {renderG4Pair(showDDS, rootNode.dam?.dam?.sire, 'rose')}
                  {renderG4Pair(showDDD, rootNode.dam?.dam?.dam, 'rose')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isViewingAncestor = activeDog.regNumber !== dog.regNumber;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-3xl bg-[#070707] border-2 border-[#D4AF37]/50 shadow-2xl flex flex-col overflow-hidden text-neutral-100 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : className
      }`}
    >
      {/* 1. Header Toolbar */}
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
              {isViewingAncestor && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDog(dog);
                    setSelectedNode(null);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#D4AF37] text-black hover:brightness-110 shrink-0"
                  title={`Regresar a ${dog.name}`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Volver a {dog.name}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 truncate">
              <span className="text-white font-medium truncate">{activeDog.name}</span>
              <span aria-hidden="true" className="text-[#D4AF37]">·</span>
              <span className="font-mono text-[#FFE885]">{activeDog.regNumber}</span>
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
              setCollapsedIds(new Set());
              requestAnimationFrame(() => fitTreeToViewport());
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
            title="Centrar y ajustar 4G en pantalla"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {showExportButton && (
            <button
              type="button"
              onClick={handleExportTreeImage}
              disabled={isExporting}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold bg-[#1C160B] border border-[#D4AF37]/60 text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all shadow"
              title="Descargar árbol completo de 4 generaciones en PNG"
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

      {/* 2. Interactive Pan & Zoom Canvas */}
      <div
        ref={viewportRef}
        className={`relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-[#050505] min-h-[520px] sm:min-h-[640px] lg:min-h-[700px] ${
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
        <div className="absolute top-2 left-3 sm:top-3 sm:left-4 z-10 pointer-events-none flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 bg-black/75 px-2.5 py-1 rounded-full border border-neutral-800 backdrop-blur-sm">
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

        {/* Tree Inner Canvas (origin-top-left guarantees G0..G4 auto-fits accurately inside viewport) */}
        <div
          ref={treeCanvasRef}
          className="absolute top-0 left-0 w-max transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          {renderTreeBranches()}
        </div>
      </div>

      {/* 3. Node Inspector Drawer */}
      {selectedNode && (
        <aside
          aria-label="Detalles de ancestro seleccionado"
          className="absolute right-4 bottom-4 top-16 w-80 sm:w-96 rounded-2xl bg-[#0D0D0D]/95 border-2 border-[#D4AF37] p-4 text-left shadow-2xl backdrop-blur-md z-30 flex flex-col justify-between overflow-y-auto animate-fadeIn"
        >
          <div>
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-800">
              <div>
                <span
                  className={`text-[10px] uppercase font-bold font-mono block ${
                    selectedNode.gender === 'Macho' ? 'text-blue-400' : 'text-rose-400'
                  }`}
                >
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
                  <span
                    className={`font-bold ${
                      selectedNode.lineage === 'PATERNAL'
                        ? 'text-blue-400'
                        : selectedNode.lineage === 'MATERNAL'
                        ? 'text-rose-400'
                        : 'text-[#FFE885]'
                    }`}
                  >
                    {selectedNode.lineage === 'PATERNAL'
                      ? 'Línea Paterna'
                      : selectedNode.lineage === 'MATERNAL'
                      ? 'Línea Materna'
                      : 'Proband Central'}
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

          <div className="pt-3 border-t border-neutral-800 space-y-2">
            {selectedNode.dogRecord && selectedNode.id !== 'root' && (
              <button
                type="button"
                onClick={() => {
                  if (selectedNode.dogRecord) {
                    setActiveDog(selectedNode.dogRecord);
                    onSelectDog?.(selectedNode.dogRecord);
                    setSelectedNode(null);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-black" />
                <span>Navegar Hacia Atrás (Hacer Raíz del Árbol)</span>
              </button>
            )}

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

        <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-400">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>·</span>
          <span className="text-[#FFE885] font-bold">
            {verifiedAncestorsCount} / 30 Ancestros en 4G
          </span>
        </div>
      </div>
    </div>
  );
};
