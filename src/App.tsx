import React, { useState } from 'react';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { RegistryProvider, useRegistry } from './context/RegistryContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { HeroBloodData } from './components/HeroBloodData';
import { AboutUs } from './components/AboutUs';
import { ThreeCards } from './components/ThreeCards';
import { TeamSection } from './components/TeamSection';
import { BullBreedsSection } from './components/BullBreedsSection';
import { SpecialEditionSection } from './components/SpecialEditionSection';
import { RacialStandardsSection } from './components/RacialStandardsSection';
import { BreedersDirectorySection } from './components/BreedersDirectorySection';
import { UpcomingEventsSection } from './components/UpcomingEventsSection';
import { ChampionsPointsSection } from './components/ChampionsPointsSection';
import { VerificationSection } from './components/VerificationSection';
import { HallOfFameSection } from './components/HallOfFameSection';
import { LiveLitterRegistrationSection } from './components/LiveLitterRegistrationSection';
import { FormsAndGenogramSection } from './components/FormsAndGenogramSection';
import { CertificationsSection } from './components/CertificationsSection';
import { ContactSection } from './components/ContactSection';
import { GallerySection } from './components/GallerySection';
import { Footer } from './components/Footer';
import { PedigreeCertificateModal } from './components/PedigreeCertificateModal';
import { ExcelDatabaseImporter } from './components/ExcelDatabaseImporter';
import { AdminRepresentativePanelModal } from './components/AdminRepresentativePanelModal';
import { RepresentativePanelModal } from './components/RepresentativePanelModal';
import { LiveCmsInlineEditor } from './components/LiveCmsInlineEditor';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { NotificationToast } from './components/NotificationToast';
import { AiSupportChatFloatingWidget } from './components/AiSupportChatFloatingWidget';
import { DogRecord, SAMPLE_DOGS } from './data/registryData';
import { useDynamicContent } from './utils/dynamicContent';
import { FileSpreadsheet, Lock, ArrowUp, ArrowLeft } from 'lucide-react';

function MainApp() {
  const { content } = useDynamicContent();
  const { dogs, findDogByQuery } = useRegistry();
  const [selectedBreedForStandard, setSelectedBreedForStandard] = useState<string>('american-bully');
  const [selectedDogForModal, setSelectedDogForModal] = useState<DogRecord | null>(null);
  const [activeVerificationCode, setActiveVerificationCode] = useState<string>('');
  const [excelImporterOpen, setExcelImporterOpen] = useState<boolean>(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState<boolean>(false);
  const [representativePanelOpen, setRepresentativePanelOpen] = useState<boolean>(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Monitor scroll for back-to-top button
  React.useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowScrollTop(window.scrollY > 400);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Deep linking and scanned QR Code handling on mount and history changes
  React.useEffect(() => {
    const handleUrlQuery = () => {
      if (typeof window === 'undefined') return;

      // 1. Detectar acceso directo al Panel Maestro mediante URL (/admin, #admin, ?admin=true)
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        path.endsWith('/admin') || 
        path.includes('/admin') || 
        hash === '#admin' || 
        hash.includes('admin') || 
        search.includes('admin') ||
        search.includes('panel=master')
      ) {
        setAdminPanelOpen(true);
      }

      // 2. Detectar verificación de microchip o registro por URL
      const urlParams = new URLSearchParams(window.location.search);
      let code = urlParams.get('verify') || urlParams.get('chip') || urlParams.get('microchip') || urlParams.get('q') || urlParams.get('reg');

      if (!code && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('verify') || hashParams.get('chip') || hashParams.get('microchip') || hashParams.get('q');
      }

      if (code && code.trim()) {
        const cleanCode = code.trim();
        setActiveVerificationCode(cleanCode);
        setTimeout(() => {
          scrollToSection('verificacion');
        }, 250);
      }
    };

    handleUrlQuery();
    window.addEventListener('popstate', handleUrlQuery);
    window.addEventListener('hashchange', handleUrlQuery);
    return () => {
      window.removeEventListener('popstate', handleUrlQuery);
      window.removeEventListener('hashchange', handleUrlQuery);
    };
  }, []);

  const handleSearchRegistry = (code: string) => {
    setActiveVerificationCode(code);
    scrollToSection('verificacion');
  };

  const handleSelectBreedStandard = (breedId: string) => {
    setSelectedBreedForStandard(breedId);
    scrollToSection('estandares');
  };

  const handleRegisterToShow = (eventTitle: string) => {
    alert(`Pre-inscripción iniciada para "${eventTitle}". Por favor complete los datos del ejemplar en el Formulario F1 o valide su registro.`);
    scrollToSection('formularios');
  };

  const handleNotificationAction = (actionType?: string, actionPayload?: any) => {
    if (!actionType) return;

    if (actionType === 'VERIFY_DOG') {
      const code = actionPayload?.microchip || actionPayload?.dogReg;
      if (code) {
        setActiveVerificationCode(code);
        scrollToSection('verificacion');
      }
    } else if (actionType === 'VIEW_CERTIFICATE') {
      const code = actionPayload?.dogReg || actionPayload?.microchip;
      if (code) {
        const found = findDogByQuery(code);
        if (found) {
          setSelectedDogForModal(found);
        } else {
          setActiveVerificationCode(code);
          scrollToSection('verificacion');
        }
      }
    } else if (actionType === 'VIEW_EVENT') {
      scrollToSection('eventos');
    } else if (actionType === 'VIEW_BREEDERS') {
      scrollToSection('criadores');
    } else if (actionType === 'VIEW_LITTER') {
      scrollToSection('camada-vivo');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col font-sans selection:bg-[#C9A86A]/30 selection:text-[#F3E5AB] overflow-x-clip w-full max-w-full">
      {/* Navbar with Instant Flag Switcher & Live Notifications */}
      <Navbar
        onOpenVerify={() => scrollToSection('verificacion')}
        onOpenRegister={() => scrollToSection('formularios')}
        onOpenExcelImporter={() => setExcelImporterOpen(true)}
        onOpenAdminPanel={() => setAdminPanelOpen(true)}
        onOpenRepresentativePanel={() => setRepresentativePanelOpen(true)}
        onOpenNotifications={() => setNotificationCenterOpen(true)}
      />

      {/* 1. Inicio: International Breeds Registry Hero */}
      {content.sectionVisibility?.hero !== false && (
        <HeroBloodData
          onSearchRegistry={handleSearchRegistry}
          onGoToLiveCamada={() => scrollToSection('camada-vivo')}
          onGoToForms={() => scrollToSection('formularios')}
        />
      )}

      {/* 2. Misión, Visión, Objetivos & Principios (Al inicio después de la foto principal y genética) */}
      {content.sectionVisibility?.aboutUs !== false && <AboutUs />}
      {content.sectionVisibility?.threeCards !== false && (
        <ThreeCards
          onOpenVerify={() => scrollToSection('verificacion')}
          onOpenForms={() => scrollToSection('formularios')}
        />
      )}

      {/* 3. Razas Oficiales (Multi-Razas Bull & Molosos) */}
      {content.sectionVisibility?.bullBreeds !== false && (
        <BullBreedsSection onSelectBreedStandard={handleSelectBreedStandard} />
      )}

      {/* 4. Verificación Microchip y Registro Minimalista */}
      {content.sectionVisibility?.verification !== false && (
        <VerificationSection
          initialCode={activeVerificationCode}
          onOpenCertificate={(dog) => setSelectedDogForModal(dog)}
          onOpenExcelImporter={() => setExcelImporterOpen(true)}
        />
      )}

      {/* 5. Próximos Eventos Oficiales */}
      {content.sectionVisibility?.events !== false && (
        <UpcomingEventsSection onRegisterToShow={handleRegisterToShow} />
      )}

      {/* 6. Galería Oficial de Campeones y Pistas */}
      {content.sectionVisibility?.gallery !== false && <GallerySection />}

      {/* 7. Estándares Raciales Oficiales */}
      {content.sectionVisibility?.racialStandards !== false && (
        <RacialStandardsSection
          selectedBreedId={selectedBreedForStandard}
          onSelectBreed={(id) => setSelectedBreedForStandard(id)}
        />
      )}

      {/* 8. Nuestras Certificaciones Oficiales */}
      {content.sectionVisibility?.certifications !== false && <CertificationsSection />}

      {/* 9. Puntajes y Campeonatos + Títulos + Base de Datos */}
      {content.sectionVisibility?.champions !== false && (
        <ChampionsPointsSection onSelectDog={(dog) => setSelectedDogForModal(dog)} />
      )}

      {/* 10. Ediciones Especiales */}
      {content.sectionVisibility?.specialEdition !== false && <SpecialEditionSection />}

      {/* 11. Nuestro Equipo (Directiva, Representantes y Jueces) */}
      {content.sectionVisibility?.team !== false && (
        <TeamSection onOpenAdminPanel={() => setAdminPanelOpen(true)} />
      )}

      {/* 12. Registro y Formularios (F1, Camada en Vivo, Homologación, Árbol) */}
      {content.sectionVisibility?.forms !== false && (
        <FormsAndGenogramSection
          onOpenCertificate={(dog) => setSelectedDogForModal(dog)}
          onOpenAdminPanel={() => setAdminPanelOpen(true)}
        />
      )}
      {content.sectionVisibility?.liveLitter !== false && <LiveLitterRegistrationSection />}

      {/* 13. Directorio de Criadores con Buscador Oficial */}
      {content.sectionVisibility?.breeders !== false && <BreedersDirectorySection />}

      {/* 14. Salón de la Fama King Vulcan y Queen Bella */}
      {content.sectionVisibility?.hallOfFame !== false && (
        <HallOfFameSection onSelectDog={(dog) => setSelectedDogForModal(dog)} />
      )}

      {/* 15. Contáctanos (Ubicado al final de la página antes del Footer) */}
      {content.sectionVisibility?.contact !== false && <ContactSection />}

      {/* Footer */}
      <Footer />

      {/* Certificate Modal */}
      <PedigreeCertificateModal
        dog={selectedDogForModal}
        onClose={() => setSelectedDogForModal(null)}
        onOpenAdminPanel={() => setAdminPanelOpen(true)}
      />

      {/* Admin Exclusive Master Panel Modal (Jonathan García) */}
      <AdminRepresentativePanelModal
        isOpen={adminPanelOpen}
        onClose={() => {
          setAdminPanelOpen(false);
          if (typeof window !== 'undefined' && window.location.hash.includes('admin')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        onOpenCertificateModal={(dog) => setSelectedDogForModal(dog)}
        onOpenExcelImporter={() => setExcelImporterOpen(true)}
        onOpenNotifications={() => setNotificationCenterOpen(true)}
      />

      {/* Excel Importer Modal (Top-level z-[200] overlay - Accessible inside or outside Master Panel) */}
      <ExcelDatabaseImporter
        isOpen={excelImporterOpen}
        onClose={() => setExcelImporterOpen(false)}
      />

      {/* Representative Exclusive Panel Modal (Cargar Camadas, Homologaciones, Iniciales) */}
      <RepresentativePanelModal
        isOpen={representativePanelOpen}
        onClose={() => setRepresentativePanelOpen(false)}
        onOpenMasterPanel={() => {
          setRepresentativePanelOpen(false);
          setAdminPanelOpen(true);
        }}
      />

      {/* Floating Real-Time Live CMS Editor */}
      <LiveCmsInlineEditor onOpenMasterPanel={() => setAdminPanelOpen(true)} />

      {/* Real-Time Notification Center Modal */}
      <NotificationCenterModal
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        onAction={handleNotificationAction}
      />

      {/* Floating Real-Time Notification Toast Alert */}
      <NotificationToast onAction={handleNotificationAction} />

      {/* Ventana de Chat Flotante Impulsada por IA (Gemini 3.8 Flash) */}
      <AiSupportChatFloatingWidget />

      {/* FLOATING GLOBAL RETURN / BACK TO TOP BUTTON */}
      {showScrollTop && (
        <div className="fixed bottom-22 right-6 z-40 flex flex-col items-end gap-2 animate-fadeIn">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#17130B]/90 border border-[#D4AF37]/60 text-[#FFE885] hover:bg-[#251D0F] shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md text-xs font-bold transition-all hover:scale-105 active:scale-95 group"
            title="Volver arriba / Regresar al inicio"
          >
            <ArrowUp className="w-4 h-4 text-[#D4AF37] group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden sm:inline">Volver Arriba</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RegistryProvider>
          <NotificationProvider>
            <MainApp />
          </NotificationProvider>
        </RegistryProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
