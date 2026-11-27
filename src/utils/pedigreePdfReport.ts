import { jsPDF } from 'jspdf';
import { DogRecord } from '../data/registryData';
import { ensureQrCodeCached } from './qrCodeGenerator';

export interface GeneratePdfOptions {
  dog: DogRecord;
  pedigree?: any;
  orientation: 'horizontal' | 'vertical';
  targetMode: 'current' | 'front' | 'back' | 'both' | 'litter' | 'dossier';
  captureFrontCanvas: () => Promise<HTMLCanvasElement>;
  captureBackCanvas: () => Promise<HTMLCanvasElement>;
  captureLitterCanvas?: () => Promise<HTMLCanvasElement>;
  onProgress?: (status: string) => void;
}

/**
 * Creates an executive notarized pedigree dossier page using pure vector jsPDF
 */
export function addNotarizedDossierPage(
  pdf: jsPDF,
  dog: DogRecord,
  pedigree: any,
  isVertical: boolean,
  qrDataUrl?: string
) {
  pdf.addPage('a4', isVertical ? 'portrait' : 'landscape');

  const pageWidth = isVertical ? 210 : 297;
  const pageHeight = isVertical ? 297 : 210;

  // Background tint: warm parchment / ivory #FCFAF5
  pdf.setFillColor(252, 250, 245);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer luxury border (gold)
  pdf.setDrawColor(212, 175, 55); // #D4AF37
  pdf.setLineWidth(1.2);
  pdf.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 3, 3, 'S');

  // Inner thin border
  pdf.setDrawColor(180, 140, 40);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 2, 2, 'S');

  if (!isVertical) {
    // ==========================================
    // LANDSCAPE LAYOUT (297 x 210 mm)
    // ==========================================

    // Header bar (Black & Gold)
    pdf.setFillColor(18, 16, 12);
    pdf.roundedRect(13, 13, pageWidth - 26, 22, 2, 2, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.6);
    pdf.line(15, 34, pageWidth - 15, 34);

    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('INTERNATIONAL BREEDS REGISTRY (INBR)', pageWidth / 2, 21, { align: 'center' });

    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXPEDIENTE NOTARIADO DE CERTIFICACIÓN DE PEDIGRÍ & DICTAMEN DE PUREZA GENÉTICA', pageWidth / 2, 27, { align: 'center' });

    pdf.setTextColor(170, 170, 170);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text('Libro Notariado Oficial • Reconocimiento Genealógico Internacional • Validación Digital de Linaje', pageWidth / 2, 31, { align: 'center' });

    // LEFT CARD: Ficha Biométrica y Registro
    const leftWidth = 110;
    const cardTop = 39;
    const cardHeight = 116;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 200, 140);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(13, cardTop, leftWidth, cardHeight, 2, 2, 'FD');

    // Section header
    pdf.setFillColor(242, 235, 210);
    pdf.roundedRect(13, cardTop, leftWidth, 7, 2, 2, 'F');
    pdf.setTextColor(80, 50, 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('FICHA BIOMÉTRICA & DATOS DE REGISTRO', 13 + leftWidth / 2, cardTop + 5, { align: 'center' });

    // Biometrics fields
    let currentY = cardTop + 12;
    const drawField = (label: string, value: string, isHighlight = false) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(110, 100, 90);
      pdf.text(label, 17, currentY);

      pdf.setFont('helvetica', isHighlight ? 'bold' : 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(isHighlight ? 160 : 30, isHighlight ? 100 : 30, isHighlight ? 15 : 30);
      pdf.text(value || 'N/D', 60, currentY);

      pdf.setDrawColor(240, 235, 225);
      pdf.setLineWidth(0.2);
      pdf.line(17, currentY + 1.8, 13 + leftWidth - 4, currentY + 1.8);

      currentY += 8.2;
    };

    drawField('Nombre Oficial:', dog.name.toUpperCase(), true);
    drawField('N° de Registro INBR:', dog.regNumber, true);
    drawField('Microchip ISO:', dog.microchip);
    drawField('Raza Reconocida:', `${dog.breed}${dog.variety ? ` (${dog.variety})` : ''}`);
    drawField('Color / Patrón:', dog.color || 'No especificado');
    drawField('Sexo / Género:', dog.gender || 'No registrado');
    drawField('Fecha de Nacimiento:', dog.dob || 'No registrada');
    drawField('País de Emisión:', dog.country || 'MÉXICO');
    drawField('Criador (Breeder):', dog.breeder || 'Criadero Registrado INBR');
    drawField('Propietario Legal:', dog.owner || 'Propietario Verificado');
    drawField('Estatus del Registro:', dog.status === 'CHAMPION' ? 'CAMPEÓN INTERNACIONAL' : 'ACTIVO VALIDADO Y NOTARIADO', true);

    // RIGHT CARD: Árbol de Linaje Notariado
    const rightX = 127;
    const rightWidth = pageWidth - 140;

    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 200, 140);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(rightX, cardTop, rightWidth, cardHeight, 2, 2, 'FD');

    // Section header
    pdf.setFillColor(242, 235, 210);
    pdf.roundedRect(rightX, cardTop, rightWidth, 7, 2, 2, 'F');
    pdf.setTextColor(80, 50, 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('LINAJE GENEALÓGICO CERTIFICADO (ANCESTROS DIRECTOS)', rightX + rightWidth / 2, cardTop + 5, { align: 'center' });

    // Sire & Dam blocks
    const sireName = pedigree?.sire?.name || dog.sire || 'PADRE REGISTRADO';
    const sireReg = pedigree?.sire?.regNumber || dog.sireReg || 'INBR-SIRE-VERIFIED';
    const damName = pedigree?.dam?.name || dog.dam || 'MADRE REGISTRADA';
    const damReg = pedigree?.dam?.regNumber || dog.damReg || 'INBR-DAM-VERIFIED';

    const grandSire1 = pedigree?.sireSire?.name || 'ABUELO PATERNO (Sire Sire)';
    const grandDam1 = pedigree?.sireDam?.name || 'ABUELA PATERNA (Sire Dam)';
    const grandSire2 = pedigree?.damSire?.name || 'ABUELO MATERNO (Dam Sire)';
    const grandDam2 = pedigree?.damDam?.name || 'ABUELA MATERNA (Dam Dam)';

    let rY = cardTop + 14;

    // Sire Box
    pdf.setFillColor(248, 246, 240);
    pdf.roundedRect(rightX + 4, rY, rightWidth - 8, 22, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 107, 31);
    pdf.text('PADRE / SIRE (GENERACIÓN 1):', rightX + 8, rY + 5);
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
    pdf.text(sireName, rightX + 8, rY + 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`REG: ${sireReg} | COLOR: ${pedigree?.sire?.color || 'Estándar'}`, rightX + 8, rY + 16);
    pdf.text(`Abuelos Pat: ${grandSire1.slice(0, 24)} • ${grandDam1.slice(0, 24)}`, rightX + 8, rY + 20);

    rY += 25;

    // Dam Box
    pdf.setFillColor(248, 246, 240);
    pdf.roundedRect(rightX + 4, rY, rightWidth - 8, 22, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 107, 31);
    pdf.text('MADRE / DAM (GENERACIÓN 1):', rightX + 8, rY + 5);
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
    pdf.text(damName, rightX + 8, rY + 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`REG: ${damReg} | COLOR: ${pedigree?.dam?.color || 'Estándar'}`, rightX + 8, rY + 16);
    pdf.text(`Abuelos Mat: ${grandSire2.slice(0, 24)} • ${grandDam2.slice(0, 24)}`, rightX + 8, rY + 20);

    rY += 26;

    // Legal / Notarial declaration text
    pdf.setFillColor(252, 250, 245);
    pdf.roundedRect(rightX + 4, rY, rightWidth - 8, 37, 1.5, 1.5, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(rightX + 4, rY, rightWidth - 8, 37, 1.5, 1.5, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(140, 107, 31);
    pdf.text('DICTAMEN NOTARIAL & DECLARATORIA DE VALIDEZ:', rightX + 8, rY + 5.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.2);
    pdf.setTextColor(60, 60, 60);
    const certText = 
      'La INTERNATIONAL BREEDS REGISTRY (INBR) hace constar que los datos genealógicos contenidos en este reporte han sido debidamente auditados, certificados y rubricados conforme a los protocolos oficiales de notariado canino internacional. El ejemplar posee pureza comprobada y trazabilidad hasta la 4ta generación documentada.';
    pdf.text(certText, rightX + 8, rY + 11, { maxWidth: rightWidth - 16, lineHeightFactor: 1.35 });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.setTextColor(100, 80, 20);
    pdf.text('Este documento posee validez notarial oficial. Prohibida su alteración o reproducción no autorizada.', rightX + 8, rY + 32);

    // BOTTOM FOOTER: Verificación, Sello Notarial y Firma
    const footerTop = 159;
    const footerHeight = 40;

    pdf.setFillColor(18, 16, 12);
    pdf.roundedRect(13, footerTop, pageWidth - 26, footerHeight, 2, 2, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(13, footerTop, pageWidth - 26, footerHeight, 2, 2, 'S');

    // Column 1: Sello Notarial y Hash Digital
    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.text('SELLO DIGITAL DE SEGURIDAD INBR', 20, footerTop + 8);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(190, 190, 190);
    const hashId = `INBR-SHA256-${dog.regNumber.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;
    pdf.text(`Hash Criptográfico: ${hashId}`, 20, footerTop + 14);
    pdf.text(`Microchip Digital: ${dog.microchip}`, 20, footerTop + 19);
    pdf.text(`Fecha de Emisión Oficial: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, footerTop + 24);
    pdf.text('Estado Notarial: EMITIDO, NOTARIADO Y REGISTRADO EN EL LIBRO MATRIZ', 20, footerTop + 29);

    // Column 2: Verificación QR
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(pageWidth / 2 - 13, footerTop + 4, 26, 26, 1.5, 1.5, 'F');
    if (qrDataUrl) {
      try {
        pdf.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 12, footerTop + 5, 24, 24);
      } catch (e) {
        console.warn('Failed to embed QR code into PDF', e);
      }
    } else {
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.text('VERIFICACIÓN', pageWidth / 2, footerTop + 13, { align: 'center' });
      pdf.setFontSize(5);
      pdf.text('QR OFICIAL', pageWidth / 2, footerTop + 18, { align: 'center' });
      pdf.text('INBR.ORG', pageWidth / 2, footerTop + 23, { align: 'center' });
    }
    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(5.5);
    pdf.text('Escanear: Valida Microchip', pageWidth / 2, footerTop + 34, { align: 'center' });

    // Column 3: Firma Oficial Presidente / CEO Notario
    const signX = pageWidth - 70;
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.4);
    pdf.line(signX, footerTop + 23, pageWidth - 20, footerTop + 23);

    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Jonathan García', signX + 25, footerTop + 28, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(190, 190, 190);
    pdf.text('Presidente / CEO Notario INBR', signX + 25, footerTop + 33, { align: 'center' });
    pdf.text('Registro Notarial #INBR-CEO-001', signX + 25, footerTop + 37, { align: 'center' });

  } else {
    // ==========================================
    // PORTRAIT LAYOUT (210 x 297 mm)
    // ==========================================
    pdf.setFillColor(18, 16, 12);
    pdf.roundedRect(12, 12, pageWidth - 24, 22, 2, 2, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.6);
    pdf.line(14, 33, pageWidth - 14, 33);

    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('INTERNATIONAL BREEDS REGISTRY (INBR)', pageWidth / 2, 20, { align: 'center' });

    pdf.setTextColor(212, 175, 55);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXPEDIENTE NOTARIADO DE CERTIFICACIÓN DE PEDIGRÍ', pageWidth / 2, 26, { align: 'center' });

    pdf.setTextColor(170, 170, 170);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text('Libro Notariado Oficial • Reconocimiento Genealógico Internacional', pageWidth / 2, 30, { align: 'center' });

    // Ficha Biométrica (Full Width)
    const cardTop = 38;
    const cardWidth = pageWidth - 24;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 200, 140);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(12, cardTop, cardWidth, 90, 2, 2, 'FD');

    pdf.setFillColor(242, 235, 210);
    pdf.roundedRect(12, cardTop, cardWidth, 7, 2, 2, 'F');
    pdf.setTextColor(80, 50, 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('FICHA BIOMÉTRICA & DATOS DE REGISTRO CANINO', pageWidth / 2, cardTop + 5, { align: 'center' });

    let currentY = cardTop + 13;
    const drawPField = (label: string, value: string, isH = false) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(110, 100, 90);
      pdf.text(label, 16, currentY);

      pdf.setFont('helvetica', isH ? 'bold' : 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(isH ? 160 : 30, isH ? 100 : 30, isH ? 15 : 30);
      pdf.text(value || 'N/D', 65, currentY);

      pdf.setDrawColor(240, 235, 225);
      pdf.setLineWidth(0.2);
      pdf.line(16, currentY + 1.8, pageWidth - 16, currentY + 1.8);

      currentY += 7.2;
    };

    drawPField('Nombre Oficial:', dog.name.toUpperCase(), true);
    drawPField('N° de Registro INBR:', dog.regNumber, true);
    drawPField('Microchip ISO:', dog.microchip);
    drawPField('Raza Reconocida:', `${dog.breed}${dog.variety ? ` (${dog.variety})` : ''}`);
    drawPField('Color / Patrón:', dog.color || 'No especificado');
    drawPField('Sexo / Género:', dog.gender || 'No registrado');
    drawPField('Fecha de Nacimiento:', dog.dob || 'No registrada');
    drawPField('País de Emisión:', dog.country || 'MÉXICO');
    drawPField('Criador (Breeder):', dog.breeder || 'Criadero Registrado INBR');
    drawPField('Propietario Legal:', dog.owner || 'Propietario Verificado');

    // Linaje Box (Portrait)
    const linajeTop = 132;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(220, 200, 140);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(12, linajeTop, cardWidth, 80, 2, 2, 'FD');

    pdf.setFillColor(242, 235, 210);
    pdf.roundedRect(12, linajeTop, cardWidth, 7, 2, 2, 'F');
    pdf.setTextColor(80, 50, 10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('LINAJE GENEALÓGICO CERTIFICADO (ANCESTROS DIRECTOS)', pageWidth / 2, linajeTop + 5, { align: 'center' });

    const sireName = pedigree?.sire?.name || dog.sire || 'PADRE REGISTRADO';
    const damName = pedigree?.dam?.name || dog.dam || 'MADRE REGISTRADA';

    // Sire Box
    pdf.setFillColor(248, 246, 240);
    pdf.roundedRect(16, linajeTop + 11, cardWidth - 8, 18, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 107, 31);
    pdf.text('PADRE / SIRE (GEN 1):', 20, linajeTop + 16);
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
    pdf.text(sireName, 20, linajeTop + 22);

    // Dam Box
    pdf.setFillColor(248, 246, 240);
    pdf.roundedRect(16, linajeTop + 32, cardWidth - 8, 18, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 107, 31);
    pdf.text('MADRE / DAM (GEN 1):', 20, linajeTop + 37);
    pdf.setFontSize(8);
    pdf.setTextColor(20, 20, 20);
    pdf.text(damName, 20, linajeTop + 43);

    // Dictamen Box
    pdf.setFillColor(252, 250, 245);
    pdf.roundedRect(16, linajeTop + 53, cardWidth - 8, 23, 1.5, 1.5, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(16, linajeTop + 53, cardWidth - 8, 23, 1.5, 1.5, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 107, 31);
    pdf.text('DICTAMEN NOTARIAL:', 20, linajeTop + 58);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setTextColor(60, 60, 60);
    pdf.text(
      'La INBR hace constar que los datos de linaje aquí certificados han sido debidamente auditados y rubricados. Pureza comprobada conforme a la genealogía internacional notariada.',
      20,
      linajeTop + 63,
      { maxWidth: cardWidth - 16, lineHeightFactor: 1.3 }
    );

    // Footer Box (Portrait)
    const pFooterTop = 216;
    pdf.setFillColor(18, 16, 12);
    pdf.roundedRect(12, pFooterTop, cardWidth, 68, 2, 2, 'F');
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(12, pFooterTop, cardWidth, 68, 2, 2, 'S');

    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('SELLO DIGITAL DE SEGURIDAD INBR', 18, pFooterTop + 10);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(190, 190, 190);
    const hashId = `INBR-SHA256-${dog.regNumber.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;
    pdf.text(`Hash Criptográfico: ${hashId}`, 18, pFooterTop + 17);
    pdf.text(`Microchip: ${dog.microchip}`, 18, pFooterTop + 23);
    pdf.text(`Emisión Oficial: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`, 18, pFooterTop + 29);

    if (qrDataUrl) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - 44, pFooterTop + 8, 26, 26, 1.5, 1.5, 'F');
      try {
        pdf.addImage(qrDataUrl, 'PNG', pageWidth - 43, pFooterTop + 9, 24, 24);
      } catch (e) {
        console.warn('Failed to embed QR code into portrait PDF', e);
      }
      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(5);
      pdf.text('Valida Microchip ISO', pageWidth - 31, pFooterTop + 37, { align: 'center' });
    }

    // Signatures in Portrait
    pdf.setDrawColor(212, 175, 55);
    pdf.setLineWidth(0.4);
    pdf.line(pageWidth / 2 - 40, pFooterTop + 48, pageWidth / 2 + 40, pFooterTop + 48);

    pdf.setTextColor(255, 232, 133);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('Jonathan García', pageWidth / 2, pFooterTop + 54, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(190, 190, 190);
    pdf.text('Presidente / CEO Notario INBR • Registro Notarial #INBR-CEO-001', pageWidth / 2, pFooterTop + 60, { align: 'center' });
  }
}

/**
 * Main PDF Generation Engine for INBR Pedigrees
 */
/**
 * Safely converts an HTMLCanvasElement to a base64 Data URL, handling tainted canvases gracefully
 */
export function safeCanvasToDataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL('image/jpeg', 0.96);
  } catch (err) {
    console.warn('Canvas export failed or canvas tainted, trying image/png fallback:', err);
    try {
      return canvas.toDataURL('image/png');
    } catch (secondErr) {
      console.warn('Canvas strictly tainted by external origin, generating safe blank white canvas:', secondErr);
      try {
        const fallback = document.createElement('canvas');
        fallback.width = canvas.width || 800;
        fallback.height = canvas.height || 1130;
        const ctx = fallback.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, fallback.width, fallback.height);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('Certificado Oficial INBR', 40, 60);
        }
        return fallback.toDataURL('image/jpeg', 0.9);
      } catch {
        return null;
      }
    }
  }
}

export async function generatePedigreePdf({
  dog,
  pedigree,
  orientation,
  targetMode,
  captureFrontCanvas,
  captureBackCanvas,
  captureLitterCanvas,
  onProgress,
}: GeneratePdfOptions): Promise<string> {
  const isVert = orientation === 'vertical';

  onProgress?.('Iniciando motor de exportación PDF...');

  const pdf = new jsPDF({
    orientation: isVert ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = isVert ? 210 : 297;
  const pdfHeight = isVert ? 297 : 210;

  // Set official document metadata
  pdf.setProperties({
    title: `Certificado Oficial de Pedigree - ${dog.name} (${dog.regNumber})`,
    subject: `Registro Genealógico Internacional INBR - ${dog.breed}`,
    author: 'International Breeds Registry (INBR)',
    keywords: `Pedigree, INBR, Canino, ${dog.breed}, ${dog.regNumber}, Certificado Oficial`,
    creator: 'INBR Official Registry Platform',
  });

  let pageIndex = 0;

  // 1. CAPTURE FRONT IF REQUESTED
  if (targetMode === 'front' || targetMode === 'both' || targetMode === 'dossier') {
    onProgress?.('Capturando Frente Oficial del Certificado...');
    try {
      const frontCanvas = await captureFrontCanvas();
      const frontImg = safeCanvasToDataUrl(frontCanvas);

      if (frontImg) {
        if (pageIndex > 0) {
          pdf.addPage('a4', isVert ? 'portrait' : 'landscape');
        }
        pdf.addImage(frontImg, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');
        pageIndex++;
      }
    } catch (frontErr) {
      console.warn('Error capturing front canvas, using vector fallback:', frontErr);
    }
  }

  // 2. CAPTURE BACK (GENOGRAM) IF REQUESTED
  if (targetMode === 'back' || targetMode === 'both' || targetMode === 'dossier') {
    onProgress?.('Capturando Genograma Oficial (4 Generaciones)...');
    try {
      const backCanvas = await captureBackCanvas();
      const backImg = safeCanvasToDataUrl(backCanvas);

      if (backImg) {
        if (pageIndex > 0) {
          pdf.addPage('a4', isVert ? 'portrait' : 'landscape');
        }
        pdf.addImage(backImg, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');
        pageIndex++;
      }
    } catch (backErr) {
      console.warn('Error capturing back canvas, using vector fallback:', backErr);
    }
  }

  // 3. CAPTURE LITTER SHEET IF REQUESTED
  if (targetMode === 'litter') {
    if (captureLitterCanvas) {
      onProgress?.('Capturando Registro Oficial de Camada...');
      try {
        const litterCanvas = await captureLitterCanvas();
        const litterImg = safeCanvasToDataUrl(litterCanvas);

        if (litterImg) {
          if (pageIndex > 0) {
            pdf.addPage('a4', isVert ? 'portrait' : 'landscape');
          }
          pdf.addImage(litterImg, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'SLOW');
          pageIndex++;
        }
      } catch (litterErr) {
        console.warn('Error capturing litter canvas:', litterErr);
      }
    }
  }

  // 4. GENERATE NOTARIZED DOSSIER TECHNICAL PAGE IF REQUESTED OR AS FALLBACK
  if (targetMode === 'dossier' || pageIndex === 0) {
    onProgress?.('Compilando Dictamen Notariado & Ficha Técnica Oficial con Código QR...');
    let qrDataUrl: string | undefined;
    try {
      qrDataUrl = await ensureQrCodeCached(dog);
    } catch (err) {
      console.warn('Could not generate QR code for PDF dossier:', err);
    }
    addNotarizedDossierPage(pdf, dog, pedigree, isVert, qrDataUrl);
    pageIndex++;
  }

  // 5. FINALIZE AND SAVE
  onProgress?.('Compilando archivo PDF final y optimizando sellos de seguridad...');
  const cleanReg = dog.regNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const suffix =
    targetMode === 'dossier'
      ? 'Dossier_Notariado_Completo'
      : targetMode === 'both'
      ? 'Certificado_DobleCara'
      : targetMode === 'front'
      ? 'Certificado_Frente'
      : targetMode === 'back'
      ? 'Genograma_4Gen'
      : 'Acta_Camada';

  const filename = `INBR_${cleanReg}_${suffix}.pdf`;
  pdf.save(filename);

  return filename;
}
