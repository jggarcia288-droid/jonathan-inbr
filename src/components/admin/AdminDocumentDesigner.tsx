import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BREED_IMAGES } from '../../utils/breedImages';
import { 
  Award, 
  CreditCard, 
  UploadCloud, 
  Move, 
  RotateCcw, 
  Save, 
  Eye, 
  EyeOff, 
  FileDown, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  Maximize2,
  Crosshair,
  CheckCircle2,
  Loader2,
  Type,
  ShieldCheck,
  Check,
  QrCode,
  Dna,
  Crown,
  Star
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { 
  CertificateLayoutOffsets, 
  LayoutOffsetItem,
  DEFAULT_CERTIFICATE_OFFSETS, 
  sanitizeCertificateOffsets,
  uploadCmsImage 
} from '../../utils/dynamicContent';
import { DogRecord } from '../../data/registryData';
import { useRegistry } from '../../context/RegistryContext';
import { buildEightGenPedigree } from '../../utils/pedigreeResolver';
import { PedigreeQrBadge } from '../PedigreeQrBadge';

interface AdminDocumentDesignerProps {
  isAdmin: boolean;
  sampleDogs: DogRecord[];
  offsets: CertificateLayoutOffsets;
  certBackgroundUrl: string;
  certBackBackgroundUrl?: string;
  pvcBackgroundUrl: string;
  orientation?: 'horizontal' | 'vertical';
  showPhoto?: boolean;
  showNotarySeal?: boolean;
  cleanBackgroundMode?: boolean;
  onOffsetsChange: (newOffsets: CertificateLayoutOffsets) => void;
  onCertBackgroundChange: (newUrl: string) => void;
  onCertBackBackgroundChange?: (newUrl: string) => void;
  onPvcBackgroundChange: (newUrl: string) => void;
  onOrientationChange?: (orientation: 'horizontal' | 'vertical') => void;
  onShowPhotoChange?: (show: boolean) => void;
  onShowNotarySealChange?: (show: boolean) => void;
  onCleanBackgroundModeChange?: (clean: boolean) => void;
  onSaveToSupabase?: () => void;
}

interface CustomTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color?: string;
}

export const AdminDocumentDesigner: React.FC<AdminDocumentDesignerProps> = ({
  isAdmin,
  sampleDogs,
  offsets,
  certBackgroundUrl,
  certBackBackgroundUrl = '',
  pvcBackgroundUrl,
  orientation = 'vertical',
  showPhoto = false,
  showNotarySeal = false,
  cleanBackgroundMode = true,
  onOffsetsChange,
  onCertBackgroundChange,
  onCertBackBackgroundChange,
  onPvcBackgroundChange,
  onOrientationChange,
  onShowPhotoChange,
  onShowNotarySealChange,
  onCleanBackgroundModeChange,
  onSaveToSupabase,
}) => {
  const { dogs: allRegistryDogs } = useRegistry();
  const [docMode, setDocMode] = useState<'certificate_front' | 'certificate_back' | 'pvc'>('certificate_front');
  const [selectedDogIndex, setSelectedDogIndex] = useState<number>(0);
  const [selectedField, setSelectedField] = useState<string>('dogNameOffset');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('/logo-inbr.jpg');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Paper Size state: 'letter' (Carta) or 'a4'
  const [paperSize, setPaperSize] = useState<'letter' | 'a4'>('letter');

  // Transparent Layer Mode: for printing or exporting strictly dynamic data with transparent background
  const [isTransparentLayer, setIsTransparentLayer] = useState<boolean>(false);

  // Missing data handler: if empty, null, or undefined -> "XXX"
  const valOrXXX = (val: any): string => {
    if (val === undefined || val === null) return 'XXX';
    const str = String(val).trim();
    return str === '' ? 'XXX' : str.toUpperCase();
  };

  // Orientation state
  const [localOrientation, setLocalOrientation] = useState<'horizontal' | 'vertical'>(
    orientation || 'vertical'
  );

  useEffect(() => {
    if (orientation) {
      setLocalOrientation(orientation);
    }
  }, [orientation]);

  const handleSetOrientation = (newOri: 'horizontal' | 'vertical') => {
    setLocalOrientation(newOri);
    if (onOrientationChange) {
      onOrientationChange(newOri);
    }
    setFeedback(`Formato cambiado a ${newOri === 'vertical' ? 'Vertical (Carta/A4)' : 'Horizontal (Carta/A4)'}`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Local live offsets for instant 60fps responsiveness without lag (sanitized against legacy extreme values)
  const sanitizedIncomingOffsets = sanitizeCertificateOffsets(
    offsets,
    Boolean(certBackgroundUrl),
    Boolean(certBackBackgroundUrl)
  );
  const [liveOffsets, setLiveOffsets] = useState<CertificateLayoutOffsets>(sanitizedIncomingOffsets);
  const offsetsRef = useRef<CertificateLayoutOffsets>(sanitizedIncomingOffsets);

  useEffect(() => {
    const clean = sanitizeCertificateOffsets(
      offsets,
      Boolean(certBackgroundUrl),
      Boolean(certBackBackgroundUrl)
    );
    offsetsRef.current = clean;
    setLiveOffsets(clean);
  }, [offsets, certBackgroundUrl, certBackBackgroundUrl]);

  // Custom text elements
  const [customTexts, setCustomTexts] = useState<CustomTextItem[]>([]);
  const [editingCustomTextId, setEditingCustomTextId] = useState<string | null>(null);

  // Dragging & Resizing interaction states
  const interactionModeRef = useRef<'drag' | 'resize' | null>(null);
  const activeFieldRef = useRef<string | null>(null);
  const startMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startOffsetRef = useRef<LayoutOffsetItem>({ x: 0, y: 0, fontSize: 14 });
  const [resizingBadge, setResizingBadge] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  // Helper to commit offset changes safely without lagging mousemove
  const commitOffsets = useCallback((newOffsets: CertificateLayoutOffsets) => {
    offsetsRef.current = newOffsets;
    setLiveOffsets(newOffsets);
    onOffsetsChange(newOffsets);
  }, [onOffsetsChange]);

  // Global window listeners for mousemove & mouseup
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!interactionModeRef.current || !activeFieldRef.current || !isAdmin) return;

      const field = activeFieldRef.current;
      const dx = Math.round(e.clientX - startMousePosRef.current.x);
      const dy = Math.round(e.clientY - startMousePosRef.current.y);

      if (interactionModeRef.current === 'drag') {
        // Move element position (clamped safely so element NEVER flies out of sight)
        const newX = Math.max(-500, Math.min(500, startOffsetRef.current.x + dx));
        const newY = Math.max(-600, Math.min(600, startOffsetRef.current.y + dy));

        const updated = {
          ...offsetsRef.current,
          [field]: {
            ...startOffsetRef.current,
            x: newX,
            y: newY,
          },
        };
        offsetsRef.current = updated;
        setLiveOffsets(updated);
      } else if (interactionModeRef.current === 'resize') {
        // Corner resize: mouse movement outward increases size, inward decreases
        const delta = Math.round((dx + dy) / 2);

        // Check if element is an image/logo/photo/seal/qr or text
        const isImageOrLogo = field.includes('logo') || field.includes('Logo') || 
                              field.includes('photo') || field.includes('Photo') || 
                              field.includes('seal') || field.includes('qr') || field.includes('Qr');

        if (isImageOrLogo) {
          const baseSize = startOffsetRef.current.width || 80;
          const newSize = Math.max(30, Math.min(260, baseSize + delta));
          const updated = {
            ...offsetsRef.current,
            [field]: {
              ...startOffsetRef.current,
              width: newSize,
              height: newSize,
              scale: Number((newSize / 80).toFixed(2)),
            },
          };
          offsetsRef.current = updated;
          setLiveOffsets(updated);
          setResizingBadge(`${newSize}px`);
        } else {
          // Text element font size
          const baseFontSize = startOffsetRef.current.fontSize || 14;
          const newFontSize = Math.max(8, Math.min(64, Math.round(baseFontSize + delta / 3)));
          const updated = {
            ...offsetsRef.current,
            [field]: {
              ...startOffsetRef.current,
              fontSize: newFontSize,
            },
          };
          offsetsRef.current = updated;
          setLiveOffsets(updated);
          setResizingBadge(`${newFontSize}px`);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (interactionModeRef.current && activeFieldRef.current) {
        // Commit final state to parent & dynamicContent
        commitOffsets(offsetsRef.current);
        interactionModeRef.current = null;
        activeFieldRef.current = null;
        setIsInteracting(false);
        setResizingBadge(null);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isAdmin, commitOffsets]);

  // Start drag on body of element
  const handleStartDrag = (fieldKey: string, e: React.MouseEvent) => {
    if (!isAdmin) return;
    if ((e.target as HTMLElement).closest('.designer-corner-handle') || (e.target as HTMLElement).closest('.designer-mini-toolbar')) {
      return;
    }
    e.stopPropagation();
    setSelectedField(fieldKey);
    interactionModeRef.current = 'drag';
    activeFieldRef.current = fieldKey;
    setIsInteracting(true);
    startMousePosRef.current = { x: e.clientX, y: e.clientY };

    const current = (offsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    startOffsetRef.current = { ...current };
  };

  // Start resize from corner handle with mouse
  const handleStartResize = (fieldKey: string, e: React.MouseEvent) => {
    if (!isAdmin) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(fieldKey);
    interactionModeRef.current = 'resize';
    activeFieldRef.current = fieldKey;
    setIsInteracting(true);
    startMousePosRef.current = { x: e.clientX, y: e.clientY };

    const current = (offsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    startOffsetRef.current = { ...current };
  };

  // Center or reset an individual element
  const handleCenterElement = (fieldKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const current = (offsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const updated = {
      ...offsetsRef.current,
      [fieldKey]: {
        ...current,
        x: 0,
        y: 0,
      },
    };
    commitOffsets(updated);
    setFeedback(`Posición de ${fieldKey} centrada en (0, 0).`);
    setTimeout(() => setFeedback(null), 2500);
  };

  // Adjust font size or scale by step
  const handleStepSize = (fieldKey: string, delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const current = (offsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const isImageOrLogo = fieldKey.includes('logo') || fieldKey.includes('Logo') || 
                          fieldKey.includes('photo') || fieldKey.includes('Photo') || 
                          fieldKey.includes('seal') || fieldKey.includes('qr') || fieldKey.includes('Qr');

    if (isImageOrLogo) {
      const currentWidth = current.width || 80;
      const newWidth = Math.max(30, Math.min(260, currentWidth + delta * 8));
      const updated = {
        ...offsetsRef.current,
        [fieldKey]: {
          ...current,
          width: newWidth,
          height: newWidth,
          scale: Number((newWidth / 80).toFixed(2)),
        },
      };
      commitOffsets(updated);
    } else {
      const newFontSize = Math.max(8, Math.min(64, (current.fontSize || 14) + delta));
      const updated = {
        ...offsetsRef.current,
        [fieldKey]: {
          ...current,
          fontSize: newFontSize,
        },
      };
      commitOffsets(updated);
    }
  };

  // Toggle hide/delete element
  const handleToggleHide = (fieldKey: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const current = (offsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const updated = {
      ...offsetsRef.current,
      [fieldKey]: {
        ...current,
        hidden: !current.hidden,
      },
    };
    commitOffsets(updated);
    setFeedback(current.hidden ? `Elemento visible.` : `Elemento ocultado.`);
    setTimeout(() => setFeedback(null), 2000);
  };

  // 1-CLICK: RECUPERAR / CENTRAR LOGO
  const handleRecoverLogo = () => {
    const targetKey = docMode === 'pvc' ? 'pvcLogoOffset' : 'logoOffset';
    const current = (offsetsRef.current as any)[targetKey] || { x: 0, y: 0, fontSize: 14 };
    const updated = {
      ...offsetsRef.current,
      [targetKey]: {
        ...current,
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        scale: 1,
        hidden: false,
      },
    };
    commitOffsets(updated);
    setSelectedField(targetKey);
    setFeedback('🎯 Logotipo recuperado y centrado exitosamente en la hoja.');
    setTimeout(() => setFeedback(null), 3000);
  };

  // 1-CLICK: RECUPERAR TODOS LOS ELEMENTOS
  const handleResetToDefault = () => {
    if (!isAdmin) return;
    if (confirm('¿Restablecer todas las posiciones y tamaños a la configuración original de fábrica?')) {
      commitOffsets(DEFAULT_CERTIFICATE_OFFSETS);
      onCertBackgroundChange('');
      if (onCertBackBackgroundChange) onCertBackBackgroundChange('');
      onPvcBackgroundChange('');
      handleSetOrientation('vertical');
      if (onShowPhotoChange) onShowPhotoChange(false);
      if (onShowNotarySealChange) onShowNotarySealChange(false);
      if (onCleanBackgroundModeChange) onCleanBackgroundModeChange(true);
      setCustomTexts([]);
      setFeedback('Posiciones y fondos restablecidos a valores por defecto.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Acomodar oficialmente todo el diseño con datos, tipografía y colores de la imagen
  const handleAccommodateCertificate = () => {
    commitOffsets({
      ...DEFAULT_CERTIFICATE_OFFSETS,
      logoOffset: { x: 0, y: 0, fontSize: 14, width: 104, height: 104 },
      headerTitleOffset: { x: 0, y: 0, fontSize: 32 },
      dogNameOffset: { x: 0, y: 0, fontSize: 36 },
      regNumberOffset: { x: 0, y: 0, fontSize: 14 },
      microchipOffset: { x: 0, y: 0, fontSize: 13 },
      breedOffset: { x: 0, y: 0, fontSize: 13 },
      colorOffset: { x: 0, y: 0, fontSize: 13 },
      genderOffset: { x: 0, y: 0, fontSize: 13 },
      dobOffset: { x: 0, y: 0, fontSize: 13 },
      ownerOffset: { x: 0, y: 0, fontSize: 13 },
      breederOffset: { x: 0, y: 0, fontSize: 13 },
      sireOffset: { x: 0, y: 0, fontSize: 12 },
      damOffset: { x: 0, y: 0, fontSize: 12 },
      qrOffset: { x: 0, y: 0, fontSize: 14 },
      sealOffset: { x: 0, y: 0, fontSize: 12 },
      dateOffset: { x: 0, y: 0, fontSize: 12 },
    });
    setFeedback('✓ ¡Diseño acomodado con tipografías de gala (Pinyon Script, Great Vibes, Montserrat) y colores oficiales de INBR!');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Subir Fondo Personalizado
  const handleUploadBackground = async (file: File) => {
    if (!isAdmin) return;
    setIsUploadingBackground(true);
    try {
      const url = await uploadCmsImage(file);
      if (docMode === 'pvc') {
        onPvcBackgroundChange(url);
        setFeedback('Fondo de credencial PVC personalizado cargado exitosamente.');
      } else if (docMode === 'certificate_back') {
        if (onCertBackBackgroundChange) onCertBackBackgroundChange(url);
        setFeedback('Fondo del reverso (genograma) cargado exitosamente.');
      } else {
        onCertBackgroundChange(url);
        setFeedback('Fondo del frente del certificado cargado exitosamente.');
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Error al subir la imagen de fondo.');
    } finally {
      setIsUploadingBackground(false);
    }
  };

  // Subir Logo Personalizado
  const handleUploadLogo = async (file: File) => {
    if (!isAdmin) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadCmsImage(file);
      setCustomLogoUrl(url);
      setFeedback('Nuevo logo oficial cargado y aplicado.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Error al subir el nuevo logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Agregar Texto Personalizado
  const handleAddCustomText = () => {
    const newId = `customText_${Date.now()}`;
    const newText: CustomTextItem = {
      id: newId,
      text: 'Nuevo Texto Personalizado',
      x: 0,
      y: 0,
      fontSize: 16,
      color: '#1A1A1A',
    };
    setCustomTexts((prev) => [...prev, newText]);
    setSelectedField(newId);
    setFeedback('Texto agregado. Haz clic sostenido para moverlo o de la esquina para cambiar su tamaño.');
    setTimeout(() => setFeedback(null), 3500);
  };

  // DESCARGAR CAPA PNG TRANSPARENTE DIRECTA (300 DPI)
  const handleExportTransparentPng = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setFeedback('Generando Capa Transparente PNG (300 DPI) para sobreponer en plantilla...');

    try {
      const canvasId = docMode === 'pvc' 
        ? 'designer-pvc-canvas' 
        : docMode === 'certificate_back'
        ? 'designer-certificate-back-canvas'
        : 'designer-certificate-canvas';

      const el = document.getElementById(canvasId);
      if (!el) throw new Error('No se encontró el lienzo.');

      const imgs = Array.from(el.querySelectorAll('img'));
      imgs.forEach((img) => {
        try { img.crossOrigin = 'anonymous'; } catch {}
      });

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null, // 100% TRANSPARENTE
        logging: false,
      });

      const dogName = valOrXXX(activeDog.name).replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.download = `INBR_Capa_Transparente_${dogName}_${paperSize.toUpperCase()}_${localOrientation.toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#FFFFFF'],
        });
      } catch {}

      setFeedback('✓ ¡Capa PNG transparente descargada exitosamente!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al generar capa transparente PNG:', err);
      alert('Hubo un problema al exportar la capa transparente PNG.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // DESCARGAR PDF DIRECTO DESDE EL DISEÑADOR
  const handleExportDesignerPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setFeedback('Generando PDF en alta resolución con tus ajustes...');

    try {
      const canvasId = docMode === 'pvc' 
        ? 'designer-pvc-canvas' 
        : docMode === 'certificate_back'
        ? 'designer-certificate-back-canvas'
        : 'designer-certificate-canvas';

      const el = document.getElementById(canvasId);
      if (!el) throw new Error('No se encontró el lienzo del documento.');

      // Ensure images crossOrigin
      const imgs = Array.from(el.querySelectorAll('img'));
      imgs.forEach((img) => {
        try { img.crossOrigin = 'anonymous'; } catch {}
      });

      const isVert = localOrientation === 'vertical' && docMode !== 'pvc';

      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: isTransparentLayer ? null : '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL(isTransparentLayer ? 'image/png' : 'image/jpeg', 0.98);
      const dogName = valOrXXX(activeDog.name).replace(/[^a-zA-Z0-9_-]/g, '_');

      if (docMode === 'pvc') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [85.6, 54],
        });
        pdf.addImage(imgData, isTransparentLayer ? 'PNG' : 'JPEG', 0, 0, 85.6, 54);
        pdf.save(`INBR_Credencial_PVC_${dogName}.pdf`);
      } else {
        const isLetter = paperSize === 'letter';
        const pdf = new jsPDF({
          orientation: isVert ? 'portrait' : 'landscape',
          unit: 'mm',
          format: isLetter ? 'letter' : 'a4',
          compress: true,
        });
        const pdfWidth = isVert ? (isLetter ? 215.9 : 210) : (isLetter ? 279.4 : 297);
        const pdfHeight = isVert ? (isLetter ? 279.4 : 297) : (isLetter ? 215.9 : 210);
        pdf.addImage(imgData, isTransparentLayer ? 'PNG' : 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`INBR_Certificado_${dogName}_${paperSize.toUpperCase()}_${isVert ? 'VERTICAL' : 'HORIZONTAL'}.pdf`);
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#FFFFFF'],
        });
      } catch {}

      setFeedback('✓ ¡PDF descargado exitosamente!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Hubo un problema al generar el archivo PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const activeDog = sampleDogs[selectedDogIndex] || {
    name: 'COOPER',
    regNumber: 'F110428',
    microchip: '981098108420001',
    breed: 'AMERICAN BULLY',
    variety: 'POCKET',
    color: 'CHOCOLATE & TAN',
    owner: 'PUPPY DREAMS',
    breeder: 'PUPPY DREAMS',
    dob: '2023-04-12',
    gender: 'Macho' as const,
    country: 'MÉXICO',
    sire: 'PUPPY DREAMS TITAN',
    sireReg: 'F110010',
    dam: 'PUPPY DREAMS LUNA',
    damReg: 'F110011',
    points: 350,
    titles: ['CH'],
    imageUrl: BREED_IMAGES.americanBully,
    status: 'ACTIVE_VALIDATED' as const,
  };

  const activePedigree = buildEightGenPedigree(
    activeDog,
    allRegistryDogs.length > 0 ? allRegistryDogs : sampleDogs
  );

  const activeBackgroundUrl = 
    docMode === 'pvc' 
      ? pvcBackgroundUrl 
      : docMode === 'certificate_back' 
      ? certBackBackgroundUrl 
      : certBackgroundUrl;

  // Render interactive element wrapper with corner handle and mini toolbar
  const renderInteractiveElement = (
    fieldKey: string,
    label: string,
    children: React.ReactNode,
    options?: {
      isImage?: boolean;
      defaultWidth?: number;
      className?: string;
    }
  ) => {
    const item = (liveOffsets as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    if (item.hidden) return null;

    const isSelected = selectedField === fieldKey;
    const isImage = options?.isImage || false;
    const width = item.width || options?.defaultWidth || (isImage ? 80 : undefined);
    const height = item.height || options?.defaultWidth || (isImage ? 80 : undefined);

    return (
      <div
        id={`designer-el-${fieldKey}`}
        onMouseDown={(e) => handleStartDrag(fieldKey, e)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedField(fieldKey);
        }}
        className={`group relative select-none transition-shadow cursor-grab active:cursor-grabbing inline-block ${
          options?.className || ''
        } ${
          isSelected
            ? 'ring-2 ring-[#D4AF37] bg-[#D4AF37]/10 rounded-lg shadow-lg z-30'
            : 'hover:ring-1 hover:ring-[#D4AF37]/50 rounded-lg'
        }`}
        style={{
          transform: `translate(${item.x || 0}px, ${item.y || 0}px)`,
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
      >
        {/* Floating Mini-Toolbar when element is selected */}
        {isSelected && isAdmin && (
          <div 
            className="designer-mini-toolbar absolute -top-8 left-1/2 -translate-x-1/2 z-50 bg-black/95 text-white border border-[#D4AF37] px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-2xl whitespace-nowrap pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span className="font-bold text-[#FFE885]">{label}</span>
            <span className="text-neutral-400">({item.x || 0}, {item.y || 0})</span>

            <div className="flex items-center gap-1 border-l border-neutral-700 pl-1.5">
              <button
                type="button"
                onClick={(e) => handleStepSize(fieldKey, -1, e)}
                className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-bold text-[9px] text-neutral-200"
                title="Hacer más chico"
              >
                -
              </button>
              <button
                type="button"
                onClick={(e) => handleStepSize(fieldKey, 1, e)}
                className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-bold text-[9px] text-neutral-200"
                title="Hacer más grande"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => handleCenterElement(fieldKey, e)}
              className="p-1 text-emerald-400 hover:text-emerald-200 hover:bg-neutral-800 rounded"
              title="Centrar en pantalla (0,0)"
            >
              <Crosshair className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={(e) => handleToggleHide(fieldKey, e)}
              className="p-1 text-rose-400 hover:text-rose-200 hover:bg-neutral-800 rounded"
              title="Ocultar elemento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Content */}
        {children}

        {/* Corner Resize Handle with mouse on bottom-right corner */}
        {isAdmin && (
          <div
            onMouseDown={(e) => handleStartResize(fieldKey, e)}
            className="designer-corner-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#D4AF37] border-2 border-black rounded-full cursor-se-resize shadow-md flex items-center justify-center opacity-80 hover:opacity-100 hover:scale-125 transition-transform z-40"
            title="Arrastra esta esquina con el ratón para cambiar el tamaño"
          >
            <Maximize2 className="w-2.5 h-2.5 text-black" />
          </div>
        )}

        {/* Live resize tooltip badge */}
        {resizingBadge && selectedField === fieldKey && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-black font-black font-mono text-[9px] px-1.5 py-0.5 rounded shadow z-50 animate-bounce">
            {resizingBadge}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & MAIN ACTION TOOLBAR                                      */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-[#D4AF37]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-base sm:text-lg font-black font-serif text-white uppercase tracking-wider">
              Diseñador Visual del Registro Canino
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Arrastra cualquier texto o logo con el mouse. <strong>Toma de la esquina</strong> para agrandarlo o achicarlo al instante.
          </p>
        </div>

        {/* Action Buttons: Acomodar Todo Oficial, Capa Transparente, Descargar PNG, Descargar PDF, Recuperar Logo, etc. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BOTÓN: ✦ Acomodar Todo Oficial */}
          <button
            type="button"
            onClick={handleAccommodateCertificate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gradient-to-r from-[#D4AF37] via-[#FFE885] to-[#D4AF37] hover:brightness-110 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            title="Acomodar automáticamente todos los textos, logos y sellos con la tipografía oficial (Pinyon Script, Great Vibes, Montserrat) y colores dorados"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>✦ Acomodar Todo Oficial</span>
          </button>

          {/* BOTÓN: 👁 Modo Capa Transparente (Fondo Transparente para Plantilla) */}
          <button
            type="button"
            onClick={() => {
              setIsTransparentLayer((prev) => !prev);
              setFeedback(!isTransparentLayer ? '✓ Modo Capa Transparente activado (Fondo invisible para sobreponer en plantilla pre-impresa).' : 'Modo vista normal con fondo activado.');
              setTimeout(() => setFeedback(null), 3000);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow cursor-pointer ${
              isTransparentLayer
                ? 'bg-emerald-500 text-black font-black border border-emerald-300 ring-2 ring-emerald-400'
                : 'bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-[#D4AF37]'
            }`}
            title="Activa o desactiva el fondo transparente para imprimir solo los datos y sellos sobre papel o plantilla pre-impresa"
          >
            {isTransparentLayer ? <EyeOff className="w-3.5 h-3.5 text-black" /> : <Eye className="w-3.5 h-3.5 text-[#FFE885]" />}
            <span>{isTransparentLayer ? 'Capa Transparente: ACTIVA' : 'Fondo Transparente'}</span>
          </button>

          {/* BOTÓN: Descargar PNG Transparente */}
          <button
            type="button"
            onClick={handleExportTransparentPng}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1A1408] border border-[#D4AF37] hover:bg-[#2B200E] active:scale-95 transition-all shadow cursor-pointer"
            title="Descargar capa de datos en PNG transparente en alta resolución (300 DPI) para imprenta o Photoshop/Illustrator"
          >
            <FileDown className="w-3.5 h-3.5 text-[#FFE885]" />
            <span>PNG Transparente</span>
          </button>

          {/* BOTÓN: Descargar PDF */}
          <button
            type="button"
            onClick={handleExportDesignerPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Descargar este documento en PDF de alta resolución con tus ajustes exactos"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>

          {/* BOTÓN: 🎯 Recuperar / Centrar Logo */}
          <button
            type="button"
            onClick={handleRecoverLogo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-700 hover:text-white hover:border-[#D4AF37] transition-all"
            title="Si el logo se movió o desapareció, haz clic aquí para regresarlo al frente"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#FFE885]" />
            <span>Logo</span>
          </button>

          {/* BOTÓN: + Agregar Texto */}
          <button
            type="button"
            onClick={handleAddCustomText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-200 bg-neutral-900 border border-neutral-700 hover:text-white hover:border-[#D4AF37] transition-all"
            title="Agregar una nueva caja de texto personalizada"
          >
            <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>+ Texto</span>
          </button>

          {/* BOTÓN: Restablecer de Fábrica */}
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 hover:text-white hover:border-neutral-700 transition-all"
            title="Restablecer todas las posiciones originales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className="p-3 rounded-xl bg-[#20180B] border border-[#D4AF37] text-xs font-mono text-[#FFE885] flex items-center justify-between shadow-lg animate-pulse">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BARRA DE HERRAMIENTAS: PESTAÑAS, ORIENTACIÓN, TAMAÑO DE HOJA Y FONDOS   */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 rounded-2xl bg-[#090909] border border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        {/* Selector de Documento */}
        <div className="flex items-center bg-black border border-neutral-800 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setDocMode('certificate_front')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              docMode === 'certificate_front'
                ? 'bg-gold-gradient text-black font-black shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>1. Pedigrí Frente</span>
          </button>

          <button
            type="button"
            onClick={() => setDocMode('certificate_back')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              docMode === 'certificate_back'
                ? 'bg-gold-gradient text-black font-black shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Reverso (Genograma 4G)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocMode('pvc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              docMode === 'pvc'
                ? 'bg-gold-gradient text-black font-black shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Credencial PVC</span>
          </button>
        </div>

        {/* SELECTOR DE ORIENTACIÓN VERTICAL / HORIZONTAL */}
        {docMode !== 'pvc' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black border border-[#D4AF37]/60 rounded-xl p-1 gap-1 shadow">
              <button
                type="button"
                onClick={() => handleSetOrientation('vertical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  localOrientation === 'vertical'
                    ? 'bg-gold-gradient text-black font-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Orientación Vertical (Carta / A4)"
              >
                Vertical
              </button>
              <button
                type="button"
                onClick={() => handleSetOrientation('horizontal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  localOrientation === 'horizontal'
                    ? 'bg-gold-gradient text-black font-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Orientación Horizontal"
              >
                Horizontal
              </button>
            </div>

            {/* SELECTOR DE TAMAÑO DE HOJA: CARTA (LETTER) vs A4 */}
            <div className="flex items-center bg-black border border-neutral-800 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setPaperSize('letter');
                  setFeedback('Tamaño de hoja: Carta (Letter 8.5 x 11 in)');
                  setTimeout(() => setFeedback(null), 2000);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  paperSize === 'letter'
                    ? 'bg-[#D4AF37] text-black font-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tamaño Carta (Letter: 216 x 279 mm)"
              >
                Carta (Letter)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperSize('a4');
                  setFeedback('Tamaño de hoja: A4 (210 x 297 mm)');
                  setTimeout(() => setFeedback(null), 2000);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  paperSize === 'a4'
                    ? 'bg-[#D4AF37] text-black font-black shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Tamaño Estándar Internacional A4"
              >
                A4
              </button>
            </div>
          </div>
        )}

        {/* CONTROLES DE FONDO Y LOGO */}
        <div className="flex items-center gap-2">
          {/* Subir Logo Oficial */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:border-[#D4AF37] cursor-pointer transition-all">
            <UploadCloud className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{isUploadingLogo ? 'Subiendo...' : 'Subir Logo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadLogo(e.target.files[0]);
                }
              }}
            />
          </label>

          {/* Subir Fondo */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-neutral-300 hover:text-white hover:border-[#D4AF37] cursor-pointer transition-all">
            <Palette className="w-3.5 h-3.5 text-[#FFE885]" />
            <span>{isUploadingBackground ? 'Subiendo...' : 'Cargar Fondo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadBackground(e.target.files[0]);
                }
              }}
            />
          </label>

          {/* Quitar Fondo si existe */}
          {activeBackgroundUrl !== '' && (
            <button
              type="button"
              onClick={() => {
                if (docMode === 'pvc') onPvcBackgroundChange('');
                else if (docMode === 'certificate_back' && onCertBackBackgroundChange) onCertBackBackgroundChange('');
                else onCertBackgroundChange('');
                setFeedback('Fondo eliminado.');
                setTimeout(() => setFeedback(null), 2000);
              }}
              className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-rose-400 hover:text-white"
              title="Quitar fondo personalizado"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Selector de perro muestra */}
          <select
            value={selectedDogIndex}
            onChange={(e) => setSelectedDogIndex(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
          >
            {sampleDogs.slice(0, 15).map((d, i) => (
              <option key={d.regNumber} value={i}>
                Ejemplar: {d.name} ({d.regNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIENZO WYSIWYG INTERACTIVO                                            */}
      {/* ========================================================================= */}
      <div 
        className="p-3 sm:p-6 bg-[#040404] rounded-3xl border-2 border-neutral-800 flex flex-col items-center justify-center overflow-x-auto relative select-none"
        onClick={() => setSelectedField('')}
      >
        <div className="text-center mb-3 text-[11px] font-mono text-[#D4AF37] flex items-center gap-2">
          <Move className="w-3.5 h-3.5" />
          <span>Arrastra cualquier texto o logo con el ratón. Para cambiar su tamaño, arrastra el círculo de su esquina derecha.</span>
        </div>

        {/* ===================================================================== */}
        {/* A. LIENZO DEL CERTIFICADO FRENTE                                     */}
        {/* ===================================================================== */}
        {docMode === 'certificate_front' && (
          <div
            id="designer-certificate-canvas"
            className={`text-black relative shadow-2xl overflow-hidden flex transition-all select-none ${
              isTransparentLayer
                ? 'bg-transparent border-2 border-dashed border-[#D4AF37]/50'
                : 'bg-[#FCFAF5] border-4 border-[#D4AF37] rounded-2xl'
            } ${
              localOrientation === 'horizontal'
                ? paperSize === 'letter'
                  ? 'w-full max-w-[1100px] min-h-[720px] aspect-[11/8.5] flex-row'
                  : 'w-full max-w-[1100px] min-h-[720px] aspect-[297/210] flex-row'
                : paperSize === 'letter'
                  ? 'w-full max-w-[780px] min-h-[1050px] aspect-[8.5/11] flex-col justify-between p-6 sm:p-10'
                  : 'w-full max-w-[780px] min-h-[1050px] aspect-[210/297] flex-col justify-between p-6 sm:p-10'
            }`}
            style={{
              backgroundImage: (!isTransparentLayer && certBackgroundUrl) ? `url(${certBackgroundUrl})` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          >
            {/* Watermark in full preview mode when no custom background */}
            {!isTransparentLayer && !certBackgroundUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] pl-32">
                <img src={customLogoUrl} alt="Watermark" className="w-[500px] h-[500px] object-contain rounded-full" />
              </div>
            )}

            {/* Corner Decorative Ornaments (En modo no transparente) */}
            {!isTransparentLayer && (
              <>
                <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37] pointer-events-none z-20" />
                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37] pointer-events-none z-20" />
                <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37] pointer-events-none z-20" />
                <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37] pointer-events-none z-20" />
              </>
            )}

            {/* ================================================================= */}
            {/* DISEÑO A: ORIENTACIÓN HORIZONTAL (Formato Oficial Asimétrico)      */}
            {/* ================================================================= */}
            {localOrientation === 'horizontal' ? (
              <>
                {/* 1. SECCIÓN IZQUIERDA: Área oscura / Columna de Identidad Principal */}
                <div className={`w-[34%] min-w-[260px] max-w-[340px] flex flex-col justify-between p-6 sm:p-8 shrink-0 relative z-10 ${
                  isTransparentLayer
                    ? 'bg-transparent border-r-2 border-dashed border-[#D4AF37]/30 text-white'
                    : 'bg-[#0B0B0B] text-white border-r-2 border-[#D4AF37] shadow-xl'
                }`}>
                  {/* LOGOTIPO INBR: Esquina superior izquierda */}
                  <div className="flex flex-col items-start">
                    {renderInteractiveElement(
                      'logoOffset',
                      'Logotipo INBR',
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#D4AF37] p-1 shadow-[0_0_20px_rgba(212,175,55,0.4)] bg-black overflow-hidden flex items-center justify-center">
                        <img src={customLogoUrl} alt="Logo Oficial INBR" className="w-full h-full object-cover rounded-full" />
                      </div>,
                      { isImage: true, defaultWidth: 104, className: 'mb-2' }
                    )}
                  </div>

                  {/* IDENTIFICACIÓN CANINA (Sans-Serif Bold gran tamaño) */}
                  <div className="my-auto py-4 space-y-3 text-left">
                    {/* NOMBRE DEL PERRO / NOMBRE PRINCIPAL */}
                    {renderInteractiveElement(
                      'dogNameOffset',
                      'Nombre Principal',
                      <div>
                        <span 
                          className="text-[9px] uppercase font-bold text-[#D4AF37] font-mono tracking-widest block"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          NOMBRE / NAME:
                        </span>
                        <h1 
                          className="font-black text-[#FFE885] tracking-tight uppercase leading-none drop-shadow-md break-words"
                          style={{ 
                            fontFamily: "'Montserrat', Arial, sans-serif",
                            fontSize: `${liveOffsets.dogNameOffset?.fontSize || 32}px` 
                          }}
                        >
                          {valOrXXX(activeDog.name)}
                        </h1>
                      </div>
                    )}

                    {/* REGISTRO No. / REGISTRY NUM. */}
                    {renderInteractiveElement(
                      'regNumberOffset',
                      'N° Registro',
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-neutral-400 font-mono tracking-wider block">
                          REGISTRO No. / REGISTRY NUM.:
                        </span>
                        <strong 
                          className="text-[#D4AF37] font-mono font-black text-sm sm:text-base leading-none block tracking-wider"
                          style={{ fontSize: `${liveOffsets.regNumberOffset?.fontSize || 14}px` }}
                        >
                          {valOrXXX(activeDog.regNumber)}
                        </strong>
                      </div>
                    )}

                    {/* CHIP No. */}
                    {renderInteractiveElement(
                      'microchipOffset',
                      'N° Microchip',
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-neutral-400 font-mono tracking-wider block">
                          CHIP No. / MICROCHIP ISO:
                        </span>
                        <span 
                          className="text-neutral-200 font-mono font-bold text-xs leading-none block tracking-wide"
                          style={{ fontSize: `${liveOffsets.microchipOffset?.fontSize || 12}px` }}
                        >
                          {valOrXXX(activeDog.microchip)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* FIRMA DEL PRESIDENTE: Esquina inferior izquierda */}
                  <div className="pt-3 border-t border-neutral-700/60 text-left relative z-20 shrink-0 mt-auto">
                    {renderInteractiveElement(
                      'dateOffset',
                      'Firma Presidente',
                      <div>
                        <div 
                          className="text-2xl sm:text-3xl text-[#FFE885] select-none leading-none font-bold italic"
                          style={{ fontFamily: "'Pinyon Script', 'Great Vibes', cursive" }}
                        >
                          Jonathan García
                        </div>
                        <span 
                          className="text-[9px] font-sans font-bold uppercase tracking-widest text-neutral-300 block mt-1"
                          style={{ fontFamily: "'Montserrat', sans-serif" }}
                        >
                          Jonathan García / Presidente INBR
                        </span>
                        <span className="text-[8px] font-mono text-[#D4AF37] block mt-0.5">
                          EMISIÓN: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. SECCIÓN DERECHA / CENTRAL: Área clara / Encabezado y Datos Técnicos */}
                <div className={`flex-1 flex flex-col justify-between p-6 sm:p-8 relative z-10 ${
                  isTransparentLayer ? 'bg-transparent text-black' : 'bg-[#FCFAF5] text-black'
                }`}>
                  {/* ENCABEZADO SUPERIOR DERECHO */}
                  <div className="flex items-start justify-between border-b-2 border-[#D4AF37]/50 pb-3">
                    <div className="text-left">
                      <span 
                        className="text-[9px] font-mono text-[#8C6B1F] font-bold tracking-widest uppercase block"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        CERTIFICADO OFICIAL DE REGISTRO & LINAJE GENÉTICO
                      </span>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[9px] font-mono font-bold text-[#8C6B1F] mt-1 uppercase">
                        <Award className="w-3 h-3 text-[#8C6B1F]" />
                        <span>FOLIO VALIDADO: {valOrXXX(activeDog.regNumber)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {renderInteractiveElement(
                        'headerTitleOffset',
                        'Título Encabezado',
                        <div>
                          <h2 
                            className="text-2xl sm:text-3xl lg:text-4xl text-[#111111] leading-none select-none font-bold"
                            style={{ 
                              fontFamily: "'Pinyon Script', 'Great Vibes', cursive",
                              fontSize: `${liveOffsets.headerTitleOffset?.fontSize || 32}px`
                            }}
                          >
                            International Breeds Registry
                          </h2>
                          <span 
                            className="text-xs sm:text-sm font-semibold text-[#8C6B1F] tracking-widest italic block mt-1"
                            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                          >
                            The new era is here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CUADRÍCULA DE DATOS TÉCNICOS (Mayúsculas, con valOrXXX) */}
                  <div className={`my-3 p-4 rounded-xl border border-[#D4AF37]/40 ${
                    isTransparentLayer ? 'bg-transparent border-dashed' : 'bg-white/80 shadow-sm'
                  }`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
                      {/* NOMBRE / NAME */}
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                          NOMBRE / NAME:
                        </span>
                        <strong className="text-neutral-900 font-mono font-black text-xs sm:text-sm block truncate uppercase">
                          {valOrXXX(activeDog.name)}
                        </strong>
                      </div>

                      {/* RAZA / BREED */}
                      <div>
                        {renderInteractiveElement(
                          'breedOffset',
                          'Raza / Breed',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              RAZA / BREED:
                            </span>
                            <strong 
                              className="text-neutral-900 font-mono font-black text-xs sm:text-sm block truncate uppercase"
                              style={{ fontSize: `${liveOffsets.breedOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.breed)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* VARIEDAD / VARIETY */}
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                          VARIEDAD / VARIETY:
                        </span>
                        <span className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block truncate uppercase">
                          {valOrXXX(activeDog.variety)}
                        </span>
                      </div>

                      {/* SEXO / SEX */}
                      <div>
                        {renderInteractiveElement(
                          'genderOffset',
                          'Sexo / Sex',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              SEXO / SEX:
                            </span>
                            <span 
                              className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block uppercase"
                              style={{ fontSize: `${liveOffsets.genderOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.gender || (activeDog as any).sex)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* COLOR / PATTERN */}
                      <div>
                        {renderInteractiveElement(
                          'colorOffset',
                          'Color / Pattern',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              COLOR / PATTERN:
                            </span>
                            <span 
                              className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block truncate uppercase"
                              style={{ fontSize: `${liveOffsets.colorOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.color)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* FECHA NAC. / DATE OF BIRTH */}
                      <div>
                        {renderInteractiveElement(
                          'dobOffset',
                          'Fecha Nac. / DOB',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              FECHA NAC. / DATE OF BIRTH:
                            </span>
                            <strong 
                              className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block uppercase"
                              style={{ fontSize: `${liveOffsets.dobOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.dob)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* PROPIETARIO / OWNER */}
                      <div>
                        {renderInteractiveElement(
                          'ownerOffset',
                          'Propietario / Owner',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              PROPIETARIO / OWNER:
                            </span>
                            <strong 
                              className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block truncate uppercase"
                              style={{ fontSize: `${liveOffsets.ownerOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.owner)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* CRIADOR / BREEDER */}
                      <div>
                        {renderInteractiveElement(
                          'breederOffset',
                          'Criador / Breeder',
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                              CRIADOR / BREEDER:
                            </span>
                            <span 
                              className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block truncate uppercase"
                              style={{ fontSize: `${liveOffsets.breederOffset?.fontSize || 13}px` }}
                            >
                              {valOrXXX(activeDog.breeder)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* PAÍS / COUNTRY */}
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-neutral-500 font-mono tracking-wider block">
                          PAÍS / COUNTRY:
                        </span>
                        <span className="text-neutral-900 font-mono font-bold text-xs sm:text-sm block uppercase">
                          {valOrXXX(activeDog.country)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LINAJE DIRECTO: PADRE Y MADRE (GEN 1) */}
                  <div className={`my-2 p-3 rounded-xl border border-[#D4AF37]/40 ${
                    isTransparentLayer ? 'bg-transparent border-dashed' : 'bg-white/80 shadow-sm'
                  }`}>
                    <div className="text-[8.5px] font-mono font-bold text-[#8C6B1F] uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Dna className="w-3.5 h-3.5 text-[#8C6B1F]" />
                        <span>✦ Linaje Directo Notariado / Direct Lineage (Gen 1)</span>
                      </span>
                      <span className="text-neutral-500">Trazabilidad Oficial INBR</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      {/* PADRE (SIRE) */}
                      <div className="p-2 rounded bg-neutral-100/70 border border-neutral-200">
                        {renderInteractiveElement(
                          'sireOffset',
                          'Padre (Sire)',
                          <div>
                            <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                              PADRE / SIRE (GEN 1):
                            </span>
                            <strong className="text-black font-mono font-black text-xs block leading-tight truncate uppercase">
                              {valOrXXX(activeDog.sire)}
                            </strong>
                            <span className="text-[#8C6B1F] font-mono text-[9px] font-bold block mt-0.5 uppercase">
                              REG: {valOrXXX(activeDog.sireReg)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* MADRE (DAM) */}
                      <div className="p-2 rounded bg-neutral-100/70 border border-neutral-200">
                        {renderInteractiveElement(
                          'damOffset',
                          'Madre (Dam)',
                          <div>
                            <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                              MADRE / DAM (GEN 1):
                            </span>
                            <strong className="text-black font-mono font-black text-xs block leading-tight truncate uppercase">
                              {valOrXXX(activeDog.dam)}
                            </strong>
                            <span className="text-[#8C6B1F] font-mono text-[9px] font-bold block mt-0.5 uppercase">
                              REG: {valOrXXX(activeDog.damReg)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TEXTOS PERSONALIZADOS AGREGADOS POR EL USUARIO */}
                  {customTexts.map((ct) => (
                    <div key={ct.id} className="relative">
                      {renderInteractiveElement(
                        ct.id,
                        'Texto Extra',
                        <div className="p-1">
                          {editingCustomTextId === ct.id ? (
                            <input
                              type="text"
                              value={ct.text}
                              autoFocus
                              onChange={(e) => {
                                const newText = e.target.value;
                                setCustomTexts((prev) =>
                                  prev.map((item) => (item.id === ct.id ? { ...item, text: newText } : item))
                                );
                              }}
                              onBlur={() => setEditingCustomTextId(null)}
                              className="bg-white border border-[#D4AF37] px-2 py-0.5 rounded text-sm text-black"
                            />
                          ) : (
                            <span
                              onDoubleClick={() => setEditingCustomTextId(ct.id)}
                              style={{ fontSize: `${(liveOffsets as any)[ct.id]?.fontSize || ct.fontSize}px` }}
                              className="font-bold text-neutral-900 cursor-text"
                              title="Doble clic para editar texto"
                            >
                              {ct.text}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* PIE DE PÁGINA NOTARIAL: QR Y SELLO DORADO */}
                  <div className="pt-2 border-t-2 border-[#D4AF37]/50 flex items-center justify-between text-neutral-800 gap-2">
                    {/* CÓDIGO QR NOTARIAL */}
                    <div className="flex items-center gap-2">
                      {renderInteractiveElement(
                        'qrOffset',
                        'Código QR',
                        <div className="p-1 flex items-center gap-2">
                          <PedigreeQrBadge
                            dog={activeDog as any}
                            size="sm"
                            label="Verificación"
                            showSubtitle={false}
                          />
                          <div className="text-left font-mono leading-none">
                            <span className="text-[7.5px] font-bold text-neutral-500 uppercase block">Verificación Digital</span>
                            <strong className="text-[8.5px] font-mono font-bold text-[#8C6B1F] block mt-0.5 uppercase">
                              OFICIAL INBR
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SELLO NOTARIAL DORADO */}
                    <div>
                      {renderInteractiveElement(
                        'sealOffset',
                        'Sello Notarial',
                        <div className="p-1 rounded-full border-2 border-[#D4AF37] bg-gradient-to-tr from-[#8C6B1F] via-[#FFE885] to-[#D4AF37] text-black shadow-sm flex items-center gap-1.5 px-3">
                          <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                          <div className="text-left font-mono leading-none">
                            <span className="text-[7.5px] font-black uppercase tracking-wider block">VALIDEZ NOTARIAL 2026</span>
                            <span className="text-[6.5px] font-bold text-neutral-900 block mt-0.5">INBR GLOBAL CERTIFIED</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* ================================================================= */
              /* DISEÑO B: ORIENTACIÓN VERTICAL (Carta / A4)                        */
              /* ================================================================= */
              <div className={`p-4 sm:p-6 rounded-xl relative z-10 flex flex-col justify-between h-full min-h-[620px] ${
                isTransparentLayer ? 'bg-transparent border-none' : 'border-2 border-[#D4AF37]/70 bg-white/70 shadow-sm'
              }`}>
                {/* ENCABEZADO OFICIAL INBR VERTICAL */}
                <div className="flex items-start justify-between border-b-2 border-[#D4AF37]/50 pb-3 relative">
                  {/* LOGO OFICIAL INBR */}
                  {renderInteractiveElement(
                    'logoOffset',
                    'Logotipo',
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#D4AF37] p-1 shadow-lg bg-black overflow-hidden flex items-center justify-center">
                      <img src={customLogoUrl} alt="Logo Oficial INBR" className="w-full h-full object-cover rounded-full" />
                    </div>,
                    { isImage: true, defaultWidth: 96 }
                  )}

                  <div className="text-right flex-1 pl-4">
                    {renderInteractiveElement(
                      'headerTitleOffset',
                      'Título Superior',
                      <div>
                        <h2 
                          className="text-2xl sm:text-3xl lg:text-4xl text-[#111111] leading-none select-none font-bold"
                          style={{ 
                            fontFamily: "'Pinyon Script', 'Great Vibes', cursive",
                            fontSize: `${liveOffsets.headerTitleOffset?.fontSize || 32}px` 
                          }}
                        >
                          International Breeds Registry
                        </h2>
                        <span 
                          className="text-xs sm:text-sm font-semibold text-[#8C6B1F] tracking-widest italic block mt-1"
                          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                        >
                          The new era is here
                        </span>
                      </div>
                    )}
                    <span 
                      className="text-[9px] sm:text-[10px] font-bold text-[#8C6B1F] tracking-[0.2em] uppercase block mt-1.5"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      Certificado Oficial de Registro Canino & Orígenes Notariados
                    </span>
                  </div>
                </div>

                {/* BLOQUE DEL NOMBRE REGISTRADO DEL EJEMPLAR */}
                <div className={`my-3 text-center p-3 sm:p-4 rounded-xl border border-[#D4AF37]/40 relative ${
                  isTransparentLayer ? 'bg-transparent border-dashed' : 'bg-white/80 shadow-sm'
                }`}>
                  {renderInteractiveElement(
                    'dogNameOffset',
                    'Nombre Ejemplar',
                    <div>
                      <span 
                        className="text-[10px] uppercase font-bold text-[#8C6B1F] tracking-[0.2em] block"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        Nombre Registrado del Ejemplar / Registered Canine Name:
                      </span>
                      <h1 
                        className="font-black text-[#111111] uppercase tracking-wide leading-tight mt-1"
                        style={{ 
                          fontFamily: "'Montserrat', Arial, sans-serif",
                          fontSize: `${liveOffsets.dogNameOffset?.fontSize || 30}px` 
                        }}
                      >
                        {valOrXXX(activeDog.name)}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <span className="px-2.5 py-0.5 rounded bg-black text-[#FFE885] font-mono text-[10px] font-bold uppercase border border-[#D4AF37]">
                          REG: {valOrXXX(activeDog.regNumber)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-black text-neutral-200 font-mono text-[10px] font-bold uppercase border border-neutral-700">
                          CHIP: {valOrXXX(activeDog.microchip)}
                        </span>
                        <span className="px-2.5 py-0.5 rounded border border-emerald-600 bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold uppercase">
                          ✓ IDENTIDAD VALIDADA NOTARIAL
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* CUADRÍCULA DE DATOS TÉCNICOS (COLUMNAS SIMÉTRICAS) */}
                <div className={`p-3 rounded-xl border border-[#D4AF37]/30 text-left ${
                  isTransparentLayer ? 'bg-transparent border-dashed' : 'bg-white/80 shadow-sm'
                }`}>
                  <div className="grid grid-cols-2 gap-3 text-neutral-800">
                    {/* RAZA */}
                    <div>
                      {renderInteractiveElement(
                        'breedOffset',
                        'Raza',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Raza Reconocida:
                          </span>
                          <strong 
                            className="font-mono text-neutral-900 leading-none block font-bold text-xs sm:text-sm uppercase"
                            style={{ fontSize: `${liveOffsets.breedOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.breed)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* VARIEDAD */}
                    <div className="p-0.5">
                      <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        Variedad / Tipo:
                      </span>
                      <span className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase">
                        {valOrXXX(activeDog.variety)}
                      </span>
                    </div>

                    {/* SEXO */}
                    <div>
                      {renderInteractiveElement(
                        'genderOffset',
                        'Sexo',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Sexo / Género:
                          </span>
                          <span 
                            className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase"
                            style={{ fontSize: `${liveOffsets.genderOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.gender || (activeDog as any).sex)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* COLOR */}
                    <div>
                      {renderInteractiveElement(
                        'colorOffset',
                        'Color',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Color & Manto:
                          </span>
                          <span 
                            className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase"
                            style={{ fontSize: `${liveOffsets.colorOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.color)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* FECHA DE NACIMIENTO */}
                    <div>
                      {renderInteractiveElement(
                        'dobOffset',
                        'Fecha Nacimiento',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Fecha de Nacimiento:
                          </span>
                          <strong 
                            className="font-mono text-neutral-900 leading-none block font-bold text-xs sm:text-sm uppercase"
                            style={{ fontSize: `${liveOffsets.dobOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.dob)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* PROPIETARIO */}
                    <div>
                      {renderInteractiveElement(
                        'ownerOffset',
                        'Propietario',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Propietario Notariado:
                          </span>
                          <strong 
                            className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase truncate"
                            style={{ fontSize: `${liveOffsets.ownerOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.owner)}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* CRIADOR */}
                    <div>
                      {renderInteractiveElement(
                        'breederOffset',
                        'Criador',
                        <div className="p-0.5">
                          <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Criador Registrado:
                          </span>
                          <span 
                            className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase truncate"
                            style={{ fontSize: `${liveOffsets.breederOffset?.fontSize || 13}px` }}
                          >
                            {valOrXXX(activeDog.breeder)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PAÍS / SEDE */}
                    <div className="p-0.5">
                      <span className="text-[9px] uppercase font-bold text-[#8C6B1F] block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        Sede / País de Origen:
                      </span>
                      <span className="font-mono font-bold text-neutral-900 leading-none block text-xs sm:text-sm uppercase">
                        {valOrXXX(activeDog.country)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LINAJE DIRECTO (PADRE Y MADRE - GEN 1) */}
                <div className={`my-2 p-3 rounded-xl border border-[#D4AF37]/50 ${
                  isTransparentLayer ? 'bg-transparent border-dashed' : 'bg-white/70 shadow-sm'
                }`}>
                  <div className="text-[9px] font-mono font-bold text-[#8C6B1F] uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Dna className="w-3.5 h-3.5 text-[#8C6B1F]" />
                      <span>✦ Linaje Directo Notariado (1ra Generación)</span>
                    </span>
                    <span className="text-neutral-500">Trazabilidad Oficial INBR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    {/* PADRE (SIRE) */}
                    <div className="p-2 rounded-lg bg-neutral-50/80 border border-neutral-200">
                      {renderInteractiveElement(
                        'sireOffset',
                        'Padre (Sire)',
                        <div>
                          <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                            PADRE / SIRE (GEN 1):
                          </span>
                          <strong className="text-black font-mono font-black text-xs block leading-tight uppercase truncate">
                            {valOrXXX(activeDog.sire)}
                          </strong>
                          <span className="text-[#8C6B1F] font-mono text-[9px] font-bold block mt-0.5 uppercase">
                            REG: {valOrXXX(activeDog.sireReg)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* MADRE (DAM) */}
                    <div className="p-2 rounded-lg bg-neutral-50/80 border border-neutral-200">
                      {renderInteractiveElement(
                        'damOffset',
                        'Madre (Dam)',
                        <div>
                          <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                            MADRE / DAM (GEN 1):
                          </span>
                          <strong className="text-black font-mono font-black text-xs block leading-tight uppercase truncate">
                            {valOrXXX(activeDog.dam)}
                          </strong>
                          <span className="text-[#8C6B1F] font-mono text-[9px] font-bold block mt-0.5 uppercase">
                            REG: {valOrXXX(activeDog.damReg)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TEXTOS PERSONALIZADOS */}
                {customTexts.map((ct) => (
                  <div key={ct.id} className="relative">
                    {renderInteractiveElement(
                      ct.id,
                      'Texto Extra',
                      <div className="p-1">
                        {editingCustomTextId === ct.id ? (
                          <input
                            type="text"
                            value={ct.text}
                            autoFocus
                            onChange={(e) => {
                              const newText = e.target.value;
                              setCustomTexts((prev) =>
                                prev.map((item) => (item.id === ct.id ? { ...item, text: newText } : item))
                              );
                            }}
                            onBlur={() => setEditingCustomTextId(null)}
                            className="bg-white border border-[#D4AF37] px-2 py-0.5 rounded text-sm text-black"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => setEditingCustomTextId(ct.id)}
                            style={{ fontSize: `${(liveOffsets as any)[ct.id]?.fontSize || ct.fontSize}px` }}
                            className="font-bold text-neutral-900 cursor-text"
                            title="Doble clic para editar texto"
                          >
                            {ct.text}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* PIE DE PÁGINA NOTARIAL (FIRMA, SELLO DORADO, QR) */}
                <div className="mt-auto pt-4 border-t-2 border-[#D4AF37]/50 flex flex-wrap items-center justify-between text-neutral-800 gap-3 relative z-20 shrink-0">
                  {/* FIRMA NOTARIAL AUTÓGRAFA */}
                  <div className="text-left">
                    {renderInteractiveElement(
                      'dateOffset',
                      'Firma Presidente',
                      <div className="p-1">
                        <div 
                          className="text-2xl text-[#111111] leading-none select-none font-bold italic"
                          style={{ fontFamily: "'Pinyon Script', 'Great Vibes', cursive" }}
                        >
                          Jonathan García
                        </div>
                        <span className="text-[8px] font-mono text-neutral-600 font-bold uppercase tracking-wider block mt-1">
                          Presidente / CEO Fundador Notario INBR
                        </span>
                        <strong 
                          className="text-[9px] font-mono text-[#8C6B1F] block mt-0.5"
                          style={{ fontSize: `${liveOffsets.dateOffset?.fontSize || 11}px` }}
                        >
                          EMISIÓN: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* SELLO NOTARIAL DORADO */}
                  <div className="text-center">
                    {renderInteractiveElement(
                      'sealOffset',
                      'Sello Notarial',
                      <div className="p-1.5 rounded-full border-2 border-[#D4AF37] bg-gradient-to-tr from-[#8C6B1F] via-[#FFE885] to-[#D4AF37] text-black shadow-md flex items-center gap-1.5 px-3">
                        <ShieldCheck className="w-5 h-5 text-black shrink-0" />
                        <div className="text-left font-mono leading-none">
                          <span className="text-[8px] font-black uppercase tracking-wider block">VALIDEZ NOTARIAL 2026</span>
                          <span className="text-[7px] font-bold text-neutral-900 block mt-0.5">INBR GLOBAL CERTIFIED</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QR CODE NOTARIAL */}
                  <div className="flex items-center gap-2">
                    {renderInteractiveElement(
                      'qrOffset',
                      'Código QR',
                      <div className="p-1 flex items-center gap-2">
                        <PedigreeQrBadge
                          dog={activeDog as any}
                          size="sm"
                          label="Verificación"
                          showSubtitle={false}
                        />
                        <div className="text-left font-mono">
                          <span className="text-[8px] font-bold text-neutral-500 uppercase block leading-none">Verificación</span>
                          <span className="text-[9px] font-extrabold text-[#8C6B1F] block leading-tight mt-0.5">OFICIAL INBR</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* B. LIENZO REVERSO (GENOGRAMA 4G)                                     */}
        {/* ===================================================================== */}
        {docMode === 'certificate_back' && (
          <div
            id="designer-certificate-back-canvas"
            className={`w-full bg-[#FAFAFA] text-black rounded-2xl relative shadow-2xl border-4 border-[#D4AF37] overflow-hidden transition-all ${
              localOrientation === 'vertical'
                ? 'max-w-[760px] min-h-[1050px] flex flex-col p-6 aspect-[210/297]'
                : 'max-w-[1080px] min-h-[720px] flex p-8 aspect-[297/210]'
            }`}
            style={{
              backgroundImage: certBackBackgroundUrl ? `url(${certBackBackgroundUrl})` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          >
            {/* Columna Lateral con Logo y QR */}
            <div className={`bg-black text-white p-4 rounded-xl flex flex-col justify-between shrink-0 ${
              localOrientation === 'vertical' ? 'w-full flex-row items-center mb-4' : 'w-64 mr-6'
            }`}>
              <div className="flex flex-col items-center">
                {renderInteractiveElement(
                  'logoOffset',
                  'Logo Reverso',
                  <div className="w-full h-full rounded-full border-2 border-[#D4AF37] p-0.5 overflow-hidden">
                    <img src={customLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                  </div>,
                  { isImage: true, defaultWidth: 80 }
                )}
                <h4 className="text-sm font-black text-[#D4AF37] font-serif uppercase mt-2 text-center">
                  {activeDog.name}
                </h4>
                <span className="text-[10px] font-mono text-neutral-300">REG: {activeDog.regNumber}</span>
              </div>

              <div className="flex flex-col items-center mt-3">
                {renderInteractiveElement(
                  'qrOffset',
                  'QR Reverso',
                  <PedigreeQrBadge dog={activeDog} size="sm" label="VERIFICAR" />,
                  { isImage: true, defaultWidth: 100 }
                )}
              </div>
            </div>

            {/* Árbol Genealógico */}
            <div className="flex-1 space-y-4 font-mono text-xs">
              <div className="border-b border-neutral-300 pb-2">
                <h3 className="text-base sm:text-lg font-black text-black uppercase">Genograma 4 Generaciones Oficiales</h3>
                <span className="text-[10px] text-neutral-500">International Breeds Registry</span>
              </div>

              {/* Padres (Gen 1) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {renderInteractiveElement(
                    'sireOffset',
                    'Padre (Sire)',
                    <div className="p-3 rounded-xl bg-white border border-neutral-300">
                      <span className="text-[9px] text-neutral-500 uppercase block font-bold">PADRE / SIRE (GEN 1):</span>
                      <strong className="text-black text-sm block">{activePedigree.sire.name}</strong>
                      <span className="text-[10px] text-neutral-600">REG: {activePedigree.sire.regNumber}</span>
                    </div>
                  )}
                </div>

                <div>
                  {renderInteractiveElement(
                    'damOffset',
                    'Madre (Dam)',
                    <div className="p-3 rounded-xl bg-white border border-neutral-300">
                      <span className="text-[9px] text-neutral-500 uppercase block font-bold">MADRE / DAM (GEN 1):</span>
                      <strong className="text-black text-sm block">{activePedigree.dam.name}</strong>
                      <span className="text-[10px] text-neutral-600">REG: {activePedigree.dam.regNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Abuelos (Gen 2) */}
              <div>
                {renderInteractiveElement(
                  'grandparentsOffset',
                  'Abuelos (Gen 2)',
                  <div className="p-3 rounded-xl bg-white border border-neutral-300 space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">ABUELOS (GEN 2):</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>Pat: <strong>{activePedigree.sireSire.name}</strong> / <strong>{activePedigree.sireDam.name}</strong></div>
                      <div>Mat: <strong>{activePedigree.damSire.name}</strong> / <strong>{activePedigree.damDam.name}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* C. LIENZO CREDENCIAL PVC                                             */}
        {/* ===================================================================== */}
        {docMode === 'pvc' && (
          <div
            id="designer-pvc-canvas"
            className="w-[450px] h-[280px] rounded-2xl p-4 text-white relative shadow-2xl border-2 border-[#D4AF37] overflow-hidden flex flex-col justify-between my-6"
            style={{
              backgroundImage: pvcBackgroundUrl
                ? `url(${pvcBackgroundUrl})`
                : 'linear-gradient(135deg, #1A1813 0%, #0D0D0D 50%, #1F1B12 100%)',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          >
            {/* Header Credencial */}
            <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/50 relative z-10">
              <div className="flex items-center gap-2">
                {renderInteractiveElement(
                  'pvcLogoOffset',
                  'Logo Credencial',
                  <div className="w-full h-full rounded-full border border-[#D4AF37] p-0.5 bg-black overflow-hidden">
                    <img src={customLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                  </div>,
                  { isImage: true, defaultWidth: 36 }
                )}
                <div>
                  <span className="text-[10px] font-black tracking-wider text-gold-gradient uppercase block leading-none">
                    INTERNATIONAL BREEDS REGISTRY
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400">CREDENTIAL ID • NOTARIADA (CR80)</span>
                </div>
              </div>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885] font-bold">
                OFICIAL
              </span>
            </div>

            {/* Cuerpo Credencial */}
            <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
              <div className="col-span-4 flex flex-col items-center">
                {renderInteractiveElement(
                  'pvcPhotoOffset',
                  'Foto Credencial',
                  <div className="w-full h-full rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-black shadow">
                    <img src={activeDog.imageUrl} alt={activeDog.name} className="w-full h-full object-cover" />
                  </div>,
                  { isImage: true, defaultWidth: 90 }
                )}
              </div>

              <div className="col-span-8 space-y-1 text-left">
                {/* Nombre */}
                {renderInteractiveElement(
                  'pvcNameOffset',
                  'Nombre',
                  <h5 
                    className="font-black text-white font-serif tracking-wide truncate leading-tight"
                    style={{ fontSize: `${liveOffsets.pvcNameOffset?.fontSize || 14}px` }}
                  >
                    {activeDog.name}
                  </h5>
                )}

                <div className="text-[10px] space-y-0.5 text-neutral-300 font-mono">
                  {/* Registro */}
                  {renderInteractiveElement(
                    'pvcRegOffset',
                    'N° Reg',
                    <div>
                      <span className="text-neutral-500">REG:</span>{' '}
                      <strong 
                        className="text-[#FFE885]"
                        style={{ fontSize: `${liveOffsets.pvcRegOffset?.fontSize || 10}px` }}
                      >
                        {activeDog.regNumber}
                      </strong>
                    </div>
                  )}

                  {/* Microchip */}
                  {renderInteractiveElement(
                    'pvcChipOffset',
                    'Microchip',
                    <div>
                      <span className="text-neutral-500">CHIP:</span>{' '}
                      <span style={{ fontSize: `${liveOffsets.pvcChipOffset?.fontSize || 10}px` }}>
                        {activeDog.microchip}
                      </span>
                    </div>
                  )}

                  {/* Raza */}
                  {renderInteractiveElement(
                    'pvcBreedOffset',
                    'Raza',
                    <div>
                      <span className="text-neutral-400" style={{ fontSize: `${liveOffsets.pvcBreedOffset?.fontSize || 9}px` }}>
                        {activeDog.breed}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Credencial */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[8px] font-mono text-neutral-400 relative z-10">
              {renderInteractiveElement(
                'pvcOwnerOffset',
                'Titular',
                <span>TITULAR: <strong className="text-white" style={{ fontSize: `${liveOffsets.pvcOwnerOffset?.fontSize || 9}px` }}>{activeDog.owner}</strong></span>
              )}

              {renderInteractiveElement(
                'pvcQrOffset',
                'Seguridad',
                <span className="text-[#FFE885] font-bold" style={{ fontSize: `${liveOffsets.pvcQrOffset?.fontSize || 8}px` }}>
                  INBR OFICIAL • CR80
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
