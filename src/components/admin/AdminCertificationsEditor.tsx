import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Download, 
  BookOpen, 
  ShieldCheck 
} from 'lucide-react';
import { 
  DynamicStandardItem, 
  DynamicCertificationItem, 
  uploadCmsImage 
} from '../../utils/dynamicContent';

interface AdminCertificationsEditorProps {
  isAdmin: boolean;
  pdfUrl: string;
  standardsList: DynamicStandardItem[];
  certificationsList: DynamicCertificationItem[];
  onPdfUrlChange: (newUrl: string) => void;
  onStandardsChange: (updatedList: DynamicStandardItem[]) => void;
  onCertificationsChange: (updatedList: DynamicCertificationItem[]) => void;
}

export const AdminCertificationsEditor: React.FC<AdminCertificationsEditorProps> = ({
  isAdmin,
  pdfUrl,
  standardsList,
  certificationsList,
  onPdfUrlChange,
  onStandardsChange,
  onCertificationsChange,
}) => {
  const [currentPdfUrl, setCurrentPdfUrl] = useState(pdfUrl);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePdfUpload = async (file: File) => {
    if (!isAdmin) return;
    setIsUploadingPdf(true);
    try {
      const url = await uploadCmsImage(file);
      setCurrentPdfUrl(url);
      onPdfUrlChange(url);
      setFeedback('Archivo PDF de Estándares Raciales subido y vinculado con éxito.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      console.error(e);
      alert('Error al subir el archivo PDF.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleAddStandard = () => {
    if (!isAdmin) return;
    const newStd: DynamicStandardItem = {
      id: `std-${Date.now()}`,
      breed: 'Nueva Raza Oficial',
      variety: 'Estándar Oficial',
      height: 'Medida a la cruz',
      head: 'Proporciones craneofaciales',
      bite: 'Mordida reglamentaria',
      body: 'Estructura torácica y dorso',
    };
    onStandardsChange([...standardsList, newStd]);
    setFeedback('Nuevo estándar racial añadido.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateStandard = (id: string, patch: Partial<DynamicStandardItem>) => {
    if (!isAdmin) return;
    onStandardsChange(standardsList.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleDeleteStandard = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Eliminar este estándar racial?')) {
      onStandardsChange(standardsList.filter((s) => s.id !== id));
      setFeedback('Estándar racial eliminado.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddCertification = () => {
    if (!isAdmin) return;
    const newCert: DynamicCertificationItem = {
      id: `cert-${Date.now()}`,
      title: 'Nueva Certificación Oficial',
      desc: 'Descripción detallada de la validez notarial y requisitos de homologación.',
      badge: 'VALIDEZ INTERNACIONAL',
    };
    onCertificationsChange([...certificationsList, newCert]);
    setFeedback('Nueva certificación oficial añadida.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateCertification = (id: string, patch: Partial<DynamicCertificationItem>) => {
    if (!isAdmin) return;
    onCertificationsChange(certificationsList.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleDeleteCertification = (id: string) => {
    if (!isAdmin) return;
    if (confirm('¿Eliminar esta certificación oficial?')) {
      onCertificationsChange(certificationsList.filter((c) => c.id !== id));
      setFeedback('Certificación oficial eliminada.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#12100B] border-2 border-[#D4AF37]/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#FFE885]" />
            <h3 className="text-xl font-black text-white font-serif-luxury tracking-wide">
              Estándares Raciales Oficiales & Certificaciones
            </h3>
          </div>
          <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
            Carga el documento PDF descargable que se distribuye a los criadores y gestiona las especificaciones morfológicas oficiales.
          </p>
        </div>

        {!isAdmin && (
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 flex items-center gap-1.5 shrink-0">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Modo Solo Lectura</span>
          </span>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 1: CARGA DEL PDF DE ESTÁNDARES RACIALES (SOLICITADO POR EL USUARIO) */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-[#0B0A08] border-2 border-[#D4AF37] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <span className="text-sm font-black text-white font-serif-luxury uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FFE885]" />
              <span>Cargar PDF Oficial de Estándares Raciales</span>
            </span>
            <p className="text-xs text-neutral-400 mt-0.5">
              Este es el archivo que se descargará automáticamente cuando los usuarios pulsen el botón público de <strong className="text-[#FFE885]">"Descargar Estándar en PDF"</strong>.
            </p>
          </div>

          <a
            href={currentPdfUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            download="INBR_Estandares_Raciales_Oficiales_2026.pdf"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black border border-[#D4AF37] text-xs font-mono text-[#FFE885] hover:bg-gold-gradient hover:text-black transition-all shrink-0 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Probar Descarga PDF Actual</span>
          </a>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-8">
                <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block mb-1">
                  Enlace Directo al Archivo PDF de Estándares:
                </label>
                <input
                  type="text"
                  value={currentPdfUrl}
                  onChange={(e) => {
                    setCurrentPdfUrl(e.target.value);
                    onPdfUrlChange(e.target.value);
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-white font-mono text-xs focus:border-[#D4AF37]"
                />
              </div>

              <div className="md:col-span-4 flex items-end">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow cursor-pointer">
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploadingPdf ? 'Subiendo PDF...' : 'Subir Archivo PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePdfUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <p className="text-[10px] text-neutral-400 font-mono">
              💡 Formato admitido: Documento PDF con sello notarial INBR de hasta 50MB.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-black border border-neutral-800 text-xs font-mono text-neutral-300">
            Archivo configurado: <span className="text-[#FFE885] truncate block">{currentPdfUrl}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2: ESTÁNDARES RACIALES MORFOLÓGICOS                                */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#FFE885] uppercase flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#FFE885]" />
            <span>Fichas Morfológicas de Estándares Raciales ({standardsList.length})</span>
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={handleAddStandard}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Añadir Ficha de Estándar</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardsList.map((std) => (
            <div
              key={std.id}
              className="p-4 rounded-2xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-3 transition-all shadow-md relative"
            >
              {isAdmin ? (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                        Raza:
                      </label>
                      <input
                        type="text"
                        value={std.breed}
                        onChange={(e) => handleUpdateStandard(std.id, { breed: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                        Variedad:
                      </label>
                      <input
                        type="text"
                        value={std.variety}
                        onChange={(e) => handleUpdateStandard(std.id, { variety: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                      Estatura / Altura a la Cruz:
                    </label>
                    <input
                      type="text"
                      value={std.height}
                      onChange={(e) => handleUpdateStandard(std.id, { height: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                      Cabeza / Stop:
                    </label>
                    <input
                      type="text"
                      value={std.head}
                      onChange={(e) => handleUpdateStandard(std.id, { head: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                        Mordida:
                      </label>
                      <input
                        type="text"
                        value={std.bite}
                        onChange={(e) => handleUpdateStandard(std.id, { bite: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                        Cuerpo / Pecho:
                      </label>
                      <input
                        type="text"
                        value={std.body}
                        onChange={(e) => handleUpdateStandard(std.id, { body: e.target.value })}
                        className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-neutral-900">
                    <button
                      type="button"
                      onClick={() => handleDeleteStandard(std.id)}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar Estándar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-sm font-serif-luxury">{std.breed}</h5>
                    <span className="text-[10px] font-mono text-[#FFE885]">{std.variety}</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]"><strong className="text-neutral-300">Altura:</strong> {std.height}</p>
                  <p className="text-neutral-400 text-[11px]"><strong className="text-neutral-300">Cabeza:</strong> {std.head}</p>
                  <p className="text-neutral-400 text-[11px]"><strong className="text-neutral-300">Mordida:</strong> {std.bite}</p>
                  <p className="text-neutral-400 text-[11px]"><strong className="text-neutral-300">Cuerpo:</strong> {std.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 3: CERTIFICACIONES Y RECONOCIMIENTOS OFICIALES                    */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[#FFE885] uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FFE885]" />
            <span>Nuestras Certificaciones Oficiales ({certificationsList.length})</span>
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={handleAddCertification}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Añadir Certificación</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {certificationsList.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-2xl bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] space-y-3 transition-all shadow-md flex flex-col justify-between"
            >
              {isAdmin ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                      Insignia / Badge:
                    </label>
                    <input
                      type="text"
                      value={cert.badge}
                      onChange={(e) => handleUpdateCertification(cert.id, { badge: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-[#FFE885] font-mono text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                      Título de la Certificación:
                    </label>
                    <input
                      type="text"
                      value={cert.title}
                      onChange={(e) => handleUpdateCertification(cert.id, { title: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-neutral-400 uppercase block mb-0.5">
                      Descripción:
                    </label>
                    <textarea
                      rows={3}
                      value={cert.desc}
                      onChange={(e) => handleUpdateCertification(cert.id, { desc: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-[#111] border border-neutral-700 text-neutral-300 text-[11px]"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-neutral-900">
                    <button
                      type="button"
                      onClick={() => handleDeleteCertification(cert.id)}
                      className="text-rose-400 hover:text-rose-300 text-[10px] font-mono flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gold-gradient text-black font-black text-[9px] font-mono inline-block">
                    {cert.badge}
                  </span>
                  <h5 className="font-bold text-white text-sm font-serif-luxury">{cert.title}</h5>
                  <p className="text-neutral-400 text-xs leading-relaxed">{cert.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
