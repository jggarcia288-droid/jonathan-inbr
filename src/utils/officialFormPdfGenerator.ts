import { jsPDF } from 'jspdf';

export interface IndividualFormPdfData {
  procedureType?: 'F1' | 'HOMOLOGACION' | 'PERMANENTE' | 'GENOGRAMA';
  dogName?: string;
  breed?: string;
  gender?: string;
  dob?: string;
  color?: string;
  microchip?: string;
  breeder?: string;
  owner?: string;
  phone?: string;
  email?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  postalCode?: string;
  cityState?: string;
  country?: string;
  // Parent info if applicable
  sire?: string;
  sireColor?: string;
  sireReg?: string;
  dam?: string;
  damColor?: string;
  damReg?: string;
  // 2nd gen
  sireSire?: string;
  sireSireColor?: string;
  sireDam?: string;
  sireDamColor?: string;
  damSire?: string;
  damSireColor?: string;
  damDam?: string;
  damDamColor?: string;
  // 3rd gen
  sireSireSire?: string;
  sireSireSireColor?: string;
  sireSireDam?: string;
  sireSireDamColor?: string;
  sireDamSire?: string;
  sireDamSireColor?: string;
  sireDamDam?: string;
  sireDamDamColor?: string;
  damSireSire?: string;
  damSireSireColor?: string;
  damSireDam?: string;
  damSireDamColor?: string;
  damDamSire?: string;
  damDamSireColor?: string;
  damDamDam?: string;
  damDamDamColor?: string;
}

export interface PuppyItemPdfData {
  gender?: 'Macho' | 'Hembra' | '';
  color?: string;
}

export interface LitterFormPdfData {
  breed?: string;
  birthDate?: string;
  matingDate?: string;
  totalMales?: number | string;
  totalFemales?: number | string;
  // Father
  fatherInbr?: string;
  fatherName?: string;
  fatherOwner?: string;
  fatherCoOwner?: string;
  fatherAddress?: string;
  fatherCity?: string;
  fatherState?: string;
  fatherZip?: string;
  fatherCountry?: string;
  fatherEmail?: string;
  // Mother
  motherInbr?: string;
  motherName?: string;
  motherOwner?: string;
  motherCoOwner?: string;
  motherAddress?: string;
  motherCity?: string;
  motherState?: string;
  motherZip?: string;
  motherCountry?: string;
  motherEmail?: string;
  // Litter Owner
  litterOwnerName?: string;
  litterOwnerAddress?: string;
  litterOwnerCity?: string;
  litterOwnerState?: string;
  litterOwnerZip?: string;
  litterOwnerCountry?: string;
  litterOwnerEmail?: string;
  // Puppies list
  puppies?: PuppyItemPdfData[];
}

/**
 * Generates and downloads the Official Individual Registration PDF (F1, Homologación, Permanente, Genograma)
 * Matches the layout of PDF 1 provided by INBR.
 */
export function generateIndividualFormPdf(data?: Partial<IndividualFormPdfData>, isBlank: boolean = false): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const d = isBlank ? {} : (data || {});

  // Page background: clean crisp white
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header Title
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(16);
  pdf.text('International Breeds Registry', pageWidth / 2, 14, { align: 'center' });

  // INBR Seal watermark or badge (Gold circle with emblem)
  pdf.setDrawColor(180, 140, 40);
  pdf.setFillColor(250, 245, 230);
  pdf.circle(20, 16, 7, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 110, 20);
  pdf.text('INBR', 20, 18.5, { align: 'center' });

  // Subtitle
  pdf.setTextColor(20, 20, 20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('REGISTRO PARA', pageWidth / 2, 22, { align: 'center' });

  // Checkboxes row: APLICACIÓN F1 []   HOMOLOGACIÓN []   PERMANENTES []   GENOGRAMA []
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 30, 30);

  const checkY = 27;
  const drawCheckbox = (x: number, label: string, isChecked: boolean) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, x, checkY + 3.2);
    const labelWidth = pdf.getTextWidth(label);
    const boxX = x + labelWidth + 2;
    pdf.setDrawColor(30, 30, 30);
    pdf.setLineWidth(0.3);
    pdf.rect(boxX, checkY, 4, 4, 'S');
    if (isChecked) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('X', boxX + 1, checkY + 3.2);
    }
  };

  const proc = d.procedureType || 'F1';
  drawCheckbox(30, 'APLICACIÓN F1', !isBlank && proc === 'F1');
  drawCheckbox(72, 'HOMOLOGACIÓN', !isBlank && proc === 'HOMOLOGACION');
  drawCheckbox(120, 'PERMANENTES', !isBlank && proc === 'PERMANENTE');
  drawCheckbox(164, 'GENOGRAMA', !isBlank && proc === 'GENOGRAMA');

  // ==========================================
  // TOP INFO SECTION (Líneas idénticas al PDF oficial)
  // ==========================================
  let curY = 38;
  const lineSpacing = 7;
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(80, 80, 80);

  const drawFieldLine = (label: string, value: string | undefined, xStart: number, lineWidth: number, y: number) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(40, 40, 40);
    pdf.text(label, xStart, y);
    const labelWidth = pdf.getTextWidth(label);
    const lineStartX = xStart + labelWidth + 1;
    const lineEndX = xStart + lineWidth;

    // Underline
    pdf.line(lineStartX, y + 0.8, lineEndX, y + 0.8);

    // Value text if present
    if (value && !isBlank) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(value), lineStartX + 1, y);
    }
  };

  // Row 1: Nombre del ejemplar: ____________ Raza: ____________
  drawFieldLine('Nombre del ejemplar: ', d.dogName, 14, 110, curY);
  drawFieldLine('Raza: ', d.breed, 126, 70, curY);

  // Row 2: Sexo: ____________ Fecha de Nacimiento: ____________
  curY += lineSpacing;
  drawFieldLine('Sexo: ', d.gender, 14, 85, curY);
  drawFieldLine('Fecha de Nacimiento: ', d.dob, 101, 95, curY);

  // Row 3: Color: ____________ No. de Microchip: ____________
  curY += lineSpacing;
  drawFieldLine('Color: ', d.color, 14, 90, curY);
  drawFieldLine('No. de Microchip: ', d.microchip, 106, 90, curY);

  // Row 4: Criador: ____________ Propietario: ____________
  curY += lineSpacing;
  drawFieldLine('Criador: ', d.breeder, 14, 85, curY);
  drawFieldLine('Propietario: ', d.owner, 101, 95, curY);

  // Row 5: Tel/cel. Propietario: ____________ E-mail propietario: ____________
  curY += lineSpacing;
  drawFieldLine('Tel/cel. Propietario: ', d.phone, 14, 85, curY);
  drawFieldLine('E-mail propietario: ', d.email, 101, 95, curY);

  // Row 6: Dirección de envío: Calle: ____________ Número: ____________
  curY += lineSpacing;
  drawFieldLine('Dirección de envío: Calle ', d.street, 14, 115, curY);
  drawFieldLine('Número ', d.number, 131, 65, curY);

  // Row 7: Colonia/Localidad: ____________ C.P: ____________
  curY += lineSpacing;
  drawFieldLine('Colonia/Localidad: ', d.neighborhood, 14, 120, curY);
  drawFieldLine('C.P: ', d.postalCode, 136, 60, curY);

  // Row 8: Ciudad/Estado: ____________ País: ____________
  curY += lineSpacing;
  drawFieldLine('Ciudad/Estado: ', d.cityState, 14, 120, curY);
  drawFieldLine('País: ', d.country || 'MÉXICO', 136, 60, curY);

  // ==========================================
  // PEDIGREE TREE SECTION (GENOGRAMA 3 GENERACIONES)
  // Matching screenshot 1 pedigree tree grid
  // ==========================================
  const treeTop = 98;
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(30, 30, 30);

  // Helper to draw a pedigree slot with SIRE / DAM and COLOR line
  const drawPedigreeBox = (
    x: number,
    y: number,
    width: number,
    height: number,
    role: 'SIRE' | 'DAM',
    nameVal?: string,
    colorVal?: string
  ) => {
    // Outer box
    pdf.setDrawColor(40, 40, 40);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, height, 'FD');

    // Inner dividing line for COLOR
    const midY = y + height * 0.52;
    pdf.line(x, midY, x + width, midY);

    // Left label column line
    const labelW = role === 'SIRE' ? 12 : 11;
    pdf.line(x + labelW, y, x + labelW, y + height);

    // Labels
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(40, 40, 40);
    pdf.text(role, x + 1.2, y + height * 0.35);
    pdf.text('COLOR', x + 1.2, y + height * 0.86);

    // Value text
    if (!isBlank) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      if (nameVal) {
        pdf.text(nameVal.substring(0, 32), x + labelW + 2, y + height * 0.35);
      }
      if (colorVal) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.text(colorVal.substring(0, 30), x + labelW + 2, y + height * 0.86);
      }
    }
  };

  // Generation 1 (Parents): x = 14, width = 60
  // SIRE (Top)
  drawPedigreeBox(14, treeTop + 15, 60, 11, 'SIRE', d.sire, d.sireColor);
  // DAM (Bottom)
  drawPedigreeBox(14, treeTop + 100, 60, 11, 'DAM', d.dam, d.damColor);

  // Generation 2 (Grandparents): x = 78, width = 60
  // Sire side
  drawPedigreeBox(78, treeTop + 3, 60, 10, 'SIRE', d.sireSire, d.sireSireColor);
  drawPedigreeBox(78, treeTop + 28, 60, 10, 'DAM', d.sireDam, d.sireDamColor);
  // Dam side
  drawPedigreeBox(78, treeTop + 88, 60, 10, 'SIRE', d.damSire, d.damSireColor);
  drawPedigreeBox(78, treeTop + 113, 60, 10, 'DAM', d.damDam, d.damDamColor);

  // Generation 3 (Great-Grandparents): x = 142, width = 54
  // 8 slots
  const g3Heights = [
    treeTop - 3,
    treeTop + 10,
    treeTop + 24,
    treeTop + 37,
    treeTop + 82,
    treeTop + 95,
    treeTop + 109,
    treeTop + 122,
  ];

  const g3Roles: Array<'SIRE' | 'DAM'> = ['SIRE', 'DAM', 'SIRE', 'DAM', 'SIRE', 'DAM', 'SIRE', 'DAM'];
  const g3Names = [
    d.sireSireSire, d.sireSireDam,
    d.sireDamSire, d.sireDamDam,
    d.damSireSire, d.damSireDam,
    d.damDamSire, d.damDamDam,
  ];
  const g3Colors = [
    d.sireSireSireColor, d.sireSireDamColor,
    d.sireDamSireColor, d.sireDamDamColor,
    d.damSireSireColor, d.damSireDamColor,
    d.damDamSireColor, d.damDamDamColor,
  ];

  g3Heights.forEach((y, i) => {
    drawPedigreeBox(142, y, 54, 9, g3Roles[i], g3Names[i], g3Colors[i]);
  });

  // Connecting tree lines
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.2);

  // Connect G1 to G2 (Sire)
  pdf.line(74, treeTop + 20.5, 78, treeTop + 8);
  pdf.line(74, treeTop + 20.5, 78, treeTop + 33);

  // Connect G1 to G2 (Dam)
  pdf.line(74, treeTop + 105.5, 78, treeTop + 93);
  pdf.line(74, treeTop + 105.5, 78, treeTop + 118);

  // Connect G2 to G3
  pdf.line(138, treeTop + 8, 142, treeTop + 1.5);
  pdf.line(138, treeTop + 8, 142, treeTop + 14.5);
  pdf.line(138, treeTop + 33, 142, treeTop + 28.5);
  pdf.line(138, treeTop + 33, 142, treeTop + 41.5);

  pdf.line(138, treeTop + 93, 142, treeTop + 86.5);
  pdf.line(138, treeTop + 93, 142, treeTop + 99.5);
  pdf.line(138, treeTop + 118, 142, treeTop + 113.5);
  pdf.line(138, treeTop + 118, 142, treeTop + 126.5);

  // ==========================================
  // LEGAL FOOTER (Idéntico al documento original)
  // ==========================================
  const legalY = 275;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(50, 50, 50);

  const legalText =
    'INBR asume que los datos suministrados en este REGISTRO PARA APLICACIÓN F1, HOMOLOGACIÓN, PERMANENTES Y GENOGRAMA son veraces y certeros; que el ' +
    'propietario del ejemplar a registrar conoce y asume la responsabilidad de la información. Ya que el ejemplar en cualquier momento puede ser llamado a la realización de ' +
    'un Perfil de ADN el cual debe ser asumido por el propietario; en caso tal de abstenerse a la presentación del anterior el registro automáticamente será invalidado.';

  const splitLegal = pdf.splitTextToSize(legalText, pageWidth - 28);
  pdf.text(splitLegal, 14, legalY);

  return pdf;
}

/**
 * Generates and downloads the Official Litter Application PDF (2 Pages)
 * Matches the layout of PDF 2 provided by INBR.
 */
export function generateLitterFormPdf(data?: Partial<LitterFormPdfData>, isBlank: boolean = false): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const d = isBlank ? {} : (data || {});

  // ==========================================================
  // PAGE 1: INFORMACIÓN DE LA CAMADA, PADRE, MADRE, PROPIETARIO
  // ==========================================================
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(15, 15, 15);
  pdf.text('INTERNATIONAL BREEDS REGISTRY ®', pageWidth / 2, 14, { align: 'center' });

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(70, 70, 70);
  pdf.text('The new era is here', pageWidth / 2, 19, { align: 'center' });

  // INBR Seal Top Right
  pdf.setDrawColor(180, 140, 40);
  pdf.setFillColor(250, 245, 230);
  pdf.circle(188, 16, 8, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(150, 110, 20);
  pdf.text('INBR', 188, 19, { align: 'center' });

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(40, 40, 40);

  // Helper for Section Box Title
  const drawSectionTitle = (title: string, x: number, y: number, width: number) => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, width, 6, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(20, 20, 20);
    pdf.text(title, x + 2, y + 4.2);
  };

  const drawFieldUnderline = (label: string, value: any, xStart: number, lineWidth: number, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(30, 30, 30);
    pdf.text(label, xStart, y);
    const labelWidth = pdf.getTextWidth(label);
    const lineStartX = xStart + labelWidth + 1;
    const lineEndX = xStart + lineWidth;
    pdf.line(lineStartX, y + 0.8, lineEndX, y + 0.8);

    if (value && !isBlank) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(0, 0, 0);
      pdf.text(String(value), lineStartX + 1, y);
    }
  };

  // BOX 1: INFORMACIÓN DE LA CAMADA
  let curY = 27;
  drawSectionTitle('INFORMACIÓN DE LA CAMADA', 14, curY, 70);
  curY += 10;

  // Row 1: RAZA: ____________ FECHA DE NACIMIENTO: ____________ # TOTAL DE MACHOS: ____________
  drawFieldUnderline('RAZA ', d.breed, 14, 65, curY);
  drawFieldUnderline('FECHA DE NACIMIENTO ', d.birthDate, 82, 60, curY);
  drawFieldUnderline('# TOTAL DE MACHOS ', d.totalMales, 145, 51, curY);

  // Row 2: FECHA DE CRUZA: ____________ # TOTAL DE HEMBRAS: ____________
  curY += 6.5;
  drawFieldUnderline('FECHA DE CRUZA ', d.matingDate, 82, 60, curY);
  drawFieldUnderline('# TOTAL DE HEMBRAS ', d.totalFemales, 145, 51, curY);

  // BOX 2: INFORMACIÓN DEL PADRE & INFORMACIÓN DE LA MADRE (Dos Columnas)
  curY += 12;
  const col1X = 14;
  const col2X = 108;
  const colW = 88;

  drawSectionTitle('INFORMACIÓN DEL PADRE', col1X, curY, 68);
  drawSectionTitle('INFORMACIÓN DE LA MADRE', col2X, curY, 68);

  curY += 11;
  const fieldGap = 6.2;

  // Row 1: INBR #
  drawFieldUnderline('INBR # ', d.fatherInbr, col1X, colW, curY);
  drawFieldUnderline('INBR # ', d.motherInbr, col2X, colW, curY);

  // Row 2: NOMBRE DEL PADRE / NOMBRE DE LA MADRE
  curY += fieldGap;
  drawFieldUnderline('NOMBRE DEL PADRE ', d.fatherName, col1X, colW, curY);
  drawFieldUnderline('NOMBRE DE LA MADRE ', d.motherName, col2X, colW, curY);

  // Row 3: NOMBRE DEL DUEÑO DEL PADRE / NOMBRE DEL DUEÑO DE LA MADRE
  curY += fieldGap;
  drawFieldUnderline('NOMBRE DEL DUEÑO DEL PADRE ', d.fatherOwner, col1X, colW, curY);
  drawFieldUnderline('NOMBRE DEL DUEÑO DE LA MADRE ', d.motherOwner, col2X, colW, curY);

  // Row 4: FIRMA DEL DUEÑO DEL PADRE / FIRMA DEL DUEÑO DE LA MADRE
  curY += fieldGap;
  drawFieldUnderline('FIRMA DEL DUEÑO DEL PADRE ', '', col1X, colW, curY);
  drawFieldUnderline('FIRMA DEL DUEÑO DE LA MADRE ', '', col2X, colW, curY);

  // Row 5: NOMBRE DEL COPROPIETARIO, SI APLICA
  curY += fieldGap;
  drawFieldUnderline('NOMRE DEL COPROPIETARIO, SI APLICA ', d.fatherCoOwner, col1X, colW, curY);
  drawFieldUnderline('NOMRE DEL COPROPIETARIO, SI APLICA ', d.motherCoOwner, col2X, colW, curY);

  // Row 6: FIRMA DEL COPROPIETARIO, SI APLICA
  curY += fieldGap;
  drawFieldUnderline('FIRMA DEL COPROPIETARIO, SI APLICA ', '', col1X, colW, curY);
  drawFieldUnderline('FIRMA DEL COPROPIETARIO, SI APLICA ', '', col2X, colW, curY);

  // Row 7: DIRECCIÓN ACTUAL
  curY += fieldGap;
  drawFieldUnderline('DIRECCIÓN ACTUAL ', d.fatherAddress, col1X, colW, curY);
  drawFieldUnderline('DIRECCIÓN ACTUAL ', d.motherAddress, col2X, colW, curY);

  // Row 8: CIUDAD / ESTADO/PROVIDENCIA
  curY += fieldGap;
  drawFieldUnderline('CIUDAD ', d.fatherCity, col1X, 42, curY);
  drawFieldUnderline('ESTADO/PROVIDENCIA ', d.fatherState, col1X + 44, 44, curY);
  drawFieldUnderline('CIUDAD ', d.motherCity, col2X, 42, curY);
  drawFieldUnderline('ESTADO/PROVIDENCIA ', d.motherState, col2X + 44, 44, curY);

  // Row 9: C.P. / PAÍS
  curY += fieldGap;
  drawFieldUnderline('C.P. ', d.fatherZip, col1X, 38, curY);
  drawFieldUnderline('PAÍS ', d.fatherCountry || 'MÉXICO', col1X + 40, 48, curY);
  drawFieldUnderline('C.P. ', d.motherZip, col2X, 38, curY);
  drawFieldUnderline('PAÍS ', d.motherCountry || 'MÉXICO', col2X + 40, 48, curY);

  // Row 10: EMAIL
  curY += fieldGap;
  drawFieldUnderline('EMAIL ', d.fatherEmail, col1X, colW, curY);
  drawFieldUnderline('EMAIL ', d.motherEmail, col2X, colW, curY);

  // BOX 3: INFORMACIÓN DEL PROPIETARIO DE LA CAMADA
  curY += 13;
  drawSectionTitle('INFORMACIÓN DEL PROPIETARIO DE LA CAMADA', 14, curY, 82);

  curY += 11;
  // Row 1: NOMBRE DEL PROPIETARIO: ____________ FIRMA DEL PROPIETARIO: ____________
  drawFieldUnderline('NOMBRE DEL PROPIETARIO ', d.litterOwnerName, 14, 98, curY);
  drawFieldUnderline('FIRMA DEL PROPIETARIO ', '', 115, 81, curY);

  // Row 2: DIRECCIÓN ACTUAL / CIUDAD / ESTADO/ PROVIDENCIA
  curY += fieldGap + 1;
  drawFieldUnderline('DIRECCIÓN ACTUAL ', d.litterOwnerAddress, 14, 75, curY);
  drawFieldUnderline('CIUDAD ', d.litterOwnerCity, 92, 45, curY);
  drawFieldUnderline('ESTADO/ PROVIDENCIA ', d.litterOwnerState, 140, 56, curY);

  // Row 3: C.P. / PAÍS / EMAIL
  curY += fieldGap + 1;
  drawFieldUnderline('C.P. ', d.litterOwnerZip, 14, 35, curY);
  drawFieldUnderline('PAÍS ', d.litterOwnerCountry || 'MÉXICO', 52, 40, curY);
  drawFieldUnderline('EMAIL ', d.litterOwnerEmail, 95, 101, curY);

  // ==========================================================
  // PAGE 2: INFORMACIÓN DE LOS CACHORROS (12 CACHORROS)
  // ==========================================================
  pdf.addPage('a4', 'portrait');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Page 2 Header Box
  drawSectionTitle('INFORMACIÓN DE LOS CACHORROS', 14, 14, 75);

  let pupY = 28;
  const pupCol1 = 14;
  const pupCol2 = 78;
  const pupCol3 = 142;
  const pupWidth = 54;

  const puppiesList = d.puppies || [];

  // 12 puppies arranged in 4 rows of 3 columns
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const pupNumber = idx + 1;
      const x = col === 0 ? pupCol1 : col === 1 ? pupCol2 : pupCol3;
      const y = pupY + row * 28;
      const pupData = puppiesList[idx];

      // Label: CACHORRO 1
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(20, 20, 20);
      pdf.text(`CACHORRO ${pupNumber}`, x, y);

      // Checkbox MACHO
      const isMacho = !isBlank && pupData && pupData.gender === 'Macho';
      const isHembra = !isBlank && pupData && pupData.gender === 'Hembra';

      pdf.setDrawColor(40, 40, 40);
      pdf.setLineWidth(0.3);
      pdf.rect(x + 28, y - 3.5, 4, 4, 'S');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('MACHO', x + 34, y - 0.5);
      if (isMacho) {
        pdf.text('X', x + 29, y - 0.5);
      }

      // Checkbox HEMBRA
      pdf.rect(x + 28, y + 2.5, 4, 4, 'S');
      pdf.text('HEMBRA', x + 34, y + 5.5);
      if (isHembra) {
        pdf.text('X', x + 29, y + 5.5);
      }

      // COLOR/MARCAS line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.text('COLOR/MARCAS', x, y + 12);
      pdf.line(x + 23, y + 12.8, x + pupWidth, y + 12.8);

      if (!isBlank && pupData && pupData.color) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(pupData.color.substring(0, 20), x + 24, y + 12);
      }
    }
  }

  // BOTTOM LEGAL BOX (Page 2)
  const bottomBoxY = 155;
  pdf.setFillColor(242, 242, 242);
  pdf.setDrawColor(80, 80, 80);
  pdf.rect(14, bottomBoxY, pageWidth - 28, 22, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(30, 30, 30);
  pdf.text(
    'ESTOY DE ACUERDO QUE SOY EL PROPIETARIO DE ESTA CAMADA REGISTRADA Y LA INFORMACIÓN PROPORCIONADA ES VERDAD.',
    17,
    bottomBoxY + 5.5
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(
    'INBR ESTÁ RESERVADO CON EL DERECHO A CANCELAR ESTE REGISTRO EN CUALQUIER MOMENTO SI ENCONTRAMOS QUE LA INFORMACIÓN PROPORCIONADA ES FALSA SIN REEMBOLSO ALGUNO.',
    17,
    bottomBoxY + 10.5
  );

  // Line for signature
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('NOMBRE Y FIRMA DEL DUEÑO DE LA CAMADA', 17, bottomBoxY + 17);
  pdf.line(78, bottomBoxY + 17.5, pageWidth - 18, bottomBoxY + 17.5);

  return pdf;
}

/**
 * Direct download triggers
 */
export function downloadBlankIndividualPdf(procedureType: 'F1' | 'HOMOLOGACION' | 'PERMANENTE' | 'GENOGRAMA' = 'F1') {
  const pdf = generateIndividualFormPdf({ procedureType }, true);
  pdf.save(`INBR_Formato_Oficial_${procedureType}_Imprimible.pdf`);
}

export function downloadBlankLitterPdf() {
  const pdf = generateLitterFormPdf({}, true);
  pdf.save('INBR_Formato_Oficial_Camada_Imprimible.pdf');
}
