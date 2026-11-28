import React, { useState, useRef, useEffect } from 'react';
import { DogRecord } from '../data/registryData';
import { useRegistry } from '../context/RegistryContext';
import { useAuth } from '../hooks/useAuth';
import { 
  useDynamicContent, 
  uploadCmsImage, 
  saveDynamicContentAsync, 
  DEFAULT_CERTIFICATE_OFFSETS, 
  sanitizeCertificateOffsets,
  CertificateLayoutOffsets 
} from '../utils/dynamicContent';
import { buildEightGenPedigree } from '../utils/pedigreeResolver';
import { generatePedigreePdf } from '../utils/pedigreePdfReport';
import { PedigreeQrBadge } from './PedigreeQrBadge';
import { getMicrochipVerificationUrl } from '../utils/qrCodeGenerator';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { 
  X, 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  QrCode, 
  FileText,
  Award,
  Layers,
  FileDown,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Lock,
  UploadCloud,
  Move,
  RotateCcw,
  Save,
  Baby,
  Trash2,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Dna,
  CreditCard,
  Crosshair,
  SlidersHorizontal
} from 'lucide-react';
import { InteractivePedigreeTree } from './InteractivePedigreeTree';

interface PedigreeCertificateModalProps {
  dog: DogRecord | null;
  onClose: () => void;
  onOpenAdminPanel?: () => void;
}

type DocumentViewMode = 'front' | 'back' | 'pvc' | 'litter' | 'both' | 'tree';

export const PedigreeCertificateModal: React.FC<PedigreeCertificateModalProps> = ({ 
  dog, 
  onClose,
  onOpenAdminPanel 
}) => {
  const { dogs } = useRegistry();
  const { user, isAuthenticated } = useAuth();
  const { content, updateContent } = useDynamicContent();

  const [side, setSide] = useState<DocumentViewMode>('front');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<string>('');
  const [pdfMenuOpen, setPdfMenuOpen] = useState<boolean>(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState<boolean>(false);

  // Admin Drag & Drop & Collapsible Tools state
  const [showCustomTools, setShowCustomTools] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [isSavingToSupabase, setIsSavingToSupabase] = useState<boolean>(false);
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<string | null>(null);

  // Permissions - Administrator Drag & Drop and PDF/JPG generation restricted to Master & Representatives
  const isMasterAdmin = Boolean(isAuthenticated && user?.role === 'MASTER');
  const isRepresentative = Boolean(isAuthenticated && user?.role === 'REPRESENTATIVE');
  const canDownloadOrPrint = Boolean(
    isAuthenticated && (user?.role === 'MASTER' || (user?.role === 'REPRESENTATIVE' && user?.canPrint !== false))
  );

  // Current configurations - default vertical letter/A4
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>(
    content.certificateOrientation || 'vertical'
  );

  useEffect(() => {
    if (content.certificateOrientation) {
      setOrientation(content.certificateOrientation);
    }
  }, [content.certificateOrientation]);

  const handleOrientationChange = (newOrientation: 'vertical' | 'horizontal') => {
    setOrientation(newOrientation);
    const updated = { ...content, certificateOrientation: newOrientation };
    updateContent(updated);
    saveDynamicContentAsync(updated);
  };

  const showPhoto = content.showPhotoOnCert === true; // Default: false (sin foto según instrucciones del usuario)
  const showNotarySeal = content.showNotarySealOnCert === true; // Default: false (oculto según el usuario)
  const showLogo = content.showLogoOnCert !== false; // Default: true
  const cleanBackgroundMode = content.certCleanBackgroundMode !== false; // Default: true (100% limpio, sin franjas ni recuadros)
  const hideTreeBorders = content.hideTreeBordersOnCert === true; // Ocultar líneas divisorias del genograma

  // Background URLs
  const certFrontBg = content.certificateBackgroundUrl || '';
  const certBackBg = content.certBackBackgroundUrl || '';
  const litterBg = content.litterBackgroundUrl || '';

  // Layout offsets (sanitized to prevent corrupted coordinates from hiding/overlapping signature & regNumber)
  const offsets: CertificateLayoutOffsets = sanitizeCertificateOffsets(
    content.certificateOffsets,
    Boolean(certFrontBg),
    Boolean(certBackBg)
  );
  const [liveOffsets, setLiveOffsets] = useState<CertificateLayoutOffsets>(offsets);

  // Ref to always track latest coordinates during drag & drop
  const latestOffsetsRef = useRef<CertificateLayoutOffsets>(offsets);
  useEffect(() => {
    const clean = sanitizeCertificateOffsets(
      content.certificateOffsets,
      Boolean(certFrontBg),
      Boolean(certBackBg)
    );
    latestOffsetsRef.current = clean;
    setLiveOffsets(clean);
  }, [content.certificateOffsets, certFrontBg, certBackBg]);

  // Direct persistence to Supabase database (table 'franquicias' with prefijo='CMS_CONFIG')
  const persistOffsetsToSupabase = async (newOffsets: CertificateLayoutOffsets) => {
    if (!isMasterAdmin) return;
    setIsSavingToSupabase(true);
    setSupabaseSyncStatus('Guardando en Supabase...');
    try {
      const updatedContent = { ...content, certificateOffsets: newOffsets };
      updateContent(updatedContent);
      await saveDynamicContentAsync(updatedContent);
      setSupabaseSyncStatus('✓ Coordenadas guardadas en Supabase');
      setTimeout(() => setSupabaseSyncStatus(null), 3000);
    } catch (err) {
      console.warn('Error saving coordinates to Supabase:', err);
      setSupabaseSyncStatus('Error al guardar en Supabase');
    } finally {
      setIsSavingToSupabase(false);
    }
  };

  // Recover lost logo to center (0,0)
  const handleRecoverLogo = async () => {
    const current = (latestOffsetsRef.current as any).logoOffset || { x: 0, y: 0, fontSize: 14 };
    const updated: CertificateLayoutOffsets = {
      ...latestOffsetsRef.current,
      logoOffset: {
        ...current,
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        scale: 1,
        hidden: false,
      },
    };
    latestOffsetsRef.current = updated;
    setLiveOffsets(updated);
    setSelectedField('logoOffset');
    updateContent({ ...content, certificateOffsets: updated });
    await persistOffsetsToSupabase(updated);
    setFeedback('🎯 Logotipo recuperado y centrado en la hoja');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Build pedigree tree recursively
  const pedigree = dog ? buildEightGenPedigree(dog, dogs) : null;

  // Global pointer/mouse move and up listeners for drag & drop (ultra smooth 60fps)
  useEffect(() => {
    if (!isDragging || !selectedField) return;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const dx = Math.round(e.clientX - dragStartPos.x);
      const dy = Math.round(e.clientY - dragStartPos.y);

      const current = (latestOffsetsRef.current as any)[selectedField] || { x: 0, y: 0, fontSize: 14 };
      const updated: CertificateLayoutOffsets = {
        ...latestOffsetsRef.current,
        [selectedField]: {
          ...current,
          x: dragStartOffset.x + dx,
          y: dragStartOffset.y + dy,
        },
      };
      latestOffsetsRef.current = updated;
      setLiveOffsets(updated);
    };

    const handlePointerUp = async () => {
      if (isDragging) {
        setIsDragging(false);
        const finalOffsets = latestOffsetsRef.current;
        updateContent({ ...content, certificateOffsets: finalOffsets });
        await persistOffsetsToSupabase(finalOffsets);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, selectedField, dragStartPos, dragStartOffset, content, updateContent]);

  // Keyboard Arrow nudge for fine-grained coordinate precision
  useEffect(() => {
    if (!isEditMode || !selectedField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();
      const current = (latestOffsetsRef.current as any)[selectedField] || { x: 0, y: 0, fontSize: 14 };
      const updated: CertificateLayoutOffsets = {
        ...latestOffsetsRef.current,
        [selectedField]: {
          ...current,
          x: (current.x || 0) + dx,
          y: (current.y || 0) + dy,
        },
      };
      latestOffsetsRef.current = updated;
      updateContent({ ...content, certificateOffsets: updated });
      persistOffsetsToSupabase(updated);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, selectedField, content]);

  if (!dog || !pedigree) return null;

  // Start dragging a specific field (Mouse or Pointer)
  const handleStartDrag = (fieldKey: string, e: React.MouseEvent) => {
    if (!isMasterAdmin || !isEditMode) return;
    e.stopPropagation();
    setSelectedField(fieldKey);
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const fOffset = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    setDragStartOffset({ x: fOffset.x || 0, y: fOffset.y || 0 });
  };

  // HTML5 Drag and Drop handlers
  const handleHtml5DragStart = (fieldKey: string, e: React.DragEvent) => {
    if (!isMasterAdmin || !isEditMode) return;
    setSelectedField(fieldKey);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', fieldKey);
    e.dataTransfer.effectAllowed = 'move';
    setDragStartPos({ x: e.clientX, y: e.clientY });

    const fOffset = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    setDragStartOffset({ x: fOffset.x || 0, y: fOffset.y || 0 });
  };

  const handleHtml5DragEnd = async () => {
    if (!isMasterAdmin || !isEditMode) return;
    setIsDragging(false);
    await persistOffsetsToSupabase(latestOffsetsRef.current);
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    if (!isMasterAdmin || !isEditMode) return;
    e.preventDefault();
    const fieldKey = e.dataTransfer.getData('text/plain') || selectedField;
    if (!fieldKey) return;

    const dx = Math.round(e.clientX - dragStartPos.x);
    const dy = Math.round(e.clientY - dragStartPos.y);

    const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const updated: CertificateLayoutOffsets = {
      ...latestOffsetsRef.current,
      [fieldKey]: {
        ...current,
        x: dragStartOffset.x + dx,
        y: dragStartOffset.y + dy,
      },
    };
    latestOffsetsRef.current = updated;
    updateContent({ ...content, certificateOffsets: updated });
    setIsDragging(false);
    await persistOffsetsToSupabase(updated);
  };

  // Change font size of a field
  const adjustFontSize = (fieldKey: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isMasterAdmin) return;
    const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const newSize = Math.max(8, Math.min(60, (current.fontSize || 14) + delta));
    const updated: CertificateLayoutOffsets = {
      ...latestOffsetsRef.current,
      [fieldKey]: {
        ...current,
        fontSize: newSize,
      },
    };
    latestOffsetsRef.current = updated;
    setLiveOffsets(updated);
    updateContent({ ...content, certificateOffsets: updated });
  };

  // Reset a field to (0, 0)
  const resetFieldOffset = (fieldKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isMasterAdmin) return;
    const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const updated: CertificateLayoutOffsets = {
      ...latestOffsetsRef.current,
      [fieldKey]: {
        ...current,
        x: 0,
        y: 0,
      },
    };
    latestOffsetsRef.current = updated;
    setLiveOffsets(updated);
    updateContent({ ...content, certificateOffsets: updated });
  };

  // Reset all offsets cleanly
  const handleResetAllOffsets = async () => {
    if (!isMasterAdmin) return;
    latestOffsetsRef.current = DEFAULT_CERTIFICATE_OFFSETS;
    setLiveOffsets(DEFAULT_CERTIFICATE_OFFSETS);
    const updatedContent = { ...content, certificateOffsets: DEFAULT_CERTIFICATE_OFFSETS };
    updateContent(updatedContent);
    await persistOffsetsToSupabase(DEFAULT_CERTIFICATE_OFFSETS);
    setFeedback('✓ Certificado acomodado y guardado sin encimamientos');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Save to Supabase
  const handleSaveToSupabase = async () => {
    if (!isMasterAdmin) return;
    try {
      await saveDynamicContentAsync(content);
      setFeedback('¡Coordenadas guardadas exitosamente en Supabase!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      console.warn('Error saving to Supabase:', e);
      setFeedback('Error al guardar en Supabase');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Upload Background Image
  const handleUploadBgFile = async (file: File, target: 'front' | 'back' | 'litter') => {
    if (!isMasterAdmin) return;
    setIsUploadingBg(true);
    try {
      const url = await uploadCmsImage(file);
      let newContent = { ...content };
      if (target === 'front') newContent.certificateBackgroundUrl = url;
      if (target === 'back') newContent.certBackBackgroundUrl = url;
      if (target === 'litter') newContent.litterBackgroundUrl = url;

      // Ensure clean mode is true so background is 100% visible
      newContent.certCleanBackgroundMode = true;

      updateContent(newContent);
      await saveDynamicContentAsync(newContent);

      const targetLabel = target === 'front' ? 'Frente' : target === 'back' ? 'Reverso' : 'Camada';
      setFeedback(`¡Fondo de ${targetLabel} cargado y guardado en Supabase!`);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Error al cargar la imagen de fondo.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Remove Custom Background
  const handleRemoveBg = async (target: 'front' | 'back' | 'litter') => {
    if (!isMasterAdmin) return;
    let newContent = { ...content };
    if (target === 'front') newContent.certificateBackgroundUrl = '';
    if (target === 'back') newContent.certBackBackgroundUrl = '';
    if (target === 'litter') newContent.litterBackgroundUrl = '';
    updateContent(newContent);
    await saveDynamicContentAsync(newContent);
    setFeedback('Fondo personalizado eliminado');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Print Handler
  const handlePrint = (targetSide: DocumentViewMode = side) => {
    if (!canDownloadOrPrint) {
      setShowRestrictedModal(true);
      return;
    }
    setSide(targetSide);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Capture canvas helper for PDF & JPG with high-resolution scaling, CORS & font waiting
  const captureElementCanvas = async (elementId: string): Promise<HTMLCanvasElement> => {
    let el = document.getElementById(elementId);
    if (!el) {
      // Poll briefly in case React just toggled view mode to mount this element
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 120));
        el = document.getElementById(elementId);
        if (el) break;
      }
    }
    if (!el) {
      console.warn(`Elemento #${elementId} no encontrado en el DOM, creando canvas de respaldo`);
      const fallback = document.createElement('canvas');
      fallback.width = 800;
      fallback.height = 1130;
      const ctx = fallback.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 800, 1130);
      }
      return fallback;
    }

    // Ensure all web fonts are loaded
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    // Ensure images inside element are fully loaded and set crossOrigin anonymous
    const imgs = Array.from(el.querySelectorAll('img'));
    imgs.forEach((img) => {
      try {
        if (!img.crossOrigin) {
          img.crossOrigin = 'anonymous';
        }
      } catch {}
    });

    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 900);
        });
      })
    );

    try {
      return await html2canvas(el, {
        scale: 2, // 2x gives 200-300 DPI without exceeding browser canvas buffer limits
        useCORS: true,
        allowTaint: false, // CRITICAL: NEVER allow taint so toDataURL never throws SecurityError
        backgroundColor: '#FFFFFF',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        ignoreElements: (element) => {
          return (
            element.getAttribute('data-html2canvas-ignore') === 'true' ||
            element.classList.contains('canvas-edit-overlay')
          );
        },
      });
    } catch (firstErr) {
      console.warn('First html2canvas attempt failed, retrying with safe fallback:', firstErr);
      try {
        return await html2canvas(el, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#FFFFFF',
          logging: false,
        });
      } catch (secondErr) {
        console.warn('Second html2canvas attempt failed, generating clean vector canvas:', secondErr);
        const safeCanvas = document.createElement('canvas');
        safeCanvas.width = el.clientWidth || 800;
        safeCanvas.height = el.clientHeight || 1130;
        const ctx = safeCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, safeCanvas.width, safeCanvas.height);
        }
        return safeCanvas;
      }
    }
  };

  // Export PDF Handler (Supports Front, Back 4-Gen, Double-Sided, Litter, and Full Notarized Dossier)
  const handleExportPdf = async (targetMode: DocumentViewMode | 'dossier' = side) => {
    if (!canDownloadOrPrint) {
      setShowRestrictedModal(true);
      return;
    }
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfMenuOpen(false);
    setPdfExportProgress('Iniciando motor de exportación PDF...');

    const originalSide = side;
    const wasEditMode = isEditMode;

    try {
      // Temporarily deactivate visual edit mode so no dragging rings or helper banners are captured
      if (wasEditMode) {
        setIsEditMode(false);
      }

      const effectiveTargetMode: 'front' | 'back' | 'litter' | 'both' | 'dossier' | 'pvc' = 
        targetMode === 'tree' ? 'back' : targetMode;

      // Special export for Credencial PVC in CR80 standard dimensions
      if (effectiveTargetMode === 'pvc') {
        setPdfExportProgress('Capturando credencial oficial CR80 (85.6 x 54 mm)...');
        if (side !== 'pvc') {
          setSide('pvc');
          await new Promise((r) => setTimeout(r, 250));
        } else {
          await new Promise((r) => setTimeout(r, 120));
        }
        const canvas = await captureElementCanvas('printable-pvc');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [85.6, 54],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, 85.6, 54);
        pdf.save(`INBR_Credencial_PVC_${dog.regNumber || 'ID'}.pdf`);
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#FFE885', '#000000'],
          });
        } catch {}
        return;
      }

      // If exporting both sides or full dossier, mount both front and back
      if (effectiveTargetMode === 'both' || effectiveTargetMode === 'dossier') {
        if (side !== 'both') {
          setSide('both');
          await new Promise((r) => setTimeout(r, 350));
        } else {
          await new Promise((r) => setTimeout(r, 150));
        }
      } else if (side !== effectiveTargetMode) {
        setSide(effectiveTargetMode);
        await new Promise((r) => setTimeout(r, 250));
      } else {
        await new Promise((r) => setTimeout(r, 120));
      }

      await generatePedigreePdf({
        dog,
        pedigree,
        orientation: orientation === 'vertical' ? 'vertical' : 'horizontal',
        targetMode: effectiveTargetMode,
        captureFrontCanvas: () => captureElementCanvas('printable-front'),
        captureBackCanvas: () => captureElementCanvas('printable-back'),
        captureLitterCanvas: () => captureElementCanvas('printable-litter'),
        onProgress: (status) => setPdfExportProgress(status),
      });

      try {
        confetti({
          particleCount: 65,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#000000', '#FFFFFF'],
        });
      } catch {}
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      setFeedback('Hubo un retraso con imágenes externas. Descargando versión optimizada...');
      // Safe direct fallback download using jsPDF vector
      try {
        const cleanReg = dog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fallbackPdf = new jsPDF({
          orientation: orientation === 'vertical' ? 'portrait' : 'landscape',
          unit: 'mm',
          format: 'a4',
        });
        fallbackPdf.text(`INBR - CERTIFICADO OFICIAL: ${dog.name} (${dog.regNumber})`, 20, 30);
        fallbackPdf.text(`Raza: ${dog.breed} | Microchip: ${dog.microchip}`, 20, 40);
        fallbackPdf.text(`Propietario: ${dog.owner} | Criador: ${dog.breeder}`, 20, 50);
        fallbackPdf.save(`INBR_${cleanReg}_Oficial.pdf`);
      } catch {}
    } finally {
      setIsExportingPdf(false);
      setPdfExportProgress('');
      setSide(originalSide);
      if (wasEditMode) {
        setIsEditMode(true);
      }
    }
  };

  // Export JPG Handler
  const handleExportJpg = async (targetSide: 'front' | 'back' | 'litter' | 'pvc' = side === 'litter' ? 'litter' : side === 'back' ? 'back' : side === 'pvc' ? 'pvc' : 'front') => {
    if (!canDownloadOrPrint) {
      setShowRestrictedModal(true);
      return;
    }
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfMenuOpen(false);
    setPdfExportProgress('Generando imagen JPG oficial en alta resolución...');

    const originalSide = side;

    try {
      if (side !== targetSide && side !== 'both') {
        setSide(targetSide);
        await new Promise((r) => setTimeout(r, 250));
      } else {
        await new Promise((r) => setTimeout(r, 100));
      }

      const elementId = targetSide === 'front' ? 'printable-front' : targetSide === 'back' ? 'printable-back' : targetSide === 'pvc' ? 'printable-pvc' : 'printable-litter';
      const canvas = await captureElementCanvas(elementId);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const cleanReg = dog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `INBR_${targetSide === 'pvc' ? 'Credencial_PVC' : 'Certificado'}_${cleanReg}_${targetSide}.jpg`;

      const downloadLink = document.createElement('a');
      downloadLink.href = imgData;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#000000'],
        });
      } catch {}
    } catch (err) {
      console.error('Error al exportar JPG:', err);
      alert('Hubo un error al generar la imagen JPG.');
    } finally {
      setIsExportingPdf(false);
      setPdfExportProgress('');
      setSide(originalSide);
    }
  };

  // Helper for Draggable Items
  const DraggableField: React.FC<{
    fieldKey: string;
    label: string;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
  }> = ({ fieldKey, label, className = '', style = {}, children }) => {
    const fOffset = (liveOffsets as any)[fieldKey] || (offsets as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
    const isSelected = selectedField === fieldKey;

    const combinedStyle: React.CSSProperties = {
      ...style,
      transform: `translate(${fOffset.x || 0}px, ${fOffset.y || 0}px)`,
    };

    if (fOffset.fontSize) {
      combinedStyle.fontSize = `${fOffset.fontSize}px`;
    }

    if (!isEditMode) {
      return (
        <div style={combinedStyle} className={className}>
          {children}
        </div>
      );
    }

    return (
      <div
        onPointerDown={(e) => {
          if (!isMasterAdmin || !isEditMode) return;
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.pedigree-corner-handle')) return;
          e.stopPropagation();
          setSelectedField(fieldKey);
          setIsDragging(true);
          setDragStartPos({ x: e.clientX, y: e.clientY });
          const fOffset = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
          setDragStartOffset({ x: fOffset.x || 0, y: fOffset.y || 0 });
        }}
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            setSelectedField(fieldKey);
          }
        }}
        style={combinedStyle}
        className={`relative transition-shadow select-none touch-none ${className} ${
          isSelected
            ? 'ring-2 ring-emerald-400 bg-emerald-400/15 rounded cursor-grabbing shadow-lg z-30'
            : 'hover:ring-1 hover:ring-amber-400 hover:bg-amber-400/10 cursor-grab rounded'
        }`}
        title={`Arrastrar para mover "${label}". Arrastra de la esquina para cambiar tamaño.`}
      >
        {/* Floating control bar for active field */}
        {isSelected && (
          <div className="absolute -top-8 left-0 z-40 bg-black/95 text-[#FFE885] border border-[#D4AF37] px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 shadow-2xl whitespace-nowrap pointer-events-auto">
            <span className="font-bold text-white">{label}</span>
            <span className="text-neutral-400">({fOffset.x || 0}, {fOffset.y || 0})</span>
            
            <div className="flex items-center gap-0.5 border-l border-neutral-700 pl-1">
              <button
                type="button"
                onClick={(e) => adjustFontSize(fieldKey, -1, e)}
                className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-bold text-[10px]"
                title="Reducir tamaño de letra"
              >
                A-
              </button>
              <button
                type="button"
                onClick={(e) => adjustFontSize(fieldKey, 1, e)}
                className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-bold text-[10px]"
                title="Aumentar tamaño de letra"
              >
                A+
              </button>
            </div>

            <div className="flex items-center gap-0.5 border-l border-neutral-700 pl-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
                  const updated: CertificateLayoutOffsets = {
                    ...latestOffsetsRef.current,
                    [fieldKey]: { ...current, x: (current.x || 0) - 2 },
                  };
                  latestOffsetsRef.current = updated;
                  setLiveOffsets(updated);
                  updateContent({ ...content, certificateOffsets: updated });
                  persistOffsetsToSupabase(updated);
                }}
                className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px]"
                title="Mover a la izquierda"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
                  const updated: CertificateLayoutOffsets = {
                    ...latestOffsetsRef.current,
                    [fieldKey]: { ...current, x: (current.x || 0) + 2 },
                  };
                  latestOffsetsRef.current = updated;
                  setLiveOffsets(updated);
                  updateContent({ ...content, certificateOffsets: updated });
                  persistOffsetsToSupabase(updated);
                }}
                className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px]"
                title="Mover a la derecha"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
                  const updated: CertificateLayoutOffsets = {
                    ...latestOffsetsRef.current,
                    [fieldKey]: { ...current, y: (current.y || 0) - 2 },
                  };
                  latestOffsetsRef.current = updated;
                  setLiveOffsets(updated);
                  updateContent({ ...content, certificateOffsets: updated });
                  persistOffsetsToSupabase(updated);
                }}
                className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px]"
                title="Mover arriba"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = (latestOffsetsRef.current as any)[fieldKey] || { x: 0, y: 0, fontSize: 14 };
                  const updated: CertificateLayoutOffsets = {
                    ...latestOffsetsRef.current,
                    [fieldKey]: { ...current, y: (current.y || 0) + 2 },
                  };
                  latestOffsetsRef.current = updated;
                  setLiveOffsets(updated);
                  updateContent({ ...content, certificateOffsets: updated });
                  persistOffsetsToSupabase(updated);
                }}
                className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[9px]"
                title="Mover abajo"
              >
                ▼
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => resetFieldOffset(fieldKey, e)}
              className="px-1.5 py-0.5 hover:bg-red-900 text-red-300 rounded text-[9px] border-l border-neutral-700 pl-1"
              title="Restablecer posición (0, 0)"
            >
              Reset 0
            </button>
          </div>
        )}
        {children}

        {/* Corner resize handle with mouse */}
        {isEditMode && isSelected && (
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const startY = e.clientY;
              const startFontSize = fOffset.fontSize || 14;
              const handleMove = (moveEv: PointerEvent | MouseEvent) => {
                const dy = moveEv.clientY - startY;
                const newSize = Math.max(8, Math.min(64, Math.round(startFontSize + dy / 3)));
                const updated = {
                  ...latestOffsetsRef.current,
                  [fieldKey]: { ...(latestOffsetsRef.current as any)[fieldKey], fontSize: newSize },
                };
                latestOffsetsRef.current = updated;
                setLiveOffsets(updated);
              };
              const handleUp = () => {
                window.removeEventListener('pointermove', handleMove);
                window.removeEventListener('pointerup', handleUp);
                const final = latestOffsetsRef.current;
                updateContent({ ...content, certificateOffsets: final });
                persistOffsetsToSupabase(final);
              };
              window.addEventListener('pointermove', handleMove);
              window.addEventListener('pointerup', handleUp);
            }}
            className="pedigree-corner-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#D4AF37] border-2 border-black rounded-full cursor-se-resize shadow-md flex items-center justify-center opacity-90 hover:scale-125 z-40"
            title="Arrastra de la esquina con el ratón para cambiar el tamaño"
          >
            <Maximize2 className="w-2.5 h-2.5 text-black" />
          </div>
        )}
      </div>
    );
  };

  // Mock application puppies for litter sheet if dog has dam/sire
  const litterPuppies = [
    { id: '1', name: 'Cachorro #1 (Macho)', sex: 'Macho', color: dog.color || 'Champagne Tri', chip: `${dog.microchip.slice(0, 10)}01` },
    { id: '2', name: 'Cachorro #2 (Macho)', sex: 'Macho', color: 'Blue Fawn', chip: `${dog.microchip.slice(0, 10)}02` },
    { id: '3', name: 'Cachorro #3 (Macho)', sex: 'Macho', color: 'Lilac Tri Ghost', chip: `${dog.microchip.slice(0, 10)}03` },
    { id: '4', name: 'Cachorro #4 (Hembra)', sex: 'Hembra', color: dog.color || 'Champagne Tri', chip: `${dog.microchip.slice(0, 10)}04` },
    { id: '5', name: 'Cachorro #5 (Hembra)', sex: 'Hembra', color: 'Chocolate Tri', chip: `${dog.microchip.slice(0, 10)}05` },
    { id: '6', name: 'Cachorro #6 (Hembra)', sex: 'Hembra', color: 'Blue Ghost Tri', chip: `${dog.microchip.slice(0, 10)}06` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-md overflow-y-auto animate-fadeIn print:p-0 print:bg-white print:overflow-visible">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: none !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>

      {/* PDF Export Progress Modal */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn no-print">
          <div className="relative w-24 h-24 rounded-full border-2 border-[#D4AF37] p-1 mb-5 bg-[#120F09] flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.7)]">
            <Loader2 className="w-12 h-12 text-[#FFE885] animate-spin" />
            <div className="absolute inset-0 rounded-full border border-[#D4AF37] animate-ping opacity-25" />
          </div>
          <div className="max-w-md space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#D4AF37] block">
              Generador Oficial de Documentos • Motor jsPDF High-Res
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury tracking-wide">
              Exportando Certificado de Pedigrí
            </h3>
            <p className="text-xs sm:text-sm text-[#FFE885] font-mono mt-1 animate-pulse">
              {pdfExportProgress || 'Renderizando documento vectorial en alta resolución (300 DPI)...'}
            </p>
            <div className="mt-4 pt-3 border-t border-[#D4AF37]/30 flex flex-wrap items-center justify-center gap-3 text-[11px] text-neutral-400 font-mono">
              <span className="text-white font-bold">{dog.name}</span>
              <span>•</span>
              <span className="text-[#FFE885]">{dog.regNumber}</span>
              <span>•</span>
              <span className="text-neutral-300">A4 Oficial INBR</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal Window */}
      <div className="relative w-full max-w-7xl bg-[#0D0D0D] border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden my-4 sm:my-8 flex flex-col print-full-width print:border-none print:shadow-none print:my-0">
        
        {/* Navigation & Controls Top Bar (Compact 2-Strip Sticky Header) */}
        <div className="no-print bg-[#14120D] border-b border-[#D4AF37]/40 sticky top-0 z-30 shadow-md">
          {/* Fila 1: Regresar, Ejemplar Activo y Acciones Principales */}
          <div className="px-3 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-black text-[#FFE885] bg-[#221A0F] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black transition-all shadow cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Regresar</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 border border-neutral-800 min-w-0">
                <span className="text-xs font-bold text-white truncate max-w-[180px]">{dog.name}</span>
                <span className="text-[#D4AF37]">·</span>
                <span className="text-[11px] font-mono text-[#FFE885] font-bold shrink-0">{dog.regNumber}</span>
              </div>

              <a
                href={getMicrochipVerificationUrl(dog)}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#0B140F] border border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-400 cursor-pointer transition-all shrink-0"
                title={`Abrir verificación pública para ${dog.microchip || dog.regNumber}`}
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{dog.microchip || dog.regNumber}</span>
              </a>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {isMasterAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isEditMode
                        ? 'bg-emerald-500 text-black shadow-lg ring-2 ring-emerald-300'
                        : 'bg-[#1E180E] border border-[#D4AF37]/70 text-[#FFE885] hover:bg-[#2A2214]'
                    }`}
                    title="Activar para mover textos, logos y campos directamente con el ratón"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{isEditMode ? '✓ Mover ACTIVO' : 'Mover Campos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCustomTools((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      showCustomTools
                        ? 'bg-[#D4AF37] text-black font-black shadow'
                        : 'bg-[#14120D] border border-neutral-700 text-neutral-300 hover:text-[#FFE885] hover:border-[#D4AF37]'
                    }`}
                    title="Desplegar herramientas de fondo, foto, sello y reinicio de posiciones"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Personalizar</span>
                  </button>
                </>
              )}

              {!canDownloadOrPrint && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/70 border border-[#D4AF37]/50 text-[#FFE885] text-[11px] font-mono shadow-inner">
                  <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Solo Visualización Oficial</span>
                  <span className="sm:hidden">Solo Lectura</span>
                </div>
              )}

              {canDownloadOrPrint && (
                <>
                  <button
                    onClick={() => handleExportJpg(side === 'litter' ? 'litter' : side === 'back' ? 'back' : 'front')}
                    disabled={isExportingPdf}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>JPG</span>
                  </button>

                  <div className="relative">
                    <div className="inline-flex rounded-xl shadow">
                      <button
                        onClick={() => handleExportPdf(side === 'pvc' ? 'pvc' : side === 'back' ? 'back' : side === 'litter' ? 'litter' : side === 'both' ? 'both' : 'front')}
                        disabled={isExportingPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl text-xs font-black text-[#FFE885] bg-[#1F190D] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black transition-all cursor-pointer"
                        title="Descargar Certificado en formato PDF de alta resolución"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfMenuOpen(!pdfMenuOpen)}
                        disabled={isExportingPdf}
                        className="px-1.5 py-1.5 rounded-r-xl bg-[#2A2212] hover:bg-[#382D16] text-[#FFE885] border-t border-r border-b border-[#D4AF37] transition-all flex items-center justify-center cursor-pointer"
                        title="Más opciones de reporte PDF"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {pdfMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0F0F0F] border-2 border-[#D4AF37] shadow-2xl py-2 z-50 animate-fadeIn">
                        <button
                          onClick={() => handleExportPdf('dossier')}
                          className="w-full text-left px-4 py-2.5 text-xs text-[#FFE885] hover:bg-[#251D0F] flex items-center gap-2.5 font-bold border-b border-neutral-800 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white">Dossier y Reporte Notariado</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-gold-gradient text-black rounded font-black">3 PÁGS</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 font-normal block leading-tight">
                              Frente + Genograma 4 Gen + Dictamen Notariado
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={() => handleExportPdf('both')}
                          className="w-full text-left px-4 py-2.5 text-xs text-neutral-200 hover:bg-[#1E190E] hover:text-[#FFE885] flex items-center gap-2.5 font-bold transition-colors"
                        >
                          <Layers className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          <div>
                            <span>PDF Doble Cara (Frente + Reverso)</span>
                            <span className="text-[10px] text-neutral-400 font-normal block">Recomendado para impresión oficial</span>
                          </div>
                        </button>

                        <div className="border-t border-neutral-800 my-1" />

                        <button
                          onClick={() => handleExportPdf('front')}
                          className="w-full text-left px-4 py-2 text-xs text-neutral-200 hover:bg-[#1E190E] hover:text-[#FFE885] flex items-center gap-2.5 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          <span>PDF Solo Frente Oficial</span>
                        </button>

                        <button
                          onClick={() => handleExportPdf('back')}
                          className="w-full text-left px-4 py-2 text-xs text-neutral-200 hover:bg-[#1E190E] hover:text-[#FFE885] flex items-center gap-2.5 transition-colors"
                        >
                          <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          <span>PDF Solo Genograma (4 Generaciones)</span>
                        </button>

                        <button
                          onClick={() => handleExportPdf('litter')}
                          className="w-full text-left px-4 py-2 text-xs text-neutral-200 hover:bg-[#1E190E] hover:text-[#FFE885] flex items-center gap-2.5 transition-colors"
                        >
                          <Baby className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                          <span>PDF Registro Oficial de Camada</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePrint(side)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-neutral-200 bg-[#1A1A1A] border border-neutral-700 hover:text-white hover:border-[#D4AF37] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fila 2: Barra única deslizable de vistas del documento y orientación */}
          <div className="px-3 py-2 sm:px-4 flex items-center justify-between gap-2 overflow-x-auto bg-[#0D0B08]">
            <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
              <button
                onClick={() => setSide('front')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'front' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1. Frente</span>
              </button>

              <button
                onClick={() => setSide('back')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'back' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>2. Reverso (4G)</span>
              </button>

              <button
                onClick={() => setSide('litter')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'litter' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Baby className="w-3.5 h-3.5" />
                <span>3. Camada</span>
              </button>

              <button
                onClick={() => setSide('both')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'both' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Doble Cara</span>
              </button>

              <button
                onClick={() => setSide('tree')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'tree' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Dna className="w-3.5 h-3.5" />
                <span>4. Árbol 4G</span>
              </button>

              <button
                onClick={() => setSide('pvc')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  side === 'pvc' ? 'bg-gold-gradient text-black font-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>5. Credencial PVC</span>
              </button>
            </div>

            {side !== 'pvc' && side !== 'tree' && (
              <div className="flex items-center bg-[#080808] border border-[#D4AF37]/50 rounded-lg p-0.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('vertical')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    orientation === 'vertical'
                      ? 'bg-gold-gradient text-black font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Vertical
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationChange('horizontal')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    orientation === 'horizontal'
                      ? 'bg-gold-gradient text-black font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Horizontal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ADMIN TOOLBAR RETRÁCTIL: Solo visible al abrir Personalizar o Modo Mover */}
        {isMasterAdmin && (showCustomTools || isEditMode) && (
          <div className="no-print p-3 bg-[#100D08] border-b border-[#D4AF37] flex flex-wrap items-center justify-between gap-2.5 text-xs animate-fadeIn">
            {/* Toggles de Contenido & Fondos */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#FFE885] font-bold font-mono">Personalización:</span>

              {/* Toggle Foto */}
              <button
                type="button"
                onClick={() => {
                  const newContent = { ...content, showPhotoOnCert: !showPhoto };
                  updateContent(newContent);
                }}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                  showPhoto 
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
                    : 'bg-black border-neutral-700 text-neutral-400'
                }`}
                title="Mostrar u ocultar la foto del animal en el certificado"
              >
                {showPhoto ? '✓ Foto Activa' : 'Sin Foto (Solo Datos)'}
              </button>

              {/* Toggle Sello Notarial */}
              <button
                type="button"
                onClick={() => {
                  const newContent = { ...content, showNotarySealOnCert: !showNotarySeal };
                  updateContent(newContent);
                }}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                  showNotarySeal 
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
                    : 'bg-black border-neutral-700 text-neutral-400'
                }`}
                title="Mostrar u ocultar sellos y leyendas notariales"
              >
                {showNotarySeal ? '✓ Sello Notarial Visible' : 'Sin Sello Notarial'}
              </button>

              {/* Toggle Logo */}
              <button
                type="button"
                onClick={() => {
                  const newContent = { ...content, showLogoOnCert: !showLogo };
                  updateContent(newContent);
                }}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                  showLogo 
                    ? 'bg-[#221A0F] border-[#D4AF37] text-[#FFE885]' 
                    : 'bg-black border-neutral-700 text-neutral-400'
                }`}
              >
                {showLogo ? '✓ Logo INBR Activo' : 'Sin Logo'}
              </button>

              {/* Modo Fondo 100% Limpio (Sin recuadros ni franjas transparentes) */}
              <button
                type="button"
                onClick={() => {
                  const newContent = { ...content, certCleanBackgroundMode: !cleanBackgroundMode };
                  updateContent(newContent);
                }}
                className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                  cleanBackgroundMode 
                    ? 'bg-[#2E2210] border-[#D4AF37] text-[#FFE885]' 
                    : 'bg-black border-neutral-700 text-neutral-400'
                }`}
                title="Elimina cualquier recuadro o franja blanquizca para mostrar únicamente el fondo que tú subas"
              >
                {cleanBackgroundMode ? '✓ Fondo 100% Limpio (Sin recuadros)' : 'Con Recuadros Clásicos'}
              </button>

              {/* Ocultar Líneas de Árbol para Fondos Pre-impresos */}
              {(side === 'back' || side === 'both') && (
                <button
                  type="button"
                  onClick={() => {
                    const newContent = { ...content, hideTreeBordersOnCert: !hideTreeBorders };
                    updateContent(newContent);
                  }}
                  className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                    hideTreeBorders 
                      ? 'bg-[#2E2210] border-[#D4AF37] text-[#FFE885]' 
                      : 'bg-black border-neutral-700 text-neutral-400'
                  }`}
                  title="Oculta las líneas divisorias HTML para encajar directamente en fondos prediseñados"
                >
                  {hideTreeBorders ? '✓ Sin Líneas de Árbol' : 'Con Líneas de Árbol'}
                </button>
              )}

              {/* Selector de Archivo de Fondo para Frente */}
              {(side === 'front' || side === 'both') && (
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#221A0F] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black cursor-pointer font-bold">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingBg ? 'Subiendo...' : 'Cargar Fondo Frente (JPG/PNG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadBgFile(e.target.files[0], 'front');
                        }
                      }}
                    />
                  </label>
                  {certFrontBg && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBg('front')}
                      className="p-1 text-red-400 hover:text-red-200 hover:bg-neutral-800 rounded"
                      title="Quitar fondo personalizado de Frente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Selector de Archivo de Fondo para Reverso */}
              {(side === 'back' || side === 'both') && (
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#221A0F] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black cursor-pointer font-bold">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingBg ? 'Subiendo...' : 'Cargar Fondo Reverso (JPG/PNG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadBgFile(e.target.files[0], 'back');
                        }
                      }}
                    />
                  </label>
                  {certBackBg && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBg('back')}
                      className="p-1 text-red-400 hover:text-red-200 hover:bg-neutral-800 rounded"
                      title="Quitar fondo personalizado de Reverso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Selector de Archivo de Fondo para Camada */}
              {side === 'litter' && (
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#221A0F] border border-[#D4AF37] text-[#FFE885] hover:bg-gold-gradient hover:text-black cursor-pointer font-bold">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingBg ? 'Subiendo...' : 'Cargar Fondo Camada (JPG/PNG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadBgFile(e.target.files[0], 'litter');
                        }
                      }}
                    />
                  </label>
                  {litterBg && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBg('litter')}
                      className="p-1 text-red-400 hover:text-red-200 hover:bg-neutral-800 rounded"
                      title="Quitar fondo personalizado de Camada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Botones de Guardar en Supabase y Restablecer */}
            <div className="flex items-center gap-2">
              {feedback && (
                <span className="text-emerald-400 font-bold font-mono animate-pulse">
                  {feedback}
                </span>
              )}

              <button
                type="button"
                onClick={handleRecoverLogo}
                className="px-2.5 py-1 rounded bg-[#1E190E] border border-[#D4AF37]/70 text-[#FFE885] font-bold flex items-center gap-1 cursor-pointer"
                title="Centrar logotipo INBR"
              >
                <Crosshair className="w-3 h-3" />
                <span>Centrar Logo</span>
              </button>

              <button
                type="button"
                onClick={handleResetAllOffsets}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold flex items-center gap-1 cursor-pointer"
                title="Acomodar todos los campos a sus posiciones limpias sin encimamientos"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Acomodar Certificado (Reset 0)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToSupabase}
                className="px-3.5 py-1 rounded-lg bg-gold-gradient text-black font-black hover:brightness-110 shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar en Supabase</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARTE 1: FRENTE OFICIAL DEL CERTIFICADO DE REGISTRO INBR                  */}
        {/* ========================================================================= */}
        {(side === 'front' || side === 'both') && (
          <div className={`p-2 sm:p-6 bg-[#080808] flex justify-center print:p-0 print:bg-white overflow-x-auto ${side === 'both' ? 'page-break-after' : ''}`}>
            <div 
              id="printable-front"
              onDragOver={(e) => {
                if (isEditMode) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={handleCanvasDrop}
              className={`text-black relative overflow-hidden transition-all print-full-width flex flex-col ${
                orientation === 'vertical'
                  ? 'w-full max-w-[800px] min-h-[1130px] p-8 sm:p-12'
                  : 'w-full max-w-[1120px] min-h-[790px] p-8 sm:p-12'
              } ${
                certFrontBg
                  ? 'shadow-2xl border-none'
                  : cleanBackgroundMode
                    ? 'bg-white shadow-xl'
                    : 'bg-[#FCFAF5] shadow-2xl border-4 border-[#D4AF37] rounded-2xl'
              }`}
              style={{
                backgroundImage: certFrontBg ? `url("${certFrontBg}")` : undefined,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: certFrontBg ? 'transparent' : cleanBackgroundMode ? '#FFFFFF' : '#FCFAF5',
              }}
            >
              {/* Capa de Edición sobre el Canvas Frente (Visible solo en modo edición) */}
              {isEditMode && (
                <div 
                  data-html2canvas-ignore="true"
                  className="canvas-edit-overlay absolute inset-0 z-20 pointer-events-none border-2 border-dashed border-[#D4AF37]/60 rounded-xl overflow-hidden"
                >
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-black/90 backdrop-blur-md border border-[#D4AF37]/60 px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#FFE885] shadow-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold uppercase tracking-wider text-white">Capa de Edición Canvas Frente</span>
                      <span className="text-neutral-400 hidden sm:inline">• Arrastra y suelta para reposicionar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSavingToSupabase ? (
                        <span className="text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Guardando en Supabase...
                        </span>
                      ) : supabaseSyncStatus ? (
                        <span className="text-emerald-400 font-bold">{supabaseSyncStatus}</span>
                      ) : (
                        <span className="text-neutral-400">● Coordenadas listas para Supabase</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contenedor Interior Limpio: flex-1 asegura footer de firma siempre hasta abajo */}
              <div className="relative z-10 flex-1 flex flex-col justify-between gap-6">
                
                {/* Header Frente */}
                <div className="text-center pb-4 relative z-10 shrink-0">
                  {showLogo && (
                    <DraggableField 
                      fieldKey="logoOffset" 
                      label="Logo INBR"
                      className="inline-block"
                    >
                      <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-0.5 mx-auto mb-2 shadow-md bg-transparent overflow-hidden">
                        <img src="/logo-inbr.jpg" alt="Logo INBR" className="w-full h-full object-cover rounded-full" />
                      </div>
                    </DraggableField>
                  )}

                  <DraggableField 
                    fieldKey="headerTitleOffset" 
                    label="Título Encabezado"
                    className="block"
                  >
                    <h1 
                      className="font-serif font-black tracking-widest text-[#1A1A1A] uppercase inline-block"
                      style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                    >
                      International Breeds Registry
                    </h1>
                    <span className="text-xs font-mono text-[#8C6B1F] tracking-widest font-bold uppercase block mt-0.5">
                      Certificado Oficial de Registro Canino & Orígenes Notariados
                    </span>
                  </DraggableField>
                </div>

                {/* Canine Main Details */}
                <div className="grid gap-6 items-center py-4 grid-cols-12 relative z-10 my-auto">
                  {/* Canine Photo & QR (Opcional según showPhoto) */}
                  {showPhoto ? (
                    <div className="col-span-12 sm:col-span-4 flex flex-col items-center text-center space-y-3">
                      <DraggableField fieldKey="photoOffset" label="Foto Canina">
                        <div className="w-36 h-44 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-lg bg-black">
                          <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                        </div>
                      </DraggableField>

                      <DraggableField fieldKey="qrOffset" label="Código QR">
                        <PedigreeQrBadge
                          dog={dog}
                          size="md"
                          label="Verificación Digital"
                          onNavigateToVerification={(code) => {
                            onClose();
                            const el = document.getElementById('verificacion');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            window.location.hash = `verificacion?verify=${encodeURIComponent(code)}`;
                          }}
                        />
                      </DraggableField>
                    </div>
                  ) : (
                    <div className="col-span-12 sm:col-span-3 flex flex-col items-center justify-center p-2 text-center">
                      <DraggableField fieldKey="qrOffset" label="Código QR">
                        <PedigreeQrBadge
                          dog={dog}
                          size="lg"
                          label="Verificación Digital"
                          onNavigateToVerification={(code) => {
                            onClose();
                            const el = document.getElementById('verificacion');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                            window.location.hash = `verificacion?verify=${encodeURIComponent(code)}`;
                          }}
                        />
                      </DraggableField>
                    </div>
                  )}

                  {/* Identification Details (Sin recuadros blanquizcos) */}
                  <div className={`${showPhoto ? 'col-span-12 sm:col-span-8' : 'col-span-12 sm:col-span-9'} space-y-4 text-xs sm:text-sm`}>
                    
                    {/* Dog Name */}
                    <DraggableField fieldKey="dogNameOffset" label="Nombre Ejemplar" className="pb-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono block">
                        Nombre Registrado:
                      </span>
                      <h2 className="font-black text-[#1A1A1A] font-serif uppercase tracking-wide">
                        {dog.name || 'XXX'}
                      </h2>
                    </DraggableField>

                    <div className="grid grid-cols-2 gap-4 text-neutral-800">
                      {/* Reg Number */}
                      <DraggableField fieldKey="regNumberOffset" label="N° Registro">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">N° de Registro:</span>
                        <strong className="text-[#8C6B1F] font-mono">
                          {dog.regNumber || 'XXX'}
                        </strong>
                      </DraggableField>

                      {/* Microchip */}
                      <DraggableField fieldKey="microchipOffset" label="Microchip">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Microchip:</span>
                        <strong className="font-mono">
                          {dog.microchip || 'XXX'}
                        </strong>
                      </DraggableField>

                      {/* Breed */}
                      <DraggableField fieldKey="breedOffset" label="Raza">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Raza Reconocida:</span>
                        <span className="font-bold">
                          {dog.breed || 'XXX'} {dog.variety ? `(${dog.variety})` : ''}
                        </span>
                      </DraggableField>

                      {/* Color */}
                      <DraggableField fieldKey="colorOffset" label="Color">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Color / Patrón:</span>
                        <span className="font-medium">
                          {dog.color || 'XXX'}
                        </span>
                      </DraggableField>

                      {/* Gender */}
                      <DraggableField fieldKey="genderOffset" label="Sexo">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Sexo:</span>
                        <span className="font-medium">{dog.gender || 'XXX'}</span>
                      </DraggableField>

                      {/* DOB */}
                      <DraggableField fieldKey="dobOffset" label="Fecha Nacimiento">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Fecha de Nacimiento:</span>
                        <span className="font-mono font-medium">
                          {dog.dob || 'XXX'}
                        </span>
                      </DraggableField>
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-4 text-neutral-800">
                      {/* Owner */}
                      <DraggableField fieldKey="ownerOffset" label="Propietario">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Propietario Legal:</span>
                        <span className="font-bold truncate block">
                          {dog.owner || 'XXX'}
                        </span>
                      </DraggableField>

                      {/* Breeder */}
                      <DraggableField fieldKey="breederOffset" label="Criador">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Criador Registrado:</span>
                        <span className="font-medium truncate block">
                          {dog.breeder || 'XXX'}
                        </span>
                      </DraggableField>
                    </div>
                  </div>
                </div>

                {/* Footer Frente: Firmas y Sellos Notariados siempre al pie del documento */}
                <div className="mt-auto pt-6 border-t border-neutral-300/70 flex flex-wrap items-end justify-between text-xs text-neutral-600 gap-4 relative z-20 shrink-0">
                  {showNotarySeal ? (
                    <DraggableField fieldKey="sealOffset" label="Sello Notarial">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full border border-[#D4AF37] p-1 bg-gradient-to-tr from-[#8C6B1F] via-[#FFE885] to-[#D4AF37] flex items-center justify-center shadow">
                          <ShieldCheck className="w-7 h-7 text-black" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-[#8C6B1F] font-bold uppercase block">
                            CERTIFICACIÓN GENÉTICA NOTARIADA
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">
                            Folio Oficial • INBR Global
                          </span>
                        </div>
                      </div>
                    </DraggableField>
                  ) : <div />}

                  <DraggableField fieldKey="dateOffset" label="Firma Notarial" className="text-right relative z-20">
                    <div className="font-serif italic font-bold text-base text-[#1A1A1A] leading-tight">
                      Jonathan García
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-neutral-600 font-mono block border-t border-neutral-300 pt-1 mt-1">
                      Presidente / CEO Notario INBR
                    </span>
                  </DraggableField>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARTE 2: REVERSO OFICIAL (GENOGRAMA 4 GENERACIONES)                       */}
        {/* ========================================================================= */}
        {(side === 'back' || side === 'both') && (
          <div className="p-2 sm:p-6 bg-[#080808] flex justify-center print:p-0 print:bg-white overflow-x-auto">
            <div 
              id="printable-back"
              onDragOver={(e) => {
                if (isEditMode) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={handleCanvasDrop}
              className={`text-black relative overflow-hidden transition-all print-full-width flex flex-col ${
                orientation === 'vertical'
                  ? 'w-full max-w-[800px] min-h-[1130px] p-6 sm:p-10'
                  : 'w-full max-w-[1120px] min-h-[790px] p-6 sm:p-10'
              } ${
                certBackBg
                  ? 'shadow-2xl border-none'
                  : cleanBackgroundMode
                    ? 'bg-white shadow-xl'
                    : 'bg-[#FCFAF5] shadow-2xl border-4 border-[#D4AF37] rounded-2xl'
              }`}
              style={{ 
                backgroundImage: certBackBg ? `url("${certBackBg}")` : undefined,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: certBackBg ? 'transparent' : cleanBackgroundMode ? '#FFFFFF' : '#FCFAF5',
              }}
            >
              {/* Capa de Edición sobre el Canvas Reverso (Visible solo en modo edición) */}
              {isEditMode && (
                <div 
                  data-html2canvas-ignore="true"
                  className="canvas-edit-overlay absolute inset-0 z-20 pointer-events-none border-2 border-dashed border-[#D4AF37]/60 rounded-xl overflow-hidden"
                >
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-black/90 backdrop-blur-md border border-[#D4AF37]/60 px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#FFE885] shadow-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold uppercase tracking-wider text-white">Capa de Edición Genograma</span>
                      <span className="text-neutral-400 hidden sm:inline">• Arrastra y suelta para reposicionar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSavingToSupabase ? (
                        <span className="text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Guardando en Supabase...
                        </span>
                      ) : supabaseSyncStatus ? (
                        <span className="text-emerald-400 font-bold">{supabaseSyncStatus}</span>
                      ) : (
                        <span className="text-neutral-400">● Coordenadas listas para Supabase</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contenedor Interior Limpio: SIN franjas negras ni recuadros blanquizcos que tapen el papel */}
              <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
                
                {/* Header Reverso: Título y Datos Principales */}
                <div className="flex flex-wrap items-start justify-between pb-3 border-b border-neutral-300/80 gap-3">
                  <div className="space-y-1">
                    <DraggableField fieldKey="backHeaderOffset" label="Título Genograma">
                      <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight flex items-center gap-2 flex-wrap">
                        <span>Genograma / Genogram</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-black text-[#FFE885] font-mono font-black uppercase">
                          4 GENERACIONES OFICIALES
                        </span>
                        <button
                          type="button"
                          onClick={() => setSide('tree')}
                          className="no-print text-[10px] px-2.5 py-1 rounded-lg bg-gold-gradient text-black font-black uppercase flex items-center gap-1 hover:brightness-110 active:scale-95 shadow transition-all cursor-pointer"
                          title="Explorar árbol genealógico interactivo y expandible de 4 generaciones"
                        >
                          <Dna className="w-3.5 h-3.5 text-black" />
                          <span>Modo Árbol Interactivo 4G</span>
                        </button>
                      </h2>
                    </DraggableField>

                    <DraggableField fieldKey="backDogNameOffset" label="Datos Ejemplar Reverso">
                      <div className="text-left">
                        <strong className="text-base sm:text-lg font-serif uppercase tracking-wider text-[#1A1A1A]">
                          {dog.name}
                        </strong>
                        <span className="text-[10px] font-mono text-neutral-600 block">
                          REG: {dog.regNumber} | RAZA: {dog.breed}
                        </span>
                      </div>
                    </DraggableField>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {showLogo && (
                      <DraggableField fieldKey="backLogoOffset" label="Logo Reverso">
                        <div className="w-16 h-16 rounded-full border border-[#D4AF37] p-0.5 shadow bg-transparent overflow-hidden inline-block">
                          <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                        </div>
                      </DraggableField>
                    )}

                    <DraggableField fieldKey="backQrOffset" label="QR Reverso">
                      <PedigreeQrBadge
                        dog={dog}
                        size="sm"
                        label="QR Reverso"
                        showSubtitle={false}
                        onNavigateToVerification={(code) => {
                          onClose();
                          const el = document.getElementById('verificacion');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          window.location.hash = `verificacion?verify=${encodeURIComponent(code)}`;
                        }}
                      />
                    </DraggableField>
                  </div>
                </div>

                {/* ÁRBOL GENEALÓGICO DE 4 GENERACIONES (Sin fondos opacos) */}
                <div className="py-4 grid grid-cols-12 gap-3 text-[9.5px] leading-tight font-sans">
                  
                  {/* GEN 1: PADRES (Sire & Dam) */}
                  <div className={`col-span-3 flex flex-col justify-around py-2 border-r ${hideTreeBorders ? 'border-transparent' : 'border-neutral-300'} pr-2 space-y-10`}>
                    <DraggableField fieldKey="sireOffset" label="Padre / Sire (Gen 1)">
                      <div className="space-y-0.5">
                        <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                          PADRE / SIRE (GEN 1)
                        </span>
                        <strong className="text-black font-extrabold text-xs block leading-tight">
                          {pedigree.sire.name}
                        </strong>
                        <span className="text-neutral-600 font-semibold block text-[9.5px]">
                          {pedigree.sire.color}
                        </span>
                        <span className="text-neutral-500 font-mono text-[8px] block">
                          REG: {pedigree.sire.regNumber}
                        </span>
                      </div>
                    </DraggableField>

                    <DraggableField fieldKey="damOffset" label="Madre / Dam (Gen 1)">
                      <div className={`space-y-0.5 pt-4 border-t ${hideTreeBorders ? 'border-transparent' : 'border-neutral-300'}`}>
                        <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">
                          MADRE / DAM (GEN 1)
                        </span>
                        <strong className="text-black font-extrabold text-xs block leading-tight">
                          {pedigree.dam.name}
                        </strong>
                        <span className="text-neutral-600 font-semibold block text-[9.5px]">
                          {pedigree.dam.color}
                        </span>
                        <span className="text-neutral-500 font-mono text-[8px] block">
                          REG: {pedigree.dam.regNumber}
                        </span>
                      </div>
                    </DraggableField>
                  </div>

                  {/* GEN 2: ABUELOS (4) */}
                  <div className={`col-span-3 flex flex-col justify-between py-1 border-r ${hideTreeBorders ? 'border-transparent' : 'border-neutral-300'} pr-2 space-y-3`}>
                    <DraggableField fieldKey="grandparentsOffset" label="Abuelos (Gen 2)">
                      <div className="space-y-3">
                        <div>
                          <span className="text-[7.5px] uppercase font-bold text-neutral-400 font-mono block">Abuelo Pat.</span>
                          <strong className="text-neutral-900 font-bold block text-[10.5px] truncate">{pedigree.sireSire.name}</strong>
                          <span className="text-neutral-500 text-[8.5px] block">{pedigree.sireSire.color}</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] uppercase font-bold text-neutral-400 font-mono block">Abuela Pat.</span>
                          <strong className="text-neutral-900 font-bold block text-[10.5px] truncate">{pedigree.sireDam.name}</strong>
                          <span className="text-neutral-500 text-[8.5px] block">{pedigree.sireDam.color}</span>
                        </div>
                        <div className={`pt-2 border-t ${hideTreeBorders ? 'border-transparent' : 'border-neutral-200'}`}>
                          <span className="text-[7.5px] uppercase font-bold text-neutral-400 font-mono block">Abuelo Mat.</span>
                          <strong className="text-neutral-900 font-bold block text-[10.5px] truncate">{pedigree.damSire.name}</strong>
                          <span className="text-neutral-500 text-[8.5px] block">{pedigree.damSire.color}</span>
                        </div>
                        <div>
                          <span className="text-[7.5px] uppercase font-bold text-neutral-400 font-mono block">Abuela Mat.</span>
                          <strong className="text-neutral-900 font-bold block text-[10.5px] truncate">{pedigree.damDam.name}</strong>
                          <span className="text-neutral-500 text-[8.5px] block">{pedigree.damDam.color}</span>
                        </div>
                      </div>
                    </DraggableField>
                  </div>

                  {/* GEN 3: BISABUELOS (8) */}
                  <div className={`col-span-3 flex flex-col justify-between py-1 border-r ${hideTreeBorders ? 'border-transparent' : 'border-neutral-300'} pr-2 space-y-1.5 text-[9px]`}>
                    <DraggableField fieldKey="g3Offset" label="Bisabuelos (Gen 3)">
                      <div className="space-y-1.5">
                        {pedigree.g3.map((anc, idx) => (
                          <div key={idx} className={idx === 4 ? `pt-1 border-t ${hideTreeBorders ? 'border-transparent' : 'border-neutral-200'}` : ''}>
                            <strong className="text-neutral-900 block font-bold truncate">{anc.name}</strong>
                            <span className="text-neutral-500 text-[8px] block truncate">
                              {anc.regNumber && anc.regNumber !== '—' ? `${anc.regNumber} · ` : ''}{anc.color}
                            </span>
                          </div>
                        ))}
                      </div>
                    </DraggableField>
                  </div>

                  {/* GEN 4: TATARABUELOS (16) */}
                  <div className="col-span-3 flex flex-col justify-between py-0.5 space-y-1 text-[8px]">
                    <DraggableField fieldKey="g4Offset" label="Tatarabuelos (Gen 4)">
                      <div className="space-y-1">
                        {pedigree.g4.map((anc, idx) => (
                          <div key={idx} className={`flex items-center justify-between border-b ${hideTreeBorders ? 'border-transparent' : 'border-neutral-100'} pb-0.5`}>
                            <strong className="text-neutral-800 truncate font-mono text-[8px]">{anc.name}</strong>
                            <span className="text-neutral-400 text-[7px] font-mono shrink-0 ml-1">
                              {anc.regNumber && anc.regNumber !== '—' ? anc.regNumber : anc.color}
                            </span>
                          </div>
                        ))}
                      </div>
                    </DraggableField>
                  </div>
                </div>

                {/* Footer Reverso: Firmas */}
                <div className={`pt-2 border-t ${hideTreeBorders ? 'border-transparent' : 'border-neutral-300'}`}>
                  <DraggableField fieldKey="signaturesOffset" label="Firmas de Propietario">
                    <div className="grid grid-cols-2 gap-8 text-center text-[9px] text-neutral-600 mb-2">
                      <div>
                        <div className="border-b border-neutral-400 mb-1 h-5 flex items-end justify-center">
                          <span className="text-[10px] font-serif font-bold text-neutral-800">{dog.owner}</span>
                        </div>
                        <span className="font-bold uppercase tracking-wider block text-[8px] text-neutral-700">
                          NOMBRE Y FIRMA DEL PROPIETARIO / OWNER'S SIGNATURE
                        </span>
                      </div>

                      <div>
                        <div className="border-b border-neutral-400 mb-1 h-5" />
                        <span className="font-bold uppercase tracking-wider block text-[8px] text-neutral-700">
                          NOMBRE Y FIRMA DEL NUEVO PROPIETARIO / NEW OWNER'S SIGNATURE
                        </span>
                      </div>
                    </div>
                  </DraggableField>

                  <DraggableField fieldKey="legalTextOffset" label="Texto Legal">
                    <p className="text-[7.5px] text-neutral-500 text-justify leading-tight border-t border-neutral-200 pt-1 font-normal">
                      Fundado en 2022 por Jonathan Garcia, el International Breeds Registry (INBR) es una autoridad cinológica global. Todos los derechos reservados.
                    </p>
                  </DraggableField>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARTE 3: REGISTRO OFICIAL DE CAMADA (LITTER REGISTRATION APPLICATION)     */}
        {/* ========================================================================= */}
        {side === 'litter' && (
          <div className="p-2 sm:p-6 bg-[#080808] flex justify-center print:p-0 print:bg-white overflow-x-auto">
            <div 
              id="printable-litter"
              onDragOver={(e) => {
                if (isEditMode) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={handleCanvasDrop}
              className={`text-black relative overflow-hidden transition-all print-full-width flex flex-col ${
                orientation === 'vertical'
                  ? 'w-full max-w-[800px] min-h-[1130px] p-6 sm:p-10'
                  : 'w-full max-w-[1120px] min-h-[790px] p-6 sm:p-10'
              } ${
                litterBg
                  ? 'shadow-2xl border-none'
                  : cleanBackgroundMode
                    ? 'bg-white shadow-xl'
                    : 'bg-[#FCFAF5] shadow-2xl border-4 border-[#D4AF37] rounded-2xl'
              }`}
              style={{ 
                backgroundImage: litterBg ? `url("${litterBg}")` : undefined,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: litterBg ? 'transparent' : cleanBackgroundMode ? '#FFFFFF' : '#FCFAF5',
              }}
            >
              {/* Capa de Edición sobre el Canvas Camada (Visible solo en modo edición) */}
              {isEditMode && (
                <div 
                  data-html2canvas-ignore="true"
                  className="canvas-edit-overlay absolute inset-0 z-20 pointer-events-none border-2 border-dashed border-[#D4AF37]/60 rounded-xl overflow-hidden"
                >
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-black/90 backdrop-blur-md border border-[#D4AF37]/60 px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#FFE885] shadow-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold uppercase tracking-wider text-white">Capa de Edición Camada</span>
                      <span className="text-neutral-400 hidden sm:inline">• Arrastra y suelta para reposicionar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSavingToSupabase ? (
                        <span className="text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Guardando en Supabase...
                        </span>
                      ) : supabaseSyncStatus ? (
                        <span className="text-emerald-400 font-bold">{supabaseSyncStatus}</span>
                      ) : (
                        <span className="text-neutral-400">● Coordenadas listas para Supabase</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contenedor Interior Limpio */}
              <div className="relative z-10 flex-1 flex flex-col justify-between gap-4">
                
                {/* Header Camada */}
                <div className="flex items-start justify-between border-b border-neutral-300 pb-3 gap-3">
                  <div className="space-y-1">
                    <DraggableField fieldKey="litterTitleOffset" label="Título Acta Camada">
                      <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight font-serif uppercase">
                        Acta Oficial de Registro de Camada
                      </h2>
                      <span className="text-[10px] font-mono text-[#8C6B1F] tracking-widest font-bold uppercase block">
                        Official Litter Registration Application • INBR Kennel Club
                      </span>
                    </DraggableField>
                  </div>

                  <div className="flex items-center gap-3">
                    {showLogo && (
                      <DraggableField fieldKey="litterLogoOffset" label="Logo Camada">
                        <div className="w-14 h-14 rounded-full border border-[#D4AF37] p-0.5 shadow bg-transparent overflow-hidden">
                          <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                        </div>
                      </DraggableField>
                    )}

                    <DraggableField fieldKey="litterQrOffset" label="QR Camada">
                      <PedigreeQrBadge
                        dog={dog}
                        size="sm"
                        label="QR Camada"
                        showSubtitle={false}
                        onNavigateToVerification={(code) => {
                          onClose();
                          const el = document.getElementById('verificacion');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                          window.location.hash = `verificacion?verify=${encodeURIComponent(code)}`;
                        }}
                      />
                    </DraggableField>
                  </div>
                </div>

                {/* Datos de los Padres y Criador */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <DraggableField fieldKey="litterMotherOffset" label="Datos Madre">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block font-mono">MADRE / DAM:</span>
                      <strong className="text-black text-sm block">{pedigree.dam.name}</strong>
                      <span className="text-neutral-500 font-mono text-[10px] block">REG: {pedigree.dam.regNumber}</span>
                    </div>
                  </DraggableField>

                  <DraggableField fieldKey="litterFatherOffset" label="Datos Padre">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block font-mono">PADRE / SIRE:</span>
                      <strong className="text-black text-sm block">{pedigree.sire.name}</strong>
                      <span className="text-neutral-500 font-mono text-[10px] block">REG: {pedigree.sire.regNumber}</span>
                    </div>
                  </DraggableField>

                  <DraggableField fieldKey="litterBreederOffset" label="Datos Criadero">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block font-mono">CRIADOR / KENNEL:</span>
                      <strong className="text-black text-xs block">{dog.breeder || dog.owner}</strong>
                      <span className="text-neutral-500 text-[10px] block">{dog.country || 'México / USA'}</span>
                    </div>
                  </DraggableField>

                  <DraggableField fieldKey="litterDobOffset" label="Fecha Nac. Camada">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-neutral-500 block font-mono">FECHA NACIMIENTO:</span>
                      <strong className="text-black font-mono text-xs block">{dog.dob}</strong>
                      <span className="text-neutral-500 text-[10px] block">Total: 6 Cachorros</span>
                    </div>
                  </DraggableField>
                </div>

                {/* Tabla de Cachorros Registrados */}
                <DraggableField fieldKey="litterPuppiesOffset" label="Tabla de Cachorros" className="my-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-neutral-300">
                      <thead>
                        <tr className="bg-neutral-100 text-neutral-700 font-mono text-[9px] uppercase border-b border-neutral-300">
                          <th className="p-2 border-r border-neutral-300">#</th>
                          <th className="p-2 border-r border-neutral-300">Nombre Temporal / Identificador</th>
                          <th className="p-2 border-r border-neutral-300">Sexo</th>
                          <th className="p-2 border-r border-neutral-300">Color / Patrón</th>
                          <th className="p-2">Microchip Notariado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {litterPuppies.map((pup, idx) => (
                          <tr key={pup.id} className="hover:bg-neutral-50/50">
                            <td className="p-2 border-r border-neutral-300 font-mono font-bold text-[10px]">{idx + 1}</td>
                            <td className="p-2 border-r border-neutral-300 font-bold">{pup.name}</td>
                            <td className="p-2 border-r border-neutral-300">{pup.sex}</td>
                            <td className="p-2 border-r border-neutral-300">{pup.color}</td>
                            <td className="p-2 font-mono text-[10px] text-[#8C6B1F] font-bold">{pup.chip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DraggableField>

                {/* Firmas de Camada */}
                <DraggableField fieldKey="litterSignaturesOffset" label="Firmas Camada" className="pt-3 border-t border-neutral-300">
                  <div className="grid grid-cols-2 gap-8 text-center text-[9px] text-neutral-600">
                    <div>
                      <div className="border-b border-neutral-400 mb-1 h-6 flex items-end justify-center">
                        <span className="text-[10px] font-serif font-bold text-neutral-800">{dog.breeder || dog.owner}</span>
                      </div>
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-neutral-700">
                        FIRMA DEL CRIADOR RESPONSABLE
                      </span>
                    </div>

                    <div>
                      <div className="border-b border-neutral-400 mb-1 h-6 flex items-end justify-center">
                        <span className="text-[10px] font-serif italic font-bold text-neutral-800">Jonathan García</span>
                      </div>
                      <span className="font-bold uppercase tracking-wider block text-[8px] text-neutral-700">
                        INSPECCIÓN Y NOTARIO INBR KENNEL CLUB
                      </span>
                    </div>
                  </div>
                </DraggableField>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARTE 4: ÁRBOL GENEALÓGICO INTERACTIVO & EXPANDIBLE (4 GENERACIONES)       */}
        {/* ========================================================================= */}
        {side === 'tree' && dog && (
          <div className="p-3 sm:p-6 bg-[#080808] flex justify-center">
            <div className="w-full max-w-7xl animate-fadeIn">
              <InteractivePedigreeTree
                dog={dog}
                onSelectDog={(selectedAncestor) => {
                  // Allow inspecting ancestor as the root proband
                }}
                onOpenCertificate={() => {
                  setSide('front');
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PARTE 5: CREDENCIAL PVC OFICIAL (ID CR80 DE BOLSILLO 85.6 x 54 mm)        */}
        {/* ========================================================================= */}
        <div className={`p-4 sm:p-8 bg-[#080808] flex flex-col items-center justify-center ${side === 'pvc' ? 'block animate-fadeIn' : 'hidden'}`}>
          <div className="text-center mb-4">
            <span className="text-xs font-mono text-[#D4AF37] font-bold uppercase tracking-wider block">
              Credencial Oficial Plastificada PVC (Estándar CR80 ISO/IEC 7810)
            </span>
            <p className="text-xs text-neutral-400 mt-0.5">
              Formato oficial de bolsillo notariado. Medidas exactas: 85.6 mm × 53.98 mm.
            </p>
          </div>

          <div
            id="printable-pvc"
            className="w-[430px] h-[270px] rounded-2xl p-4 bg-gradient-to-br from-[#1C180E] via-[#0D0D0D] to-[#221B0F] border-2 border-[#D4AF37] shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.35)] relative overflow-hidden flex flex-col justify-between text-white shrink-0 select-none"
            style={{
              backgroundImage: content.pvcBackgroundUrl ? `url("${content.pvcBackgroundUrl}")` : undefined,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
            }}
          >
            {/* Watermark default */}
            {!content.pvcBackgroundUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <img src="/logo-inbr.jpg" alt="Watermark" className="w-52 h-52 object-cover rounded-full" />
              </div>
            )}

            {/* Header PVC */}
            <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/50 relative z-10">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-9 h-9 rounded-full border border-[#D4AF37] p-0.5 bg-black overflow-hidden shadow"
                  style={{
                    transform: `translate(${offsets.pvcLogoOffset?.x || 0}px, ${offsets.pvcLogoOffset?.y || 0}px)`,
                  }}
                >
                  <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                </div>
                <div>
                  <span className="text-[11px] font-black tracking-wider text-gold-gradient uppercase block leading-none">
                    INTERNATIONAL BREEDS REGISTRY
                  </span>
                  <span className="text-[8px] font-mono text-[#FFE885]">CREDENTIAL ID • NOTARIADA</span>
                </div>
              </div>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885] font-bold">
                OFICIAL
              </span>
            </div>

            {/* Canine Details PVC */}
            <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
              <div className="col-span-4 flex flex-col items-center">
                <div 
                  className="w-20 h-24 rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-black shadow-lg"
                  style={{
                    transform: `translate(${offsets.pvcPhotoOffset?.x || 0}px, ${offsets.pvcPhotoOffset?.y || 0}px)`,
                  }}
                >
                  <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="col-span-8 space-y-1 text-left">
                <h5 
                  className="text-sm font-black text-white font-serif tracking-wide truncate"
                  style={{
                    transform: `translate(${offsets.pvcNameOffset?.x || 0}px, ${offsets.pvcNameOffset?.y || 0}px)`,
                    fontSize: `${offsets.pvcNameOffset?.fontSize || 14}px`,
                  }}
                >
                  {dog.name}
                </h5>
                <div className="text-[10px] space-y-0.5 text-neutral-300 font-mono">
                  <div 
                    style={{ transform: `translate(${offsets.pvcRegOffset?.x || 0}px, ${offsets.pvcRegOffset?.y || 0}px)` }}
                  >
                    <span className="text-neutral-500">REG:</span> <strong className="text-[#FFE885]">{dog.regNumber}</strong>
                  </div>
                  <div
                    style={{ transform: `translate(${offsets.pvcChipOffset?.x || 0}px, ${offsets.pvcChipOffset?.y || 0}px)` }}
                  >
                    <span className="text-neutral-500">CHIP:</span> <span>{dog.microchip}</span>
                  </div>
                  <div
                    style={{ transform: `translate(${offsets.pvcBreedOffset?.x || 0}px, ${offsets.pvcBreedOffset?.y || 0}px)` }}
                  >
                    <span className="text-neutral-500">RAZA:</span> <span>{dog.breed}</span>
                  </div>
                  <div
                    style={{ transform: `translate(${offsets.pvcColorOffset?.x || 0}px, ${offsets.pvcColorOffset?.y || 0}px)` }}
                  >
                    <span className="text-neutral-500">COLOR:</span> <span>{dog.color}</span>
                  </div>
                  <div
                    style={{ transform: `translate(${offsets.pvcDobOffset?.x || 0}px, ${offsets.pvcDobOffset?.y || 0}px)` }}
                  >
                    <span className="text-neutral-500">NAC:</span> <span>{dog.dob}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer PVC */}
            <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/40 text-[8px] font-mono text-neutral-400 relative z-10">
              <span style={{ transform: `translate(${offsets.pvcOwnerOffset?.x || 0}px, ${offsets.pvcOwnerOffset?.y || 0}px)` }}>
                PROP: {dog.owner}
              </span>
              <div 
                className="flex items-center gap-1.5"
                style={{ transform: `translate(${offsets.pvcQrOffset?.x || 0}px, ${offsets.pvcQrOffset?.y || 0}px)` }}
              >
                <span className="text-[#FFE885] font-bold">INBR OFICIAL • 2026</span>
              </div>
            </div>
          </div>

          {canDownloadOrPrint ? (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => handleExportPdf('pvc')}
                disabled={isExportingPdf}
                className="px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF Credencial CR80</span>
              </button>
              <button
                onClick={() => handleExportJpg('pvc')}
                disabled={isExportingPdf}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border border-[#D4AF37] hover:bg-[#2A2214] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Descargar JPG Credencial</span>
              </button>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-neutral-400">
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Credencial PVC Oficial Registrada • Descarga restringida a Representantes</span>
            </div>
          )}
        </div>

        {/* Bottom Floating Footer */}
        <div className="no-print p-4 bg-[#14120D] border-t border-[#D4AF37]/40 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-[#FFE885] bg-[#221A0F] border-2 border-[#D4AF37] hover:bg-gold-gradient hover:text-black hover:scale-105 active:scale-95 transition-all shadow cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Regresar a la Plataforma</span>
          </button>

          {canDownloadOrPrint ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePrint('front')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 transition-all border border-neutral-600 cursor-pointer"
              >
                Imprimir Frente
              </button>

              <button
                onClick={() => handlePrint('back')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 transition-all border border-neutral-600 cursor-pointer"
              >
                Imprimir Reverso
              </button>

              <button
                onClick={() => handlePrint('litter')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-700 transition-all border border-neutral-600 cursor-pointer"
              >
                Imprimir Camada
              </button>

              <button
                onClick={() => handleExportJpg(side === 'litter' ? 'litter' : side === 'back' ? 'back' : 'front')}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Generar JPG</span>
              </button>

              <button
                onClick={() => handleExportPdf(side === 'front' ? 'both' : side)}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-[#FFE885] bg-[#1E180E] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black transition-all shadow-lg cursor-pointer"
                title="Descargar Certificado en PDF (Doble Cara)"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => handleExportPdf('dossier')}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                title="Exportar Expediente Genealógico y Ficha Técnica Notariada Completa (3 Páginas)"
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>Dossier Notariado (PDF)</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Ejemplar Oficial en Sistema INBR • Consulta de autenticidad en tiempo real</span>
            </div>
          )}
        </div>

        {/* Modal de Descarga Restringida para Usuarios sin Permiso */}
        {showRestrictedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-lg bg-[#0F0D09] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.4)] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D2311] to-[#120F08] border-2 border-[#D4AF37] flex items-center justify-center mx-auto shadow-lg text-[#FFE885]">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-widest block mb-1">
                  SEGURIDAD NOTARIAL INBR • PROTOCOLO OFICIAL
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-white font-serif-luxury tracking-wide">
                  Descarga Notarial Restringida
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-black/70 border border-neutral-800 text-xs text-neutral-300 text-left space-y-2 leading-relaxed">
                <p>
                  <strong>Acceso para Clientes y Público General:</strong> La consulta, árbol de 4 generaciones, microchips y autenticidad se encuentran <strong>100% verificados y visibles en pantalla</strong>.
                </p>
                <p className="text-neutral-400">
                  <strong>Emisión Física y Archivos PDF/JPG:</strong> La descarga y generación está reservada para la Presidencia de la INBR y los Representantes con autorización explícita.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setShowRestrictedModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-neutral-400 bg-neutral-900 border border-neutral-700 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Continuar Consulta en Pantalla
                </button>

                {onOpenAdminPanel && (
                  <button
                    onClick={() => {
                      setShowRestrictedModal(false);
                      onClose();
                      onOpenAdminPanel();
                    }}
                    className="flex-1 py-3 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Acceso para Representantes</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
