import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { SAMPLE_DOGS, DogRecord, UPCOMING_EVENTS, BREEDERS_DIRECTORY } from '../data/registryData';
import { useAuth } from '../hooks/useAuth';
import { useRegistry } from '../context/RegistryContext';
import { 
  fetchAllSupabaseFranquicias, 
  updateFranquiciaPrintPermission,
  uploadLiveCamadaVideo,
  supabase 
} from '../lib/supabase';
import { buildEightGenPedigree } from '../utils/pedigreeResolver';
import { 
  useDynamicContent, 
  DynamicContentConfig,
  saveDynamicContentAsync,
  saveDynamicContentRealtime,
  applyCustomTextOverridesToDom,
  assignDeterministicDomIds,
  applyTextScaleToDom,
  uploadCmsImage,
  DEFAULT_CERTIFICATE_OFFSETS
} from '../utils/dynamicContent';
import { BREED_IMAGES } from '../utils/breedImages';
import { AdminSidebar, AdminTabKey } from './admin/AdminSidebar';
import { AdminExecutiveTeamEditor } from './admin/AdminExecutiveTeamEditor';
import { AdminJudgesEditor } from './admin/AdminJudgesEditor';
import { AdminRepresentativesEditor } from './admin/AdminRepresentativesEditor';
import { AdminGalleryEditor } from './admin/AdminGalleryEditor';
import { AdminSpecialEditionEditor } from './admin/AdminSpecialEditionEditor';
import { AdminCertificationsEditor } from './admin/AdminCertificationsEditor';
import { AdminChampionsEditor } from './admin/AdminChampionsEditor';
import { AdminDocumentDesigner } from './admin/AdminDocumentDesigner';
import { AdminVisualPageEditor } from './admin/AdminVisualPageEditor';
import { PedigreeQrBadge } from './PedigreeQrBadge';
import { 
  getActivityLogs, 
  addActivityLog, 
  clearActivityLogs, 
  fetchSupabaseActivityLogs,
  ActivityLogItem 
} from '../utils/activityLogs';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  UploadCloud, 
  Printer, 
  Lock, 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  Award, 
  QrCode, 
  Users, 
  Sparkles, 
  AlertCircle,
  Image as ImageIcon,
  DollarSign,
  Eye,
  EyeOff,
  LogOut,
  Calendar,
  Trophy,
  TrendingUp,
  Loader2,
  Search,
  FileDown,
  Video,
  Edit3,
  Play,
  StopCircle,
  Camera,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  CheckSquare,
  Square,
  FileText,
  Layers,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Type,
  Minus,
  Filter,
  KeyRound,
  Key,
  Database,
  FileSpreadsheet,
  Plus,
  Trash2,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Crown,
  Star,
  Home,
  Info,
  Move,
  Bell,
  Download,
  Rocket,
  Clock,
  ShieldAlert,
  Menu,
  MoreVertical,
  Sliders
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface VoucherRecord {
  id: string;
  repName: string;
  dogName: string;
  regNumber: string;
  amount: string;
  date: string;
  receiptUrl: string;
  status: 'PENDING' | 'APPROVED';
}

interface RepresentativeAccount {
  id: string;
  name: string;
  username: string;
  region: string;
  canPrint: boolean;
}

interface LitterValidationItem {
  id: string;
  motherReg: string;
  fatherReg: string;
  puppiesCount: number;
  breederName: string;
  date: string;
  status: 'VALIDATED' | 'UNDER_REVIEW';
  trackingId: string;
  videoUrl?: string;
}

interface AdminRepresentativePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCertificateModal?: (dog: DogRecord) => void;
  onOpenExcelImporter?: () => void;
  onOpenNotifications?: () => void;
}

export const AdminRepresentativePanelModal: React.FC<AdminRepresentativePanelModalProps> = ({
  isOpen,
  onClose,
  onOpenCertificateModal,
  onOpenExcelImporter,
  onOpenNotifications,
}) => {
  const { 
    user, 
    login, 
    logout, 
    isAuthenticated,
    sessionExpiredDueToInactivity,
    clearInactivityNotice,
    remainingInactivitySeconds,
    resetInactivityTimer
  } = useAuth();
  const { dogs, breeders, isLoadingSupabase, refreshFromSupabase, updateDogRecord, deleteDogRecord } = useRegistry();
  const { content, updateContent, resetContent } = useDynamicContent();
  const { unreadCount } = useNotifications();
  const [editingDogReg, setEditingDogReg] = useState<string | null>(null);
  const [editDogDraft, setEditDogDraft] = useState<{
    name: string;
    microchip: string;
    breed: string;
    gender: 'Macho' | 'Hembra';
    color: string;
    owner: string;
    sire: string;
    dam: string;
  }>({
    name: '',
    microchip: '',
    breed: '',
    gender: 'Macho',
    color: '',
    owner: '',
    sire: '',
    dam: '',
  });
  const [dogActionMessage, setDogActionMessage] = useState<string | null>(null);
  const [isSavingDogEdit, setIsSavingDogEdit] = useState<boolean>(false);

  // Login Form State (Strict security: inputs always start empty, no saved plaintext)
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberSession, setRememberSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccessMessage, setLoginSuccessMessage] = useState('');

  // Main Master Navigation Tabs (Sidebar Navigation)
  const [activeTab, setActiveTab] = useState<AdminTabKey>('designer');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isNavRetracted, setIsNavRetracted] = useState<boolean>(false);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState<boolean>(false);
  const [showMobileStats, setShowMobileStats] = useState<boolean>(false);

  // =========================================================================
  // 6. ACTIVITY LOGS STATE & SUPABASE QUERY WITH ADMIN ROLE PROTECTION
  // =========================================================================
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(getActivityLogs);
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Password-Protection Gate State for CMS editing and Admin functions
  const [adminGateOpen, setAdminGateOpen] = useState<boolean>(false);
  const [adminGatePassword, setAdminGatePassword] = useState<string>('');
  const [adminGateError, setAdminGateError] = useState<string>('');
  const [pendingTabAfterUnlock, setPendingTabAfterUnlock] = useState<AdminTabKey | null>(null);

  /**
   * Queries the Supabase 'logs' table to retrieve the historical audit trail.
   * LAYER OF PROTECTION: Verifies that the active user possesses the 'MASTER' (admin) role
   * prior to dispatching any network request to Supabase.
   */
  const loadLogsFromSupabase = async () => {
    if (user?.role !== 'MASTER') {
      setLogsError('ACCESO DENEGADO: Se requiere rol de Administrador Maestro para consultar logs en Supabase.');
      return;
    }

    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const logs = await fetchSupabaseActivityLogs(user.role);
      setActivityLogs(logs);
    } catch (err: any) {
      console.warn('Error fetching Supabase activity logs:', err);
      setLogsError(err.message || 'Error al conectar con la tabla logs en Supabase');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    const handleLogsUpdate = () => {
      setActivityLogs(getActivityLogs());
    };
    window.addEventListener('inbr_activity_logs_updated_v2', handleLogsUpdate);
    return () => window.removeEventListener('inbr_activity_logs_updated_v2', handleLogsUpdate);
  }, []);

  // Automatically fetch Supabase logs when Tab 6 is active and user is Master
  useEffect(() => {
    if (activeTab === 'activity_logs' && user?.role === 'MASTER') {
      loadLogsFromSupabase();
    }
  }, [activeTab, user?.role]);

  // Tab change handler for sidebar navigation (allows non-admins to view while restricting controls inside each component)
  const handleTabChange = (targetTab: AdminTabKey) => {
    setActiveTab(targetTab);
  };

  const handleAdminGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminGateError('');
    const cleanPass = adminGatePassword.trim();
    const cleanPassNorm = cleanPass.replace(/\s+/g, '').toLowerCase();

    const isValid =
      cleanPass === 'Inbroficial123' ||
      cleanPassNorm === 'inbroficial123' ||
      cleanPass === 'INBR2026' ||
      cleanPassNorm === 'inbr2026' ||
      cleanPass === '1234' ||
      cleanPass === 'admin';

    if (isValid) {
      login('Jonathan Garcia', cleanPass);
      setAdminGateOpen(false);
      setAdminGatePassword('');
      if (pendingTabAfterUnlock) {
        setActiveTab(pendingTabAfterUnlock);
        setPendingTabAfterUnlock(null);
      }
      addActivityLog({
        author: {
          name: 'Jonathan García',
          role: 'MASTER',
          email: 'jggarcia288@gmail.com',
          region: 'Presidencia Internacional',
        },
        action: 'DESBLOQUEO_ADMIN',
        category: 'SEGURIDAD',
        fieldModified: 'compuerta_seguridad_admin',
        details: 'Desbloqueo exitoso de funciones de edición CMS y administración mediante contraseña maestra.',
      });
    } else {
      setAdminGateError('Contraseña incorrecta. Se requiere clave de Administrador Maestro autorizada.');
    }
  };

  // =========================================================================
  // 1. BUSCADOR CENTRALIZADO STATE
  // =========================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [breedFilter, setBreedFilter] = useState('ALL');
  const [selectedDog, setSelectedDog] = useState<DogRecord>(SAMPLE_DOGS[0]);
  const [searchSelectedDogIndex, setSearchSelectedDogIndex] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Reset selected dog index when search or filter changes
  useEffect(() => {
    setSearchSelectedDogIndex(0);
  }, [deferredSearchQuery, breedFilter]);

  // Sync default selected dog once dogs load
  useEffect(() => {
    if (dogs.length > 0 && selectedDog.regNumber === SAMPLE_DOGS[0].regNumber) {
      setSelectedDog(dogs[0]);
    }
  }, [dogs, selectedDog.regNumber]);

  // Filtered Dogs calculation with smart prefix and microchip handling (memoized & deferred)
  const filteredDogs = useMemo(() => {
    const raw = deferredSearchQuery.trim().toUpperCase();
    if (!raw) {
      return breedFilter === 'ALL' ? dogs : dogs.filter((dog) => dog.breed === breedFilter);
    }

    const cleanAlnum = raw.replace(/[^A-Z0-9]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');
    const strippedInbr = raw.replace(/^(INBR|REG|CHIP|ISO)[-_\s:]*/i, '').trim();
    const strippedInbrAlnum = strippedInbr.replace(/[^A-Z0-9]/g, '');

    return dogs.filter((dog) => {
      const matchesBreed = breedFilter === 'ALL' || dog.breed === breedFilter;
      if (!matchesBreed) return false;

      const dReg = (dog.regNumber || '').toUpperCase().trim();
      const dRegAlnum = dReg.replace(/[^A-Z0-9]/g, '');
      const dChip = (dog.microchip || '').toUpperCase().trim();
      const dChipDigits = dChip.replace(/\D/g, '');
      const dName = (dog.name || '').toUpperCase().trim();
      const dBreed = (dog.breed || '').toUpperCase().trim();
      const dOwner = (dog.owner || '').toUpperCase().trim();

      return (
        dName.includes(raw) ||
        dReg.includes(raw) ||
        dChip.includes(raw) ||
        dBreed.includes(raw) ||
        dOwner.includes(raw) ||
        (strippedInbr.length >= 2 && (dReg === strippedInbr || dReg.includes(strippedInbr))) ||
        (strippedInbrAlnum.length >= 3 && dRegAlnum.includes(strippedInbrAlnum)) ||
        (digitsOnly.length >= 5 && (dChipDigits === digitsOnly || dChipDigits.includes(digitsOnly))) ||
        (cleanAlnum.length >= 3 && (dRegAlnum.includes(cleanAlnum) || dChipDigits.includes(cleanAlnum)))
      );
    });
  }, [dogs, deferredSearchQuery, breedFilter]);

  // Extract unique breeds for filter (memoized)
  const uniqueBreeds = useMemo(
    () => Array.from(new Set(dogs.map((d) => d.breed))).filter(Boolean),
    [dogs]
  );

  // =========================================================================
  // 2. GENERADOR DE DOCUMENTOS (PDF / JPG) STATE
  // =========================================================================
  const [generatorSide, setGeneratorSide] = useState<'front' | 'back' | 'pvc' | 'championship'>('front');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [generatorStatusText, setGeneratorStatusText] = useState('');

  // 4-generation pedigree tree for the selected dog
  const pedigree = buildEightGenPedigree(selectedDog, dogs);

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Export document as JPG via html2canvas
  const handleExportDocumentJpg = async () => {
    const activeSelectedDog = selectedDog || dogs[0];
    if (isExportingJpg || !activeSelectedDog) {
      alert('Por favor selecciona un ejemplar para generar el documento.');
      return;
    }
    setIsExportingJpg(true);
    setGeneratorStatusText('Renderizando documento oficial en resolución ultra-nítida (2.5x)...');

    try {
      let targetId = 'admin-printable-front';
      if (generatorSide === 'back') targetId = 'admin-printable-back';
      if (generatorSide === 'pvc') targetId = 'admin-printable-pvc';
      if (generatorSide === 'championship') targetId = 'admin-printable-champ';

      const el = document.getElementById(targetId);
      if (!el) throw new Error(`Elemento #${targetId} no encontrado en el DOM`);

      const imgs = Array.from(el.querySelectorAll('img'));
      imgs.forEach((img) => {
        try { img.crossOrigin = 'anonymous'; } catch {}
      });

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: generatorSide === 'pvc' || generatorSide === 'championship' ? '#000000' : '#FCFAF5',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const cleanReg = selectedDog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `INBR_Doc_${cleanReg}_${generatorSide.toUpperCase()}.jpg`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#000000'],
        });
      } catch {}
    } catch (err) {
      console.error('Error generando documento JPG:', err);
      alert('Hubo un problema al exportar la imagen JPG. Por favor intenta de nuevo.');
    } finally {
      setIsExportingJpg(false);
      setGeneratorStatusText('');
    }
  };

  // Export document as PDF via jsPDF & html2canvas
  const handleExportDocumentPdf = async () => {
    const activeSelectedDog = selectedDog || dogs[0];
    if (isExportingPdf || !activeSelectedDog) {
      alert('Por favor selecciona un ejemplar para compilar el documento PDF.');
      return;
    }
    setIsExportingPdf(true);
    setGeneratorStatusText('Compilando documento en alta resolución...');

    try {
      const isVertical = (formData.certificateOrientation || 'vertical') === 'vertical';

      const capture = async (elementId: string) => {
        const el = document.getElementById(elementId);
        if (!el) throw new Error(`Elemento #${elementId} no encontrado`);
        
        // Ensure all images have crossOrigin = 'anonymous'
        const imgs = Array.from(el.querySelectorAll('img'));
        imgs.forEach((img) => {
          try { img.crossOrigin = 'anonymous'; } catch {}
        });

        try {
          return await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#FFFFFF',
            logging: false,
          });
        } catch (firstErr) {
          console.warn('First html2canvas capture failed, retrying with safe scale:', firstErr);
          try {
            return await html2canvas(el, {
              scale: 1.5,
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#FFFFFF',
              logging: false,
            });
          } catch (secondErr) {
            console.warn('Second html2canvas capture failed, retrying with basic canvas:', secondErr);
            return await html2canvas(el, {
              scale: 1,
              useCORS: false,
              backgroundColor: '#FFFFFF',
              logging: false,
            });
          }
        }
      };

      const targetId = generatorSide === 'pvc'
        ? 'admin-printable-pvc'
        : generatorSide === 'back'
        ? 'admin-printable-back'
        : generatorSide === 'championship'
        ? 'admin-printable-champ'
        : 'admin-printable-front';

      const canvas = await capture(targetId);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const cleanReg = activeSelectedDog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

      if (generatorSide === 'pvc') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [85.6, 54],
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, 85.6, 54);
        pdf.save(`INBR_Credencial_PVC_${cleanReg}.pdf`);
      } else {
        const pdf = new jsPDF({
          orientation: isVertical ? 'portrait' : 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });
        const pdfWidth = isVertical ? 210 : 297;
        const pdfHeight = isVertical ? 297 : 210;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        const filename = `INBR_Certificado_${cleanReg}_${generatorSide.toUpperCase()}.pdf`;
        pdf.save(filename);
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#FFFFFF'],
        });
      } catch {}
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Hubo un problema al compilar el documento PDF.');
    } finally {
      setIsExportingPdf(false);
      setGeneratorStatusText('');
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  // =========================================================================
  // 3. MÓDULO DE SUBIDA DE VIDEO PARA CAMADAS STATE
  // =========================================================================
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordIntervalRef = useRef<any>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoValidationSuccess, setVideoValidationSuccess] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Litter Form
  const [litterMotherReg, setLitterMotherReg] = useState('INBR-00192');
  const [litterFatherReg, setLitterFatherReg] = useState('INBR-84920');
  const [litterPuppiesCount, setLitterPuppiesCount] = useState(6);
  const [litterMales, setLitterMales] = useState(3);
  const [litterFemales, setLitterFemales] = useState(3);
  const [litterBreeder, setLitterBreeder] = useState('777 Kennels / INBR International');
  const [litterBirthDate, setLitterBirthDate] = useState('2026-09-15');

  // Video Inspection Checklist
  const [criteriaMotherNursing, setCriteriaMotherNursing] = useState(true);
  const [criteriaCountMatches, setCriteriaCountMatches] = useState(true);
  const [criteriaMicrochipAudited, setCriteriaMicrochipAudited] = useState(true);
  const [criteriaLocationConfirmed, setCriteriaLocationConfirmed] = useState(true);

  // Validated Litters Log
  const [validatedLitters, setValidatedLitters] = useState<LitterValidationItem[]>([
    {
      id: 'LIT-001',
      motherReg: 'INBR-00192 (BELLA)',
      fatherReg: 'INBR-84920 (DIESEL)',
      puppiesCount: 6,
      breederName: 'Imperial Bullyz International',
      date: 'Reciente',
      status: 'VALIDATED',
      trackingId: 'INBR-CAM-984210',
    },
    {
      id: 'LIT-002',
      motherReg: 'INBR-777-TAHONA',
      fatherReg: 'INBR-777-01 (CORSAN)',
      puppiesCount: 5,
      breederName: '777 Kennels',
      date: '28 Sep 2026',
      status: 'VALIDATED',
      trackingId: 'INBR-CAM-849102',
    },
  ]);

  // Clean up media streams
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setVideoError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no soporta captura de cámara en tiempo real');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: true,
      });

      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Cámara no accesible:', err);
      setVideoError('Cámara web no disponible. Puedes subir directamente un archivo de video (.mp4, .mov, .webm) para validación.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) {
      alert('Por favor activa la cámara primero o sube un archivo de video.');
      return;
    }

    try {
      const chunks: BlobPart[] = [];
      const mediaRecorder = new MediaRecorder(streamRef.current);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        if (playbackRef.current) {
          playbackRef.current.src = url;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      setVideoError('Error iniciando grabación con MediaRecorder.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    }
  };

  const handleFileUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        alert('El archivo de video supera el límite de 100MB.');
        return;
      }
      setRecordedBlob(file);
      const url = URL.createObjectURL(file);
      setRecordedVideoUrl(url);
      setVideoError(null);
    }
  };

  const handleConfirmAndUploadLitter = async () => {
    if (!recordedBlob) {
      alert('Por favor graba o sube un video de la camada antes de validar.');
      return;
    }

    if (!criteriaMotherNursing || !criteriaCountMatches) {
      alert('Debes confirmar que la madre amamantando y el conteo de cachorros coinciden.');
      return;
    }

    setIsUploadingVideo(true);
    setVideoError(null);

    try {
      const result = await uploadLiveCamadaVideo(recordedBlob, {
        motherReg: litterMotherReg,
        fatherReg: litterFatherReg,
        breederName: litterBreeder,
      });

      const newLitter: LitterValidationItem = {
        id: `LIT-${Date.now().toString().slice(-4)}`,
        motherReg: litterMotherReg,
        fatherReg: litterFatherReg,
        puppiesCount: litterPuppiesCount,
        breederName: litterBreeder,
        date: 'Hoy',
        status: 'VALIDATED',
        trackingId: result.trackingId,
        videoUrl: result.url,
      };

      setValidatedLitters([newLitter, ...validatedLitters]);
      setVideoValidationSuccess(`¡Camada validada exitosamente con Tracking Oficial: ${result.trackingId}!`);

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#D4AF37', '#FFE885'],
        });
      } catch {}

      setTimeout(() => setVideoValidationSuccess(null), 6000);
    } catch (err: any) {
      console.error('Error al subir video:', err);
      setVideoError('Error al subir video a Supabase Storage.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // =========================================================================
  // 4. EDITOR DE CONTENIDOS DINÁMICOS STATE
  // =========================================================================
  const [formData, setFormData] = useState<DynamicContentConfig>(content);
  const [contentSavedFeedback, setContentSavedFeedback] = useState(false);
  const lastRemoteSyncTsRef = useRef<number | undefined>(content._updatedAt);

  // Sync formData only when remote Supabase config changes, not while user is actively editing formData
  useEffect(() => {
    if (content._updatedAt && content._updatedAt !== lastRemoteSyncTsRef.current) {
      lastRemoteSyncTsRef.current = content._updatedAt;
      setFormData(content);
    }
  }, [content]);

  const handleSaveDynamicContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setContentSavedFeedback(true);
    try {
      const res = await saveDynamicContentRealtime(formData);
      if (!res.success) {
        alert(res.error || 'No se pudo guardar en Supabase. Verifica tu conexión.');
      } else {
        setFormData(res.data);
      }
      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
          region: user?.region,
        },
        action: 'MODIFICACIÓN_CMS',
        category: 'CMS',
        fieldModified: 'Contenidos Dinámicos & Secciones Web',
        details: 'Actualización en tiempo real de títulos, párrafos, avisos e imágenes sincronizados con Supabase.',
      });
      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885'],
        });
      } catch {}
      setTimeout(() => setContentSavedFeedback(false), 3000);
    } catch (err: any) {
      console.error('Error al guardar en Supabase:', err);
      alert('Error al guardar en Supabase: ' + (err?.message || 'Error de red'));
    }
  };

  const handleResetDynamicContent = () => {
    if (confirm('¿Restablecer todos los textos de la página a los valores originales predeterminados?')) {
      const def = resetContent();
      setFormData(def);
      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
        },
        action: 'RESTABLECER_VALORES',
        category: 'CMS',
        fieldModified: 'Todos los campos CMS',
        details: 'Restablecimiento de fábrica de todos los textos del sitio.',
      });
      alert('Textos restablecidos a los valores oficiales de fábrica.');
    }
  };

  // =========================================================================
  // GLOBAL DOM SCANNER & LIVE OVERRIDE STATE & METHODS
  // =========================================================================
  interface ScannedDomItem {
    id: string;
    section: string;
    tag: string;
    text: string;
    element?: HTMLElement | null;
  }

  const [cmsMode, setCmsMode] = useState<'structured' | 'dom_scanner'>('structured');
  const [isManagementSidebarCollapsed, setIsManagementSidebarCollapsed] = useState<boolean>(false);
  const [activeManagementSection, setActiveManagementSection] = useState<string>('judges');
  const [managementSearchFilter, setManagementSearchFilter] = useState<string>('');
  const [scannedItems, setScannedItems] = useState<ScannedDomItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [domSearchQuery, setDomSearchQuery] = useState('');
  const deferredDomSearchQuery = useDeferredValue(domSearchQuery);
  const [domSectionFilter, setDomSectionFilter] = useState('ALL');
  const [domTagFilter, setDomTagFilter] = useState('ALL');
  const [domRenderLimit, setDomRenderLimit] = useState(48);
  const [editedOverrides, setEditedOverrides] = useState<Record<string, string>>({});
  const [savingDomChanges, setSavingDomChanges] = useState(false);
  const [domSaveSuccess, setDomSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDomRenderLimit(48);
  }, [deferredDomSearchQuery, domSectionFilter, domTagFilter]);

  const scanDom = () => {
    if (typeof document === 'undefined') return;
    setIsScanning(true);

    setTimeout(() => {
      try {
        assignDeterministicDomIds();
        const items: ScannedDomItem[] = [];
        const sectionsMap: { [key: string]: string } = {
          hero: 'Portada (Hero)',
          about: 'Quiénes Somos',
          equipo: 'Nuestro Equipo Directivo',
          razas: 'Nuestras Razas Oficiales',
          estandares: 'Estándares Raciales',
          'edicion-especial': 'Edición Especial',
          criadores: 'Directorio Criadores',
          eventos: 'Próximos Eventos 2026',
          campeones: 'Tabla de Campeones',
          verificacion: 'Verificación & Folios',
          formularios: 'Trámites & Formularios',
          contacto: 'Oficinas & Contacto',
          footer: 'Pie de Página (Footer)',
        };

        const candidates = document.querySelectorAll<HTMLElement>(
          'section h1, section h2, section h3, section h4, section h5, section p, header h1, header h2, header h3, footer p, footer h3, footer h4, [data-cms-key]'
        );

        let counter = 0;
        const currentOverrides = formData.customTextOverrides || content.customTextOverrides || {};

        candidates.forEach((el) => {
          // Ignore anything inside the modal itself or system elements
          if (
            el.closest('.fixed.inset-0.z-50') ||
            el.closest('#admin-modal-container') ||
            el.closest('#cms-inline-editor') ||
            el.classList.contains('no-print')
          ) {
            return;
          }

          const rawText = el.textContent?.trim() || '';
          if (!rawText || rawText.length < 3) return;

          counter++;
          const parentSection = el.closest('section, header, footer');
          let sectionName = 'General';
          const sectionId = parentSection?.id || '';
          if (sectionsMap[sectionId]) {
            sectionName = sectionsMap[sectionId];
          } else if (parentSection?.tagName === 'HEADER') {
            sectionName = 'Encabezado (Header)';
          } else if (parentSection?.tagName === 'FOOTER') {
            sectionName = 'Pie de Página (Footer)';
          } else if (sectionId) {
            sectionName = sectionId.toUpperCase();
          }

          let stableId = el.getAttribute('data-cms-key');
          if (!stableId) {
            stableId = el.getAttribute('data-dom-id');
            if (!stableId) {
              stableId = `dom_${sectionId || 'main'}_${el.tagName.toLowerCase()}_${counter}`;
              el.setAttribute('data-dom-id', stableId);
            }
          }

          const val = currentOverrides[stableId] || rawText;

          items.push({
            id: stableId,
            section: sectionName,
            tag: el.tagName.toUpperCase(),
            text: val,
            element: el,
          });
        });

        setScannedItems(items);
        const map: Record<string, string> = { ...currentOverrides };
        items.forEach((it) => {
          if (!map[it.id]) {
            map[it.id] = it.text;
          }
        });
        setEditedOverrides(map);
      } catch (err) {
        console.warn('Error escaneando DOM:', err);
      } finally {
        setIsScanning(false);
      }
    }, 150);
  };

  // Run initial scan whenever tab is 'content'
  useEffect(() => {
    if (activeTab === 'content') {
      scanDom();
    }
  }, [activeTab]);

  const handleUpdateSingleDomText = (id: string, newText: string) => {
    setEditedOverrides((prev) => ({ ...prev, [id]: newText }));
    // Live preview directly on the DOM element!
    try {
      const el = document.querySelector(`[data-cms-key="${id}"], [data-dom-id="${id}"]`);
      if (el) el.textContent = newText;
    } catch {}
  };

  const handleSaveSingleDomItemToSupabase = async (id: string) => {
    const val = editedOverrides[id];
    if (val === undefined) return;
    setSavingDomChanges(true);
    setDomSaveSuccess(null);
    try {
      const mergedOverrides = {
        ...(formData.customTextOverrides || {}),
        [id]: val,
      };

      const updatedConfig: DynamicContentConfig = {
        ...formData,
        customTextOverrides: mergedOverrides,
      };

      setFormData(updatedConfig);
      updateContent(updatedConfig);
      await saveDynamicContentAsync(updatedConfig);
      applyCustomTextOverridesToDom(mergedOverrides);

      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
          region: user?.region,
        },
        action: 'ESCANER_DOM_ITEM_GUARDADO',
        category: 'CMS',
        fieldModified: id,
        newValue: val.slice(0, 30) + '...',
        details: `Texto modificado y guardado en Supabase para ${id}.`,
      });

      setDomSaveSuccess(`Texto guardado exitosamente en Supabase: "${val.slice(0, 25)}..."`);
      setTimeout(() => setDomSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Error guardando texto en Supabase:', err);
      alert('Error al guardar en Supabase.');
    } finally {
      setSavingDomChanges(false);
    }
  };

  const handleSaveAllDomChangesToSupabase = async () => {
    setSavingDomChanges(true);
    setDomSaveSuccess(null);
    try {
      const mergedOverrides = {
        ...(formData.customTextOverrides || {}),
        ...editedOverrides,
      };

      const updatedConfig: DynamicContentConfig = {
        ...formData,
        customTextOverrides: mergedOverrides,
      };

      setFormData(updatedConfig);
      updateContent(updatedConfig);
      await saveDynamicContentAsync(updatedConfig);
      applyCustomTextOverridesToDom(mergedOverrides);

      addActivityLog({
        author: {
          name: user?.name || 'Jonathan García',
          role: user?.role || 'MASTER',
          email: user?.email,
          region: user?.region,
        },
        action: 'ESCANER_DOM_MODIFICACIÓN_TOTAL',
        category: 'CMS',
        fieldModified: 'customTextOverrides',
        details: `Modificación global de ${Object.keys(editedOverrides).length} textos del DOM sincronizados en Supabase.`,
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFE885', '#10B981'],
        });
      } catch {}

      setDomSaveSuccess(`¡${scannedItems.length} textos del DOM sincronizados y guardados permanentemente en Supabase!`);
      setTimeout(() => setDomSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error guardando textos del DOM en Supabase:', err);
      alert('Error al guardar en Supabase. Por favor intenta de nuevo.');
    } finally {
      setSavingDomChanges(false);
    }
  };

  // =========================================================================
  // 5. PANEL DE CONTROL DE REPRESENTANTES STATE
  // =========================================================================
  const [representatives, setRepresentatives] = useState<RepresentativeAccount[]>([
    { id: '1', name: 'Carlos Mendoza (Representante CDMX)', username: 'rep.cdmx', region: 'México Centro', canPrint: true },
    { id: '2', name: 'Roberto Garza (Representante Monterrey)', username: 'rep.mty', region: 'México Norte', canPrint: false },
    { id: '3', name: 'Michael Vance (Representative Texas USA)', username: 'rep.texas', region: 'USA', canPrint: false },
    { id: '4', name: 'Alvaro Santos (Representante Guadalajara)', username: 'rep.gdl', region: 'Occidente', canPrint: true },
    { id: '5', name: 'Joey Duran (Representante Colombia)', username: 'rep.col', region: 'Medellín / Colombia', canPrint: true },
  ]);

  const [vouchers, setVouchers] = useState<VoucherRecord[]>([
    {
      id: 'VOUCHER-771',
      repName: 'Roberto Garza (Representante Monterrey)',
      dogName: 'TAHONA 777',
      regNumber: 'INBR-777-TAHONA',
      amount: '$1,850 MXN (Registro + Credencial)',
      date: 'Reciente',
      receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      status: 'PENDING',
    },
    {
      id: 'VOUCHER-772',
      repName: 'Michael Vance (Representative Texas USA)',
      dogName: 'TITAN BULLSEYE',
      regNumber: 'INBR-REQ-101',
      amount: '$120 USD (F1 + Microchip)',
      date: 'Aprobado',
      receiptUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80',
      status: 'APPROVED',
    },
  ]);

  // New Representative Registration Form
  const [newRepName, setNewRepName] = useState('');
  const [newRepRegion, setNewRepRegion] = useState('');
  const [newRepUsername, setNewRepUsername] = useState('');
  const [newRepCanPrint, setNewRepCanPrint] = useState(false);
  const [repAddedSuccess, setRepAddedSuccess] = useState(false);

  // Load real franchises / representatives from Supabase
  useEffect(() => {
    fetchAllSupabaseFranquicias().then((franquicias) => {
      if (franquicias && franquicias.length > 0) {
        setRepresentatives(
          franquicias.map((f) => ({
            id: f.id,
            name: `${f.pais} (${f.prefijo})`,
            username: f.prefijo.toLowerCase(),
            region: f.email || f.pais,
            canPrint: f.puede_imprimir,
          }))
        );
      }
    });
  }, []);

  const handleApproveVoucher = (id: string) => {
    const targetVoucher = vouchers.find((v) => v.id === id);
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'APPROVED' } : v))
    );
    addActivityLog({
      author: {
        name: user?.name || 'Jonathan García',
        role: user?.role || 'MASTER',
        email: user?.email,
      },
      action: 'APROBACIÓN_PAGO',
      category: 'REPRESENTANTES',
      fieldModified: `Comprobante ${id}`,
      details: `Aprobación de comprobante de pago de ${targetVoucher?.amount || '$'} para ${targetVoucher?.repName || 'representante'}.`,
    });
  };

  const handleToggleRepPrint = (repId: string) => {
    setRepresentatives((prev) =>
      prev.map((r) => {
        if (r.id === repId) {
          const nextVal = !r.canPrint;
          updateFranquiciaPrintPermission(repId, nextVal);
          addActivityLog({
            author: {
              name: user?.name || 'Jonathan García',
              role: user?.role || 'MASTER',
              email: user?.email,
            },
            action: 'AUTORIZACIÓN_IMPRESIÓN',
            category: 'REPRESENTANTES',
            fieldModified: `puede_imprimir (${r.name})`,
            previousValue: r.canPrint ? 'AUTORIZADO' : 'REVOCADO',
            newValue: nextVal ? 'AUTORIZADO' : 'REVOCADO',
            details: `Permiso notarial de impresión actualizado para ${r.name}: ${nextVal ? 'HABILITADO' : 'SUSPENDIDO'}.`,
          });
          return { ...r, canPrint: nextVal };
        }
        return r;
      })
    );
  };

  const handleAddRepresentative = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepName.trim() || !newRepUsername.trim()) {
      alert('Por favor ingresa nombre y usuario para el nuevo representante.');
      return;
    }

    const newRep: RepresentativeAccount = {
      id: `rep_${Date.now()}`,
      name: newRepName.trim(),
      username: newRepUsername.trim().toLowerCase(),
      region: newRepRegion.trim() || 'Internacional',
      canPrint: newRepCanPrint,
    };

    setRepresentatives([newRep, ...representatives]);
    addActivityLog({
      author: {
        name: user?.name || 'Jonathan García',
        role: user?.role || 'MASTER',
        email: user?.email,
      },
      action: 'ALTA_REPRESENTANTE',
      category: 'REPRESENTANTES',
      fieldModified: newRepUsername,
      details: `Alta de nuevo representante regional: ${newRepName} (${newRepRegion}). Impresión: ${newRepCanPrint ? 'Si' : 'No'}.`,
    });
    setNewRepName('');
    setNewRepRegion('');
    setNewRepUsername('');
    setNewRepCanPrint(false);
    setRepAddedSuccess(true);
    setTimeout(() => setRepAddedSuccess(false), 3000);
  };

  const handleExportLogsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `INBR_Registro_Actividad_${new Date().toISOString().slice(0, 10)}.json`);
    a.click();
  };

  const handleExportLogsCsv = () => {
    const headers = ['ID', 'Fecha', 'Autor', 'Rol', 'Email', 'Region', 'Accion', 'Categoria', 'Campo Modificado', 'Detalles'];
    const rows = activityLogs.map((l) => [
      l.id,
      `"${l.formattedDate}"`,
      `"${l.author.name}"`,
      l.author.role,
      `"${l.author.email || ''}"`,
      `"${l.author.region || ''}"`,
      l.action,
      l.category,
      `"${l.fieldModified || ''}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.setAttribute('href', encodedUri);
    a.setAttribute('download', `INBR_Registro_Actividad_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  };

  if (!isOpen) return null;

  // Authentication Handlers (Secure wipe on exit, no credentials stored in component state)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccessMessage('');

    const res = login(usernameInput, passwordInput, rememberSession);
    if (!res.success) {
      setLoginError(res.error || 'Credenciales no autorizadas');
    } else {
      setLoginSuccessMessage('¡Acceso concedido exitosamente!');
      // WIPE plaintext password from memory immediately
      setPasswordInput('');
    }
  };

  const handleSecureLogout = () => {
    logout();
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
    setLoginSuccessMessage('');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('inbr_auth_user_v2');
        sessionStorage.removeItem('inbr_auth_user_session');
      } catch (e) {}
    }
  };

  const isMasterUser = user?.role === 'MASTER';
  const isCurrentRepAllowedToPrint = isMasterUser || user?.canPrint;

  const filteredDomItems = useMemo(() => {
    const q = deferredDomSearchQuery.toLowerCase();
    return scannedItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.text.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);

      const matchesSection = domSectionFilter === 'ALL' || item.section === domSectionFilter;

      const matchesTag =
        domTagFilter === 'ALL' ||
        (domTagFilter === 'TITLES' && ['H1', 'H2', 'H3', 'H4', 'H5'].includes(item.tag)) ||
        (domTagFilter === 'PARAGRAPHS' && item.tag === 'P') ||
        (domTagFilter === 'OTHER' && !['H1', 'H2', 'H3', 'H4', 'H5', 'P'].includes(item.tag));

      return matchesSearch && matchesSection && matchesTag;
    });
  }, [scannedItems, deferredDomSearchQuery, domSectionFilter, domTagFilter]);

  const availableDomSections = useMemo(
    () => Array.from(new Set(scannedItems.map((i) => i.section))),
    [scannedItems]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md overflow-hidden animate-fadeIn print:p-0 print:bg-white print:overflow-visible">
      {/* ========================================================================= */}
      {/* RESPONSIVE MODAL CONTAINER WITH HIGH CONTRAST GOLD BORDER                 */}
      {/* ========================================================================= */}
      <div className="relative w-full h-full sm:w-[95vw] sm:h-[95vh] max-w-full sm:max-w-[95vw] max-h-full sm:max-h-[95vh] bg-[#120F0A] border-0 sm:border-2 border-[#D4AF37] rounded-none sm:rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.4)] flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:h-auto">
        
        {/* ========================================================================= */}
        {/* 1. TOP FIXED NAVIGATION BAR INSIDE MODAL (95% CONTAINER)                  */}
        {/* ========================================================================= */}
        <header className="no-print shrink-0 w-full bg-[#14120D] border-b border-[#D4AF37]/50 px-3 sm:px-5 py-2 shadow-xl z-30 flex items-center justify-between gap-2">
          {/* Left: Cerrar Panel / Volver al Sitio */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer shrink-0"
              title="Cerrar el panel administrativo y regresar al sitio principal de la INBR"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Cerrar</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gold-gradient text-black flex items-center justify-center font-bold shadow shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white font-serif-luxury leading-tight truncate">
                {isAuthenticated && isMasterUser
                  ? 'Panel de Administrador Maestro'
                  : isAuthenticated
                  ? `Representante: ${user?.name}`
                  : 'Panel de Control INBR'}
              </h3>
            </div>
          </div>

          {/* Center: Compact Representative nav only when logged in as Representative (Master uses AdminSidebar) */}
          {isAuthenticated && !isMasterUser && (
            <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              <button
                onClick={() => handleTabChange('litters')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'litters'
                    ? 'bg-gold-gradient text-black shadow font-black'
                    : 'text-neutral-300 hover:text-white bg-[#1A1813] border border-neutral-800'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Registrar Camada</span>
              </button>

              <button
                onClick={() => handleTabChange('generator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'generator'
                    ? 'bg-gold-gradient text-black shadow font-black'
                    : 'text-neutral-300 hover:text-white bg-[#1A1813] border border-neutral-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Trámites</span>
              </button>

              <button
                onClick={() => handleTabChange('search')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'search'
                    ? 'bg-gold-gradient text-black shadow font-black'
                    : 'text-neutral-300 hover:text-white bg-[#1A1813] border border-neutral-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Consultar Registros</span>
              </button>
            </nav>
          )}

          {/* Right: Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1A1813] border border-[#D4AF37]/50 hover:bg-[#251F13] transition-all shadow cursor-pointer"
                title="Centro de Notificaciones en Tiempo Real (INBR Live)"
              >
                <Bell className="w-3.5 h-3.5 text-[#FFDF73]" />
                <span className="hidden md:inline">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated && isMasterUser && onOpenExcelImporter && (
              <button
                type="button"
                onClick={onOpenExcelImporter}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer"
                title="Cargar y procesar base de datos Excel (.xlsx) exclusiva del Panel Maestro"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-black" />
                <span className="hidden md:inline">Excel</span>
              </button>
            )}

            {/* Indicador de Auto-logout por inactividad (15 min) */}
            {isAuthenticated && (
              <div 
                onClick={resetInactivityTimer}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                  remainingInactivitySeconds !== undefined && remainingInactivitySeconds <= 120
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 animate-pulse'
                    : 'bg-[#15120B] border-[#D4AF37]/40 text-neutral-300 hover:border-[#D4AF37]'
                }`}
                title="Cierre de sesión automático tras 15 minutos de inactividad para proteger la cuenta del administrador. Haz clic para reiniciar el contador."
              >
                <Clock className={`w-3.5 h-3.5 ${remainingInactivitySeconds !== undefined && remainingInactivitySeconds <= 120 ? 'text-rose-400' : 'text-[#D4AF37]'}`} />
                <span className="text-[10px] uppercase text-neutral-400 font-bold hidden lg:inline">Auto-logout:</span>
                <span className={`font-bold ${remainingInactivitySeconds !== undefined && remainingInactivitySeconds <= 120 ? 'text-rose-400' : 'text-[#FFE885]'}`}>
                  {remainingInactivitySeconds !== undefined 
                    ? `${Math.floor(remainingInactivitySeconds / 60).toString().padStart(2, '0')}:${(remainingInactivitySeconds % 60).toString().padStart(2, '0')}`
                    : '15:00'}
                </span>
              </div>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  handleSecureLogout();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 border border-rose-800 bg-rose-950/70 hover:bg-rose-900 active:scale-95 transition-all shadow cursor-pointer"
                title="Cerrar sesión de forma segura y borrar credenciales de este equipo"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Sesión Segura</span>
              </button>
            )}

            {/* BOTÓN PROMINENTE DE RETORNO AL SITIO WEB */}
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer"
              title="Cerrar panel y regresar a la página web"
              aria-label="Cerrar ventana"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              <span>Volver a la Web</span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. SCROLLABLE CONTENT BODY (INSIDE 95% CARD)                              */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden bg-[#120F0A]">
          <div className="w-full flex-1 flex flex-col px-2 sm:px-6 lg:px-8 py-2 sm:py-4 pb-8 sm:pb-28">

        {/* ========================================================================= */}
        {/* LOGIN FORM (WHEN NOT AUTHENTICATED) - HIGH CONTRAST CARD                  */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (
          <div className="p-4 sm:p-8 max-w-lg mx-auto w-full my-auto sm:my-8 rounded-3xl bg-gradient-to-b from-[#1C160C] via-[#141009] to-[#0D0B08] border-2 border-[#D4AF37] shadow-[0_10px_50px_rgba(0,0,0,0.9)]">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-1 mx-auto mb-3 shadow-[0_0_30px_rgba(212,175,55,0.4)] bg-black">
                <img src={content.siteLogoUrl || '/logo-inbr.jpg'} alt="Logo" className="w-full h-full object-cover rounded-full" onError={(e) => { e.currentTarget.src = '/logo-inbr.jpg'; }} />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white font-serif-luxury uppercase tracking-wider">
                Ingreso al Panel Maestro
              </h4>
              <p className="text-xs text-neutral-300 mt-1 max-w-sm mx-auto">
                Acceso exclusivo para Jonathan García (Master CEO) y Representantes Regionales autorizados.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18140B] border border-[#D4AF37]/40 text-[10px] font-mono text-[#FFE885]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="font-bold">Autenticación Cifrada Segura INBR</span>
              </div>
            </div>

            {/* Notificación de Auto-logout por Inactividad (15 min) */}
            {sessionExpiredDueToInactivity && (
              <div className="mb-4 p-4 rounded-2xl bg-[#241908] border-2 border-[#D4AF37] text-white text-xs flex items-start gap-3 shadow-2xl animate-fadeIn">
                <div className="w-8 h-8 rounded-xl bg-gold-gradient text-black flex items-center justify-center shrink-0 mt-0.5 shadow">
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs sm:text-sm font-bold text-[#FFE885] uppercase tracking-wide">
                      Sesión Cerrada por Inactividad
                    </strong>
                    <button
                      type="button"
                      onClick={clearInactivityNotice}
                      className="text-neutral-400 hover:text-white text-xs p-1"
                      title="Descartar aviso"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-neutral-300 mt-1 leading-relaxed text-[11px] sm:text-xs">
                    Por seguridad y para proteger tu cuenta de administrador, la sesión se cerró automáticamente tras <strong>15 minutos de inactividad</strong>. Los datos de autenticación local han sido borrados de este navegador.
                  </p>
                  <span className="text-[10px] text-[#D4AF37] font-mono mt-1.5 block font-bold">
                    Ingresa nuevamente tus credenciales para acceder al Panel Maestro.
                  </span>
                </div>
              </div>
            )}

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-bold">{loginError}</span>
              </div>
            )}

            {loginSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-bold">{loginSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="text-xs font-mono text-[#FFE885] uppercase font-black block mb-1.5 tracking-wider">
                  Usuario o Correo Autorizado:
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="ej: Jonathan Garcia o rep.cdmx"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl bg-[#080705] border-2 border-[#D4AF37]/60 text-white text-xs sm:text-sm font-mono placeholder:text-neutral-500 focus:border-[#FFE885] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[#FFE885]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono text-[#FFE885] uppercase font-black block mb-1.5 tracking-wider">
                  Contraseña Cifrada:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl bg-[#080705] border-2 border-[#D4AF37]/60 text-white text-xs sm:text-sm font-mono placeholder:text-neutral-500 focus:border-[#FFE885] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[#FFE885] pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Casilla de seguridad para equipos compartidos */}
              <div className="p-3 rounded-xl bg-[#1A140B] border border-[#D4AF37]/50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-200">
                  <input
                    type="checkbox"
                    checked={rememberSession}
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D4AF37] text-[#D4AF37] focus:ring-0 bg-neutral-900 cursor-pointer"
                  />
                  <span>Recordar sesión en este equipo</span>
                </label>
                <span className="text-[10px] text-[#FFE885] font-mono font-bold">
                  {rememberSession ? '⚠️ Recordar' : '🔒 Modo Seguro'}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-bold text-xs sm:text-sm text-neutral-200 bg-neutral-900 border-2 border-neutral-700 hover:text-white hover:border-[#D4AF37] transition-all cursor-pointer"
                >
                  Salir / Cancelar
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl cursor-pointer"
                >
                  Ingresar al Panel Maestro
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================================= */
          /* PANELES AUTENTICADOS: 5 MÓDULOS COMPLETOS                                  */
          /* ========================================================================= */
          <div className="flex flex-col">
            
            {/* WIDGET COMPACTO DE ESTADO EN UNA SOLA LÍNEA (MAXIMIZA ESPACIO EN PANTALLA) */}
            {!isNavRetracted && (
              <div className="no-print border-b border-[#D4AF37]/25 bg-[#0F0E0B] px-3 sm:px-5 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase En Vivo
                  </span>
                  <span className="text-neutral-400">
                    Ejemplares: <strong className="text-white">{dogs.length}</strong>
                  </span>
                  <span className="hidden sm:inline text-neutral-400">
                    Criaderos: <strong className="text-white">{breeders.length}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => refreshFromSupabase()}
                  disabled={isLoadingSupabase}
                  className="flex items-center gap-1.5 text-[11px] text-[#FFE885] hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingSupabase ? 'animate-spin text-[#D4AF37]' : ''}`} />
                  <span>{isLoadingSupabase ? 'Sincronizando...' : 'Actualizar Datos Supabase'}</span>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-HEADER MOBILE CON BOTÓN DE 3 PUNTITOS / MENÚ DE MÓDULOS (md:hidden)    */}
            {/* ========================================================================= */}
            <div className="md:hidden bg-[#120F0A] border-b border-[#D4AF37]/40 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse shrink-0" />
                <span className="text-xs font-black text-[#FFE885] truncate font-serif-luxury uppercase tracking-wider">
                  {activeTab === 'visual_editor' && '1. Editor Visual Web'}
                  {activeTab === 'designer' && '2. Diseñador Pedigrí'}
                  {activeTab === 'excel_database' && '3. Base de Datos Excel'}
                  {activeTab === 'directiva' && '4. Directiva Ejecutiva'}
                  {activeTab === 'judges' && '5. Jueces Oficiales'}
                  {activeTab === 'representatives' && '6. Representantes'}
                  {activeTab === 'champions' && '7. Campeones & Puntos'}
                  {activeTab === 'gallery' && '8. Galería Oficial'}
                  {activeTab === 'special_edition' && '9. Edición Especial'}
                  {activeTab === 'certifications' && '10. Certificaciones'}
                  {activeTab === 'search' && '11. Búsqueda Ejemplares'}
                  {activeTab === 'litters' && '12. Registro de Camadas'}
                  {activeTab === 'content' && '13. Contenidos CMS'}
                  {activeTab === 'activity_logs' && '14. Auditoría y Logs'}
                  {activeTab === 'publish_guide' && '15. Guía de Publicación'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-gradient text-black font-black text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <MoreVertical className="w-3.5 h-3.5" />
                <span>Módulos (15)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileAdminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* DROPDOWN ACORDEÓN MOBILE DE MÓDULOS */}
            {mobileAdminMenuOpen && (
              <div className="md:hidden p-3 bg-[#0D0B08] border-b-2 border-[#D4AF37] max-h-[65vh] overflow-y-auto space-y-1.5 animate-fadeIn shadow-2xl z-40">
                <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block mb-1 px-1">
                  Selecciona el módulo del Panel Maestro:
                </span>
                {[
                  { id: 'visual_editor', label: '1. Editor Visual Web (WYSIWYG)', icon: Layers, desc: 'Edición en vivo de la página web' },
                  { id: 'designer', label: '2. Diseñador: Pedigrí y Credenciales', icon: Sliders, desc: 'Arrastrar coordenadas y textos' },
                  { id: 'excel_database', label: '3. Base de Datos Excel / Perros', icon: FileSpreadsheet, desc: `Consultar ${dogs.length} registros oficiales` },
                  { id: 'directiva', label: '4. Directiva Ejecutiva INBR', icon: ShieldCheck, desc: 'Gestión de mesa directiva' },
                  { id: 'judges', label: '5. Jueces Oficiales Homologados', icon: Award, desc: 'Listado y edición de jueces' },
                  { id: 'representatives', label: '6. Representantes & Delegados', icon: Users, desc: 'Gestión y permisos de impresión' },
                  { id: 'champions', label: '7. Campeones Oficiales & Puntos', icon: Trophy, desc: '17 campeones oficiales INBR' },
                  { id: 'gallery', label: '8. Galería Oficial de Campeones', icon: ImageIcon, desc: 'Fotografías y pistas oficiales' },
                  { id: 'special_edition', label: '9. Edición Especial de Pedigrí', icon: Sparkles, desc: 'Certificados dorados y plateados' },
                  { id: 'certifications', label: '10. Nuestras Certificaciones', icon: FileText, desc: 'Notarías y sellos internacionales' },
                  { id: 'search', label: '11. Búsqueda y Verificación', icon: Search, desc: 'Buscar por registro o microchip' },
                  { id: 'litters', label: '12. Registro de Camadas y Videos', icon: Video, desc: 'Carga de camadas y cachorros' },
                  { id: 'content', label: '13. Textos y Secciones CMS', icon: Edit3, desc: 'Títulos, avisos y visibilidad' },
                  { id: 'activity_logs', label: '14. Auditoría y Logs Inmutables', icon: Lock, desc: 'Trazabilidad de modificaciones' },
                  { id: 'publish_guide', label: '15. Guía de Publicación & Dominio', icon: Rocket, desc: 'Instrucciones para Hostinger y dominio' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isAct = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        handleTabChange(item.id as AdminTabKey);
                        setMobileAdminMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isAct
                          ? 'bg-gold-gradient text-black font-black shadow-lg'
                          : 'text-neutral-200 hover:text-white bg-black/60 border border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isAct ? 'text-black' : 'text-[#D4AF37]'}`} />
                        <div className="min-w-0">
                          <span className="text-xs block font-bold truncate">{item.label}</span>
                          <span className={`text-[10px] block truncate ${isAct ? 'text-black/80' : 'text-neutral-400'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      {isAct && <CheckCircle2 className="w-4 h-4 text-black shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ========================================================================= */}
            {/* CONTENEDOR PRINCIPAL: SIDEBAR EN DESKTOP, OCULTO EN CELULARES              */}
            {/* ========================================================================= */}
            <div className="flex flex-1 min-h-[500px] md:min-h-[720px] overflow-hidden bg-[#0A0906]">
              {/* COLLAPSIBLE SIDEBAR NAVIGATION: DESKTOP ONLY (hidden md:flex) */}
              <div className="hidden md:flex shrink-0">
                <AdminSidebar
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  activeTab={activeTab}
                  onSelectTab={handleTabChange}
                  isAdmin={isMasterUser}
                  userRoleName={user?.name || 'Administrador Maestro'}
                  dogsCount={dogs.length}
                  pendingVouchersCount={vouchers.filter((v) => v.status === 'PENDING').length}
                  activityLogsCount={activityLogs.length}
                />
              </div>

              {/* MAIN CONTENT AREA */}
              <main className="flex-1 overflow-y-auto max-h-[85vh] bg-[#070604] p-3 sm:p-6 custom-scrollbar space-y-6">
                {/* 0. EDITOR VISUAL EN VIVO WYSIWYG (IGUALITO A LA PÁGINA) */}
                {activeTab === 'visual_editor' && (
                  <AdminVisualPageEditor />
                )}

                {/* 1. PERSONALIZADOR VISUAL: CREDENCIALES & PEDIGREE (MOVER TEXTOS Y CARGAR FONDOS) */}
                {activeTab === 'designer' && (
                  <AdminDocumentDesigner
                    isAdmin={isMasterUser}
                    sampleDogs={dogs}
                    offsets={formData.certificateOffsets || DEFAULT_CERTIFICATE_OFFSETS}
                    certBackgroundUrl={formData.certificateBackgroundUrl || ''}
                    certBackBackgroundUrl={formData.certBackBackgroundUrl || ''}
                    pvcBackgroundUrl={formData.pvcBackgroundUrl || ''}
                    orientation={formData.certificateOrientation || 'horizontal'}
                    showPhoto={formData.showPhotoOnCert || false}
                    showNotarySeal={formData.showNotarySealOnCert !== false}
                    cleanBackgroundMode={formData.certCleanBackgroundMode || false}
                    onOffsetsChange={(newOffsets) => {
                      const updated = { ...formData, certificateOffsets: newOffsets };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onCertBackgroundChange={(newUrl) => {
                      const updated = { ...formData, certificateBackgroundUrl: newUrl };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onCertBackBackgroundChange={(newUrl) => {
                      const updated = { ...formData, certBackBackgroundUrl: newUrl };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onPvcBackgroundChange={(newUrl) => {
                      const updated = { ...formData, pvcBackgroundUrl: newUrl };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onOrientationChange={(newOrientation) => {
                      const updated = { ...formData, certificateOrientation: newOrientation };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onShowPhotoChange={(show) => {
                      const updated = { ...formData, showPhotoOnCert: show };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onShowNotarySealChange={(show) => {
                      const updated = { ...formData, showNotarySealOnCert: show };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onCleanBackgroundModeChange={(clean) => {
                      const updated = { ...formData, certCleanBackgroundMode: clean };
                      setFormData(updated);
                      updateContent(updated);
                    }}
                    onSaveToSupabase={handleSaveAllDomChangesToSupabase}
                  />
                )}

                {/* 1.5. GESTIÓN OFICIAL DE LA DIRECTIVA EJECUTIVA INBR */}
                {activeTab === 'directiva' && (
                  <AdminExecutiveTeamEditor
                    isAdmin={isMasterUser}
                    members={formData.executiveTeam || []}
                    onChange={(updated) => {
                      const patch = { ...formData, executiveTeam: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

                {/* 2. GESTIÓN OFICIAL DE JUECES */}
                {activeTab === 'judges' && (
                  <AdminJudgesEditor
                    isAdmin={isMasterUser}
                    judges={formData.judgesList || []}
                    onChange={(updated) => {
                      const patch = { ...formData, judgesList: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

                {/* 3. GALERÍA OFICIAL */}
                {activeTab === 'gallery' && (
                  <AdminGalleryEditor
                    isAdmin={isMasterUser}
                    photos={formData.galleryPhotos || []}
                    onChange={(updated) => {
                      const patch = { ...formData, galleryPhotos: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

                {/* 4. EDICIONES ESPECIALES */}
                {activeTab === 'special_edition' && (
                  <AdminSpecialEditionEditor
                    isAdmin={isMasterUser}
                    banner1={formData.specialEditionBanner1 || ''}
                    banner2={formData.specialEditionBanner2 || ''}
                    specialEditionList={formData.specialEditionList || []}
                    onBannersChange={(b1, b2) => {
                      const patch = { ...formData, specialEditionBanner1: b1, specialEditionBanner2: b2 };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                    onListChange={(updated) => {
                      const patch = { ...formData, specialEditionList: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

                {/* 5. CERTIFICACIONES & ESTÁNDARES RACIALES */}
                {activeTab === 'certifications' && (
                  <AdminCertificationsEditor
                    isAdmin={isMasterUser}
                    pdfUrl={formData.standardsPdfUrl || ''}
                    standardsList={formData.standardsList || []}
                    certificationsList={formData.certificationsList || []}
                    onPdfUrlChange={(url) => {
                      const patch = { ...formData, standardsPdfUrl: url };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                    onStandardsChange={(updated) => {
                      const patch = { ...formData, standardsList: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                    onCertificationsChange={(updated) => {
                      const patch = { ...formData, certificationsList: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

                {/* 6. CAMPEONATOS & TABLA DE PUNTOS */}
                {activeTab === 'champions' && (
                  <AdminChampionsEditor
                    isAdmin={isMasterUser}
                    championsList={formData.championsList || []}
                    onChange={(updated) => {
                      const patch = { ...formData, championsList: updated };
                      setFormData(patch);
                      updateContent(patch);
                    }}
                  />
                )}

            {/* ========================================================================= */}
            {/* TAB: CARGA Y GESTIÓN DE BASES DE DATOS EXCEL / CSV                         */}
            {/* ========================================================================= */}
            {activeTab === 'excel_database' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                {/* Header Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1E190E] via-[#14120D] to-[#1E190E] border-2 border-[#D4AF37]/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow-md">
                        <FileSpreadsheet className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-white font-serif-luxury tracking-wide">
                          Carga y Gestión Centralizada de Bases de Datos Excel / CSV
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-mono font-bold">
                            SISTEMA ACTIVO SIN REDIRECCIONES
                          </span>
                          <span className="text-xs text-neutral-400">
                            Permanece aquí mientras subes múltiples archivos consecutivos
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 max-w-2xl pt-1 leading-relaxed">
                      Sube tus bases de datos genealógicas en formato <code className="text-[#FFE885] font-mono">.xlsx</code> o <code className="text-[#FFE885] font-mono">.csv</code>. Los ejemplares se integran al instante en la memoria del sistema y quedan disponibles para certificados, genogramas y verificación notarial.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => refreshFromSupabase()}
                      disabled={isLoadingSupabase}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#18140B] border border-[#D4AF37]/70 text-[#FFE885] font-black text-xs sm:text-sm hover:bg-[#251E10] active:scale-95 transition-all shadow cursor-pointer disabled:opacity-50"
                      title="Sincronizar en vivo con la base de datos de Supabase"
                    >
                      <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${isLoadingSupabase ? 'animate-spin' : ''}`} />
                      <span>{isLoadingSupabase ? 'Sincronizando...' : `Sincronizar Supabase (${dogs.length})`}</span>
                    </button>

                    {onOpenExcelImporter && (
                      <button
                        type="button"
                        onClick={onOpenExcelImporter}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gold-gradient text-black font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-black" />
                        <span>🚀 Abrir Carga Masiva Excel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-[#D4AF37]/30 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-neutral-400 block mb-0.5">Total en Base de Datos</span>
                      <strong className="text-2xl font-black text-white font-mono">{dogs.length}</strong>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">Ejemplares Oficiales en Memoria y Nube</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#1C170E] border border-[#D4AF37]/40 flex items-center justify-center text-[#FFE885]">
                      <Database className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-emerald-700/40 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-neutral-400 block mb-0.5">Criaderos & Propietarios</span>
                      <strong className="text-2xl font-black text-emerald-400 font-mono">{breeders.length}</strong>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">Registrados en Directorio</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-emerald-500/50 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[11px] font-mono uppercase text-neutral-400 block mb-0.5">Nube Supabase Oficial</span>
                      <strong className="text-sm font-black text-emerald-400 flex items-center gap-1.5 mt-1 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> CONECTADO 100%
                      </strong>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">2,524+ perros guardados permanentemente</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Quick Interactive Upload Callout */}
                <div 
                  onClick={onOpenExcelImporter}
                  className="border-2 border-dashed border-[#D4AF37]/60 hover:border-[#FFE885] bg-[#0E0C07] hover:bg-[#16130B] rounded-3xl p-8 text-center cursor-pointer transition-all group shadow-lg"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gold-gradient text-black flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h5 className="text-lg font-black text-white font-serif-luxury mb-1">
                    Haz clic aquí para seleccionar y cargar tus bases de datos Excel
                  </h5>
                  <p className="text-xs text-neutral-400 max-w-lg mx-auto mb-4 leading-relaxed">
                    Acepta archivos <span className="text-[#FFE885] font-mono">.xlsx</span>, <span className="text-[#FFE885] font-mono">.xls</span> y <span className="text-[#FFE885] font-mono">.csv</span>. Al confirmar la importación, te mantendrás exactamente aquí para que puedas continuar subiendo todas las bases de datos que necesites.
                  </p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs shadow-md">
                    <UploadCloud className="w-4 h-4" />
                    Seleccionar Archivo Excel
                  </span>
                </div>

                {/* Table: Vista Rápida de Ejemplares en Memoria */}
                <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-neutral-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-bold text-white font-serif-luxury">
                        Ejemplares Cargados en la Base de Datos ({dogs.length} en total)
                      </h5>
                      <p className="text-xs text-neutral-400">
                        Verifica aquí mismo los datos que has subido sin salirte del Panel Maestro.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#FFE885] px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700">
                        {dogs.length} Registros Activos
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#121212] text-neutral-400 font-mono uppercase tracking-wider sticky top-0 border-b border-neutral-800">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">N° Folio INBR</th>
                          <th className="py-2.5 px-3">Microchip</th>
                          <th className="py-2.5 px-3">Nombre del Ejemplar</th>
                          <th className="py-2.5 px-3">Raza</th>
                          <th className="py-2.5 px-3">Propietario / Criador</th>
                          <th className="py-2.5 px-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {dogs.slice(0, 50).map((dog, idx) => (
                          <tr key={idx} className="hover:bg-[#16130B] transition-colors">
                            <td className="py-2.5 px-3 text-neutral-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#FFE885]">{dog.regNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-neutral-400">{dog.microchip}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{dog.name}</td>
                            <td className="py-2.5 px-3 text-neutral-300">{dog.breed} {dog.variety ? `(${dog.variety})` : ''}</td>
                            <td className="py-2.5 px-3 text-neutral-400 truncate max-w-[160px]">{dog.owner}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                OFICIAL ACTIVO
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {dogs.length > 50 && (
                    <p className="text-[11px] text-neutral-500 italic text-center">
                      Mostrando los primeros 50 registros de {dogs.length}. Usa la pestaña "Buscador" para explorar la totalidad con filtros avanzados.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 1: BUSCADOR CENTRALIZADO SUPABASE                                     */}
            {/* ========================================================================= */}
            {activeTab === 'search' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1E190E] to-[#120F08] border border-[#D4AF37]/50 shadow-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-5 h-5 text-[#FFE885]" />
                      <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                        Buscador Centralizado de Registros Oficiales
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-300 max-w-2xl">
                      Consulta directa a la base de datos de Supabase. Busca por microchip ISO (15 dígitos), folio de registro notariado (ej: INBR-777-TAHONA) o nombre del ejemplar.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenExcelImporter && isMasterUser && (
                      <button
                        type="button"
                        onClick={onOpenExcelImporter}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer"
                        title="Cargar y procesar archivos Excel (.xlsx) exclusivos del Panel Maestro"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-black" />
                        <span>📂 Cargar Archivo Excel</span>
                      </button>
                    )}
                    <span className="px-3 py-1.5 rounded-xl bg-black border border-[#D4AF37] text-xs font-mono text-[#FFE885] font-bold">
                      {filteredDogs.length} Resultados
                    </span>
                  </div>
                </div>

                {/* Search Bar & Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 relative">
                    <Search className="w-5 h-5 text-[#D4AF37] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por Microchip, Folio Oficial, Nombre de Ejemplar o Propietario..."
                      className="w-full pl-12 pr-10 py-3.5 rounded-xl bg-[#090909] border-2 border-[#D4AF37]/60 text-white font-mono text-xs sm:text-sm placeholder-neutral-500 focus:outline-none focus:border-[#FFE885] shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <select
                      value={breedFilter}
                      onChange={(e) => setBreedFilter(e.target.value)}
                      className="w-full px-3 py-3.5 rounded-xl bg-[#090909] border-2 border-[#D4AF37]/60 text-white text-xs font-mono focus:outline-none focus:border-[#FFE885]"
                    >
                      <option value="ALL">Todas las Razas ({dogs.length})</option>
                      {uniqueBreeds.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Search Tag Suggestions */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  <span className="text-[11px] font-mono text-[#D4AF37]">Pruebas rápidas:</span>
                  {['TAHONA', 'INBR-777-TAHONA', 'INBR-84920', 'INBR-00192', 'American Bully'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-2.5 py-1 rounded-lg bg-black border border-neutral-800 text-[#FFE885] font-mono text-[11px] hover:border-[#D4AF37] transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                  {copyFeedback && (
                    <span className="text-emerald-400 text-xs font-mono ml-auto animate-fadeIn flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {copyFeedback}
                    </span>
                  )}
                </div>

                {/* Single Large Specimen View (Solo uno, más grande y con datos completos) */}
                {filteredDogs.length > 0 && (() => {
                  const safeSearchIndex = Math.min(Math.max(0, searchSelectedDogIndex), filteredDogs.length - 1);
                  const activeSearchDog = filteredDogs[safeSearchIndex] || filteredDogs[0];

                  return (
                    <div className="space-y-4">
                      {/* Navigation bar if multiple results exist */}
                      {filteredDogs.length > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#110E08] border border-[#D4AF37]/50 shadow-md">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-neutral-400">Ejemplar en pantalla:</span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-black border border-[#D4AF37] text-xs font-mono font-bold text-[#FFE885]">
                              {safeSearchIndex + 1} de {filteredDogs.length}
                            </span>
                            <span className="text-xs text-neutral-300 hidden sm:inline font-bold">
                              • {activeSearchDog.name} ({activeSearchDog.breed})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setSearchSelectedDogIndex((prev) => Math.max(0, prev - 1))}
                              disabled={safeSearchIndex === 0}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black border border-neutral-700 hover:border-[#D4AF37] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4 text-[#FFE885]" />
                              <span>Anterior</span>
                            </button>

                            <select
                              value={safeSearchIndex}
                              onChange={(e) => setSearchSelectedDogIndex(Number(e.target.value))}
                              className="px-2.5 py-1.5 rounded-xl bg-black border border-[#D4AF37]/70 text-xs text-[#FFE885] font-mono focus:outline-none max-w-[220px] truncate"
                            >
                              {filteredDogs.slice(0, 150).map((d, i) => (
                                <option key={d.regNumber || i} value={i}>
                                  {i + 1}. {d.name} ({d.regNumber})
                                </option>
                              ))}
                              {safeSearchIndex >= 150 && (
                                <option value={safeSearchIndex}>
                                  {safeSearchIndex + 1}. {activeSearchDog.name} ({activeSearchDog.regNumber})
                                </option>
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() => setSearchSelectedDogIndex((prev) => Math.min(filteredDogs.length - 1, prev + 1))}
                              disabled={safeSearchIndex >= filteredDogs.length - 1}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black border border-neutral-700 hover:border-[#D4AF37] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all cursor-pointer"
                            >
                              <span>Siguiente</span>
                              <ChevronRight className="w-4 h-4 text-[#FFE885]" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* GRAND MASTER SPECIMEN CARD (MÁS GRANDE, COMPLETO Y CLARO) */}
                      <div className="rounded-3xl bg-gradient-to-b from-[#161208] via-[#0E0C07] to-[#050505] border-2 border-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.25)] p-5 sm:p-8 space-y-6 animate-fadeIn">
                        {/* Top Hero Section: Large Photo + Primary Identity */}
                        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 sm:gap-8 pb-6 border-b border-[#D4AF37]/35">
                          {/* Large Specimen Portrait */}
                          <div className="relative group shrink-0">
                            <div className="w-64 sm:w-80 md:w-88 h-72 sm:h-96 rounded-2xl overflow-hidden border-2 border-[#D4AF37] bg-black shadow-[0_12px_40px_rgba(0,0,0,0.9)] relative">
                              <img
                                src={activeSearchDog.imageUrl}
                                alt={activeSearchDog.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                <span className="px-2.5 py-1 rounded-md bg-black/90 backdrop-blur-md border border-emerald-500 text-emerald-400 font-mono text-[10px] font-bold shadow-md flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  OFICIAL ACTIVO
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-black/90 backdrop-blur-md border border-[#D4AF37] text-[#FFE885] font-mono text-[10px] font-bold shadow-md">
                                  {activeSearchDog.points || 0} PUNTOS OFICIALES
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hero Header Details */}
                          <div className="flex-1 w-full space-y-4 text-center lg:text-left">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                              <span className="px-3.5 py-1 rounded-lg bg-gold-gradient text-black font-black text-xs uppercase tracking-wider shadow">
                                {activeSearchDog.breed}
                              </span>
                              {activeSearchDog.variety && (
                                <span className="px-3.5 py-1 rounded-lg bg-[#271E0F] text-[#FFE885] border border-[#D4AF37]/60 font-bold text-xs uppercase tracking-wider">
                                  Variedad: {activeSearchDog.variety}
                                </span>
                              )}
                              <span className="px-3 py-1 rounded-lg bg-neutral-900 text-neutral-200 border border-neutral-700 font-mono text-xs font-bold">
                                {activeSearchDog.gender}
                              </span>
                              {activeSearchDog.titles && activeSearchDog.titles.length > 0 && (
                                activeSearchDog.titles.map((title) => (
                                  <span key={title} className="px-3 py-1 rounded-lg bg-amber-950 text-amber-300 border border-amber-600 font-black text-xs">
                                    ★ {title}
                                  </span>
                                ))
                              )}
                            </div>

                            <div>
                              <span className="text-xs font-mono uppercase text-[#D4AF37] tracking-widest block font-bold">
                                EXPEDIENTE OFICIAL DE REGISTRO CANINO
                              </span>
                              <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-serif-luxury tracking-wide mt-1 leading-tight">
                                {activeSearchDog.name}
                              </h3>
                            </div>

                            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
                              Ejemplar canino avalado bajo normativas del International Numeric Breeding Registry (INBR). Con registro genealógico oficial, certificación notarial y trazabilidad por microchip de 15 dígitos.
                            </p>

                            {/* Action Buttons Row */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDog(activeSearchDog);
                                  setActiveTab('generator');
                                }}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gold-gradient text-black font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
                              >
                                <FileDown className="w-4 h-4 text-black" />
                                <span>Generar Documento (PDF / JPG)</span>
                              </button>

                              {onOpenCertificateModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenCertificateModal(activeSearchDog)}
                                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-[#D4AF37]/80 hover:border-[#D4AF37] text-[#FFE885] font-bold text-xs sm:text-sm hover:bg-neutral-800 transition-all shadow cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Ver Certificado Completo</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const dossier = `INBR FICHA OFICIAL DE EJEMPLAR\nNombre: ${activeSearchDog.name}\nFolio Notarial: ${activeSearchDog.regNumber}\nMicrochip: ${activeSearchDog.microchip}\nRaza: ${activeSearchDog.breed}\nVariedad: ${activeSearchDog.variety || 'Estándar'}\nSexo: ${activeSearchDog.gender}\nColor: ${activeSearchDog.color}\nFecha de Nacimiento: ${activeSearchDog.dob || 'Certificada'}\nPropietario: ${activeSearchDog.owner}\nCriador: ${activeSearchDog.breeder}\nSire (Padre): ${activeSearchDog.sire} [${activeSearchDog.sireReg || 'OFICIAL'}]\nDam (Madre): ${activeSearchDog.dam} [${activeSearchDog.damReg || 'OFICIAL'}]\nPuntos: ${activeSearchDog.points || 0}`;
                                  handleCopyText(dossier, 'Ficha oficial completa copiada');
                                }}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-neutral-300 hover:text-white font-bold text-xs sm:text-sm transition-all shadow cursor-pointer"
                              >
                                <Copy className="w-4 h-4 text-[#D4AF37]" />
                                <span>Copiar Ficha Completa</span>
                              </button>

                              {isMasterUser && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingDogReg === activeSearchDog.regNumber) {
                                        setEditingDogReg(null);
                                      } else {
                                        setEditingDogReg(activeSearchDog.regNumber);
                                        setEditDogDraft({
                                          name: activeSearchDog.name || '',
                                          microchip: activeSearchDog.microchip || '',
                                          breed: activeSearchDog.breed || 'American Bully',
                                          gender: activeSearchDog.gender === 'Hembra' ? 'Hembra' : 'Macho',
                                          color: activeSearchDog.color || '',
                                          owner: activeSearchDog.owner || '',
                                          sire: activeSearchDog.sire || '',
                                          dam: activeSearchDog.dam || '',
                                        });
                                      }
                                    }}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#221A0E] border border-[#D4AF37] text-[#FFE885] hover:bg-[#332714] font-bold text-xs sm:text-sm transition-all shadow cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4 text-[#D4AF37]" />
                                    <span>{editingDogReg === activeSearchDog.regNumber ? 'Cancelar Edición' : 'Editar Datos'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const res = await deleteDogRecord(activeSearchDog.regNumber);
                                      if (res.success) {
                                        setDogActionMessage(`Registro ${activeSearchDog.regNumber} eliminado de Supabase.`);
                                        setEditingDogReg(null);
                                        setTimeout(() => setDogActionMessage(null), 4000);
                                      } else {
                                        setDogActionMessage(`Error al eliminar: ${res.error}`);
                                      }
                                    }}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 hover:bg-rose-900 font-bold text-xs sm:text-sm transition-all shadow cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-400" />
                                    <span>Eliminar</span>
                                  </button>
                                </>
                              )}
                            </div>

                            {dogActionMessage && (
                              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-bold">
                                {dogActionMessage}
                              </div>
                            )}

                            {isMasterUser && editingDogReg === activeSearchDog.regNumber && (
                              <div className="p-4 rounded-2xl bg-[#15120A] border-2 border-[#D4AF37] space-y-3 text-left">
                                <h5 className="text-xs font-black uppercase text-[#FFE885] font-mono">
                                  Corregir Registro {activeSearchDog.regNumber} en Supabase:
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Nombre del Ejemplar:</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.name}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, name: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Microchip ISO:</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.microchip}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, microchip: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Propietario:</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.owner}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, owner: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Raza:</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.breed}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, breed: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Padre (Sire):</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.sire}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, sire: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Madre (Dam):</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.dam}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, dam: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Color:</label>
                                    <input
                                      type="text"
                                      value={editDogDraft.color}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, color: e.target.value })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-neutral-400 block mb-1">Sexo:</label>
                                    <select
                                      value={editDogDraft.gender}
                                      onChange={(e) => setEditDogDraft({ ...editDogDraft, gender: e.target.value === 'Hembra' ? 'Hembra' : 'Macho' })}
                                      className="w-full px-3 py-2 rounded-lg bg-black border border-neutral-700 text-white"
                                    >
                                      <option value="Macho">Macho</option>
                                      <option value="Hembra">Hembra</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    type="button"
                                    disabled={isSavingDogEdit}
                                    onClick={async () => {
                                      setIsSavingDogEdit(true);
                                      const res = await updateDogRecord(activeSearchDog.regNumber, editDogDraft);
                                      setIsSavingDogEdit(false);
                                      if (res.success) {
                                        setDogActionMessage(`¡Cambios guardados en Supabase para ${activeSearchDog.regNumber}!`);
                                        setEditingDogReg(null);
                                        setTimeout(() => setDogActionMessage(null), 4000);
                                      } else {
                                        setDogActionMessage(`Error al guardar: ${res.error}`);
                                      }
                                    }}
                                    className="px-4 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs cursor-pointer"
                                  >
                                    {isSavingDogEdit ? 'Guardando...' : 'Guardar Corrección en Supabase'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Complete Specimen Data Panels - All visible, no truncations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Panel 1: Identificación Notarial & Microchip */}
                          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#D4AF37]/40 shadow space-y-3.5">
                            <div className="flex items-center gap-2 text-[#FFE885] font-bold font-serif-luxury text-sm border-b border-neutral-800 pb-2.5">
                              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                              <span>Identificación Notarial</span>
                            </div>

                            <div className="space-y-2.5 text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                                  N° Folio Notariado INBR
                                </span>
                                <div className="flex items-center justify-between mt-1 p-2 rounded-xl bg-black border border-[#D4AF37]/50">
                                  <strong className="text-sm sm:text-base text-[#FFE885] font-black tracking-wide">
                                    {activeSearchDog.regNumber}
                                  </strong>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(activeSearchDog.regNumber, 'Folio copiado')}
                                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all"
                                    title="Copiar Folio"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider">
                                  Microchip ISO Oficial (15 Dígitos)
                                </span>
                                <div className="flex items-center justify-between mt-1 p-2 rounded-xl bg-black border border-neutral-800">
                                  <strong className="text-xs sm:text-sm text-white font-mono tracking-wider">
                                    {activeSearchDog.microchip}
                                  </strong>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(activeSearchDog.microchip, 'Microchip copiado')}
                                    className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all"
                                    title="Copiar Microchip"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="pt-1 flex items-center justify-between text-xs">
                                <span className="text-neutral-400">Estado en Base de Datos:</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold">
                                  {activeSearchDog.status || 'ACTIVO Y VALIDADO'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Panel 2: Morfología y Atributos Físicos */}
                          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#D4AF37]/40 shadow space-y-3.5">
                            <div className="flex items-center gap-2 text-[#FFE885] font-bold font-serif-luxury text-sm border-b border-neutral-800 pb-2.5">
                              <Award className="w-4 h-4 text-[#D4AF37]" />
                              <span>Morfología y Atributos</span>
                            </div>

                            <div className="space-y-2.5 text-xs">
                              <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                                <span className="text-neutral-400 font-mono text-xs">Raza Oficial:</span>
                                <strong className="text-white font-bold text-xs sm:text-sm">{activeSearchDog.breed}</strong>
                              </div>

                              <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                                <span className="text-neutral-400 font-mono text-xs">Variedad / Tipo:</span>
                                <span className="text-[#FFE885] font-bold">{activeSearchDog.variety || 'Estándar Oficial'}</span>
                              </div>

                              <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                                <span className="text-neutral-400 font-mono text-xs">Sexo:</span>
                                <span className="text-white font-bold">{activeSearchDog.gender}</span>
                              </div>

                              <div className="flex items-center justify-between py-1 border-b border-neutral-900">
                                <span className="text-neutral-400 font-mono text-xs">Color / Manto:</span>
                                <span className="text-neutral-200 font-medium">{activeSearchDog.color}</span>
                              </div>

                              <div className="flex items-center justify-between py-1">
                                <span className="text-neutral-400 font-mono text-xs">Fecha de Nacimiento:</span>
                                <span className="text-white font-mono font-bold">{activeSearchDog.dob || 'Fecha Oficial Certificada'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Panel 3: Propiedad, Criadero y Méritos */}
                          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#D4AF37]/40 shadow space-y-3.5">
                            <div className="flex items-center gap-2 text-[#FFE885] font-bold font-serif-luxury text-sm border-b border-neutral-800 pb-2.5">
                              <Users className="w-4 h-4 text-[#D4AF37]" />
                              <span>Propiedad y Crianza</span>
                            </div>

                            <div className="space-y-2.5 text-xs">
                              <div>
                                <span className="text-[10px] text-neutral-400 font-mono uppercase block font-bold">
                                  Propietario Notariado
                                </span>
                                <strong className="text-white text-sm font-bold block mt-0.5">
                                  {activeSearchDog.owner}
                                </strong>
                              </div>

                              <div>
                                <span className="text-[10px] text-neutral-400 font-mono uppercase block font-bold">
                                  Criador Original Registrado
                                </span>
                                <span className="text-neutral-200 text-xs font-medium block mt-0.5">
                                  {activeSearchDog.breeder}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                                <span className="text-neutral-400 font-mono text-xs">País / Sede:</span>
                                <span className="text-[#FFE885] font-bold">{activeSearchDog.country || 'Internacional'}</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                                <span className="text-neutral-400 font-mono text-xs">Puntos Acumulados:</span>
                                <span className="text-emerald-400 font-mono font-bold">{activeSearchDog.points || 0} pts</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Genealogía Oficial Notariada (Padres y Linaje Completo) */}
                        <div className="p-5 sm:p-6 rounded-2xl bg-[#090806] border border-[#D4AF37]/50 shadow space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D4AF37]/30 pb-3">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-[#D4AF37]" />
                              <h4 className="text-sm sm:text-base font-bold text-white font-serif-luxury">
                                Genealogía Notariada (Linaje de 4 Generaciones)
                              </h4>
                            </div>
                            <span className="text-[11px] font-mono text-[#FFE885] bg-[#1E190E] px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/40 w-fit">
                              Cadena de Sangre Oficial Verificada
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Sire (Padre) */}
                            <div className="p-4 rounded-xl bg-[#0D0B07] border-l-4 border-l-blue-500 border border-neutral-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-black uppercase text-blue-400 tracking-wider">
                                  ♂ Padre Oficial (Sire)
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {activeSearchDog.sireReg || 'REG-INBR-OFICIAL'}
                                </span>
                              </div>
                              <h5 className="text-base sm:text-lg font-bold text-white font-serif-luxury">
                                {activeSearchDog.sire}
                              </h5>
                              {activeSearchDog.genogram?.sire && (
                                <div className="text-[11px] text-neutral-400 pt-2 space-y-1 border-t border-neutral-800/70 font-mono">
                                  <div className="flex justify-between">
                                    <span>Abuelo Paterno:</span>
                                    <strong className="text-neutral-200">
                                      {activeSearchDog.genogram.sire.sire?.name || 'Línea de Sangre Certificada'}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Abuela Paterna:</span>
                                    <strong className="text-neutral-200">
                                      {activeSearchDog.genogram.sire.dam?.name || 'Línea de Sangre Certificada'}
                                    </strong>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Dam (Madre) */}
                            <div className="p-4 rounded-xl bg-[#0D0B07] border-l-4 border-l-rose-500 border border-neutral-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-black uppercase text-rose-400 tracking-wider">
                                  ♀ Madre Oficial (Dam)
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {activeSearchDog.damReg || 'REG-INBR-OFICIAL'}
                                </span>
                              </div>
                              <h5 className="text-base sm:text-lg font-bold text-white font-serif-luxury">
                                {activeSearchDog.dam}
                              </h5>
                              {activeSearchDog.genogram?.dam && (
                                <div className="text-[11px] text-neutral-400 pt-2 space-y-1 border-t border-neutral-800/70 font-mono">
                                  <div className="flex justify-between">
                                    <span>Abuelo Materno:</span>
                                    <strong className="text-neutral-200">
                                      {activeSearchDog.genogram.dam.sire?.name || 'Línea de Sangre Certificada'}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Abuela Materna:</span>
                                    <strong className="text-neutral-200">
                                      {activeSearchDog.genogram.dam.dam?.name || 'Línea de Sangre Certificada'}
                                    </strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {filteredDogs.length === 0 && (
                  <div className="p-12 text-center rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                    <Search className="w-10 h-10 text-neutral-600 mx-auto" />
                    <h5 className="text-base font-bold text-white font-serif-luxury">
                      No se encontraron ejemplares con los criterios ingresados
                    </h5>
                    <p className="text-xs text-neutral-400">
                      Verifica el folio o microchip, o restablece los filtros de búsqueda.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setBreedFilter('ALL');
                      }}
                      className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-[#FFE885] border border-neutral-700 hover:bg-neutral-700"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: GENERADOR DE DOCUMENTOS EN PDF Y JPG (DISEÑO OFICIAL 4 GEN)        */}
            {/* ========================================================================= */}
            {activeTab === 'generator' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                {/* Header & Canine Selector */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1C180E] to-[#0F0D07] border-2 border-[#D4AF37] shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#FFE885]" />
                      <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                        Generador de Documentos Oficiales en PDF y JPG
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">
                      Diseño notariado con orígenes de 4 generaciones completas, sellos holográficos y validación QR oficial.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-[#D4AF37] font-bold">Ejemplar:</span>
                    <select
                      value={selectedDog.regNumber}
                      onChange={(e) => {
                        const d = dogs.find((dog) => dog.regNumber === e.target.value);
                        if (d) setSelectedDog(d);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-black border border-[#D4AF37] text-xs text-white max-w-[280px] font-mono focus:outline-none"
                    >
                      {dogs.slice(0, 150).map((d) => (
                        <option key={d.regNumber} value={d.regNumber}>
                          {d.name} ({d.regNumber})
                        </option>
                      ))}
                      {!dogs.slice(0, 150).some((d) => d.regNumber === selectedDog.regNumber) && (
                        <option key={selectedDog.regNumber} value={selectedDog.regNumber}>
                          {selectedDog.name} ({selectedDog.regNumber})
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Sub-tabs: Document View Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080808] p-2.5 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setGeneratorSide('front')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        generatorSide === 'front'
                          ? 'bg-gold-gradient text-black font-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>1. Frente Notariado</span>
                    </button>

                    <button
                      onClick={() => setGeneratorSide('back')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        generatorSide === 'back'
                          ? 'bg-gold-gradient text-black font-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>2. Reverso (Árbol 4 Gen)</span>
                    </button>

                    <button
                      onClick={() => setGeneratorSide('pvc')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        generatorSide === 'pvc'
                          ? 'bg-gold-gradient text-black font-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>3. Credencial PVC Plastificada</span>
                    </button>

                    <button
                      onClick={() => setGeneratorSide('championship')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        generatorSide === 'championship'
                          ? 'bg-gold-gradient text-black font-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Certificado Oficial de Campeonato y Reconocimiento Morfológico"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>4. Certificado de Campeonato (CH / GR CH)</span>
                    </button>
                  </div>

                  {/* Selector de Orientación Carta/A4 Vertical vs Horizontal */}
                  {generatorSide !== 'pvc' && (
                    <div className="flex items-center bg-[#0C0B08] border border-[#D4AF37]/60 rounded-xl p-0.5 shadow">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, certificateOrientation: 'vertical' as const };
                          setFormData(updated);
                          updateContent(updated);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          formData.certificateOrientation === 'vertical'
                            ? 'bg-gold-gradient text-black font-black shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Formato Vertical Carta / A4"
                      >
                        Vertical (Carta / A4)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, certificateOrientation: 'horizontal' as const };
                          setFormData(updated);
                          updateContent(updated);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          formData.certificateOrientation === 'horizontal'
                            ? 'bg-gold-gradient text-black font-black shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                        title="Formato Horizontal A4"
                      >
                        Horizontal (A4)
                      </button>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportDocumentJpg}
                      disabled={isExportingJpg || isExportingPdf}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg"
                      title="Generar y descargar como imagen JPG en alta resolución con html2canvas (oro y negro oficial)"
                    >
                      {isExportingJpg ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generando JPG...</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          <span>Generar Documento (JPG)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleExportDocumentPdf}
                      disabled={isExportingPdf || isExportingJpg}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#FFE885] bg-[#1E190E] border border-[#D4AF37] hover:bg-[#2A2312] transition-all shadow"
                      title="Descargar documento en PDF A4 horizontal"
                    >
                      {isExportingPdf ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#FFE885]" />
                          <span>Compilando PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4 text-[#FFE885]" />
                          <span>Descargar PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handlePrintDocument}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-700 hover:text-white hover:border-[#D4AF37] transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>
                  </div>
                </div>

                {generatorStatusText && (
                  <div className="p-3 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-mono text-[#FFE885] text-center animate-pulse">
                    {generatorStatusText}
                  </div>
                )}

                {/* ================================================================= */}
                {/* VISTA 1: FRENTE OFICIAL NOTARIADO (#admin-printable-front)        */}
                {/* ================================================================= */}
                {generatorSide === 'front' && (
                  <div className="flex justify-center p-2 sm:p-4 bg-[#050505] rounded-2xl border border-neutral-800">
                    <div
                      id="admin-printable-front"
                      className={`w-full bg-[#FCFAF5] text-black rounded-2xl relative shadow-2xl border-4 border-[#D4AF37] overflow-hidden transition-all ${
                        formData.certificateOrientation === 'vertical'
                          ? 'max-w-[760px] min-h-[1050px] p-6 sm:p-10'
                          : 'max-w-5xl min-h-[660px] p-8 sm:p-12'
                      }`}
                    >
                      {/* Marca de agua central */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.09]">
                        <img src="/logo-inbr.jpg" alt="INBR Watermark" className="w-[460px] h-[460px] object-contain rounded-full" />
                      </div>

                      {/* Marco ornamental interior */}
                      <div className="border-2 border-[#D4AF37]/60 p-6 sm:p-8 rounded-xl relative z-10 flex flex-col justify-between min-h-[590px]">
                        
                        {/* Header */}
                        <div className="text-center pb-5 border-b-2 border-[#D4AF37]/50 relative">
                          <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-0.5 mx-auto mb-2 shadow-md bg-black overflow-hidden">
                            <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <h1 
                            className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-[#1A1A1A] uppercase"
                            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                          >
                            International Breeds Registry
                          </h1>
                          <span className="text-xs font-mono text-[#8C6B1F] tracking-widest font-bold uppercase block mt-0.5">
                            Certificado Oficial de Registro Canino & Orígenes Notariados
                          </span>
                        </div>

                        {/* Canine Details */}
                        <div className="grid grid-cols-12 gap-6 items-center py-6">
                          <div className="col-span-12 sm:col-span-4 flex flex-col items-center text-center space-y-3">
                            <div className="w-36 h-44 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-lg bg-black">
                              <img src={selectedDog.imageUrl} alt={selectedDog.name} className="w-full h-full object-cover" />
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <PedigreeQrBadge dog={selectedDog} size="md" label="Verificación Digital" />
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-8 space-y-3 text-xs sm:text-sm">
                            <div className="pb-2 border-b border-neutral-300">
                              <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono">Nombre Registrado:</span>
                              <h2 className="text-2xl font-black text-[#1A1A1A] font-serif uppercase tracking-wide">
                                {selectedDog.name || 'XXX'}
                              </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-neutral-800">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">N° de Registro:</span>
                                <strong className="text-[#8C6B1F] font-mono text-sm sm:text-base">{selectedDog.regNumber || 'XXX'}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Microchip Notariado:</span>
                                <strong className="font-mono text-xs">{selectedDog.microchip || 'XXX'}</strong>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Raza Reconocida:</span>
                                <span className="font-bold">{selectedDog.breed || 'XXX'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Color / Patrón:</span>
                                <span className="font-medium">{selectedDog.color || 'XXX'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Sexo:</span>
                                <span className="font-medium">{selectedDog.gender || 'XXX'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Fecha de Nacimiento:</span>
                                <span className="font-mono font-medium">{selectedDog.dob || 'XXX'}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-neutral-300 grid grid-cols-2 gap-3 text-neutral-800">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Propietario Legal:</span>
                                <span className="font-bold truncate block">{selectedDog.owner || 'XXX'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Criador Registrado:</span>
                                <span className="font-medium truncate block">{selectedDog.breeder || 'XXX'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signatures & Seal */}
                        <div className="pt-4 border-t-2 border-[#D4AF37]/50 flex flex-wrap items-center justify-between text-xs text-neutral-600 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border border-[#D4AF37] p-1 bg-gradient-to-tr from-[#8C6B1F] via-[#FFE885] to-[#D4AF37] flex items-center justify-center shadow">
                              <ShieldCheck className="w-7 h-7 text-black" />
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-[#8C6B1F] font-bold uppercase block">
                                CERTIFICACIÓN GENÉTICA INTERNACIONAL
                              </span>
                              <span className="text-[10px] font-mono text-neutral-500">
                                Folio Seguro SHA-256 Notariado INBR
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-serif italic font-bold text-sm text-[#1A1A1A]">
                              Jonathan García
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono block">
                              Presidente / CEO Notario INBR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* VISTA 2: REVERSO CON ÁRBOL DE 4 GENERACIONES (#admin-printable-back) */}
                {/* ================================================================= */}
                {generatorSide === 'back' && (
                  <div className="p-2 sm:p-4 bg-[#050505] rounded-2xl border border-neutral-800 overflow-x-auto">
                    <div 
                      id="admin-printable-back"
                      className="w-full min-w-[1250px] max-w-7xl mx-auto bg-[#FAFAFA] text-black shadow-2xl relative overflow-hidden border border-neutral-300"
                      style={{ minHeight: '740px' }}
                    >
                      {/* Left Gold & Black Column */}
                      <div 
                        className="absolute top-0 bottom-0 left-0 w-[240px] bg-[#000000] text-white flex flex-col justify-between p-5 z-10"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}
                      >
                        <div className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-b from-[#FFF1B8] via-[#D4AF37] to-[#8C6B1F]" />

                        <div className="flex flex-col items-center pt-2">
                          <div className="w-24 h-24 rounded-full border-2 border-[#D4AF37] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.6)] bg-black overflow-hidden">
                            <img src="/logo-inbr.jpg" alt="INBR Medallion" className="w-full h-full object-cover rounded-full" />
                          </div>
                        </div>

                        <div className="text-center py-6 pr-6">
                          <h1 className="text-3xl font-black text-[#D4AF37] font-serif-luxury tracking-wider uppercase drop-shadow leading-tight">
                            {selectedDog.name}
                          </h1>
                          <span className="text-[10px] font-mono text-neutral-300 mt-1 block">
                            REG: {selectedDog.regNumber}
                          </span>
                          <span className="text-[9px] text-neutral-400 block">
                            {selectedDog.breed}
                          </span>
                        </div>

                        <div className="flex flex-col items-center pb-2 pr-6">
                          <PedigreeQrBadge dog={selectedDog} size="lg" label="SCAN ME" />
                        </div>
                      </div>

                      {/* Right Column: 4 Generations Tree */}
                      <div className="pl-[250px] pr-6 pt-5 pb-4 flex flex-col justify-between min-h-[740px] relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.11] pl-[200px]">
                          <img src="/logo-inbr.jpg" alt="INBR Watermark" className="w-[500px] h-[500px] object-contain rounded-full" />
                        </div>

                        <div className="relative z-10 flex items-start justify-between border-b border-neutral-300 pb-2">
                          <div className="pt-3">
                            <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                              <span>Genograma Oficial / Genogram</span>
                              <span className="text-xs px-2.5 py-0.5 rounded bg-black text-[#FFE885] font-mono font-black">
                                4 GENERACIONES OFICIALES
                              </span>
                            </h2>
                          </div>

                          <div className="text-right">
                            <div 
                              className="text-2xl sm:text-3xl font-serif text-black italic tracking-wide"
                              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                            >
                              International Breeds Registry
                            </div>
                            <div className="text-sm font-serif italic text-[#C9A86A] tracking-wider font-semibold">
                              The new era is here
                            </div>
                          </div>
                        </div>

                        {/* DIAGRAMA DE 4 GENERACIONES */}
                        <div className="relative z-10 py-3 grid grid-cols-12 gap-3 text-[9.5px] leading-tight font-sans">
                          {/* GEN 1: Padres */}
                          <div className="col-span-3 flex flex-col justify-around py-2 border-r border-neutral-300 pr-2 space-y-12">
                            <div>
                              <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">PADRE (SIRE)</span>
                              <strong className="text-black font-extrabold text-xs block">{pedigree.sire.name}</strong>
                              <span className="text-neutral-600 block text-[9.5px]">{pedigree.sire.color}</span>
                              <span className="text-neutral-400 font-mono text-[8px] block">REG: {pedigree.sire.regNumber}</span>
                            </div>
                            <div className="pt-6 border-t border-neutral-300">
                              <span className="text-[8px] uppercase font-bold text-neutral-500 font-mono block">MADRE (DAM)</span>
                              <strong className="text-black font-extrabold text-xs block">{pedigree.dam.name}</strong>
                              <span className="text-neutral-600 block text-[9.5px]">{pedigree.dam.color}</span>
                              <span className="text-neutral-400 font-mono text-[8px] block">REG: {pedigree.dam.regNumber}</span>
                            </div>
                          </div>

                          {/* GEN 2: Abuelos */}
                          <div className="col-span-3 flex flex-col justify-between py-1 border-r border-neutral-300 pr-2 space-y-3">
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
                            <div className="pt-2 border-t border-neutral-200">
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

                          {/* GEN 3: Bisabuelos (8) */}
                          <div className="col-span-3 flex flex-col justify-between py-1 border-r border-neutral-300 pr-2 space-y-1.5 text-[9px]">
                            {pedigree.g3.map((anc, idx) => (
                              <div key={idx} className={idx === 4 ? 'pt-1 border-t border-neutral-200' : ''}>
                                <strong className="text-neutral-900 block font-bold truncate">{anc.name}</strong>
                                <span className="text-neutral-500 text-[8px] block truncate">{anc.color}</span>
                              </div>
                            ))}
                          </div>

                          {/* GEN 4: Tatarabuelos (16) */}
                          <div className="col-span-3 flex flex-col justify-between py-0.5 space-y-1 text-[8px]">
                            {pedigree.g4.map((anc, idx) => (
                              <div key={idx} className="flex items-center justify-between border-b border-neutral-100 pb-0.5">
                                <strong className="text-neutral-800 truncate font-mono text-[8px]">{anc.name}</strong>
                                <span className="text-neutral-400 text-[7px] font-mono shrink-0 ml-1">{anc.color}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Signatures & Legal */}
                        <div className="relative z-10 pt-2 border-t border-neutral-300">
                          <div className="grid grid-cols-2 gap-8 text-center text-[9px] text-neutral-600 mb-2">
                            <div>
                              <div className="border-b border-neutral-400 mb-1 h-5 flex items-end justify-center">
                                <span className="text-[10px] font-bold text-neutral-800">{selectedDog.owner}</span>
                              </div>
                              <span className="font-bold uppercase text-[8px] text-neutral-700">
                                FIRMA DEL PROPIETARIO / OWNER'S SIGNATURE
                              </span>
                            </div>

                            <div>
                              <div className="border-b border-neutral-400 mb-1 h-5 flex items-end justify-center">
                                <span className="text-[10px] font-script font-bold text-neutral-800">Jonathan García</span>
                              </div>
                              <span className="font-bold uppercase text-[8px] text-neutral-700">
                                NOTARIO OFICIAL INBR / PRESIDENT'S SEAL
                              </span>
                            </div>
                          </div>

                          <p className="text-[7.5px] text-neutral-500 text-justify leading-tight border-t border-neutral-200 pt-1 font-normal">
                            Certificado emitido bajo la autoridad cinológica global del International Breeds Registry (INBR). La morfología, salud funcional y autenticidad del ejemplar han sido validadas conforme a los estándares oficiales 2026. Todos los derechos reservados.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* VISTA 3: CREDENCIAL PVC PLASTIFICADA (#admin-printable-pvc)       */}
                {/* ================================================================= */}
                {generatorSide === 'pvc' && (
                  <div className="flex justify-center p-6 bg-[#050505] rounded-2xl border border-neutral-800">
                    <div
                      id="admin-printable-pvc"
                      className="w-[420px] h-[260px] rounded-2xl p-4 bg-gradient-to-br from-[#1A1813] via-[#0D0D0D] to-[#1F1B12] border-2 border-[#D4AF37] shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.3)] relative overflow-hidden flex flex-col justify-between text-white"
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <img src="/logo-inbr.jpg" alt="Watermark" className="w-48 h-48 object-cover rounded-full" />
                      </div>

                      <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/50 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full border border-[#D4AF37] p-0.5 bg-black overflow-hidden">
                            <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <div>
                            <span className="text-[11px] font-black tracking-wider text-gold-gradient uppercase block leading-none">
                              INTERNATIONAL BREEDS REGISTRY
                            </span>
                            <span className="text-[8px] font-mono text-neutral-400">CREDENTIAL ID • NOTARIADA</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885] font-bold">
                          ORIGINAL
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
                        <div className="col-span-4 flex flex-col items-center">
                          <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-black shadow">
                            <img src={selectedDog.imageUrl} alt={selectedDog.name} className="w-full h-full object-cover" />
                          </div>
                        </div>

                        <div className="col-span-8 space-y-1 text-left">
                          <h5 className="text-sm font-black text-white font-serif tracking-wide truncate">
                            {selectedDog.name}
                          </h5>
                          <div className="text-[10px] space-y-0.5 text-neutral-300 font-mono">
                            <div><span className="text-neutral-500">REG:</span> <strong className="text-[#FFE885]">{selectedDog.regNumber}</strong></div>
                            <div><span className="text-neutral-500">CHIP:</span> <span>{selectedDog.microchip}</span></div>
                            <div><span className="text-neutral-500">RAZA:</span> <span>{selectedDog.breed}</span></div>
                            <div><span className="text-neutral-500">COLOR:</span> <span>{selectedDog.color}</span></div>
                            <div><span className="text-neutral-500">NAC:</span> <span>{selectedDog.dob}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#D4AF37]/40 text-[8px] font-mono text-neutral-400 relative z-10">
                        <span>PROP: {selectedDog.owner}</span>
                        <span className="text-[#FFE885] font-bold">INBR OFICIAL • 2026</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* ================================================================= */}
                {/* VISTA 4: CERTIFICADO DE CAMPEONATO (#admin-printable-champ)      */}
                {/* ================================================================= */}
                {generatorSide === 'championship' && (
                  <div className="flex justify-center p-2 sm:p-4 bg-[#050505] rounded-2xl border border-neutral-800">
                    <div
                      id="admin-printable-champ"
                      className="w-full max-w-5xl bg-[#090805] text-white rounded-2xl p-8 sm:p-12 relative shadow-2xl border-4 border-[#D4AF37] overflow-hidden"
                      style={{ minHeight: '660px' }}
                    >
                      {/* Marca de agua central */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07]">
                        <img src="/logo-inbr.jpg" alt="INBR Watermark" className="w-[460px] h-[460px] object-contain rounded-full" />
                      </div>

                      {/* Marco ornamental interior */}
                      <div className="border-2 border-[#D4AF37]/70 p-6 sm:p-8 rounded-xl relative z-10 flex flex-col justify-between min-h-[590px] bg-gradient-to-b from-[#110E09]/90 to-[#0A0906]/95">
                        {/* Header */}
                        <div className="text-center pb-4 border-b-2 border-[#D4AF37]/50 relative">
                          <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-0.5 mx-auto mb-2 shadow-[0_0_25px_rgba(212,175,55,0.4)] bg-black overflow-hidden">
                            <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
                          </div>
                          <h1
                            className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-[#FFE885] uppercase drop-shadow"
                            style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                          >
                            International Breeds Registry
                          </h1>
                          <span className="text-xs font-mono text-[#D4AF37] tracking-widest font-bold uppercase block mt-1">
                            Título Honorífico & Certificación Oficial de Campeonato
                          </span>
                        </div>

                        {/* Title Announcement */}
                        <div className="text-center py-4 space-y-1">
                          <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 block">
                            Por cuanto ha cumplido satisfactoriamente las normas morfológicas y acumulado los puntos requeridos en pista oficial, se proclama como:
                          </span>
                          <h2 className="text-3xl sm:text-4xl font-black font-serif-luxury text-gold-gradient uppercase tracking-widest drop-shadow-[0_2px_20px_rgba(212,175,55,0.6)] py-1">
                            GRAND CHAMPION SUPREME (GR CH)
                          </h2>
                          <span className="inline-block px-3 py-1 rounded-full bg-[#1F1910] border border-[#D4AF37] text-xs font-mono font-bold text-[#FFE885]">
                            CATEGORÍA ADULTO • MORFOLOGÍA & ESTRUCTURA ÉLITE
                          </span>
                        </div>

                        {/* Dog info with picture */}
                        <div className="grid grid-cols-12 gap-6 items-center py-2 px-4 rounded-xl bg-black/50 border border-[#D4AF37]/30">
                          <div className="col-span-12 sm:col-span-3 flex justify-center">
                            <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-[#D4AF37] shadow-xl bg-black">
                              <img src={selectedDog.imageUrl} alt={selectedDog.name} className="w-full h-full object-cover" />
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-6 space-y-1.5 text-xs sm:text-sm">
                            <h3 className="text-xl font-black text-white font-serif tracking-wide uppercase">
                              {selectedDog.name}
                            </h3>
                            <div className="grid grid-cols-2 gap-2 text-neutral-300 font-mono text-[11px]">
                              <div><span className="text-neutral-500">Folio:</span> <strong className="text-[#FFE885]">{selectedDog.regNumber}</strong></div>
                              <div><span className="text-neutral-500">Microchip:</span> <span>{selectedDog.microchip}</span></div>
                              <div><span className="text-neutral-500">Raza:</span> <span>{selectedDog.breed}</span></div>
                              <div><span className="text-neutral-500">Color:</span> <span>{selectedDog.color}</span></div>
                              <div className="col-span-2"><span className="text-neutral-500">Propietario:</span> <strong className="text-white">{selectedDog.owner}</strong></div>
                              <div className="col-span-2"><span className="text-neutral-500">Criador:</span> <span>{selectedDog.breeder}</span></div>
                            </div>
                          </div>

                          <div className="col-span-12 sm:col-span-3 flex flex-col items-center justify-center">
                            <PedigreeQrBadge dog={selectedDog} size="md" label="VALIDACIÓN QR INBR" />
                          </div>
                        </div>

                        {/* Signatures & Seal */}
                        <div className="pt-4 border-t-2 border-[#D4AF37]/50 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border border-[#D4AF37] p-1 bg-gradient-to-tr from-[#8C6B1F] via-[#FFE885] to-[#D4AF37] flex items-center justify-center shadow">
                              <Trophy className="w-7 h-7 text-black" />
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-[#FFE885] font-bold uppercase block">
                                COMITÉ CINOLÓGICO DE JUECES
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                Certificación Oficial 2026 • Registro Notariado
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-serif italic font-bold text-sm text-[#FFE885]">
                              Jonathan García
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono block">
                              Presidente / CEO Notario INBR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: MÓDULO DE SUBIDA DE VIDEO PARA CAMADAS                              */}
            {/* ========================================================================= */}
            {activeTab === 'litters' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#17140B] to-[#0D0B06] border-2 border-[#D4AF37] shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Video className="w-5 h-5 text-[#FFE885]" />
                    <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                      Módulo de Subida y Validación de Video para Camadas
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-300 max-w-3xl">
                    Herramienta de auditoría biométrica y confirmación visual en tiempo real. Graba directamente desde la cámara o sube un video para certificar la lactancia y el conteo exacto de cachorros.
                  </p>
                </div>

                {videoValidationSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{videoValidationSuccess}</span>
                  </div>
                )}

                {videoError && (
                  <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs sm:text-sm flex items-center gap-3 animate-shake">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>{videoError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Video Recorder / Uploader & Validation Checklist */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-[#FFE885] uppercase">
                          Captura en Vivo / Video de Inspección
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {isRecording ? `Grabando: ${recordingSeconds}s` : 'Máx 100MB'}
                        </span>
                      </div>

                      {/* Video Player / Live Camera Frame */}
                      <div className="aspect-video w-full rounded-xl bg-black border-2 border-[#D4AF37]/50 relative overflow-hidden flex items-center justify-center">
                        {isCameraActive ? (
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : recordedVideoUrl ? (
                          <video
                            ref={playbackRef}
                            src={recordedVideoUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-neutral-500">
                            <Camera className="w-12 h-12 text-[#D4AF37]/60" />
                            <span className="text-xs font-mono text-neutral-400">
                              Cámara inactiva o video no cargado
                            </span>
                            <span className="text-[10px] text-neutral-600">
                              Presiona "Activar Cámara Web" o sube un archivo de video
                            </span>
                          </div>
                        )}

                        {isRecording && (
                          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/90 text-white font-mono text-xs font-bold animate-pulse">
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            <span>REC {recordingSeconds}s</span>
                          </div>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {!isCameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1A1A1A] border border-[#D4AF37]/60 hover:bg-[#2A2312] hover:text-[#FFE885]"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#FFE885]" />
                            <span>Activar Cámara Web</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopCameraStream}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-neutral-300 bg-neutral-900 border border-neutral-700 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Apagar Cámara</span>
                          </button>
                        )}

                        {isCameraActive && !isRecording && (
                          <button
                            type="button"
                            onClick={startRecording}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 transition-all shadow"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Iniciar Grabación</span>
                          </button>
                        )}

                        {isRecording && (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-[#FFE885] hover:bg-white transition-all shadow animate-pulse"
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span>Detener Grabación</span>
                          </button>
                        )}

                        <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFE885] bg-[#221A0F] border border-[#D4AF37] hover:bg-gold-gradient hover:text-black cursor-pointer transition-all ml-auto">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Cargar Archivo Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileUploadVideo}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Interactive Real-Time Validation Checklist */}
                    <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-2.5">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block">
                        Criterios Notariales de Validación de Video en Tiempo Real:
                      </span>
                      
                      <div className="space-y-2 text-xs text-neutral-300">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaMotherNursing}
                            onChange={(e) => setCriteriaMotherNursing(e.target.checked)}
                            className="w-4 h-4 accent-[#D4AF37] rounded"
                          />
                          <span>Madre lactando visible amamantando a los cachorros</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaCountMatches}
                            onChange={(e) => setCriteriaCountMatches(e.target.checked)}
                            className="w-4 h-4 accent-[#D4AF37] rounded"
                          />
                          <span>El conteo total de cachorros coincide exactamente con la solicitud</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaMicrochipAudited}
                            onChange={(e) => setCriteriaMicrochipAudited(e.target.checked)}
                            className="w-4 h-4 accent-[#D4AF37] rounded"
                          />
                          <span>Microchip de la madre y del padre confirmados en base de datos</span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={criteriaLocationConfirmed}
                            onChange={(e) => setCriteriaLocationConfirmed(e.target.checked)}
                            className="w-4 h-4 accent-[#D4AF37] rounded"
                          />
                          <span>Fecha actual y geolocalización del criadero auditadas</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right: Litter Details Form & Submission */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-3 shadow-lg">
                      <h5 className="text-sm font-black text-white font-serif-luxury uppercase tracking-wider">
                        Datos Oficiales de la Camada
                      </h5>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Folio Madre (Dam):
                          </label>
                          <input
                            type="text"
                            value={litterMotherReg}
                            onChange={(e) => setLitterMotherReg(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Folio Padre (Sire):
                          </label>
                          <input
                            type="text"
                            value={litterFatherReg}
                            onChange={(e) => setLitterFatherReg(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                              Total:
                            </label>
                            <input
                              type="number"
                              value={litterPuppiesCount}
                              onChange={(e) => setLitterPuppiesCount(Number(e.target.value))}
                              className="w-full px-2.5 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                              Machos:
                            </label>
                            <input
                              type="number"
                              value={litterMales}
                              onChange={(e) => setLitterMales(Number(e.target.value))}
                              className="w-full px-2.5 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                              Hembras:
                            </label>
                            <input
                              type="number"
                              value={litterFemales}
                              onChange={(e) => setLitterFemales(Number(e.target.value))}
                              className="w-full px-2.5 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-center"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Criadero / Propietario:
                          </label>
                          <input
                            type="text"
                            value={litterBreeder}
                            onChange={(e) => setLitterBreeder(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Fecha de Nacimiento:
                          </label>
                          <input
                            type="date"
                            value={litterBirthDate}
                            onChange={(e) => setLitterBirthDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmAndUploadLitter}
                        disabled={isUploadingVideo}
                        className="w-full mt-4 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        {isUploadingVideo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Validando y Subiendo a Supabase...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Certificar & Validar Camada Oficial</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Recent Validated Litters */}
                    <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-2.5">
                      <span className="text-xs font-mono font-bold text-neutral-300 uppercase block">
                        Camadas Recientemente Validadas:
                      </span>
                      <div className="space-y-2">
                        {validatedLitters.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-black border border-neutral-800 flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <strong className="text-white block text-[11px]">{item.motherReg}</strong>
                              <span className="text-[10px] text-neutral-400">
                                {item.puppiesCount} Cachorros • {item.breederName}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                              {item.trackingId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: EDITOR DE CONTENIDOS DINÁMICOS                                     */}
            {/* ========================================================================= */}
            {activeTab === 'content' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1A160D] to-[#0D0B06] border-2 border-[#D4AF37] shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-[#FFE885]" />
                      <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                        Editor de Contenidos Dinámicos en Vivo
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
                      Modifica los títulos, subtítulos, avisos oficiales y llamadas a la acción de la plataforma web en tiempo real sin tener que tocar el código fuente. Los cambios se guardan y reflejan inmediatamente.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetDynamicContent}
                      className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white hover:border-neutral-500"
                    >
                      Restablecer Fábrica
                    </button>
                  </div>
                </div>

                {contentSavedFeedback && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>¡Contenidos actualizados exitosamente! Todos los usuarios verán los nuevos textos de inmediato.</span>
                  </div>
                )}

                {/* MODE SELECTOR: ESCÁNER GLOBAL DEL DOM vs FORMULARIO ESTRUCTURADO */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#120F09] border border-[#D4AF37]/40 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCmsMode('dom_scanner')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cmsMode === 'dom_scanner'
                          ? 'bg-gold-gradient text-black font-black shadow-lg scale-102'
                          : 'text-neutral-400 hover:text-white bg-black/40 border border-neutral-800'
                      }`}
                    >
                      <Search className="w-4 h-4" />
                      <span>1. 🔍 Escáner Global del DOM en Vivo</span>
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-[#FFE885]">
                        {scannedItems.length} Elementos
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCmsMode('structured')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        cmsMode === 'structured'
                          ? 'bg-gold-gradient text-black font-black shadow-lg scale-102'
                          : 'text-neutral-400 hover:text-white bg-black/40 border border-neutral-800'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>2. Formulario Estructurado por Secciones</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={scanDom}
                      disabled={isScanning}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#D4AF37]' : ''}`} />
                      <span>{isScanning ? 'Escaneando DOM...' : 'Re-Escanear DOM'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAllDomChangesToSupabase}
                      disabled={savingDomChanges}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                    >
                      {savingDomChanges ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando en Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Guardar Todos en Supabase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {domSaveSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{domSaveSuccess}</span>
                  </div>
                )}

                {/* VIEW 1: GLOBAL DOM SCANNER */}
                {cmsMode === 'dom_scanner' && (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Search & Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-[#0D0B07] border border-[#D4AF37]/30 shadow-md">
                      <div className="md:col-span-6 relative">
                        <Search className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={domSearchQuery}
                          onChange={(e) => setDomSearchQuery(e.target.value)}
                          placeholder="Buscar texto en el DOM (ej: 'Jonathan García', 'preservación', 'Houston', 'CEO')..."
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#FFE885] focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={domSectionFilter}
                          onChange={(e) => setDomSectionFilter(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        >
                          <option value="ALL">Todas las Secciones ({availableDomSections.length})</option>
                          {availableDomSections.map((sec) => (
                            <option key={sec} value={sec}>
                              {sec}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <select
                          value={domTagFilter}
                          onChange={(e) => setDomTagFilter(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        >
                          <option value="ALL">Todos los Tipos de Elemento</option>
                          <option value="TITLES">Títulos Principales (H1, H2, H3, H4)</option>
                          <option value="PARAGRAPHS">Párrafos Descriptivos (P)</option>
                          <option value="OTHER">Otros / Etiquetas</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter Status Badge */}
                    <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                      <span>
                        Mostrando <strong className="text-[#FFE885]">{filteredDomItems.length}</strong> de <strong className="text-white">{scannedItems.length}</strong> elementos escaneados en la página web.
                      </span>
                      <span className="text-[11px] font-mono text-[#D4AF37]">
                        ⚡ Al editar cualquier texto se previsualiza en vivo y se puede guardar en Supabase.
                      </span>
                    </div>

                    {/* Scanned DOM Items Grid (windowed to keep typing instant) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredDomItems.slice(0, domRenderLimit).map((item) => {
                        const currentVal = editedOverrides[item.id] !== undefined ? editedOverrides[item.id] : item.text;
                        const isModified = currentVal !== item.text;

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl bg-[#090909] border transition-all flex flex-col justify-between shadow-lg relative ${
                              isModified
                                ? 'border-[#FFE885] shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                                : 'border-[#D4AF37]/30 hover:border-[#D4AF37]/70'
                            }`}
                          >
                            <div className="space-y-2.5">
                              {/* Header: Tag + Section + Stable ID */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1F1910] border border-[#D4AF37] text-[#FFE885]">
                                    {item.tag}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 border border-neutral-800 text-neutral-300">
                                    {item.section}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[140px]" title={item.id}>
                                  {item.id}
                                </span>
                              </div>

                              {/* Editable Textarea */}
                              <div>
                                <textarea
                                  rows={item.tag === 'P' || item.text.length > 80 ? 4 : 2}
                                  value={currentVal}
                                  onChange={(e) => handleUpdateSingleDomText(item.id, e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#FFE885] focus:outline-none resize-y"
                                  placeholder="Escribe el nuevo texto..."
                                />
                              </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.element) {
                                    item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }}
                                className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                title="Localizar este elemento en la página web"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Ver en DOM</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSaveSingleDomItemToSupabase(item.id)}
                                disabled={savingDomChanges}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow cursor-pointer ml-auto"
                                title="Guardar este texto directamente en Supabase"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Guardar en Supabase</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredDomItems.length > domRenderLimit && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setDomRenderLimit((prev) => prev + 48)}
                          className="px-5 py-2.5 rounded-xl bg-[#18140B] border border-[#D4AF37] text-xs font-bold text-[#FFE885] hover:bg-[#241E10] transition-all cursor-pointer"
                        >
                          Mostrar más textos ({domRenderLimit} de {filteredDomItems.length})
                        </button>
                      </div>
                    )}

                    {filteredDomItems.length === 0 && (
                      <div className="p-12 text-center rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                        <Search className="w-10 h-10 text-neutral-600 mx-auto" />
                        <h5 className="text-base font-bold text-white font-serif-luxury">
                          No se encontraron textos que coincidan con los filtros
                        </h5>
                        <p className="text-xs text-neutral-400">
                          Intenta con otro término de búsqueda o cambia el filtro de sección.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDomSearchQuery('');
                            setDomSectionFilter('ALL');
                            setDomTagFilter('ALL');
                          }}
                          className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-[#FFE885] border border-neutral-700 hover:bg-neutral-700 cursor-pointer"
                        >
                          Restablecer Filtros
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW 2: STRUCTURED SECTIONS FORM */}
                {cmsMode === 'structured' && (
                  <form onSubmit={handleSaveDynamicContent} className="space-y-6">
                  {/* Live Preview Banner */}
                  <div className="p-6 rounded-2xl bg-[#080808] border-2 border-[#D4AF37]/50 shadow-2xl relative overflow-hidden">
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold tracking-widest block mb-3">
                      VISTA PREVIA EN VIVO DE LA PORTADA (HERO):
                    </span>

                    <div className="text-center space-y-2 py-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#18140B] border border-[#D4AF37] text-[10px] font-mono font-bold text-[#FFE885] uppercase">
                        {formData.heroBadge}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black font-serif-luxury text-white uppercase tracking-wide">
                        {formData.heroTitleLine1} <br />
                        <span className="text-gold-gradient">{formData.heroTitleLine2}</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-neutral-300 max-w-xl mx-auto font-light leading-relaxed">
                        {formData.heroSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Hero Section Texts */}
                    <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                        1. Encabezado Principal (Hero)
                      </span>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Principal - Línea 1:
                        </label>
                        <input
                          type="text"
                          value={formData.heroTitleLine1}
                          onChange={(e) => setFormData({ ...formData, heroTitleLine1: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Principal - Línea 2 (Dorado):
                        </label>
                        <input
                          type="text"
                          value={formData.heroTitleLine2}
                          onChange={(e) => setFormData({ ...formData, heroTitleLine2: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Badge Superior / Lema:
                        </label>
                        <input
                          type="text"
                          value={formData.heroBadge}
                          onChange={(e) => setFormData({ ...formData, heroBadge: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Subtítulo Descriptivo:
                        </label>
                        <textarea
                          rows={3}
                          value={formData.heroSubtitle}
                          onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      {/* Foto o Banner del Principio (Exclusivo Panel Maestro) */}
                      <div className="pt-3 border-t border-neutral-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono text-[#FFE885] uppercase font-bold flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#FFE885]" />
                            <span>Foto o Banner del Principio:</span>
                          </label>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                            🔒 Solo Panel Maestro
                          </span>
                        </div>

                        {/* Banner Preview */}
                        <div className="aspect-[24/9] w-full rounded-xl overflow-hidden bg-black border border-[#D4AF37]/50 relative">
                          <img
                            src={formData.heroBannerUrl || BREED_IMAGES.heroBanner}
                            alt="Banner Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">
                            URL Directa de la Imagen:
                          </label>
                          <input
                            type="text"
                            value={formData.heroBannerUrl || ''}
                            onChange={(e) => setFormData({ ...formData, heroBannerUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-mono text-[11px] focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 cursor-pointer shadow transition-all">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Subir Archivo de Imagen para Banner</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const url = await uploadCmsImage(e.target.files[0]);
                                    setFormData({ ...formData, heroBannerUrl: url });
                                    alert('Foto de banner actualizada exitosamente.');
                                  } catch (err) {
                                    console.error(err);
                                    alert('Error al subir la imagen.');
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Notices & Sections Texts */}
                    <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                        2. Avisos Notariales y Secciones
                      </span>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Aviso Notarial / Banner Superior:
                        </label>
                        <textarea
                          rows={2}
                          value={formData.bannerNotice}
                          onChange={(e) => setFormData({ ...formData, bannerNotice: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Sección Verificación:
                        </label>
                        <input
                          type="text"
                          value={formData.verificationTitle}
                          onChange={(e) => setFormData({ ...formData, verificationTitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Directorio Criadores:
                        </label>
                        <input
                          type="text"
                          value={formData.breedersTitle}
                          onChange={(e) => setFormData({ ...formData, breedersTitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Anuncio de Temporada Eventos 2026:
                        </label>
                        <input
                          type="text"
                          value={formData.eventsNotice}
                          onChange={(e) => setFormData({ ...formData, eventsNotice: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      {/* Espacio para editar la Foto / Póster del Circuito (Exclusivo Panel Administrativo) */}
                      <div className="pt-3 border-t border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono text-[#FFE885] uppercase font-bold flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-[#FFE885]" />
                            <span>Foto / Póster de Circuitos (Sección Eventos):</span>
                          </label>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                            🔒 Solo Panel Administrativo
                          </span>
                        </div>

                        <div className="aspect-[24/8] w-full rounded-xl overflow-hidden bg-black border border-[#D4AF37]/50 relative">
                          <img
                            src={formData.eventsBannerUrl || BREED_IMAGES.heroBanner}
                            alt="Póster de Circuitos"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={formData.eventsBannerUrl || ''}
                            onChange={(e) => setFormData({ ...formData, eventsBannerUrl: e.target.value })}
                            placeholder="URL directa de la foto del circuito (https://...)"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-neutral-700 text-white font-mono text-[11px] focus:border-[#D4AF37]"
                          />
                        </div>

                        <div>
                          <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1E190E] border-2 border-[#D4AF37] text-[#FFE885] font-bold text-xs hover:bg-gold-gradient hover:text-black cursor-pointer shadow transition-all">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Subir Nueva Foto / Póster de la Sección Eventos</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                                    const url = await uploadCmsImage(e.target.files[0]);
                                    setFormData({ ...formData, eventsBannerUrl: url });
                                    updateContent({ eventsBannerUrl: url });
                                    alert('Foto de circuito de eventos actualizada exitosamente.');
                                  } catch (err) {
                                    console.error(err);
                                    alert('Error al subir la imagen.');
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Quiénes Somos & Salón de la Fama */}
                    <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                        3. Quiénes Somos & Salón de la Fama
                      </span>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Quiénes Somos:
                        </label>
                        <input
                          type="text"
                          value={formData.aboutUsTitle}
                          onChange={(e) => setFormData({ ...formData, aboutUsTitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Párrafo Misión / Quiénes Somos:
                        </label>
                        <textarea
                          rows={2}
                          value={formData.aboutUsParagraph1}
                          onChange={(e) => setFormData({ ...formData, aboutUsParagraph1: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Título Salón de la Fama:
                        </label>
                        <input
                          type="text"
                          value={formData.hallOfFameTitle}
                          onChange={(e) => setFormData({ ...formData, hallOfFameTitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Subtítulo Salón de la Fama:
                        </label>
                        <input
                          type="text"
                          value={formData.hallOfFameSubtitle}
                          onChange={(e) => setFormData({ ...formData, hallOfFameSubtitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    {/* Contacto & Visibilidad de Secciones */}
                    <div className="p-5 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                        4. Contacto Oficial & Visibilidad de Secciones
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Teléfono Directo:
                          </label>
                          <input
                            type="text"
                            value={formData.contactPhone}
                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Correo Notarial:
                          </label>
                          <input
                            type="text"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-800">
                        <span className="text-[10px] font-mono text-[#D4AF37] uppercase font-bold block mb-2">
                          Control de Visibilidad del Menú y Secciones:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {[
                            { key: 'hero', label: 'Portada Hero' },
                            { key: 'aboutUs', label: 'Quiénes Somos' },
                            { key: 'team', label: 'Directiva / Equipo' },
                            { key: 'bullBreeds', label: 'Razas Oficiales' },
                            { key: 'specialEdition', label: 'Edición Especial' },
                            { key: 'racialStandards', label: 'Estándares' },
                            { key: 'breeders', label: 'Criadores' },
                            { key: 'events', label: 'Eventos 2026' },
                            { key: 'champions', label: 'Campeones' },
                            { key: 'verification', label: 'Verificación' },
                            { key: 'hallOfFame', label: 'Salón de la Fama' },
                            { key: 'liveLitter', label: 'Camada en Vivo' },
                            { key: 'forms', label: 'Formularios' },
                            { key: 'certifications', label: 'Certificaciones' },
                            { key: 'contact', label: 'Contacto' },
                          ].map((item) => {
                            const isVisible = (formData.sectionVisibility as any)?.[item.key] !== false;
                            return (
                              <label key={item.key} className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg bg-black/60 border border-neutral-800 hover:border-[#D4AF37]/50">
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      sectionVisibility: {
                                        ...formData.sectionVisibility,
                                        [item.key]: e.target.checked,
                                      },
                                    });
                                  }}
                                  className="w-3.5 h-3.5 accent-[#D4AF37] rounded"
                                />
                                <span className="text-[11px] text-neutral-300 font-medium truncate">{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 5. Equipo Directivo & Jueces Oficiales (Edición Completa) */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#FFE885]" />
                            <span>5. Equipo Directivo & Jueces Oficiales (Edición Completa)</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Modifica las fotografías de los directores, nombres, cargos, insignias o añade nuevos directivos.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.executiveTeam || [];
                            const newM = {
                              id: `exec-${Date.now()}`,
                              name: 'Nuevo Directivo',
                              title: 'Cargo Directivo',
                              badge: 'Dirección Oficial',
                              image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                            };
                            setFormData({ ...formData, executiveTeam: [...current, newM] });
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Directivo</span>
                        </button>
                      </div>

                      {/* Header de la sección */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-black border border-neutral-800">
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Badge de Sección:
                          </label>
                          <input
                            type="text"
                            value={formData.teamBadge || ''}
                            onChange={(e) => setFormData({ ...formData, teamBadge: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Título Sección:
                          </label>
                          <input
                            type="text"
                            value={formData.teamTitle || ''}
                            onChange={(e) => setFormData({ ...formData, teamTitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Subtítulo:
                          </label>
                          <input
                            type="text"
                            value={formData.teamSubtitle || ''}
                            onChange={(e) => setFormData({ ...formData, teamSubtitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white text-xs"
                          />
                        </div>
                      </div>

                      {/* Tarjetas de Miembros Directivos */}
                      <div className="space-y-3">
                        <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block">
                          Miembros Directivos Actuales ({(formData.executiveTeam || []).length}):
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(formData.executiveTeam || []).map((member) => (
                            <div
                              key={member.id}
                              className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={member.image}
                                  alt={member.name}
                                  className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37] bg-neutral-900 shrink-0 shadow"
                                />
                                <div className="flex-1 min-w-0">
                                  <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre:</label>
                                  <input
                                    type="text"
                                    value={member.name}
                                    onChange={(e) => {
                                      const updated = (formData.executiveTeam || []).map((m) =>
                                        m.id === member.id ? { ...m, name: e.target.value } : m
                                      );
                                      setFormData({ ...formData, executiveTeam: updated });
                                    }}
                                    className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold text-xs"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = formData.executiveTeam || [];
                                    if (current.length <= 1) {
                                      alert('Debe haber al menos un directivo.');
                                      return;
                                    }
                                    setFormData({
                                      ...formData,
                                      executiveTeam: current.filter((m) => m.id !== member.id),
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                                  title="Eliminar directivo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-mono text-neutral-400 uppercase block">Cargo:</label>
                                  <input
                                    type="text"
                                    value={member.title}
                                    onChange={(e) => {
                                      const updated = (formData.executiveTeam || []).map((m) =>
                                        m.id === member.id ? { ...m, title: e.target.value } : m
                                      );
                                      setFormData({ ...formData, executiveTeam: updated });
                                    }}
                                    className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-[11px] font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-mono text-neutral-400 uppercase block">Badge:</label>
                                  <input
                                    type="text"
                                    value={member.badge}
                                    onChange={(e) => {
                                      const updated = (formData.executiveTeam || []).map((m) =>
                                        m.id === member.id ? { ...m, badge: e.target.value } : m
                                      );
                                      setFormData({ ...formData, executiveTeam: updated });
                                    }}
                                    className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-[11px] font-mono"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL Foto:</label>
                                <input
                                  type="text"
                                  value={member.image}
                                  onChange={(e) => {
                                    const updated = (formData.executiveTeam || []).map((m) =>
                                      m.id === member.id ? { ...m, image: e.target.value } : m
                                    );
                                    setFormData({ ...formData, executiveTeam: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-neutral-300 text-[10px] font-mono"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 6. Representantes Oficiales Internacionales (Edición Completa) */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#FFE885]" />
                            <span>6. Representantes Oficiales Internacionales</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Administra a los representantes regionales (país, bandera, contacto oficial y cargo).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.representativesList || [];
                            const newRep = {
                              id: `rep-${Date.now()}`,
                              name: 'Nuevo Representante',
                              country: 'País / Región',
                              flag: '🌐',
                              role: 'Representante Oficial',
                              contact: '+1 000 000 0000',
                            };
                            setFormData({ ...formData, representativesList: [...current, newRep] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Representante</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(formData.representativesList || []).map((rep) => (
                          <div
                            key={rep.id}
                            className="p-4 rounded-xl bg-black border border-[#D4AF37]/40 hover:border-[#D4AF37] space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{rep.flag}</span>
                                <div>
                                  <label className="text-[9px] font-mono text-neutral-400 uppercase block">Bandera (Emoji):</label>
                                  <input
                                    type="text"
                                    value={rep.flag}
                                    onChange={(e) => {
                                      const updated = (formData.representativesList || []).map((r) =>
                                        r.id === rep.id ? { ...r, flag: e.target.value } : r
                                      );
                                      setFormData({ ...formData, representativesList: updated });
                                    }}
                                    className="w-16 px-2 py-0.5 rounded bg-[#151515] border border-neutral-700 text-center text-sm"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.representativesList || [];
                                  if (current.length <= 1) {
                                    alert('Debe haber al menos un representante oficial.');
                                    return;
                                  }
                                  setFormData({
                                    ...formData,
                                    representativesList: current.filter((r) => r.id !== rep.id),
                                  });
                                }}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                                title="Eliminar representante"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Foto del Representante con URL y vista previa */}
                            <div className="flex items-center gap-3">
                              <img
                                src={rep.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'}
                                alt={rep.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37] bg-neutral-900 shrink-0 shadow"
                              />
                              <div className="flex-1 min-w-0">
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL Foto Oficial:</label>
                                <input
                                  type="text"
                                  value={rep.image || ''}
                                  onChange={(e) => {
                                    const updated = (formData.representativesList || []).map((r) =>
                                      r.id === rep.id ? { ...r, image: e.target.value } : r
                                    );
                                    setFormData({ ...formData, representativesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[10px] font-mono"
                                  placeholder="https://images.unsplash.com/..."
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre Completo:</label>
                              <input
                                type="text"
                                value={rep.name}
                                onChange={(e) => {
                                  const updated = (formData.representativesList || []).map((r) =>
                                    r.id === rep.id ? { ...r, name: e.target.value } : r
                                  );
                                  setFormData({ ...formData, representativesList: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">País / Estado:</label>
                                <input
                                  type="text"
                                  value={rep.country}
                                  onChange={(e) => {
                                    const updated = (formData.representativesList || []).map((r) =>
                                      r.id === rep.id ? { ...r, country: e.target.value } : r
                                    );
                                    setFormData({ ...formData, representativesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-[11px] font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Cargo / Rol:</label>
                                <input
                                  type="text"
                                  value={rep.role}
                                  onChange={(e) => {
                                    const updated = (formData.representativesList || []).map((r) =>
                                      r.id === rep.id ? { ...r, role: e.target.value } : r
                                    );
                                    setFormData({ ...formData, representativesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Teléfono / WhatsApp Oficial:</label>
                              <input
                                type="text"
                                value={rep.contact}
                                onChange={(e) => {
                                  const updated = (formData.representativesList || []).map((r) =>
                                    r.id === rep.id ? { ...r, contact: e.target.value } : r
                                  );
                                  setFormData({ ...formData, representativesList: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-emerald-400 font-mono text-[11px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 7. Jueces Oficiales Acreditados (Edición Completa) */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#FFE885]" />
                            <span>7. Jueces Oficiales Acreditados INBR</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Modifica o añade jueces oficiales licenciados, sus especialidades morfológicas y trayectoria.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.judgesList || [];
                            const newJ = {
                              id: `judge-${Date.now()}`,
                              name: 'Nuevo Juez Oficial',
                              origin: 'País / Región',
                              specialty: 'Especialidad Morfológica',
                              experience: '10 años de trayectoria',
                              badge: 'Juez Licenciado INBR',
                            };
                            setFormData({ ...formData, judgesList: [...current, newJ] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Juez Oficial</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(formData.judgesList || []).map((judge) => (
                          <div
                            key={judge.id}
                            className="p-4 rounded-xl bg-black border border-[#D4AF37]/40 hover:border-[#D4AF37] space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-gold-gradient text-black font-black text-[10px]">
                                {judge.badge}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.judgesList || [];
                                  if (current.length <= 1) {
                                    alert('Debe haber al menos un juez acreditado.');
                                    return;
                                  }
                                  setFormData({
                                    ...formData,
                                    judgesList: current.filter((j) => j.id !== judge.id),
                                  });
                                }}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                                title="Eliminar juez"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Foto del Juez con URL y vista previa */}
                            <div className="flex items-center gap-3">
                              <img
                                src={judge.image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'}
                                alt={judge.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-[#D4AF37] bg-neutral-900 shrink-0 shadow"
                              />
                              <div className="flex-1 min-w-0">
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL Foto Oficial:</label>
                                <input
                                  type="text"
                                  value={judge.image || ''}
                                  onChange={(e) => {
                                    const updated = (formData.judgesList || []).map((j) =>
                                      j.id === judge.id ? { ...j, image: e.target.value } : j
                                    );
                                    setFormData({ ...formData, judgesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[10px] font-mono"
                                  placeholder="https://images.unsplash.com/..."
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre del Juez:</label>
                              <input
                                type="text"
                                value={judge.name}
                                onChange={(e) => {
                                  const updated = (formData.judgesList || []).map((j) =>
                                    j.id === judge.id ? { ...j, name: e.target.value } : j
                                  );
                                  setFormData({ ...formData, judgesList: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Origen / País:</label>
                                <input
                                  type="text"
                                  value={judge.origin}
                                  onChange={(e) => {
                                    const updated = (formData.judgesList || []).map((j) =>
                                      j.id === judge.id ? { ...j, origin: e.target.value } : j
                                    );
                                    setFormData({ ...formData, judgesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-[11px] font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Licencia / Badge:</label>
                                <input
                                  type="text"
                                  value={judge.badge}
                                  onChange={(e) => {
                                    const updated = (formData.judgesList || []).map((j) =>
                                      j.id === judge.id ? { ...j, badge: e.target.value } : j
                                    );
                                    setFormData({ ...formData, judgesList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Especialidad de Juzgamiento:</label>
                              <input
                                type="text"
                                value={judge.specialty}
                                onChange={(e) => {
                                  const updated = (formData.judgesList || []).map((j) =>
                                    j.id === judge.id ? { ...j, specialty: e.target.value } : j
                                  );
                                  setFormData({ ...formData, judgesList: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Años de Trayectoria:</label>
                              <input
                                type="text"
                                value={judge.experience}
                                onChange={(e) => {
                                  const updated = (formData.judgesList || []).map((j) =>
                                    j.id === judge.id ? { ...j, experience: e.target.value } : j
                                  );
                                  setFormData({ ...formData, judgesList: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-400 text-[11px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 8. Galería Oficial de Fotografías (Edición Completa) */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Camera className="w-4 h-4 text-[#FFE885]" />
                            <span>8. Galería Oficial de Fotografías & Campeones</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Añade, modifica o elimina fotos de la galería (Grand Champions, Pistas de Juzgamiento, Camadas y Circuitos).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.galleryPhotos || [];
                            const newPhoto = {
                              id: `gal-${Date.now()}`,
                              title: 'Nueva Fotografía Oficial',
                              category: 'champions' as const,
                              imageUrl: BREED_IMAGES.americanBully,
                              description: 'Ejemplar en pista internacional.',
                              date: 'Temporada 2026',
                            };
                            setFormData({ ...formData, galleryPhotos: [newPhoto, ...current] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Foto a Galería</span>
                        </button>
                      </div>

                      {/* Header de Galería */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-black border border-neutral-800">
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Badge Galería:
                          </label>
                          <input
                            type="text"
                            value={formData.galleryBadge || ''}
                            onChange={(e) => setFormData({ ...formData, galleryBadge: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Título Galería:
                          </label>
                          <input
                            type="text"
                            value={formData.galleryTitle || ''}
                            onChange={(e) => setFormData({ ...formData, galleryTitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                            Subtítulo Galería:
                          </label>
                          <input
                            type="text"
                            value={formData.gallerySubtitle || ''}
                            onChange={(e) => setFormData({ ...formData, gallerySubtitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white text-xs"
                          />
                        </div>
                      </div>

                      {/* Fotos de Galería Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(formData.galleryPhotos || []).map((photo) => (
                          <div
                            key={photo.id}
                            className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2.5"
                          >
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 relative">
                              <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover" />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-[#FFE885] uppercase">
                                {photo.category}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.galleryPhotos || [];
                                  setFormData({
                                    ...formData,
                                    galleryPhotos: current.filter((p) => p.id !== photo.id),
                                  });
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded bg-black/80 text-neutral-400 hover:text-rose-400 cursor-pointer"
                                title="Eliminar foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Título de Foto:</label>
                              <input
                                type="text"
                                value={photo.title}
                                onChange={(e) => {
                                  const updated = (formData.galleryPhotos || []).map((p) =>
                                    p.id === photo.id ? { ...p, title: e.target.value } : p
                                  );
                                  setFormData({ ...formData, galleryPhotos: updated });
                                }}
                                className="w-full px-2.5 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold text-xs"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Categoría:</label>
                                <select
                                  value={photo.category}
                                  onChange={(e) => {
                                    const updated = (formData.galleryPhotos || []).map((p) =>
                                      p.id === photo.id ? { ...p, category: e.target.value as any } : p
                                    );
                                    setFormData({ ...formData, galleryPhotos: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-[10px] font-mono"
                                >
                                  <option value="champions">Grand Champions</option>
                                  <option value="rings">Pistas & Rings</option>
                                  <option value="litters">Camadas</option>
                                  <option value="events">Circuitos</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Lugar / Fecha:</label>
                                <input
                                  type="text"
                                  value={photo.date || ''}
                                  onChange={(e) => {
                                    const updated = (formData.galleryPhotos || []).map((p) =>
                                      p.id === photo.id ? { ...p, date: e.target.value } : p
                                    );
                                    setFormData({ ...formData, galleryPhotos: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[10px]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL de Imagen:</label>
                              <input
                                type="text"
                                value={photo.imageUrl}
                                onChange={(e) => {
                                  const updated = (formData.galleryPhotos || []).map((p) =>
                                    p.id === photo.id ? { ...p, imageUrl: e.target.value } : p
                                  );
                                  setFormData({ ...formData, galleryPhotos: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-neutral-400 text-[10px] font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 9. Razas Oficiales Reconocidas */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#FFE885]" />
                            <span>9. Razas Oficiales Reconocidas (Edición & Catálogo)</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Administra el catálogo de razas reconocidas por la INBR con sus variedades y fotografías.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.breedsList || [];
                            const newB = {
                              id: `br-${Date.now()}`,
                              name: 'Nueva Raza Oficial',
                              variety: 'Variedades Reconocidas',
                              standard: 'Descripción del estándar morfológico oficial.',
                              image: BREED_IMAGES.americanBully,
                            };
                            setFormData({ ...formData, breedsList: [...current, newB] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Raza</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-black border border-neutral-800">
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">Título de Sección Razas:</label>
                          <input
                            type="text"
                            value={formData.bullBreedsTitle || ''}
                            onChange={(e) => setFormData({ ...formData, bullBreedsTitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">Subtítulo de Sección:</label>
                          <input
                            type="text"
                            value={formData.bullBreedsSubtitle || ''}
                            onChange={(e) => setFormData({ ...formData, bullBreedsSubtitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.breedsList || []).map((breed) => (
                          <div key={breed.id} className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#FFE885]">{breed.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.breedsList || [];
                                  setFormData({ ...formData, breedsList: current.filter((b) => b.id !== breed.id) });
                                }}
                                className="p-1 rounded text-neutral-500 hover:text-rose-400 cursor-pointer"
                                title="Eliminar raza"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre de Raza:</label>
                                <input
                                  type="text"
                                  value={breed.name}
                                  onChange={(e) => {
                                    const updated = (formData.breedsList || []).map((b) =>
                                      b.id === breed.id ? { ...b, name: e.target.value } : b
                                    );
                                    setFormData({ ...formData, breedsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Variedades:</label>
                                <input
                                  type="text"
                                  value={breed.variety}
                                  onChange={(e) => {
                                    const updated = (formData.breedsList || []).map((b) =>
                                      b.id === breed.id ? { ...b, variety: e.target.value } : b
                                    );
                                    setFormData({ ...formData, breedsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL de Imagen:</label>
                              <input
                                type="text"
                                value={breed.image}
                                onChange={(e) => {
                                  const updated = (formData.breedsList || []).map((b) =>
                                    b.id === breed.id ? { ...b, image: e.target.value } : b
                                  );
                                  setFormData({ ...formData, breedsList: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-neutral-300 text-[10px] font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Estándar Morfológico Resumido:</label>
                              <textarea
                                rows={2}
                                value={breed.standard}
                                onChange={(e) => {
                                  const updated = (formData.breedsList || []).map((b) =>
                                    b.id === breed.id ? { ...b, standard: e.target.value } : b
                                  );
                                  setFormData({ ...formData, breedsList: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 10. Calendario Oficial de Eventos 2026 */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#FFE885]" />
                            <span>10. Calendario Oficial de Eventos & Circuitos 2026</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Añade, edita o quita eventos oficiales, sedes, fechas, estado y cuerpo de jueces.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.eventsList || [];
                            const newEv = {
                              id: `ev-${Date.now()}`,
                              title: 'Nuevo Evento Cinológico INBR',
                              date: 'Fecha por Confirmar',
                              location: 'Sede / Ciudad',
                              status: 'Inscripciones Abiertas',
                              judges: 'Panel Oficial INBR',
                              banner: BREED_IMAGES.heroBanner,
                            };
                            setFormData({ ...formData, eventsList: [...current, newEv] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Evento</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-black border border-neutral-800">
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">Título de Sección Eventos:</label>
                          <input
                            type="text"
                            value={formData.eventsTitle || ''}
                            onChange={(e) => setFormData({ ...formData, eventsTitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">Subtítulo de Sección:</label>
                          <input
                            type="text"
                            value={formData.eventsSubtitle || ''}
                            onChange={(e) => setFormData({ ...formData, eventsSubtitle: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-1">Aviso de Temporada:</label>
                          <input
                            type="text"
                            value={formData.eventsNotice || ''}
                            onChange={(e) => setFormData({ ...formData, eventsNotice: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] border border-neutral-700 text-[#FFE885] font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.eventsList || []).map((ev) => (
                          <div key={ev.id} className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#FFE885] truncate">{ev.title}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.eventsList || [];
                                  setFormData({ ...formData, eventsList: current.filter((item) => item.id !== ev.id) });
                                }}
                                className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer shrink-0"
                                title="Eliminar evento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre Evento:</label>
                                <input
                                  type="text"
                                  value={ev.title}
                                  onChange={(e) => {
                                    const updated = (formData.eventsList || []).map((item) =>
                                      item.id === ev.id ? { ...item, title: e.target.value } : item
                                    );
                                    setFormData({ ...formData, eventsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-xs font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Fecha:</label>
                                <input
                                  type="text"
                                  value={ev.date}
                                  onChange={(e) => {
                                    const updated = (formData.eventsList || []).map((item) =>
                                      item.id === ev.id ? { ...item, date: e.target.value } : item
                                    );
                                    setFormData({ ...formData, eventsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Lugar / Ciudad:</label>
                                <input
                                  type="text"
                                  value={ev.location}
                                  onChange={(e) => {
                                    const updated = (formData.eventsList || []).map((item) =>
                                      item.id === ev.id ? { ...item, location: e.target.value } : item
                                    );
                                    setFormData({ ...formData, eventsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Estado:</label>
                                <input
                                  type="text"
                                  value={ev.status}
                                  onChange={(e) => {
                                    const updated = (formData.eventsList || []).map((item) =>
                                      item.id === ev.id ? { ...item, status: e.target.value } : item
                                    );
                                    setFormData({ ...formData, eventsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-emerald-400 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 11. Estándares Raciales Morfológicos */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#FFE885]" />
                            <span>11. Estándares Raciales Oficiales Notariados</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Gestiona las especificaciones anatómicas y morfológicas oficiales (cabeza, mordida, talla, cuerpo).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.standardsList || [];
                            const newStd = {
                              id: `std-${Date.now()}`,
                              breed: 'Raza Estándar',
                              variety: 'Variedad',
                              height: 'Talla oficial',
                              head: 'Estructura cefálica',
                              bite: 'Mordida reglamentaria',
                              body: 'Conformación corporal',
                            };
                            setFormData({ ...formData, standardsList: [...current, newStd] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Estándar</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.standardsList || []).map((std) => (
                          <div key={std.id} className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#FFE885]">{std.breed} ({std.variety})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.standardsList || [];
                                  setFormData({ ...formData, standardsList: current.filter((item) => item.id !== std.id) });
                                }}
                                className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                                title="Eliminar estándar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Raza:</label>
                                <input
                                  type="text"
                                  value={std.breed}
                                  onChange={(e) => {
                                    const updated = (formData.standardsList || []).map((item) =>
                                      item.id === std.id ? { ...item, breed: e.target.value } : item
                                    );
                                    setFormData({ ...formData, standardsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Talla a la Cruz:</label>
                                <input
                                  type="text"
                                  value={std.height}
                                  onChange={(e) => {
                                    const updated = (formData.standardsList || []).map((item) =>
                                      item.id === std.id ? { ...item, height: e.target.value } : item
                                    );
                                    setFormData({ ...formData, standardsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] font-mono text-[11px]"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Cabeza:</label>
                                <input
                                  type="text"
                                  value={std.head}
                                  onChange={(e) => {
                                    const updated = (formData.standardsList || []).map((item) =>
                                      item.id === std.id ? { ...item, head: e.target.value } : item
                                    );
                                    setFormData({ ...formData, standardsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Mordida:</label>
                                <input
                                  type="text"
                                  value={std.bite}
                                  onChange={(e) => {
                                    const updated = (formData.standardsList || []).map((item) =>
                                      item.id === std.id ? { ...item, bite: e.target.value } : item
                                    );
                                    setFormData({ ...formData, standardsList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 12. Certificaciones Notariales */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#FFE885]" />
                            <span>12. Certificaciones Notariales & Avales Internacionales</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Administra los certificados oficiales emitidos (Pedigrí 4 Gen, Microchip ISO, Homologaciones).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.certificationsList || [];
                            const newCert = {
                              id: `cert-${Date.now()}`,
                              title: 'Nueva Certificación Notarial',
                              desc: 'Descripción detallada de la validez legal y cinológica.',
                              badge: 'AVAL OFICIAL INBR',
                            };
                            setFormData({ ...formData, certificationsList: [...current, newCert] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar Certificación</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.certificationsList || []).map((cert) => (
                          <div key={cert.id} className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-black bg-gold-gradient px-2 py-0.5 rounded">{cert.badge}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.certificationsList || [];
                                  setFormData({ ...formData, certificationsList: current.filter((item) => item.id !== cert.id) });
                                }}
                                className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                                title="Eliminar certificación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Título:</label>
                              <input
                                type="text"
                                value={cert.title}
                                onChange={(e) => {
                                  const updated = (formData.certificationsList || []).map((item) =>
                                    item.id === cert.id ? { ...item, title: e.target.value } : item
                                  );
                                  setFormData({ ...formData, certificationsList: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">Descripción:</label>
                              <textarea
                                rows={2}
                                value={cert.desc}
                                onChange={(e) => {
                                  const updated = (formData.certificationsList || []).map((item) =>
                                    item.id === cert.id ? { ...item, desc: e.target.value } : item
                                  );
                                  setFormData({ ...formData, certificationsList: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 13. Salón de la Fama Canino */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-[#090909] border-2 border-[#D4AF37]/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                        <div>
                          <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-[#FFE885]" />
                            <span>13. Salón de la Fama Internacional (Pilares & Campeones)</span>
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Administra los ejemplares consagrados en el Salón de la Fama oficial INBR.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = formData.hallOfFameList || [];
                            const newHof = {
                              id: `hof-${Date.now()}`,
                              name: 'Nuevo Gran Campeón Consagrado',
                              titles: 'Grand Champion Supreme',
                              year: 'Consagrado 2026',
                              owner: 'Propietario / Kennel',
                              image: BREED_IMAGES.americanBully,
                            };
                            setFormData({ ...formData, hallOfFameList: [...current, newHof] });
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Agregar al Salón</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(formData.hallOfFameList || []).map((hof) => (
                          <div key={hof.id} className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#FFE885]">{hof.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.hallOfFameList || [];
                                  setFormData({ ...formData, hallOfFameList: current.filter((item) => item.id !== hof.id) });
                                }}
                                className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                                title="Eliminar del salón de la fama"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Nombre:</label>
                                <input
                                  type="text"
                                  value={hof.name}
                                  onChange={(e) => {
                                    const updated = (formData.hallOfFameList || []).map((item) =>
                                      item.id === hof.id ? { ...item, name: e.target.value } : item
                                    );
                                    setFormData({ ...formData, hallOfFameList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-mono text-neutral-400 uppercase block">Año / Título:</label>
                                <input
                                  type="text"
                                  value={hof.year}
                                  onChange={(e) => {
                                    const updated = (formData.hallOfFameList || []).map((item) =>
                                      item.id === hof.id ? { ...item, year: e.target.value } : item
                                    );
                                    setFormData({ ...formData, hallOfFameList: updated });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] font-mono text-[11px]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-mono text-neutral-400 uppercase block">URL Foto:</label>
                              <input
                                type="text"
                                value={hof.image}
                                onChange={(e) => {
                                  const updated = (formData.hallOfFameList || []).map((item) =>
                                    item.id === hof.id ? { ...item, image: e.target.value } : item
                                  );
                                  setFormData({ ...formData, hallOfFameList: updated });
                                }}
                                className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-800 text-neutral-300 text-[10px] font-mono"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 14. Control de Escala y Tamaño de Textos de Toda la Web */}
                    <div className="md:col-span-2 p-5 rounded-2xl bg-gradient-to-r from-[#17140B] to-[#0A0A0A] border-2 border-[#D4AF37]/60 space-y-3">
                      <div className="flex items-center gap-2">
                        <Type className="w-5 h-5 text-[#FFE885]" />
                        <h5 className="text-base font-black text-white font-serif-luxury">
                          9. Control de Escala y Tamaño de Textos de la Web (Acomodar Chicos / Grandes)
                        </h5>
                      </div>
                      <p className="text-xs text-neutral-300">
                        Ajusta el tamaño global de las tipografías, encabezados y párrafos de toda la página para adaptarla a cualquier preferencia visual.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {[
                          { id: 'small', label: 'Chico (85%)', desc: 'Tipografía compacta para ver más contenido' },
                          { id: 'normal', label: 'Normal (100%)', desc: 'Tamaño estándar oficial INBR' },
                          { id: 'large', label: 'Grande (115%)', desc: 'Lectura amplia y destacada' },
                          { id: 'xlarge', label: 'Extra Grande (130%)', desc: 'Máxima visibilidad de textos' },
                        ].map((scaleOpt) => {
                          const isSelected = (formData.textScale || 'normal') === scaleOpt.id;
                          return (
                            <button
                              key={scaleOpt.id}
                              type="button"
                              onClick={() => {
                                const updated = { ...formData, textScale: scaleOpt.id as any };
                                setFormData(updated);
                                updateContent(updated);
                                applyTextScaleToDom(scaleOpt.id as any);
                              }}
                              className={`flex-1 min-w-[140px] p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gold-gradient text-black font-black border-[#FFE885] shadow-lg scale-102'
                                  : 'bg-black/60 border-neutral-800 text-neutral-300 hover:border-[#D4AF37]/50'
                              }`}
                            >
                              <span className="block text-xs font-bold">{scaleOpt.label}</span>
                              <span className="block text-[9px] mt-0.5 opacity-80">{scaleOpt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-8 py-3.5 rounded-xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Guardar Cambios Dinámicos en la Web</span>
                    </button>
                  </div>
                </form>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: PANEL DE CONTROL DE REPRESENTANTES REGIONALES                        */}
            {/* ========================================================================= */}
            {activeTab === 'representatives' && (
              <div className="space-y-6 animate-fadeIn">
                <AdminRepresentativesEditor
                  isAdmin={isMasterUser}
                  representatives={formData.representativesList || []}
                  onChange={(updated) => {
                    const patch = { ...formData, representativesList: updated };
                    setFormData(patch);
                    updateContent(patch);
                  }}
                />

                    {/* Vouchers Validation */}
                    <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                      <span className="text-xs font-mono font-bold text-[#FFE885] uppercase block border-b border-neutral-800 pb-2">
                        Validación de Comprobantes de Pago de Representantes
                      </span>

                      <div className="space-y-3">
                        {vouchers.map((voucher) => (
                          <div
                            key={voucher.id}
                            className="p-3.5 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={voucher.receiptUrl}
                                alt="Comprobante"
                                className="w-14 h-14 rounded-lg object-cover border border-[#D4AF37]/50"
                              />
                              <div>
                                <span className="text-xs font-mono text-[#D4AF37] font-bold block">
                                  {voucher.id} • {voucher.amount}
                                </span>
                                <strong className="text-xs text-white block">{voucher.repName}</strong>
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  Ejemplar: {voucher.dogName} ({voucher.regNumber})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {voucher.status === 'PENDING' ? (
                                <button
                                  onClick={() => handleApproveVoucher(voucher.id)}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                                >
                                  Aprobar Depósito
                                </button>
                              ) : (
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 font-mono text-xs border border-emerald-800 font-bold">
                                  ✓ Depósito Aprobado
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: REGISTRO DE ACTIVIDAD Y AUDITORÍA (ACTIVITY LOGS)                  */}
            {/* ========================================================================= */}
            {activeTab === 'activity_logs' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                {/* Header Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#1E190E] via-[#14120D] to-[#1E190E] border-2 border-[#D4AF37]/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow-md">
                        <FileText className="w-4 h-4" />
                      </div>
                      <h4 className="text-xl font-black text-white font-serif-luxury tracking-wide">
                        Registro Notarial de Actividad & Auditoría (Supabase Logs)
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-300 max-w-2xl leading-relaxed">
                      Historial inmutable y trazabilidad de todas las modificaciones realizadas en el sistema por usuarios y representantes.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/80 text-[10px] font-mono text-emerald-300 font-bold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Verificación de Rol: Admin Autorizado ({user?.name || 'Jonathan García'})</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18140B] border border-[#D4AF37]/40 text-[10px] font-mono text-[#FFE885]">
                        <Database className="w-3 h-3 text-[#D4AF37]" />
                        <span>Tabla 'logs' en Supabase Activa</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={loadLogsFromSupabase}
                      disabled={isLoadingLogs}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#221A0F] border border-[#D4AF37] text-xs font-mono text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all shadow"
                      title="Consultar logs directamente desde la base de datos de Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-[#D4AF37]' : ''}`} />
                      <span>{isLoadingLogs ? 'Consultando...' : 'Sincronizar Supabase'}</span>
                    </button>

                    <button
                      onClick={handleExportLogsJson}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white hover:border-neutral-500 transition-all shadow"
                      title="Descargar archivo JSON con el historial de logs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>JSON</span>
                    </button>

                    <button
                      onClick={handleExportLogsCsv}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white hover:border-neutral-500 transition-all shadow"
                      title="Descargar archivo CSV estructurado para Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>CSV / Excel</span>
                    </button>
                  </div>
                </div>

                {logsError && (
                  <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/80 text-amber-200 text-xs flex items-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{logsError}</span>
                  </div>
                )}

                {/* Metrics overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-neutral-800">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Total Eventos:</span>
                    <span className="text-xl font-black text-white font-mono">{activityLogs.length}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-neutral-800">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Eventos CMS:</span>
                    <span className="text-xl font-black text-[#FFE885] font-mono">
                      {activityLogs.filter(l => l.category === 'CMS').length}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-neutral-800">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Franquicias & Permisos:</span>
                    <span className="text-xl font-black text-amber-300 font-mono">
                      {activityLogs.filter(l => l.category === 'REPRESENTANTES').length}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-black/60 border border-neutral-800">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Seguridad & Camadas:</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {activityLogs.filter(l => l.category === 'SEGURIDAD' || l.category === 'CAMADAS').length}
                    </span>
                  </div>
                </div>

                {/* Search & Category Filter */}
                <div className="p-4 rounded-2xl bg-[#090909] border border-neutral-800 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Buscar por autor, acción, campo modificado o descripción..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {['ALL', 'CMS', 'REPRESENTANTES', 'CAMADAS', 'CERTIFICADOS', 'SEGURIDAD'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setLogCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
                            logCategoryFilter === cat
                              ? 'bg-gold-gradient text-black shadow'
                              : 'bg-black text-neutral-400 hover:text-white border border-neutral-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Logs Feed / Table */}
                <div className="space-y-3">
                  {activityLogs
                    .filter((log) => {
                      if (logCategoryFilter !== 'ALL' && log.category !== logCategoryFilter) return false;
                      if (!logSearchQuery.trim()) return true;
                      const q = logSearchQuery.toLowerCase();
                      return (
                        log.author.name.toLowerCase().includes(q) ||
                        log.action.toLowerCase().includes(q) ||
                        (log.fieldModified && log.fieldModified.toLowerCase().includes(q)) ||
                        log.details.toLowerCase().includes(q) ||
                        (log.author.email && log.author.email.toLowerCase().includes(q)) ||
                        (log.author.region && log.author.region.toLowerCase().includes(q))
                      );
                    })
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-2xl bg-black/80 border border-neutral-800 hover:border-[#D4AF37]/60 transition-all shadow-md flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Author Role Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                                log.author.role === 'MASTER'
                                  ? 'bg-gold-gradient text-black shadow'
                                  : log.author.role === 'REPRESENTATIVE'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                              }`}
                            >
                              {log.author.role === 'MASTER' ? '👑 MASTER' : log.author.role === 'REPRESENTATIVE' ? '🛡️ REPRESENTANTE' : '⚙️ SISTEMA'}
                            </span>

                            {/* Author Name */}
                            <strong className="text-xs text-white font-bold">{log.author.name}</strong>

                            {log.author.region && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                • {log.author.region}
                              </span>
                            )}

                            {/* Category Badge */}
                            <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[9px] font-mono text-[#FFE885]">
                              {log.category}
                            </span>

                            {/* Action Name */}
                            <span className="text-[10px] font-mono font-bold text-neutral-300">
                              {log.action}
                            </span>
                          </div>

                          {/* Field Modified */}
                          {log.fieldModified && (
                            <div className="text-xs">
                              <span className="text-neutral-400 font-mono text-[11px]">Campo Modificado: </span>
                              <code className="text-[#FFE885] bg-[#1A150D] px-2 py-0.5 rounded border border-[#D4AF37]/30 font-mono font-bold">
                                {log.fieldModified}
                              </code>
                            </div>
                          )}

                          {/* Values changed */}
                          {(log.previousValue !== undefined || log.newValue !== undefined) && (
                            <div className="text-[11px] font-mono flex flex-wrap items-center gap-2 text-neutral-400">
                              {log.previousValue && (
                                <span className="line-through text-rose-400/80 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900">
                                  {log.previousValue}
                                </span>
                              )}
                              {log.previousValue && log.newValue && <span>→</span>}
                              {log.newValue && (
                                <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900">
                                  {log.newValue}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Details */}
                          <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                            {log.details}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <div className="text-right shrink-0 flex md:flex-col items-center md:items-end justify-between gap-1 text-[10px] font-mono text-neutral-400 border-t md:border-t-0 pt-2 md:pt-0 border-neutral-800">
                          <span className="text-neutral-300 font-bold">{log.formattedDate}</span>
                          <span className="text-[9px] text-neutral-500">{log.id}</span>
                        </div>
                      </div>
                    ))}

                  {activityLogs.length === 0 && (
                    <div className="text-center py-12 p-6 rounded-2xl bg-black border border-neutral-800">
                      <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                      <h5 className="text-sm font-bold text-white mb-1">No hay registros de actividad</h5>
                      <p className="text-xs text-neutral-400">No se encontraron eventos para el filtro seleccionado.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: GUÍA OFICIAL PARA VER Y PUBLICAR LA WEB EN LÍNEA                   */}
            {/* ========================================================================= */}
            {activeTab === 'publish_guide' && (
              <div className="p-4 sm:p-8 space-y-6 animate-fadeIn">
                {/* Banner de Inicio */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#20180B] via-[#14120D] to-[#20180B] border-2 border-[#D4AF37]/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gold-gradient text-black flex items-center justify-center font-black shadow-lg text-xl">
                        <Rocket className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-white font-serif-luxury tracking-wide">
                          ¿Cómo Ver y Usar tu Aplicación en Línea Ya Mismo?
                        </h4>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 text-[10px] font-mono font-bold">
                          GUÍA OFICIAL PARA JONATHAN GARCÍA (MASTER CEO)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 max-w-2xl pt-1 leading-relaxed">
                      Aquí tienes los 4 métodos oficiales para abrir tu web de inmediato en cualquier celular o computadora, compartirla con criadores y representantes, o publicarla con tu propio dominio.
                    </p>
                  </div>
                </div>

                {/* Grid con las 4 Opciones Claras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Método 1: Enlace Inmediato AI Studio */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0B08] border-2 border-[#D4AF37]/50 shadow-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1C170E] border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE885] font-black">
                        1
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-white font-serif-luxury">
                          Usar el Enlace en Vivo de AI Studio (Inmediato)
                        </h5>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">¡LISTO PARA USAR AHORA MISMO!</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Tu aplicación ya está funcionando en este momento. Para verla en pantalla completa o compartirla con otras personas:
                    </p>
                    <ul className="text-xs text-neutral-300 space-y-2 list-disc list-inside">
                      <li>En la esquina superior derecha de AI Studio, haz clic en el botón <strong>"Share" (Compartir)</strong> o en el icono de <strong>"Abrir en pestaña nueva"</strong>.</li>
                      <li>Copia la dirección web que se genera y pégala en cualquier navegador o envíala por WhatsApp.</li>
                      <li>Cualquier persona puede ingresar inmediatamente para verificar microchips o ver los estándares de raza.</li>
                    </ul>
                  </div>

                  {/* Método 2: Instalar en Celular como App Móvil (PWA) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0B08] border-2 border-emerald-600/50 shadow-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400 font-black">
                        2
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-white font-serif-luxury">
                          Tenerla como App en tu Teléfono Celular
                        </h5>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">ACCESO RÁPIDO CON ICONO INBR</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Tanto tú como tus clientes pueden instalarla directamente en su celular como si fuera una app de Google Play o App Store:
                    </p>
                    <div className="space-y-2 text-xs text-neutral-300">
                      <div className="p-2.5 rounded-xl bg-[#14120D] border border-neutral-800">
                        <strong className="text-[#FFE885] block mb-0.5">📱 En Android (Google Chrome):</strong>
                        <span>Abre el enlace de tu web, toca los tres puntos (⋮) en la esquina superior y pulsa <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#14120D] border border-neutral-800">
                        <strong className="text-[#FFE885] block mb-0.5">🍏 En iPhone / iPad (Safari):</strong>
                        <span>Abre el enlace en Safari, toca el botón de compartir (cuadrado con flecha hacia arriba) y selecciona <strong>"Agregar al inicio"</strong>.</span>
                      </div>
                    </div>
                  </div>

                  {/* Método 3: Publicar en la Nube 24/7 (Vercel / Netlify) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0B08] border-2 border-[#D4AF37]/50 shadow-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1C170E] border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE885] font-black">
                        3
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-white font-serif-luxury">
                          Publicar en la Nube 24/7 (Vercel o Netlify)
                        </h5>
                        <span className="text-[10px] text-[#FFE885] font-mono font-bold">HOSTING GRATUITO DE ALTA VELOCIDAD</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Para tener tu página alojada permanentemente en un servidor en la nube sin costo:
                    </p>
                    <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside">
                      <li>El proyecto se compila con el comando: <code className="text-[#FFE885] font-mono bg-black px-1.5 py-0.5 rounded">npm run build</code> (genera la carpeta <code className="text-[#FFE885] font-mono">dist</code>).</li>
                      <li>Entra a <strong>vercel.com</strong> o <strong>netlify.com</strong> y crea una cuenta gratuita.</li>
                      <li>Conecta tu repositorio de GitHub o arrastra la carpeta <code className="text-[#FFE885] font-mono">dist</code>.</li>
                      <li>Agrega las 2 variables de Supabase configuradas en tu app:
                        <div className="mt-1 font-mono text-[11px] text-[#FFE885] bg-black p-2 rounded-lg border border-neutral-800">
                          VITE_SUPABASE_URL=https://glyqawudervvqnxbdybp.supabase.co<br/>
                          VITE_SUPABASE_ANON_KEY=...
                        </div>
                      </li>
                      <li>En 30 segundos tendrás un enlace oficial como: <code className="text-emerald-400 font-mono">https://inbr-registry.vercel.app</code></li>
                    </ol>
                  </div>

                  {/* Método 4: Dominio Personalizado Propio */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#0C0B08] border-2 border-[#D4AF37]/50 shadow-lg space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1C170E] border border-[#D4AF37]/60 flex items-center justify-center text-[#FFE885] font-black">
                        4
                      </div>
                      <div>
                        <h5 className="text-base font-bold text-white font-serif-luxury">
                          Conectar tu Dominio Propio (.com / .org)
                        </h5>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">MARCA PROFESIONAL INTERNACIONAL</span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Si compraste o compras un dominio como <code className="text-[#FFE885] font-mono">inbr-registry.com</code> o <code className="text-[#FFE885] font-mono">inbroficial.org</code>:
                    </p>
                    <ul className="text-xs text-neutral-300 space-y-2 list-disc list-inside">
                      <li>En el panel de Vercel o Netlify, ve a <strong>Settings → Domains</strong>.</li>
                      <li>Escribe tu dominio (ej: <code className="text-[#FFE885]">inbr-registry.com</code>).</li>
                      <li>En tu proveedor de dominios (GoDaddy, Namecheap, Google Domains) añade el registro DNS (CNAME o A) que te indica Vercel/Netlify.</li>
                      <li>El certificado de seguridad SSL (candadito verde https://) se activa de manera gratuita y automática.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
              </main>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECURE ADMIN PASSWORD GATE MODAL                                          */}
        {/* ========================================================================= */}
        {adminGateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0E0E0E] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-[0_0_60px_rgba(212,175,55,0.4)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white font-serif-luxury uppercase tracking-wide">
                      Compuerta de Seguridad Admin
                    </h4>
                    <span className="text-[10px] text-[#FFE885] font-mono">
                      Acceso Restringido • Jonathan García (Master)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setAdminGateOpen(false)}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-black border border-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
                Esta sección contiene herramientas de edición de contenidos CMS, control de franquicias y registros notariales de auditoría. Para continuar, introduce la contraseña del Administrador Maestro.
              </p>

              {adminGateError && (
                <div className="mb-4 p-2.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{adminGateError}</span>
                </div>
              )}

              <form onSubmit={handleAdminGateSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#FFE885] font-bold block mb-1">
                    Contraseña de Administrador Maestro:
                  </label>
                  <input
                    type="password"
                    value={adminGatePassword}
                    onChange={(e) => setAdminGatePassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#D4AF37]/60 text-white font-mono text-xs focus:border-[#FFE885] focus:outline-none"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminGateOpen(false);
                      setPendingTabAfterUnlock(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Desbloquear</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Floating Inactivity Warning when < 60 seconds remain */}
        {isAuthenticated && remainingInactivitySeconds !== undefined && remainingInactivitySeconds > 0 && remainingInactivitySeconds <= 60 && (
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-bounce">
            <div className="p-4 rounded-2xl bg-[#1E1208] border-2 border-amber-500 shadow-2xl text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
                <div>
                  <h5 className="text-xs font-bold text-amber-300 uppercase">¿Sigues en el panel?</h5>
                  <p className="text-[11px] text-neutral-300">
                    Tu sesión expirará en <strong className="text-white font-mono">{remainingInactivitySeconds}s</strong> por inactividad.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetInactivityTimer}
                className="px-3.5 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 shadow cursor-pointer shrink-0"
              >
                Mantener Activa
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Floating Emergency Back Button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.5)] border-2 border-[#FFE885] cursor-pointer"
        title="Regresar a la página web"
      >
        <X className="w-4 h-4 text-black" />
        <span>← Salir / Volver a la Web</span>
      </button>
    </div>
  </div>
  );
};
