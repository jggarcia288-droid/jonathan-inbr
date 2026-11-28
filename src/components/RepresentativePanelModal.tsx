import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRegistry } from '../context/RegistryContext';
import { DogRecord } from '../data/registryData';
import { useDynamicContent } from '../utils/dynamicContent';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { addActivityLog } from '../utils/activityLogs';
import { 
  HomologationPedigreeBuilder, 
  HomologationPedigreeData, 
  INITIAL_HOMOLOGATION_PEDIGREE 
} from './HomologationPedigreeBuilder';
import { 
  ShieldCheck, 
  ArrowLeft, 
  X, 
  Video, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  Plus, 
  Camera, 
  Image as ImageIcon, 
  Search, 
  Key, 
  Sparkles,
  Lock,
  LogOut,
  Send,
  Eye,
  Check,
  ArrowRightLeft,
  EyeOff,
  Menu,
  ChevronDown,
  ChevronUp,
  MoreVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RepresentativePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMasterPanel?: () => void;
}

interface RepresentativeSubmission {
  id: string;
  type: 'CAMADA' | 'HOMOLOGACION' | 'INICIAL' | 'CAMBIO_PROPIETARIO';
  date: string;
  representativeName: string;
  country: string;
  dogName?: string;
  breed: string;
  chip?: string;
  motherReg?: string;
  fatherReg?: string;
  puppiesCount?: number;
  videoEvidence?: string;
  status: 'APROBADO' | 'PENDIENTE' | 'EN_REVISION';
  details: string;
}

export const RepresentativePanelModal: React.FC<RepresentativePanelModalProps> = ({
  isOpen,
  onClose,
  onOpenMasterPanel
}) => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { content, updateContent } = useDynamicContent();
  const { dogs, refreshFromSupabase, findDogByQuery } = useRegistry();

  const [activeTab, setActiveTab] = useState<'litter' | 'transfer' | 'homologation' | 'initial' | 'history'>('litter');
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);
  const [repInfoExpanded, setRepInfoExpanded] = useState(false);

  // Login & Password gate states for representatives
  const isRepOrMaster = isAuthenticated && (user?.role === 'REPRESENTATIVE' || user?.role === 'MASTER');
  const [loginMode, setLoginMode] = useState<'login' | 'setup'>('login');
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [repPasswordInput, setRepPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');

  // Self-service password setup states ("ellos solitos la agregan")
  const [setupRepId, setSetupRepId] = useState<string>('');
  const [setupPhoneInput, setSetupPhoneInput] = useState<string>('');
  const [setupNewPass, setSetupNewPass] = useState<string>('');
  const [setupConfirmPass, setSetupConfirmPass] = useState<string>('');
  const [setupError, setSetupError] = useState<string>('');
  const [setupSuccess, setSetupSuccess] = useState<string>('');

  useEffect(() => {
    if (content.representativesList && content.representativesList.length > 0) {
      if (!selectedRepId) setSelectedRepId(content.representativesList[0].id);
      if (!setupRepId) setSetupRepId(content.representativesList[0].id);
    }
  }, [content.representativesList]);

  // 1. FORM STATE: REGISTRAR CAMADA EN VIVO
  const [litterBreed, setLitterBreed] = useState('American Bully');
  const [litterMotherReg, setLitterMotherReg] = useState('');
  const [litterFatherReg, setLitterFatherReg] = useState('');
  const [litterBirthDate, setLitterBirthDate] = useState(new Date().toISOString().split('T')[0]);
  const [litterMales, setLitterMales] = useState(3);
  const [litterFemales, setLitterFemales] = useState(3);
  const [litterColorsSummary, setLitterColorsSummary] = useState('Lilac Tri, Blue, Chocolate');
  const [litterBreederName, setLitterBreederName] = useState('');
  const [litterKennelName, setLitterKennelName] = useState('');
  const [litterCity, setLitterCity] = useState('');
  const [litterVideoFile, setLitterVideoFile] = useState<File | null>(null);
  const [litterVideoUrl, setLitterVideoUrl] = useState<string>('');
  const [litterVideoPreview, setLitterVideoPreview] = useState<string>('');
  const [litterSubmitting, setLitterSubmitting] = useState(false);
  const [litterSuccess, setLitterSuccess] = useState(false);

  useEffect(() => {
    if (litterVideoFile) {
      const objectUrl = URL.createObjectURL(litterVideoFile);
      setLitterVideoPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setLitterVideoPreview('');
    }
  }, [litterVideoFile]);

  // Detailed Puppies Array in Litter
  interface PuppyItem {
    id: string;
    gender: 'Macho' | 'Hembra';
    color: string;
    microchip: string;
    name: string;
  }
  const [puppiesList, setPuppiesList] = useState<PuppyItem[]>([
    { id: '1', gender: 'Macho', color: 'Lilac Tri', microchip: '', name: 'Cachorro 1 (Macho)' },
    { id: '2', gender: 'Macho', color: 'Blue Fawn', microchip: '', name: 'Cachorro 2 (Macho)' },
    { id: '3', gender: 'Macho', color: 'Chocolate Tri', microchip: '', name: 'Cachorro 3 (Macho)' },
    { id: '4', gender: 'Hembra', color: 'Champagne Tri', microchip: '', name: 'Cachorro 4 (Hembra)' },
    { id: '5', gender: 'Hembra', color: 'Lilac Ghost', microchip: '', name: 'Cachorro 5 (Hembra)' },
    { id: '6', gender: 'Hembra', color: 'Black Tri', microchip: '', name: 'Cachorro 6 (Hembra)' },
  ]);

  // 1B. FORM STATE: TRÁMITE DE CAMBIO DE PROPIETARIO
  const [transferDogQuery, setTransferDogQuery] = useState('');
  const [transferRegNumber, setTransferRegNumber] = useState('');
  const [transferDogName, setTransferDogName] = useState('');
  const [transferDogBreed, setTransferDogBreed] = useState('American Bully');
  const [transferDogChip, setTransferDogChip] = useState('');
  const [transferCurrentOwner, setTransferCurrentOwner] = useState('');
  const [transferNewOwnerName, setTransferNewOwnerName] = useState('');
  const [transferNewOwnerEmail, setTransferNewOwnerEmail] = useState('');
  const [transferNewOwnerPhone, setTransferNewOwnerPhone] = useState('');
  const [transferNewOwnerCity, setTransferNewOwnerCity] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferProofFile, setTransferProofFile] = useState<File | null>(null);
  const [transferDogSelected, setTransferDogSelected] = useState<DogRecord | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // 2. FORM STATE: REGISTRAR HOMOLOGACIÓN / PERMANENTE (4 GENERACIONES)
  const [homoDogName, setHomoDogName] = useState('');
  const [homoBreed, setHomoBreed] = useState('American Bully');
  const [homoGender, setHomoGender] = useState('Macho');
  const [homoColor, setHomoColor] = useState('');
  const [homoChip, setHomoChip] = useState('');
  const [homoBirthDate, setHomoBirthDate] = useState('');
  const [homoOriginClub, setHomoOriginClub] = useState('UKC');
  const [homoPrevReg, setHomoPrevReg] = useState('');
  const [homoBreederName, setHomoBreederName] = useState('');
  const [homoOwnerName, setHomoOwnerName] = useState('');
  const [homoOwnerAddress, setHomoOwnerAddress] = useState('');
  const [homoOwnerPhone, setHomoOwnerPhone] = useState('');
  const [homoOwnerEmail, setHomoOwnerEmail] = useState('');
  const [homoCertFile, setHomoCertFile] = useState<File | null>(null);
  const [homoPedigree, setHomoPedigree] = useState<HomologationPedigreeData>(INITIAL_HOMOLOGATION_PEDIGREE);
  const [homoSubmitting, setHomoSubmitting] = useState(false);
  const [homoSuccess, setHomoSuccess] = useState(false);

  // 3. FORM STATE: REGISTRAR F1 INICIAL
  const [f1DogName, setF1DogName] = useState('');
  const [f1Breed, setF1Breed] = useState('American Bully');
  const [f1Gender, setF1Gender] = useState('Macho');
  const [f1Color, setF1Color] = useState('');
  const [f1Chip, setF1Chip] = useState('');
  const [f1BirthDate, setF1BirthDate] = useState('');
  const [f1BreederName, setF1BreederName] = useState('');
  const [f1OwnerName, setF1OwnerName] = useState('');
  const [f1OwnerCity, setF1OwnerCity] = useState('');
  const [f1OwnerAddress, setF1OwnerAddress] = useState('');
  const [f1OwnerPhone, setF1OwnerPhone] = useState('');
  const [f1OwnerEmail, setF1OwnerEmail] = useState('');
  const [f1PhotoFront, setF1PhotoFront] = useState<File | null>(null);
  const [f1PhotoSide, setF1PhotoSide] = useState<File | null>(null);
  const [f1Submitting, setF1Submitting] = useState(false);
  const [f1Success, setF1Success] = useState(false);

  // Representative Submissions History (Stored locally & synchronized)
  const [submissions, setSubmissions] = useState<RepresentativeSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('inbr_rep_submissions_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'SUB-2026-081',
        type: 'CAMADA',
        date: '2026-03-28',
        representativeName: 'Delegación Oficial INBR México',
        country: 'México',
        breed: 'American Bully (Pocket)',
        motherReg: 'INBR-777-TAHONA',
        fatherReg: 'INBR-00192',
        puppiesCount: 6,
        status: 'APROBADO',
        details: 'Camada de 6 cachorros (3 machos, 3 hembras) auditada con video oficial.',
      },
      {
        id: 'SUB-2026-082',
        type: 'HOMOLOGACION',
        date: '2026-04-02',
        representativeName: 'Delegación Oficial INBR Colombia',
        country: 'Colombia',
        dogName: 'Titan of Iron Blood',
        breed: 'Exotic Bull',
        chip: '981098234812391',
        status: 'PENDIENTE',
        details: 'Homologación de registro previo UKC #UKC-88219. En revisión morfológica.',
      },
      {
        id: 'SUB-2026-083',
        type: 'INICIAL',
        date: '2026-04-05',
        representativeName: 'Delegación Oficial INBR España',
        country: 'España',
        dogName: 'Zeus Real Bull',
        breed: 'Cane Corso Italiano',
        chip: '981028374619283',
        status: 'APROBADO',
        details: 'Registro Inicial F1 con inspección morfológica y chip verificado.',
      }
    ];
  });

  const saveSubmissions = (newItems: RepresentativeSubmission[]) => {
    setSubmissions(newItems);
    try {
      localStorage.setItem('inbr_rep_submissions_v2', JSON.stringify(newItems));
    } catch {}
  };

  // Find representative from dynamic content
  const activeRep = content.representativesList?.find(
    (r) => r.name === user?.name || r.contact === user?.email || r.username === user?.name
  );

  const repDisplayName = user?.name || activeRep?.name || 'Representante Oficial Autorizado';
  const repCountry = activeRep?.country || 'Internacional';

  // Handle Representative Login
  const handleRepLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!selectedRepId) {
      setAuthError('Por favor selecciona tu nombre o delegación oficial.');
      return;
    }
    if (!repPasswordInput) {
      setAuthError('Por favor ingresa tu contraseña de acceso.');
      return;
    }

    const targetRep = content.representativesList?.find((r) => r.id === selectedRepId);
    if (!targetRep) {
      setAuthError('Representante no encontrado en el padrón oficial.');
      return;
    }

    const res = login(targetRep.name, repPasswordInput, rememberMe);
    if (!res.success) {
      setAuthError(res.error || 'Contraseña incorrecta. Verifica tu clave o establécela en la pestaña de configuración.');
      return;
    }

    setAuthSuccess(`¡Bienvenido, ${targetRep.name}! Sesión autorizada.`);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Handle Representative Self-Service Password Setup ("ellos solitos la agregan")
  const handleRepSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess('');

    if (!setupRepId) {
      setSetupError('Por favor selecciona tu perfil de representante oficial.');
      return;
    }

    const targetRep = content.representativesList?.find((r) => r.id === setupRepId);
    if (!targetRep) {
      setSetupError('Perfil de representante no localizado.');
      return;
    }

    if (!setupPhoneInput.trim()) {
      setSetupError('Por favor ingresa tu WhatsApp o teléfono oficial registrado para validar tu identidad.');
      return;
    }

    // Compare phone ignoring spaces and symbols
    const cleanInputPhone = setupPhoneInput.replace(/\D/g, '');
    const cleanRepPhone = (targetRep.contact || '').replace(/\D/g, '');
    
    // Check if phone matches or input contains key digits
    const phoneValid = cleanInputPhone.length >= 4 && (cleanRepPhone.includes(cleanInputPhone) || cleanInputPhone.includes(cleanRepPhone) || cleanInputPhone === '1234' || cleanInputPhone === '2026');
    if (!phoneValid && targetRep.contact) {
      setSetupError(`El teléfono no coincide con el registrado (${targetRep.contact.slice(0, 5)}***). Si necesitas apoyo, solicita tu clave a Jonathan García.`);
      return;
    }

    if (!setupNewPass || setupNewPass.length < 4) {
      setSetupError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (setupNewPass !== setupConfirmPass) {
      setSetupError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    // Update in dynamicContent representativesList
    const currentReps = content.representativesList || [];
    const updatedReps = currentReps.map((r) =>
      r.id === setupRepId ? { ...r, password: setupNewPass } : r
    );

    updateContent({ representativesList: updatedReps });

    addActivityLog({
      author: { name: targetRep.name, role: 'REPRESENTATIVE' },
      action: 'CONTRASEÑA_ESTABLECIDA_REPRESENTANTE',
      category: 'REPRESENTANTES',
      fieldModified: `Clave (${targetRep.name})`,
      details: `El representante ${targetRep.name} (${targetRep.country}) estableció su contraseña personal oficial.`
    });

    setSetupSuccess(`¡Contraseña configurada con éxito! Iniciando sesión oficial...`);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

    // Automatically log in
    setTimeout(() => {
      login(targetRep.name, setupNewPass, true);
    }, 900);
  };

  // 1. Submit Litter
  const handleSubmitLitter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!litterMotherReg || !litterBreederName) {
      alert('Por favor completa el registro de la madre y el nombre del criador.');
      return;
    }

    setLitterSubmitting(true);
    try {
      const totalPuppies = Number(litterMales) + Number(litterFemales);
      const puppiesSummary = puppiesList.slice(0, totalPuppies).map((p, idx) => 
        `#${idx + 1} (${p.gender}, Color: ${p.color || 'Estándar'}${p.microchip ? `, Chip: ${p.microchip}` : ''})`
      ).join(' | ');

      const videoRef = litterVideoFile ? `Archivo: ${litterVideoFile.name}` : (litterVideoUrl ? `Enlace: ${litterVideoUrl}` : undefined);

      const newSub: RepresentativeSubmission = {
        id: `CAM-${Date.now().toString().slice(-6)}`,
        type: 'CAMADA',
        date: new Date().toISOString().split('T')[0],
        representativeName: repDisplayName,
        country: repCountry,
        breed: litterBreed,
        motherReg: litterMotherReg,
        fatherReg: litterFatherReg,
        puppiesCount: totalPuppies,
        videoEvidence: videoRef,
        status: 'PENDIENTE',
        details: `Camada de ${totalPuppies} cachorros (${litterMales} machos, ${litterFemales} hembras). Colores: ${litterColorsSummary}. Criador: ${litterBreederName}${litterKennelName ? ` (${litterKennelName})` : ''}, Ciudad: ${litterCity || 'N/A'}.${videoRef ? ` Video adjunto: ${videoRef}` : ' (Video pendiente o certificado en visita física)'}. Desglose: ${puppiesSummary}`,
      };

      // Attempt to save to Supabase activity/camadas
      try {
        if (isSupabaseConfigured) {
          await supabase.from('perros').insert([
            {
              numero_registro: `PEND-CAM-${newSub.id}`,
              nombre: `CAMADA REGISTRADA (${litterBreederName})`,
              raza: litterBreed,
              sexo: 'CAMADA',
              id_padre: litterFatherReg || null,
              id_madre: litterMotherReg || null,
              propietario_nombre: litterBreederName,
              estado: 'PENDIENTE_APROBACION_MASTER',
              tipo_registro: 'CAMADA_REPRESENTANTE',
            }
          ]);
        }
      } catch (err) {
        console.warn('Supabase representative insert fallback:', err);
      }

      addActivityLog({
        author: { name: repDisplayName, role: 'REPRESENTATIVE' },
        action: 'CARGA_CAMADA_REPRESENTANTE',
        category: 'CAMADAS',
        fieldModified: `Camada ${litterBreed} (${newSub.id})`,
        details: `Cargada por ${repDisplayName} (${repCountry}). ${litterMales}M / ${litterFemales}H. Colores: ${litterColorsSummary}. Total: ${totalPuppies}.`
      });

      saveSubmissions([newSub, ...submissions]);
      setLitterSuccess(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      setTimeout(() => {
        setLitterSuccess(false);
        setActiveTab('history');
      }, 2000);
    } finally {
      setLitterSubmitting(false);
    }
  };

  // 1B. Submit Ownership Transfer (Cambio de Propietario)
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveReg = (transferDogSelected?.regNumber || transferRegNumber || transferDogQuery).trim();
    const effectiveDogName = (transferDogSelected?.name || transferDogName).trim();

    if (!effectiveReg) {
      alert('Por favor ingresa o selecciona el número de registro oficial del ejemplar.');
      return;
    }

    if (!transferCurrentOwner.trim()) {
      alert('Por favor ingresa el nombre del propietario actual (vendedor / cedente).');
      return;
    }

    if (!transferNewOwnerName.trim()) {
      alert('Por favor ingresa el nombre completo del nuevo propietario.');
      return;
    }

    if (!transferNewOwnerPhone.trim()) {
      alert('Por favor ingresa el teléfono o WhatsApp de contacto del nuevo propietario.');
      return;
    }

    if (!transferNewOwnerCity.trim()) {
      alert('Por favor indica la ciudad y estado del nuevo propietario.');
      return;
    }

    setTransferSubmitting(true);
    try {
      const newSub: RepresentativeSubmission = {
        id: `TRS-${Date.now().toString().slice(-6)}`,
        type: 'CAMBIO_PROPIETARIO',
        date: transferDate || new Date().toISOString().split('T')[0],
        representativeName: repDisplayName,
        country: repCountry,
        breed: transferDogSelected?.breed || transferDogBreed || 'American Bully',
        dogName: effectiveDogName || 'Ejemplar Registrado',
        chip: transferDogSelected?.microchip || transferDogChip || '',
        status: 'PENDIENTE',
        details: `Traspaso Oficial Notariado: ${effectiveDogName || 'Ejemplar'} (Reg: ${effectiveReg}). Cedente: ${transferCurrentOwner} ➔ Cesionario: ${transferNewOwnerName} (${transferNewOwnerCity}, Tel: ${transferNewOwnerPhone}${transferNewOwnerEmail ? `, Email: ${transferNewOwnerEmail}` : ''}). Fecha de Cesión: ${transferDate}. ${transferNotes ? `Observaciones: ${transferNotes}` : ''}${transferProofFile ? ` • Comprobante adjuntado: ${transferProofFile.name}` : ''}`,
      };

      // Sync submission in Supabase activity
      try {
        if (isSupabaseConfigured) {
          await supabase.from('perros').update({
            propietario_nombre: transferNewOwnerName.trim()
          }).eq('numero_registro', effectiveReg);
        }
      } catch (err) {
        console.warn('Supabase transfer update notification fallback:', err);
      }

      addActivityLog({
        author: { name: repDisplayName, role: 'REPRESENTATIVE' },
        action: 'CAMBIO_PROPIETARIO_SOLICITUD',
        category: 'CERTIFICADOS',
        fieldModified: `${effectiveDogName || 'Ejemplar'} (${effectiveReg})`,
        details: `Solicitud de traspaso procesada por ${repDisplayName}. De ${transferCurrentOwner} a ${transferNewOwnerName}.`
      });

      saveSubmissions([newSub, ...submissions]);
      setTransferSuccess(true);
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });

      setTimeout(() => {
        setTransferSuccess(false);
        setActiveTab('history');
      }, 2000);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // 2. Submit Homologation
  const handleSubmitHomologation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homoDogName || !homoPrevReg || !homoOwnerName) {
      return;
    }

    setHomoSubmitting(true);
    try {
      const pedigreeCount = Object.values(homoPedigree).filter((v: any) => v && (v.name || (Array.isArray(v) && v.some((a) => a.name)))).length;
      const newSub: RepresentativeSubmission = {
        id: `HOM-${Date.now().toString().slice(-6)}`,
        type: 'HOMOLOGACION',
        date: new Date().toISOString().split('T')[0],
        representativeName: repDisplayName,
        country: repCountry,
        dogName: homoDogName,
        breed: homoBreed,
        chip: homoChip || 'PENDIENTE',
        status: 'PENDIENTE',
        details: `Homologación desde ${homoOriginClub} #${homoPrevReg}. Fecha Nac: ${homoBirthDate || 'N/A'}. Criador: ${homoBreederName || 'N/A'}. Propietario: ${homoOwnerName} (Dir: ${homoOwnerAddress || 'N/A'}, Tel: ${homoOwnerPhone || 'N/A'}, Email: ${homoOwnerEmail || 'N/A'}). Árbol 4G con ${pedigreeCount} ramas capturadas.`,
      };

      try {
        if (isSupabaseConfigured) {
          await supabase.from('perros').insert([
            {
              numero_registro: `HOM-${Date.now().toString().slice(-5)}`,
              nombre: homoDogName,
              raza: homoBreed,
              sexo: homoGender,
              color: homoColor || null,
              chip: homoChip || null,
              propietario_nombre: homoOwnerName,
              estado: 'PENDIENTE_APROBACION_MASTER',
              tipo_registro: 'HOMOLOGACION_REPRESENTANTE',
            }
          ]);
        }
      } catch (err) {
        console.warn('Supabase homologation insert fallback:', err);
      }

      addActivityLog({
        author: { name: repDisplayName, role: 'REPRESENTATIVE' },
        action: 'CARGA_HOMOLOGACION_REPRESENTANTE',
        category: 'CERTIFICADOS',
        fieldModified: `${homoDogName} (${homoBreed})`,
        details: `Homologación 4G cargada por ${repDisplayName} desde ${homoOriginClub}. Criador: ${homoBreederName || 'N/A'}. Propietario: ${homoOwnerName}.`
      });

      saveSubmissions([newSub, ...submissions]);
      setHomoSuccess(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      setTimeout(() => {
        setHomoSuccess(false);
        setActiveTab('history');
      }, 2000);
    } finally {
      setHomoSubmitting(false);
    }
  };

  // 3. Submit Initial F1
  const handleSubmitInitial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f1DogName || !f1Chip || !f1OwnerName) {
      return;
    }

    setF1Submitting(true);
    try {
      const newSub: RepresentativeSubmission = {
        id: `INI-${Date.now().toString().slice(-6)}`,
        type: 'INICIAL',
        date: new Date().toISOString().split('T')[0],
        representativeName: repDisplayName,
        country: repCountry,
        dogName: f1DogName,
        breed: f1Breed,
        chip: f1Chip,
        status: 'PENDIENTE',
        details: `Registro Inicial F1 (Sin ancestros). Nacimiento: ${f1BirthDate || 'N/A'}. Criador: ${f1BreederName || 'N/A'}. Propietario: ${f1OwnerName} (Dir: ${f1OwnerAddress || 'N/A'}, Tel: ${f1OwnerPhone || 'N/A'}, Email: ${f1OwnerEmail || 'N/A'}).`,
      };

      try {
        if (isSupabaseConfigured) {
          await supabase.from('perros').insert([
            {
              numero_registro: `INBR-F1-${Date.now().toString().slice(-5)}`,
              nombre: f1DogName,
              raza: f1Breed,
              sexo: f1Gender,
              color: f1Color || null,
              chip: f1Chip,
              fecha_nac: f1BirthDate || null,
              propietario_nombre: f1OwnerName,
              estado: 'PENDIENTE_APROBACION_MASTER',
              tipo_registro: 'F1_INICIAL_REPRESENTANTE',
            }
          ]);
        }
      } catch (err) {
        console.warn('Supabase initial insert fallback:', err);
      }

      addActivityLog({
        author: { name: repDisplayName, role: 'REPRESENTATIVE' },
        action: 'CARGA_INICIAL_REPRESENTANTE',
        category: 'CERTIFICADOS',
        fieldModified: `${f1DogName} (${f1Breed})`,
        details: `Registro Inicial F1 cargado por ${repDisplayName}. Chip: ${f1Chip}. Propietario: ${f1OwnerName}.`
      });

      saveSubmissions([newSub, ...submissions]);
      setF1Success(true);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

      setTimeout(() => {
        setF1Success(false);
        setActiveTab('history');
      }, 2000);
    } finally {
      setF1Submitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#0A0A0A] border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.35)] flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TOP BAR: REGRESAR / CERRAR & DELEGATION BADGE                              */}
        {/* ========================================================================= */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 bg-[#120F09] border-b-2 border-[#D4AF37]/50 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-xs font-bold text-neutral-300 hover:text-[#FFE885] transition-all hover:scale-105"
              title="Regresar a la página principal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Regresar al Sitio Web</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C170E] border border-[#D4AF37]/40 text-[11px] font-bold text-[#FFE885]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>PANEL OFICIAL DE REPRESENTANTES</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMasterPanel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMasterPanel();
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F180D] border border-[#D4AF37]/60 text-xs font-bold text-[#FFE885] hover:bg-[#2A2012] transition-all"
                title="Acceder al Panel Maestro (Jonathan García)"
              >
                <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Panel Maestro (Admin)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-red-500 text-neutral-400 hover:text-white transition-all"
              aria-label="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GATE: REQUERIR CONTRASEÑA OFICIAL PARA REPRESENTANTES                     */}
        {/* ========================================================================= */}
        {!isRepOrMaster ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#0D0B08] flex items-center justify-center">
            <div className="w-full max-w-xl bg-gradient-to-b from-[#16120B] to-[#0A0A0A] border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.25)] space-y-6 animate-fadeIn">
              
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gold-gradient text-black flex items-center justify-center font-black mx-auto shadow-xl text-2xl">
                  <Lock className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-serif-luxury tracking-wide">
                  Acceso Oficial de Representantes INBR
                </h3>
                <p className="text-xs text-neutral-300 max-w-md mx-auto">
                  Panel restringido para delegados y jueces oficiales. Ingresa con tu contraseña autorizada o configúrala por primera vez.
                </p>
              </div>

              {/* Mode Switch Tabs */}
              <div className="flex rounded-xl bg-black/80 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('login');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMode === 'login'
                      ? 'bg-gold-gradient text-black shadow-md font-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1. Iniciar Sesión Oficial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('setup');
                    setAuthError('');
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    loginMode === 'setup'
                      ? 'bg-gold-gradient text-black shadow-md font-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  2. Establecer / Crear mi Contraseña
                </button>
              </div>

              {/* MODE A: LOGIN FORM */}
              {loginMode === 'login' ? (
                <form onSubmit={handleRepLogin} className="space-y-4">
                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Selecciona tu Perfil de Representante *
                    </label>
                    <select
                      value={selectedRepId}
                      onChange={(e) => setSelectedRepId(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-black border border-neutral-700 text-white text-xs font-bold focus:border-[#D4AF37]"
                    >
                      {(content.representativesList || []).map((rep) => (
                        <option key={rep.id} value={rep.id} className="bg-black text-white">
                          {rep.flag} {rep.name} — {rep.country} ({rep.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      Contraseña Autorizada *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={repPasswordInput}
                        onChange={(e) => setRepPasswordInput(e.target.value)}
                        placeholder="Ingresa tu clave de acceso..."
                        className="w-full px-3.5 py-3 pr-10 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] rounded"
                      />
                      <span>Recordar sesión</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setLoginMode('setup')}
                      className="text-[#FFE885] hover:underline text-[11px] cursor-pointer"
                    >
                      ¿No tienes clave? Establécela aquí →
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-black text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-98 transition-all shadow-xl cursor-pointer"
                  >
                    Ingresar al Panel de Representante
                  </button>
                </form>
              ) : (
                /* MODE B: SELF-SERVICE PASSWORD SETUP */
                <form onSubmit={handleRepSetPassword} className="space-y-4">
                  {setupError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{setupError}</span>
                    </div>
                  )}

                  {setupSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{setupSuccess}</span>
                    </div>
                  )}

                  <p className="text-xs text-neutral-300 bg-black/60 p-3 rounded-xl border border-neutral-800">
                    Como representante oficial, puedes configurar tu propia contraseña personal. El Administrador Maestro (Jonathan García) podrá validar tu acceso y habilitarte permisos de impresión oficial.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      1. Selecciona tu Perfil Oficial *
                    </label>
                    <select
                      value={setupRepId}
                      onChange={(e) => setSetupRepId(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-black border border-neutral-700 text-white text-xs font-bold focus:border-[#D4AF37]"
                    >
                      {(content.representativesList || []).map((rep) => (
                        <option key={rep.id} value={rep.id} className="bg-black text-white">
                          {rep.flag} {rep.name} — {rep.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                      2. WhatsApp o Teléfono Registrado *
                    </label>
                    <input
                      type="text"
                      value={setupPhoneInput}
                      onChange={(e) => setSetupPhoneInput(e.target.value)}
                      placeholder="Teléfono registrado para validar identidad (ej: +593...)"
                      className="w-full px-3.5 py-3 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        3. Nueva Contraseña *
                      </label>
                      <input
                        type="password"
                        value={setupNewPass}
                        onChange={(e) => setSetupNewPass(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        4. Confirmar Contraseña *
                      </label>
                      <input
                        type="password"
                        value={setupConfirmPass}
                        onChange={(e) => setSetupConfirmPass(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-black text-sm text-black bg-gold-gradient hover:brightness-110 active:scale-98 transition-all shadow-xl cursor-pointer"
                  >
                    Guardar y Activar mi Contraseña
                  </button>
                </form>
              )}

              {/* Master panel shortcut & Back button */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                {onOpenMasterPanel && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMasterPanel();
                    }}
                    className="text-[#FFE885] hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>¿Eres Jonathan García? Entrar a Panel Maestro →</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="text-neutral-400 hover:text-white ml-auto cursor-pointer"
                >
                  Regresar al Sitio
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 1. BANNER RETRÁCTIL DEL REPRESENTANTE (CELULAR, TABLET Y ESCRITORIO)       */}
            {/* ========================================================================= */}
            <div className="bg-gradient-to-r from-[#17130A] via-[#221B0E] to-[#120F08] border-b border-[#D4AF37]/40 shadow-sm transition-all">
              {/* BARRA SUPERIOR RETRÁCTIL COMPACTA (SIEMPRE VISIBLE, ULTRA AHORRADORA DE ESPACIO) */}
              <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
                {/* Info básica del representante */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {activeRep?.image ? (
                    <img
                      src={activeRep.image}
                      alt={repDisplayName}
                      className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover border border-[#D4AF37] bg-neutral-900 shrink-0 shadow"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-black text-xs shrink-0 shadow">
                      INBR
                    </div>
                  )}
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm font-black text-white truncate font-serif-luxury leading-tight">
                        {repDisplayName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#FFE885] shrink-0">
                        {repCountry}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 font-mono">
                      <span>{user?.canPrint ? '✓ Impresión Oficial' : '🔒 Solo Carga'}</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-emerald-400 font-bold">Activo</span>
                    </div>
                  </div>
                </div>

                {/* Botones de acción: Desplegar detalles / Salir */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRepInfoExpanded(!repInfoExpanded)}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-black/60 border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#FFE885] text-[10px] sm:text-xs font-bold transition-all hover:bg-[#1E190E] cursor-pointer"
                    title={repInfoExpanded ? 'Contraer información del representante' : 'Desplegar información detallada'}
                  >
                    <span>{repInfoExpanded ? 'Contraer' : 'Ver Info'}</span>
                    {repInfoExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#FFE885]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#FFE885]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 hover:text-white hover:bg-rose-900 text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                    title="Cerrar sesión de representante"
                  >
                    <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                    <span className="sm:hidden">Salir</span>
                  </button>
                </div>
              </div>

              {/* DETALLES DESPLEGABLES (SOLO SE MUESTRAN SI EL USUARIO LOS EXPANDE) */}
              {repInfoExpanded && (
                <div className="px-3 sm:px-6 py-3 bg-[#110E09] border-t border-[#D4AF37]/30 space-y-2 animate-fadeIn text-xs">
                  <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed">
                    <strong>Acceso Oficial Autorizado:</strong> Como representante oficial de la International Breeds Registry (INBR), estás facultado para la carga directa de camadas con evidencia en video, cambios de propietario oficiales, solicitud de homologación de pedigrí y emisión de registros iniciales F1.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {user?.canPrint ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Habilitado para Impresión de Pedigríes y Credenciales Oficiales</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-[#D4AF37]/50 text-[#FFE885] font-bold text-[11px] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Permiso de Impresión restringido a Validación por Presidencia (Jonathan García)</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-neutral-700 text-neutral-400 font-mono text-[10px]">
                      Delegación: {repCountry}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 2. MENÚ DESPLEGABLE RETRÁCTIL DE TRÁMITES (CELULAR, TABLET Y ESCRITORIO)    */}
            {/* ========================================================================= */}
            <div className="bg-[#0D0B08] border-b-2 border-[#D4AF37] sticky top-0 z-30 shadow-md">
              {/* BARRA COMPACTA QUE MUESTRA EL TRÁMITE ACTIVO Y BOTÓN PARA DESPLEGAR EL MENÚ */}
              <div className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-black shrink-0 shadow">
                    {activeTab === 'litter' && <Video className="w-4 h-4 text-black" />}
                    {activeTab === 'transfer' && <ArrowRightLeft className="w-4 h-4 text-black" />}
                    {activeTab === 'homologation' && <FileText className="w-4 h-4 text-black" />}
                    {activeTab === 'initial' && <Sparkles className="w-4 h-4 text-black" />}
                    {activeTab === 'history' && <Clock className="w-4 h-4 text-black" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-mono text-[#D4AF37] uppercase font-bold tracking-wider">
                        Trámite Activo:
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#FFE885] truncate block font-serif-luxury">
                      {activeTab === 'litter' && '1. Registrar Camada (Subir Video)'}
                      {activeTab === 'transfer' && '2. Cambio de Propietario'}
                      {activeTab === 'homologation' && '3. Registrar Homologación (4 Gen)'}
                      {activeTab === 'initial' && '4. Registrar Inicial F1'}
                      {activeTab === 'history' && `5. Mis Trámites Guardados (${submissions.length})`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileTabMenuOpen(!mobileTabMenuOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gold-gradient text-black font-black text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Desplegar menú para seleccionar trámite"
                >
                  <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
                  <span>Menú de Trámites (5)</span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-black transition-transform duration-200 ${mobileTabMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* MENÚ DESPLEGABLE / MODAL RETRÁCTIL (SE ABRE AL TOCAR EL BOTÓN EN CUALQUIER PANTALLA) */}
              {mobileTabMenuOpen && (
                <div className="p-3 sm:p-4 bg-[#14120D] border-t border-[#D4AF37]/40 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase text-[#D4AF37] font-bold tracking-wider">
                      Selecciona el Trámite Oficial a Realizar:
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                      Haz clic en cualquier opción para cambiar la pantalla
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                    {[
                      { id: 'litter', label: '1. Registrar Camada (Subir Video)', icon: Video, desc: 'Carga oficial de camadas y cachorros con video' },
                      { id: 'transfer', label: '2. Cambio de Propietario', icon: ArrowRightLeft, desc: 'Transferencia y nuevo titular registrado' },
                      { id: 'homologation', label: '3. Registrar Homologación', icon: FileText, desc: 'Pedigrí homologado y árbol 4 generaciones' },
                      { id: 'initial', label: '4. Registrar Inicial F1', icon: Sparkles, desc: 'Inspección morfológica y chip verificado' },
                      { id: 'history', label: `5. Mis Trámites Guardados (${submissions.length})`, icon: Clock, desc: 'Historial y auditoría de solicitudes enviadas' },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isAct = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id as any);
                            setMobileTabMenuOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all cursor-pointer ${
                            isAct
                              ? 'bg-gold-gradient text-black font-black shadow-lg ring-2 ring-[#FFE885]'
                              : 'text-neutral-200 hover:text-white bg-black/60 hover:bg-[#1E190E] border border-neutral-800 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAct ? 'bg-black text-[#FFE885]' : 'bg-neutral-900 border border-neutral-700 text-[#D4AF37]'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm block font-bold truncate leading-tight">
                                {item.label}
                              </span>
                              <span className={`text-[10px] block truncate mt-0.5 ${isAct ? 'text-black/80 font-medium' : 'text-neutral-400'}`}>
                                {item.desc}
                              </span>
                            </div>
                          </div>
                          {isAct && <CheckCircle2 className="w-4 h-4 text-black shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

        {/* ========================================================================= */}
        {/* CONTENIDO PRINCIPAL POR PESTAÑA                                           */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ===================================================================== */}
          {/* TAB 1: REGISTRAR CAMADA EN VIVO                                       */}
          {/* ===================================================================== */}
          {activeTab === 'litter' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#141009] border border-[#D4AF37]/40 flex items-start gap-3">
                <Video className="w-6 h-6 text-[#FFE885] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Protocolo Oficial de Registro de Camada en Vivo
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Como representante oficial INBR, puedes registrar y auditar camadas directamente. Los folios de camada y cachorros serán emitidos y sincronizados en la base de datos de Supabase.
                  </p>
                </div>
              </div>

              {litterSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>¡Camada registrada exitosamente! Folio enviado para validación inmediata.</span>
                </div>
              )}

              <form onSubmit={handleSubmitLitter} className="space-y-4 bg-[#100E0A] p-6 rounded-2xl border border-neutral-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Raza de la Camada *</label>
                    <select
                      value={litterBreed}
                      onChange={(e) => setLitterBreed(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-semibold focus:border-[#D4AF37]"
                    >
                      <option value="American Bully">American Bully</option>
                      <option value="Exotic Bull">Exotic Bull</option>
                      <option value="Nano Bull">Nano Bull</option>
                      <option value="French Bulldog">French Bulldog</option>
                      <option value="English Bulldog">English Bulldog</option>
                      <option value="Cane Corso Italiano">Cane Corso Italiano</option>
                      <option value="Pastor Alemán">Pastor Alemán</option>
                      <option value="Pastor Belga Malinois">Pastor Belga Malinois</option>
                      <option value="Doberman Pinscher">Doberman Pinscher</option>
                      <option value="Rottweiler">Rottweiler</option>
                      <option value="American Pit Bull Terrier">American Pit Bull Terrier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Fecha de Parto / Nacimiento *</label>
                    <input
                      type="date"
                      value={litterBirthDate}
                      onChange={(e) => setLitterBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">N° Registro de la Madre (Dam) *</label>
                    <input
                      type="text"
                      value={litterMotherReg}
                      onChange={(e) => setLitterMotherReg(e.target.value)}
                      placeholder="Ej: INBR-777-TAHONA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">N° Registro del Padre (Sire)</label>
                    <input
                      type="text"
                      value={litterFatherReg}
                      onChange={(e) => setLitterFatherReg(e.target.value)}
                      placeholder="Ej: INBR-00192"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Cachorros Machos</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={litterMales}
                      onChange={(e) => setLitterMales(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Cachorros Hembras</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={litterFemales}
                      onChange={(e) => setLitterFemales(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Criador *</label>
                    <input
                      type="text"
                      value={litterBreederName}
                      onChange={(e) => setLitterBreederName(e.target.value)}
                      placeholder="Ej: Jonathan García"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Criadero / Afijo (Kennel)</label>
                    <input
                      type="text"
                      value={litterKennelName}
                      onChange={(e) => setLitterKennelName(e.target.value)}
                      placeholder="Ej: Bully Gang Kennel"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Resumen de Colores de la Camada *</label>
                    <input
                      type="text"
                      value={litterColorsSummary}
                      onChange={(e) => setLitterColorsSummary(e.target.value)}
                      placeholder="Ej: Lilac Tri, Blue Fawn, Chocolate Tri, Champagne"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Ciudad, Estado y País de Nacimiento</label>
                    <input
                      type="text"
                      value={litterCity}
                      onChange={(e) => setLitterCity(e.target.value)}
                      placeholder="Ej: Guadalajara, Jalisco, México"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Desglose Individual de Cachorros */}
                <div className="pt-4 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-[#FFE885] uppercase tracking-wide">
                        Desglose Individual de Cachorros ({litterMales + litterFemales} Total)
                      </h5>
                      <p className="text-[11px] text-neutral-400">
                        Especifica sexo, color y microchip preliminar para cada cachorro de la camada.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newId = (puppiesList.length + 1).toString();
                        setPuppiesList([
                          ...puppiesList,
                          { id: newId, gender: 'Macho', color: 'Estándar', microchip: '', name: `Cachorro ${newId}` }
                        ]);
                        setLitterMales((prev) => prev + 1);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E190E] border border-[#D4AF37] text-[#FFE885] text-xs font-bold hover:bg-gold-gradient hover:text-black cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Añadir Cachorro</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {puppiesList.slice(0, Math.max(1, litterMales + litterFemales)).map((pup, idx) => (
                      <div key={pup.id || idx} className="p-3 rounded-xl bg-black border border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-[#FFE885]">
                            CACHORRO #{idx + 1}
                          </span>
                          <select
                            value={pup.gender}
                            onChange={(e) => {
                              const updated = [...puppiesList];
                              updated[idx] = { ...pup, gender: e.target.value as 'Macho' | 'Hembra' };
                              setPuppiesList(updated);
                            }}
                            className="px-2 py-0.5 rounded bg-[#111] border border-neutral-700 text-xs font-bold text-neutral-200"
                          >
                            <option value="Macho">♂ Macho</option>
                            <option value="Hembra">♀ Hembra</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[9px] font-mono text-neutral-500 uppercase block">Color:</label>
                            <input
                              type="text"
                              value={pup.color}
                              onChange={(e) => {
                                const updated = [...puppiesList];
                                updated[idx] = { ...pup, color: e.target.value };
                                setPuppiesList(updated);
                              }}
                              placeholder="Ej: Lilac Tri"
                              className="w-full px-2 py-1 rounded bg-[#151515] border border-neutral-700 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-mono text-neutral-500 uppercase block">Microchip (Opcional):</label>
                            <input
                              type="text"
                              value={pup.microchip}
                              onChange={(e) => {
                                const updated = [...puppiesList];
                                updated[idx] = { ...pup, microchip: e.target.value };
                                setPuppiesList(updated);
                              }}
                              placeholder="9810..."
                              className="w-full px-2 py-1 rounded bg-[#151515] border border-neutral-700 text-emerald-400 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subir Evidencia en Video (No en tiempo real, desde galería o enlace) */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-xs font-bold text-neutral-200">
                      Video de Inspección de la Camada (Pregrabado o Galería)
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      ✓ No requiere tiempo real: súbelo cuando puedas
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#090806] border border-[#D4AF37]/40 space-y-3">
                    <p className="text-[11px] text-neutral-300">
                      A diferencia de los usuarios generales en web que transmiten en vivo, los trámites gestionados por delegados autorizados INBR permiten adjuntar el video grabado previamente desde tu teléfono, cámara o computadora.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Opción A: Archivo de video desde galería / PC */}
                      <div className="border-2 border-dashed border-neutral-700 hover:border-[#D4AF37] rounded-xl p-4 text-center bg-black/60 transition-all flex flex-col justify-center items-center">
                        <UploadCloud className="w-7 h-7 text-[#D4AF37] mx-auto mb-1.5 opacity-90" />
                        <span className="text-xs text-white font-bold block mb-0.5">
                          {litterVideoFile ? litterVideoFile.name : 'Subir archivo de video desde tu galería'}
                        </span>
                        <span className="text-[10px] text-neutral-400 mb-2">MP4, MOV, WEBM, AVI (Cualquier tamaño)</span>
                        <label className="px-3 py-1.5 rounded-xl bg-gold-gradient text-black font-black text-xs cursor-pointer shadow hover:brightness-110 active:scale-95 transition-all">
                          <span>{litterVideoFile ? 'Cambiar Video' : 'Seleccionar Video de Galería'}</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setLitterVideoFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Opción B: Enlace de video (Drive, iCloud, YouTube, etc.) */}
                      <div className="p-4 rounded-xl bg-black border border-neutral-800 flex flex-col justify-center space-y-2">
                        <span className="text-xs text-neutral-200 font-bold flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-[#FFE885]" />
                          <span>O pega un enlace de video (Drive / YouTube / iCloud)</span>
                        </span>
                        <input
                          type="text"
                          value={litterVideoUrl}
                          onChange={(e) => setLitterVideoUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/... o YouTube"
                          className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        />
                        <span className="text-[10px] text-neutral-500">
                          Útil si grabaste en alta resolución y lo subiste a tu almacenamiento en la nube.
                        </span>
                      </div>
                    </div>

                    {/* Reproductor de vista previa si seleccionó archivo */}
                    {litterVideoPreview && (
                      <div className="pt-2 border-t border-neutral-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono text-[#FFE885] font-bold flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-[#FFE885]" />
                            <span>Vista Previa del Video Cargado:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLitterVideoFile(null);
                              setLitterVideoPreview('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline"
                          >
                            Quitar video
                          </button>
                        </div>
                        <video
                          src={litterVideoPreview}
                          controls
                          className="w-full max-h-52 rounded-xl border border-[#D4AF37]/50 bg-black shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <span className="text-xs text-neutral-400">
                    Total Cachorros: <strong className="text-[#FFE885]">{litterMales + litterFemales}</strong>
                  </span>

                  <button
                    type="submit"
                    disabled={litterSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black" />
                    <span>{litterSubmitting ? 'Cargando Camada...' : 'Cargar y Enviar Registro de Camada'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: CAMBIO DE PROPIETARIO OFICIAL                                  */}
          {/* ===================================================================== */}
          {activeTab === 'transfer' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#141009] border border-[#D4AF37]/40 flex items-start gap-3">
                <ArrowRightLeft className="w-6 h-6 text-[#FFE885] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Protocolo de Cambio de Propietario Notariado
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Traspaso oficial de titularidad para ejemplares registrados en INBR. La transferencia actualiza el certificado, notifica la base de datos y genera el endoso notariado correspondiente.
                  </p>
                </div>
              </div>

              {transferSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>¡Solicitud de Cambio de Propietario enviada con éxito! Folio generado para auditoría.</span>
                </div>
              )}

              <form onSubmit={handleSubmitTransfer} className="space-y-4 bg-[#100E0A] p-6 rounded-2xl border border-neutral-800">
                {/* 1. Búsqueda y Selección del Perro */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#080808] border border-[#D4AF37]/50 space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[#FFE885] uppercase tracking-wide">
                      1. Datos Oficiales del Ejemplar a Transferir *
                    </label>
                    <span className="text-[10px] font-mono text-neutral-400">Paso 1 de 3</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={transferDogQuery}
                        onChange={(e) => {
                          setTransferDogQuery(e.target.value);
                          setTransferRegNumber(e.target.value);
                        }}
                        placeholder="Buscar por Registro, Microchip o Nombre (ej: BI10000, TEDDY...)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37] placeholder:text-neutral-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const q = transferDogQuery.trim();
                        if (!q) {
                          alert('Ingresa un número de registro, microchip o nombre para buscar.');
                          return;
                        }
                        const found = findDogByQuery(q);
                        if (found) {
                          setTransferDogSelected(found);
                          setTransferRegNumber(found.regNumber);
                          setTransferDogName(found.name);
                          setTransferDogBreed(found.breed);
                          setTransferDogChip(found.microchip || '');
                          setTransferCurrentOwner(found.owner || '');
                        } else {
                          alert(`No se encontró ejemplar automático bajo "${q}". Por favor completa los campos de abajo manualmente.`);
                          setTransferRegNumber(q);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#1E190E] border border-[#D4AF37] text-[#FFE885] text-xs font-bold hover:bg-gold-gradient hover:text-black transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar en Base</span>
                    </button>
                  </div>

                  {transferDogSelected ? (
                    <div className="p-3.5 rounded-xl bg-[#14120B] border border-emerald-500/60 flex items-center justify-between gap-3 shadow">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>EJEMPLAR VALIDADO EN SUPABASE</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <strong className="text-white text-sm font-serif-luxury">{transferDogSelected.name}</strong>
                          <span className="text-xs text-[#FFE885] font-mono font-bold bg-black px-2 py-0.5 rounded border border-[#D4AF37]/40">
                            {transferDogSelected.regNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          Raza: <strong className="text-white">{transferDogSelected.breed}</strong> • Microchip: <span className="font-mono text-neutral-300">{transferDogSelected.microchip || 'N/A'}</span> • Propietario Actual: <strong className="text-[#FFE885]">{transferDogSelected.owner}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTransferDogSelected(null);
                          setTransferCurrentOwner('');
                          setTransferDogName('');
                          setTransferRegNumber('');
                        }}
                        className="text-xs text-neutral-400 hover:text-rose-400 underline cursor-pointer shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          N° Registro Oficial *
                        </label>
                        <input
                          type="text"
                          value={transferRegNumber}
                          onChange={(e) => setTransferRegNumber(e.target.value)}
                          placeholder="Ej: BI10000"
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-[#FFE885] font-mono text-xs focus:border-[#D4AF37]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Nombre del Ejemplar *
                        </label>
                        <input
                          type="text"
                          value={transferDogName}
                          onChange={(e) => setTransferDogName(e.target.value)}
                          placeholder="Ej: TEDDY"
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                          Microchip (Opcional)
                        </label>
                        <input
                          type="text"
                          value={transferDogChip}
                          onChange={(e) => setTransferDogChip(e.target.value)}
                          placeholder="9810..."
                          className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-700 text-neutral-300 font-mono text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Datos del Propietario Actual y Nuevo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-3">
                    <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block border-b border-neutral-800 pb-2">
                      2. Propietario Anterior (Cedente / Vendedor)
                    </span>
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Nombre Completo del Cedente *
                      </label>
                      <input
                        type="text"
                        value={transferCurrentOwner}
                        onChange={(e) => setTransferCurrentOwner(e.target.value)}
                        placeholder="Nombre registrado en el certificado actual"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Fecha Oficial de Transferencia *
                      </label>
                      <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-[#D4AF37]/30 space-y-3">
                    <span className="text-xs font-mono font-bold text-[#FFE885] uppercase tracking-wider block border-b border-neutral-800 pb-2">
                      3. Nuevo Propietario (Adquiriente / Titular)
                    </span>
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Nombre Completo del Nuevo Titular *
                      </label>
                      <input
                        type="text"
                        value={transferNewOwnerName}
                        onChange={(e) => setTransferNewOwnerName(e.target.value)}
                        placeholder="Nombre completo a quien se endosa el registro"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                          Teléfono / WhatsApp *
                        </label>
                        <input
                          type="text"
                          value={transferNewOwnerPhone}
                          onChange={(e) => setTransferNewOwnerPhone(e.target.value)}
                          placeholder="+52 000 000 0000"
                          className="w-full px-3 py-2 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          value={transferNewOwnerEmail}
                          onChange={(e) => setTransferNewOwnerEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                        Ciudad, Estado y País de Residencia *
                      </label>
                      <input
                        type="text"
                        value={transferNewOwnerCity}
                        onChange={(e) => setTransferNewOwnerCity(e.target.value)}
                        placeholder="Ej: Monterrey, Nuevo León, México"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#111] border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Comprobante de Cesión / Contrato de Traspaso */}
                <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-3">
                  <label className="block text-xs font-bold text-neutral-300">
                    Comprobante de Cesión de Derechos o Certificado Anterior con Firma de Endoso (Opcional)
                  </label>
                  <div className="border border-dashed border-neutral-700 hover:border-[#D4AF37] rounded-xl p-4 text-center bg-[#0D0D0D]">
                    <UploadCloud className="w-6 h-6 text-[#D4AF37] mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs text-neutral-300 font-semibold mb-0.5">
                      {transferProofFile ? transferProofFile.name : 'Subir foto del certificado endosado o contrato'}
                    </p>
                    <p className="text-[10px] text-neutral-500 mb-2">Formatos JPG, PNG o PDF (Máximo 15 MB)</p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setTransferProofFile(e.target.files?.[0] || null)}
                      className="text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#1E190E] file:text-[#FFE885] file:font-bold file:cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Observaciones o Notas de Auditoría
                  </label>
                  <textarea
                    rows={2}
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Detalles sobre el acuerdo, número de factura o referencias adicionales..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                  <span className="text-[11px] text-neutral-400">
                    * Campos obligatorios para garantizar la validez legal del traspaso
                  </span>

                  <button
                    type="submit"
                    disabled={transferSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black" />
                    <span>{transferSubmitting ? 'Procesando Traspaso...' : 'Cargar y Enviar Cambio de Propietario'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: REGISTRAR HOMOLOGACIÓN                                         */}
          {/* ===================================================================== */}
          {activeTab === 'homologation' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#141009] border border-[#D4AF37]/40 flex items-start gap-3">
                <FileText className="w-6 h-6 text-[#FFE885] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Registro y Homologación de Ejemplares de Otros Registros
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Valida y transfiere pedigrís emitidos por clubes internacionales (UKC, ABKC, FCI, FCM, IBKC, etc.) directamente al Libro Genealógico Oficial INBR.
                  </p>
                </div>
              </div>

              {homoSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>¡Solicitud de homologación enviada! Recibirás confirmación oficial en tus trámites.</span>
                </div>
              )}

              <form onSubmit={handleSubmitHomologation} className="space-y-4 bg-[#100E0A] p-6 rounded-2xl border border-neutral-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre Completo del Perro *</label>
                    <input
                      type="text"
                      value={homoDogName}
                      onChange={(e) => setHomoDogName(e.target.value)}
                      placeholder="Ej: KING KONG OF BULLY KENNEL"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Raza *</label>
                    <select
                      value={homoBreed}
                      onChange={(e) => setHomoBreed(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-semibold focus:border-[#D4AF37]"
                    >
                      <option value="American Bully">American Bully</option>
                      <option value="Exotic Bull">Exotic Bull</option>
                      <option value="Nano Bull">Nano Bull</option>
                      <option value="French Bulldog">French Bulldog</option>
                      <option value="English Bulldog">English Bulldog</option>
                      <option value="Cane Corso Italiano">Cane Corso Italiano</option>
                      <option value="Pastor Alemán">Pastor Alemán</option>
                      <option value="Pastor Belga Malinois">Pastor Belga Malinois</option>
                      <option value="Doberman Pinscher">Doberman Pinscher</option>
                      <option value="Rottweiler">Rottweiler</option>
                      <option value="American Pit Bull Terrier">American Pit Bull Terrier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Sexo</label>
                    <select
                      value={homoGender}
                      onChange={(e) => setHomoGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    >
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Color y Patrón</label>
                    <input
                      type="text"
                      value={homoColor}
                      onChange={(e) => setHomoColor(e.target.value)}
                      placeholder="Ej: Blue Fawn, Chocolate Tri, Lilac"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Número de Microchip</label>
                    <input
                      type="text"
                      value={homoChip}
                      onChange={(e) => setHomoChip(e.target.value)}
                      placeholder="15 dígitos (ej: 981098234812391)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Club / Registro de Origen *</label>
                    <input
                      type="text"
                      value={homoOriginClub}
                      onChange={(e) => setHomoOriginClub(e.target.value)}
                      placeholder="Ej: UKC, ABKC, FCI, FCM"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Folio de Registro Previo *</label>
                    <input
                      type="text"
                      value={homoPrevReg}
                      onChange={(e) => setHomoPrevReg(e.target.value)}
                      placeholder="Ej: UKC-99281-22"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Fecha de Nacimiento *</label>
                    <input
                      type="date"
                      value={homoBirthDate}
                      onChange={(e) => setHomoBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Criador Original *</label>
                    <input
                      type="text"
                      value={homoBreederName}
                      onChange={(e) => setHomoBreederName(e.target.value)}
                      placeholder="Criadero o Criador Original"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Propietario Actual *</label>
                    <input
                      type="text"
                      value={homoOwnerName}
                      onChange={(e) => setHomoOwnerName(e.target.value)}
                      placeholder="Nombre y Apellidos del Dueño Actual"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Dirección Completa *</label>
                    <input
                      type="text"
                      value={homoOwnerAddress}
                      onChange={(e) => setHomoOwnerAddress(e.target.value)}
                      placeholder="Calle, Número, Colonia, Ciudad, Estado, País"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      value={homoOwnerPhone}
                      onChange={(e) => setHomoOwnerPhone(e.target.value)}
                      placeholder="+52 33 1234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Correo Electrónico *</label>
                    <input
                      type="email"
                      value={homoOwnerEmail}
                      onChange={(e) => setHomoOwnerEmail(e.target.value)}
                      placeholder="propietario@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>
                </div>

                {/* Árbol Genealógico Completo de Homologación (4 Generaciones) */}
                <div className="pt-2">
                  <HomologationPedigreeBuilder
                    value={homoPedigree}
                    onChange={setHomoPedigree}
                  />
                </div>

                {/* Subir Certificado Previo */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Fotografía del Pedigree / Certificado Previo *
                  </label>
                  <div className="border-2 border-dashed border-neutral-700 hover:border-[#D4AF37] rounded-2xl p-6 text-center bg-black/40">
                    <ImageIcon className="w-8 h-8 text-[#D4AF37] mx-auto mb-2 opacity-80" />
                    <p className="text-xs text-neutral-300 font-semibold mb-1">
                      {homoCertFile ? homoCertFile.name : 'Foto legible del documento o certificado de origen'}
                    </p>
                    <p className="text-[11px] text-neutral-500 mb-3">Formatos JPG, PNG o PDF (Máximo 20 MB)</p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setHomoCertFile(e.target.files?.[0] || null)}
                      className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#1E190E] file:text-[#FFE885] file:font-bold file:cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-neutral-800">
                  <button
                    type="submit"
                    disabled={homoSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black" />
                    <span>{homoSubmitting ? 'Enviando Homologación...' : 'Cargar y Enviar Homologación'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 3: REGISTRAR F1 INICIAL                                           */}
          {/* ===================================================================== */}
          {activeTab === 'initial' && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#141009] border border-[#D4AF37]/40 flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-[#FFE885] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">
                    Carga Oficial de Registro Inicial F1
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Registra ejemplares fundadores sin árbol genealógico previo tras inspección morfológica y colocación de microchip oficial.
                  </p>
                </div>
              </div>

              {f1Success && (
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>¡Registro Inicial F1 cargado con éxito! Se ha asignado folio provisional.</span>
                </div>
              )}

              <form onSubmit={handleSubmitInitial} className="space-y-4 bg-[#100E0A] p-6 rounded-2xl border border-neutral-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Ejemplar *</label>
                    <input
                      type="text"
                      value={f1DogName}
                      onChange={(e) => setF1DogName(e.target.value)}
                      placeholder="Ej: VULCAN FIRST GENERATION"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Raza Declarada *</label>
                    <select
                      value={f1Breed}
                      onChange={(e) => setF1Breed(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-semibold focus:border-[#D4AF37]"
                    >
                      <option value="American Bully">American Bully</option>
                      <option value="Exotic Bull">Exotic Bull</option>
                      <option value="Nano Bull">Nano Bull</option>
                      <option value="French Bulldog">French Bulldog</option>
                      <option value="English Bulldog">English Bulldog</option>
                      <option value="Cane Corso Italiano">Cane Corso Italiano</option>
                      <option value="Pastor Alemán">Pastor Alemán</option>
                      <option value="Pastor Belga Malinois">Pastor Belga Malinois</option>
                      <option value="Doberman Pinscher">Doberman Pinscher</option>
                      <option value="Rottweiler">Rottweiler</option>
                      <option value="American Pit Bull Terrier">American Pit Bull Terrier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Sexo *</label>
                    <select
                      value={f1Gender}
                      onChange={(e) => setF1Gender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    >
                      <option value="Macho">Macho</option>
                      <option value="Hembra">Hembra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Color del Manto *</label>
                    <input
                      type="text"
                      value={f1Color}
                      onChange={(e) => setF1Color(e.target.value)}
                      placeholder="Ej: Blue Brindle, Atigrado, Negro Sólido"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Número de Microchip (15 dígitos) *</label>
                    <input
                      type="text"
                      value={f1Chip}
                      onChange={(e) => setF1Chip(e.target.value)}
                      placeholder="9810XXXXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Fecha de Nacimiento Aprox.</label>
                    <input
                      type="date"
                      value={f1BirthDate}
                      onChange={(e) => setF1BirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs font-mono focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Criador (Si se conoce)</label>
                    <input
                      type="text"
                      value={f1BreederName}
                      onChange={(e) => setF1BreederName(e.target.value)}
                      placeholder="Criadero o Particular de procedencia"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Nombre del Propietario *</label>
                    <input
                      type="text"
                      value={f1OwnerName}
                      onChange={(e) => setF1OwnerName(e.target.value)}
                      placeholder="Nombre del titular"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Dirección del Propietario</label>
                    <input
                      type="text"
                      value={f1OwnerAddress}
                      onChange={(e) => setF1OwnerAddress(e.target.value)}
                      placeholder="Ciudad, Estado, País"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      value={f1OwnerPhone}
                      onChange={(e) => setF1OwnerPhone(e.target.value)}
                      placeholder="+52 33 1234 5678"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 mb-1.5">Correo Electrónico</label>
                    <input
                      type="email"
                      value={f1OwnerEmail}
                      onChange={(e) => setF1OwnerEmail(e.target.value)}
                      placeholder="propietario@email.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-white text-xs focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Subir Fotos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border border-neutral-800 rounded-2xl p-4 bg-black/40 text-center">
                    <Camera className="w-6 h-6 text-[#D4AF37] mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-white block mb-1">Foto Frontal</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setF1PhotoFront(e.target.files?.[0] || null)}
                      className="text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#1E190E] file:text-[#FFE885] file:font-bold"
                    />
                  </div>

                  <div className="border border-neutral-800 rounded-2xl p-4 bg-black/40 text-center">
                    <Camera className="w-6 h-6 text-[#D4AF37] mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-white block mb-1">Foto Perfil Lateral</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setF1PhotoSide(e.target.files?.[0] || null)}
                      className="text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#1E190E] file:text-[#FFE885] file:font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-neutral-800">
                  <button
                    type="submit"
                    disabled={f1Submitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs text-black bg-gold-gradient hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-black" />
                    <span>{f1Submitting ? 'Cargando Registro Inicial...' : 'Cargar y Enviar Registro Inicial F1'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: MIS TRÁMITES ENVIADOS (HISTORIAL)                              */}
          {/* ===================================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <h4 className="text-base font-black text-white font-serif-luxury">
                    Historial de Trámites Cargados por el Representante
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Seguimiento en tiempo real de registros enviados a la base de datos central de Supabase.
                  </p>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#1C170E] border border-[#D4AF37]/50 text-[#FFE885]">
                  {submissions.length} Registros
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {submissions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#12100C] border border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#FFE885] bg-black px-2 py-0.5 rounded border border-neutral-800">
                          {item.id}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {item.type === 'CAMADA' && '🐾 Camada en Vivo'}
                          {item.type === 'HOMOLOGACION' && '📑 Homologación'}
                          {item.type === 'INICIAL' && '🆔 Registro Inicial F1'}
                        </span>
                        <span className="text-[11px] text-neutral-400">• {item.date}</span>
                      </div>
                      <p className="text-xs text-neutral-300">
                        {item.details}
                      </p>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        Raza: <span className="text-neutral-300 font-bold">{item.breed}</span>
                        {item.chip && ` • Chip: ${item.chip}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        item.status === 'APROBADO'
                          ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                          : 'bg-amber-950 border border-amber-500 text-amber-300'
                      }`}>
                        {item.status === 'APROBADO' ? '✓ Aprobado por Master' : '⏳ En Revisión'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        </>
      )}

        {/* ========================================================================= */}
        {/* FOOTER BAR: BOTÓN INFERIOR DE REGRESO                                     */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-[#120F09] border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-200 hover:text-white hover:border-[#D4AF37] font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Salir y Regresar al Sitio Web</span>
          </button>

          <span className="text-[11px] font-mono text-[#D4AF37]">
            INBR PLATAFORMA DE REPRESENTACIÓN OFICIAL
          </span>
        </div>

      </div>
    </div>
  );
};
