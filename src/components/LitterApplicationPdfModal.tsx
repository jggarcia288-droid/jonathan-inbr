import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Baby, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface LitterPuppy {
  id: string;
  temporaryName: string;
  gender: 'Macho' | 'Hembra';
  color: string;
  microchip?: string;
  variety?: string;
}

interface LitterApplicationPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  litterData?: {
    motherReg: string;
    fatherReg: string;
    breederName: string;
    birthDate: string;
    puppiesCount: number;
    malesCount: number;
    femalesCount: number;
  };
}

export const LitterApplicationPdfModal: React.FC<LitterApplicationPdfModalProps> = ({
  isOpen,
  onClose,
  litterData = {
    motherReg: 'INBR-00192',
    fatherReg: 'INBR-84920',
    breederName: 'Imperial Bullyz International',
    birthDate: new Date().toISOString().split('T')[0],
    puppiesCount: 6,
    malesCount: 3,
    femalesCount: 3,
  },
}) => {
  const [puppies, setPuppies] = useState<LitterPuppy[]>([
    { id: 'pup-1', temporaryName: 'Cachorro #1 (Macho)', gender: 'Macho', color: 'Champagne Tri', microchip: '981098108420001' },
    { id: 'pup-2', temporaryName: 'Cachorro #2 (Macho)', gender: 'Macho', color: 'Blue Fawn', microchip: '981098108420002' },
    { id: 'pup-3', temporaryName: 'Cachorro #3 (Macho)', gender: 'Macho', color: 'Lilac Tri', microchip: '981098108420003' },
    { id: 'pup-4', temporaryName: 'Cachorro #4 (Hembra)', gender: 'Hembra', color: 'Champagne Tri', microchip: '981098108420004' },
    { id: 'pup-5', temporaryName: 'Cachorro #5 (Hembra)', gender: 'Hembra', color: 'Chocolate Tri', microchip: '981098108420005' },
    { id: 'pup-6', temporaryName: 'Cachorro #6 (Hembra)', gender: 'Hembra', color: 'Blue Ghost Tri', microchip: '981098108420006' },
  ]);

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const el = document.getElementById('printable-litter-application');
      if (!el) throw new Error('Elemento de solicitud de camada no encontrado');

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`INBR_Acta_Camada_${litterData.motherReg}_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF de la camada.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-[#0D0D0D] border-2 border-[#D4AF37] rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden my-4 flex flex-col print:border-none print:shadow-none print:bg-white">
        {/* Header Bar */}
        <div className="p-4 bg-[#14120D] border-b border-[#D4AF37]/40 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow">
              <Baby className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-base font-black text-white font-serif-luxury tracking-wide">
                Acta Oficial de Registro & Aplicación de Camada
              </h3>
              <span className="text-[10px] text-[#FFE885] font-mono">
                Formato Imprimible y Exportación en PDF para Cachorros Notariados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-neutral-200 bg-neutral-900 border border-neutral-700 hover:text-white hover:border-[#D4AF37]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black bg-gold-gradient hover:brightness-110 shadow-lg cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-black border border-neutral-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas (A4 Vertical) */}
        <div className="p-4 sm:p-8 bg-[#050505] overflow-x-auto flex justify-center print:p-0 print:bg-white">
          <div
            id="printable-litter-application"
            className="w-full max-w-3xl bg-white text-black p-8 sm:p-12 shadow-2xl border-4 border-[#D4AF37] relative overflow-hidden print:border-none print:shadow-none"
            style={{ minHeight: '1000px' }}
          >
            {/* Header Document */}
            <div className="text-center pb-6 border-b-2 border-[#D4AF37]">
              <div className="w-20 h-20 rounded-full border-2 border-[#D4AF37] p-0.5 mx-auto mb-2 shadow bg-black overflow-hidden">
                <img src="/logo-inbr.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-[#1A1A1A] uppercase">
                International Breeds Registry
              </h1>
              <span className="text-xs font-mono text-[#8C6B1F] tracking-widest font-bold uppercase block mt-1">
                Acta Notarial de Registro de Camada & Emisión de Certificados
              </span>
              <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                Folio de Seguimiento Criptográfico: ACTA-CAM-{Date.now().toString().slice(-6)}
              </span>
            </div>

            {/* Parents & Breeder Info */}
            <div className="my-6 p-4 rounded-xl bg-[#FAFAF8] border border-neutral-300 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block font-bold">Madre Oficial (Dam):</span>
                <strong className="text-black text-sm">{litterData.motherReg}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block font-bold">Padre Oficial (Sire):</span>
                <strong className="text-black text-sm">{litterData.fatherReg}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block font-bold">Fecha de Nacimiento:</span>
                <strong className="text-neutral-800">{litterData.birthDate}</strong>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block font-bold">Criadero Responsable:</span>
                <strong className="text-neutral-800 truncate block">{litterData.breederName}</strong>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5F2EB] border border-[#D4AF37]/50 text-xs font-mono mb-6">
              <span>Total Cachorros Registrados: <strong>{puppies.length}</strong></span>
              <span>Machos: <strong>{puppies.filter(p => p.gender === 'Macho').length}</strong></span>
              <span>Hembras: <strong>{puppies.filter(p => p.gender === 'Hembra').length}</strong></span>
              <span className="text-emerald-700 font-bold">● Validación Biométrica ISO</span>
            </div>

            {/* Puppies Table */}
            <div className="space-y-2 mb-8">
              <h4 className="text-xs font-mono uppercase text-[#8C6B1F] font-black tracking-wider border-b border-neutral-300 pb-1">
                Relación Individual de Cachorros para Emisión de Pedigrí
              </h4>

              <table className="w-full text-left text-xs border border-neutral-300">
                <thead className="bg-[#1A1A1A] text-white font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border border-neutral-400">#</th>
                    <th className="p-2 border border-neutral-400">Nombre Temporal / Identificador</th>
                    <th className="p-2 border border-neutral-400">Sexo</th>
                    <th className="p-2 border border-neutral-400">Color / Variedad</th>
                    <th className="p-2 border border-neutral-400">Microchip ISO Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                  {puppies.map((pup, idx) => (
                    <tr key={pup.id} className="hover:bg-neutral-50">
                      <td className="p-2 border border-neutral-200 font-bold">{idx + 1}</td>
                      <td className="p-2 border border-neutral-200 font-semibold">{pup.temporaryName}</td>
                      <td className="p-2 border border-neutral-200">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pup.gender === 'Macho' ? 'bg-blue-100 text-blue-900' : 'bg-rose-100 text-rose-900'
                        }`}>
                          {pup.gender}
                        </span>
                      </td>
                      <td className="p-2 border border-neutral-200">{pup.color}</td>
                      <td className="p-2 border border-neutral-200 font-mono font-bold text-[#8C6B1F]">
                        {pup.microchip || 'Pendiente de Implante'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer with Signatures and Notary Stamps */}
            <div className="pt-8 border-t-2 border-[#D4AF37] grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="h-14 border-b border-neutral-400 flex items-end justify-center pb-1">
                  <span className="font-serif italic font-bold text-sm">Jonathan García</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600 block mt-1 uppercase font-bold">
                  Presidente / Notario Oficial INBR
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">Firma & Sello de Validación Legal</span>
              </div>

              <div>
                <div className="h-14 border-b border-neutral-400 flex items-end justify-center pb-1">
                  <span className="font-mono text-xs text-neutral-500">[ Firma del Criador Responsable ]</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600 block mt-1 uppercase font-bold">
                  {litterData.breederName}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">Declaración Jurada de Cruza & Parto</span>
              </div>
            </div>

            <div className="text-center mt-6 pt-4 border-t border-neutral-200 text-[9px] text-neutral-400 font-mono">
              Documento emitido conforme al Reglamento Internacional de Registros Genealógicos INBR 2026. La falsedad u omisión anula las aplicaciones de pedigrí.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
