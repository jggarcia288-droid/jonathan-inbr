import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useRegistry } from '../context/RegistryContext';
import { DogRecord } from '../data/registryData';
import { getBreedImageByIdOrName } from '../utils/breedImages';
import confetti from 'canvas-confetti';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Database, 
  X, 
  Trash2,
  Table, 
  HelpCircle
} from 'lucide-react';

interface ExcelDatabaseImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNavigate?: () => void;
}

interface DetectedColumnsSummary {
  reg?: string;
  chip?: string;
  name?: string;
  breed?: string;
  gender?: string;
  color?: string;
  sire?: string;
  dam?: string;
  owner?: string;
}

export const ExcelDatabaseImporter: React.FC<ExcelDatabaseImporterProps> = ({
  isOpen,
  onClose,
}) => {
  const { addDogsFromExcel, dogs, totalCustomRecords, clearAllDogs } = useRegistry();
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [workbookState, setWorkbookState] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('__ALL__');
  const [parsedDogs, setParsedDogs] = useState<DogRecord[]>([]);
  const [duplicateRegs, setDuplicateRegs] = useState<string[]>([]);
  const [duplicateChips, setDuplicateChips] = useState<string[]>([]);
  const [detectedCols, setDetectedCols] = useState<DetectedColumnsSummary | null>(null);
  const [missingBreedCount, setMissingBreedCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const cellToCleanText = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return '';
      if (Number.isInteger(val)) return val.toFixed(0);
      return String(val).trim();
    }
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    return String(val).replace(/\s+/g, ' ').trim();
  };

  const parseSheetRows = (
    worksheet: XLSX.WorkSheet,
    batchStamp: string,
    sheetOffset: number
  ): { rows: DogRecord[]; cols: DetectedColumnsSummary } => {
    const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    if (!aoa || aoa.length === 0) {
      return { rows: [], cols: {} };
    }

    let headerRowIdx = 0;
    let bestScore = -1;
    const headerKeywords = [
      'registro', 'folio', 'microchip', 'chip', 'nombre', 'ejemplar',
      'raza', 'breed', 'padre', 'madre', 'propietario', 'color', 'sexo'
    ];
    for (let r = 0; r < Math.min(12, aoa.length); r++) {
      const rowCells = (aoa[r] || []).map((c) => normalizeKey(cellToCleanText(c)));
      const score = rowCells.reduce((acc, cell) => {
        if (!cell) return acc;
        return acc + (headerKeywords.some((kw) => cell.includes(kw)) ? 1 : 0);
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        headerRowIdx = r;
      }
    }

    if (bestScore < 1) {
      return { rows: [], cols: {} };
    }

    const rawJsonAll: any[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      range: headerRowIdx,
    });

    const rawJson = rawJsonAll.filter((row) =>
      Object.values(row).some((v) => cellToCleanText(v) !== '')
    );

    if (!rawJson || rawJson.length === 0) {
      return { rows: [], cols: {} };
    }

    const headerKeys = Object.keys(rawJson[0] || {});
    const matchHeader = (patterns: string[], exclude: string[] = []): string | undefined => {
      for (const p of patterns) {
        for (const k of headerKeys) {
          const norm = normalizeKey(k);
          if (exclude.some((ex) => norm.includes(ex))) continue;
          if (norm === p) return k;
        }
      }
      for (const p of patterns) {
        for (const k of headerKeys) {
          const norm = normalizeKey(k);
          if (exclude.some((ex) => norm.includes(ex))) continue;
          if (norm.includes(p)) return k;
        }
      }
      return undefined;
    };

    const regCol = matchHeader(
      ['numeroregistro', 'noregistro', 'nroregistro', 'numero_registro', 'numregistro', 'nregistro', 'noreg', 'nreg', 'folioregistro', 'folioinbr', 'folio', 'certificado', 'matricula', 'registro', 'regnumber', 'reg', 'codigo', 'clave', 'pedigree', 'inbr', 'id'],
      ['padre', 'madre', 'sire', 'dam', 'fecha', 'tipo', 'region', 'estado', 'anterior', 'previo', 'chip', 'microchip']
    );
    const chipCol = matchHeader(['microchip', 'chip', 'iso', 'rfid', 'nochip', 'numerodechip', 'numchip'], ['padre', 'madre', 'sire', 'dam']);
    const nameCol = matchHeader(['nombreejemplar', 'nombredelperro', 'nombreperro', 'nombre', 'ejemplar', 'cachorro', 'cria', 'dogname'], ['padre', 'madre', 'sire', 'dam', 'propietario', 'dueno', 'criador', 'owner']);
    const breedCol = matchHeader(['raza', 'razacanina', 'razadelperro', 'razadelejemplar', 'breed', 'dogbreed', 'especie', 'razayvariedad', 'subraza', 'razapureza'], ['padre', 'madre', 'sire', 'dam']);
    const varietyCol = matchHeader(['variedad', 'subvariedad', 'variety', 'clase', 'tamano'], ['registro', 'raza']);
    const genderCol = matchHeader(['sexo', 'gender', 'sex']);
    const colorCol = matchHeader(['color', 'manto', 'marcas', 'capa']);
    const dobCol = matchHeader(['fechanac', 'fechadenacimiento', 'nacimiento', 'dob', 'fecha'], ['registro']);
    const sireCol = matchHeader(['padre', 'sire', 'papa', 'idpadre', 'nombredelpadre', 'nombrepadre'], ['madre', 'dam', 'mama', 'regpadre', 'sirereg']);
    const sireRegCol = matchHeader(['regpadre', 'sirereg', 'regsire', 'foliopadre']);
    const damCol = matchHeader(['madre', 'dam', 'mama', 'idmadre', 'nombredelamadre', 'nombremadre'], ['padre', 'sire', 'papa', 'regmadre', 'damreg']);
    const damRegCol = matchHeader(['regmadre', 'damreg', 'regdam', 'foliomadre']);
    const ownerCol = matchHeader(['propietario', 'propietarionombre', 'nombrepropietario', 'dueno', 'owner', 'titular'], ['padre', 'madre', 'sire', 'dam']);
    const breederCol = matchHeader(['criador', 'breeder', 'criadero', 'kennel'], ['padre', 'madre', 'sire', 'dam']);
    const countryCol = matchHeader(['pais', 'country', 'nacion', 'origen']);
    const pointsCol = matchHeader(['puntos', 'points', 'pts']);
    const titlesCol = matchHeader(['titulos', 'titles', 'campeonato']);

    const colsSummary: DetectedColumnsSummary = {
      reg: regCol,
      chip: chipCol,
      name: nameCol,
      breed: breedCol,
      gender: genderCol,
      color: colorCol,
      sire: sireCol,
      dam: damCol,
      owner: ownerCol,
    };

    const rows: DogRecord[] = [];
    rawJson.forEach((row, index) => {
      const regRaw = regCol ? cellToCleanText(row[regCol]) : '';
      const chip = chipCol ? cellToCleanText(row[chipCol]) : '';
      let name = nameCol ? cellToCleanText(row[nameCol]) : '';

      // Skip rows that have no folio, no chip, and no dog name
      if (!regRaw && !chip && !name) {
        return;
      }

      const chipDigits = chip.replace(/\D/g, '');
      const reg = regRaw || (chipDigits.length >= 6 ? `SIN-FOLIO-${chipDigits}` : `INBR-TMP-${batchStamp}-${sheetOffset + index + 1}`);

      const sire = (sireCol ? cellToCleanText(row[sireCol]) : '') || 'SIN REGISTRO';
      const sireReg = (sireRegCol ? cellToCleanText(row[sireRegCol]) : '') || '—';
      const dam = (damCol ? cellToCleanText(row[damCol]) : '') || 'SIN REGISTRO';
      const damReg = (damRegCol ? cellToCleanText(row[damRegCol]) : '') || '—';
      let owner = (ownerCol ? cellToCleanText(row[ownerCol]) : '') || 'Criadero Oficial INBR';

      const isCamada = /^CA\d/i.test(reg);
      if (isCamada && (!name || name.toUpperCase() === sire.toUpperCase() || name.toUpperCase() === dam.toUpperCase())) {
        name = `CACHORRO ${reg.toUpperCase()}`;
      } else if (!name) {
        name = regRaw ? `EJEMPLAR ${regRaw.toUpperCase()}` : `EJEMPLAR #${sheetOffset + index + 1}`;
      }

      if (
        (sire !== 'SIN REGISTRO' && owner.toUpperCase() === sire.toUpperCase()) ||
        (dam !== 'SIN REGISTRO' && owner.toUpperCase() === dam.toUpperCase())
      ) {
        owner = 'Criadero Oficial INBR';
      }

      const breed = (breedCol ? cellToCleanText(row[breedCol]) : '') || 'SIN ESPECIFICAR';
      const variety = (varietyCol ? cellToCleanText(row[varietyCol]) : '') || (isCamada ? 'Camada Registrada' : 'Standard');
      const genderRaw = (genderCol ? cellToCleanText(row[genderCol]) : '').toLowerCase();
      const gender: 'Macho' | 'Hembra' =
        genderRaw.startsWith('h') || genderRaw.startsWith('f') ? 'Hembra' : 'Macho';
      const color = (colorCol ? cellToCleanText(row[colorCol]) : '') || 'SIN ESPECIFICAR';
      const dob = (dobCol ? cellToCleanText(row[dobCol]) : '') || new Date().toISOString().split('T')[0];
      const breeder = (breederCol ? cellToCleanText(row[breederCol]) : '') || owner;
      const country = (countryCol ? cellToCleanText(row[countryCol]) : '') || 'México';
      const pointsRaw = pointsCol ? cellToCleanText(row[pointsCol]) : '';
      const points = parseInt(pointsRaw, 10) || 0;
      const titlesRaw = titlesCol ? cellToCleanText(row[titlesCol]) : '';
      const titles = titlesRaw ? titlesRaw.split(/[,;/]/).map((t) => t.trim()).filter(Boolean) : [];

      rows.push({
        regNumber: reg.replace(/\*/g, '').trim().toUpperCase(),
        microchip: chip,
        name: name.toUpperCase(),
        breed,
        variety,
        gender,
        color,
        dob,
        owner,
        breeder,
        country,
        sire,
        sireReg,
        dam,
        damReg,
        points,
        titles,
        imageUrl: getBreedImageByIdOrName(breed),
        status: 'ACTIVE_VALIDATED',
      });
    });

    return { rows, cols: colsSummary };
  };

  const extractFromWorkbook = (workbook: XLSX.WorkBook, sheetChoice: string) => {
    const batchStamp = Date.now().toString(36).toUpperCase().slice(-5);
    const targets =
      sheetChoice === '__ALL__'
        ? workbook.SheetNames
        : [sheetChoice].filter((s) => workbook.Sheets[s]);

    let allDogs: DogRecord[] = [];
    let firstCols: DetectedColumnsSummary | null = null;

    targets.forEach((sheetName) => {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return;
      const { rows, cols } = parseSheetRows(ws, batchStamp, allDogs.length);
      if (rows.length > 0) {
        if (!firstCols) firstCols = cols;
        allDogs = allDogs.concat(rows);
      }
    });

    if (allDogs.length === 0) {
      throw new Error('No se encontraron columnas o filas válidas en el archivo Excel (ej. Registro, Nombre, Microchip, Raza).');
    }

    const seenReg = new Set<string>();
    const dupRegs = new Set<string>();
    const seenChip = new Set<string>();
    const dupChips = new Set<string>();
    let missingBreed = 0;

    allDogs.forEach((d) => {
      const regKey = d.regNumber.trim().toUpperCase();
      if (seenReg.has(regKey)) dupRegs.add(regKey);
      else seenReg.add(regKey);

      const chipDigits = (d.microchip || '').replace(/\D/g, '');
      if (chipDigits.length >= 8) {
        if (seenChip.has(chipDigits)) dupChips.add(chipDigits);
        else seenChip.add(chipDigits);
      }

      if (!d.breed || d.breed === 'SIN ESPECIFICAR') {
        missingBreed++;
      }
    });

    setDetectedCols(firstCols);
    setDuplicateRegs(Array.from(dupRegs));
    setDuplicateChips(Array.from(dupChips));
    setMissingBreedCount(missingBreed);
    setParsedDogs(allDogs);
  };

  const parseExcelFile = (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setImportSuccess(null);
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        setWorkbookState(workbook);
        setSheetNames(workbook.SheetNames);
        const initialChoice = workbook.SheetNames.length > 1 ? '__ALL__' : workbook.SheetNames[0];
        setSelectedSheet(initialChoice);

        extractFromWorkbook(workbook, initialChoice);
      } catch (err: any) {
        console.error(err);
        setParsedDogs([]);
        setDetectedCols(null);
        setErrorMessage(err.message || 'Error al procesar el archivo Excel. Asegúrate de que sea un archivo .xlsx, .xls o .csv.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (choice: string) => {
    setSelectedSheet(choice);
    if (!workbookState) return;
    setErrorMessage(null);
    try {
      extractFromWorkbook(workbookState, choice);
    } catch (err: any) {
      setParsedDogs([]);
      setErrorMessage(err.message || 'Esta pestaña no contiene registros válidos.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleUploadAnother = () => {
    setParsedDogs([]);
    setWorkbookState(null);
    setSheetNames([]);
    setDetectedCols(null);
    setDuplicateRegs([]);
    setDuplicateChips([]);
    setMissingBreedCount(0);
    setFileName(null);
    setImportSuccess(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCommitImport = async () => {
    if (parsedDogs.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await addDogsFromExcel(parsedDogs);
      const count = res.count;
      setImportSuccess(count);
      setParsedDogs([]);
      setWorkbookState(null);
      setSheetNames([]);
      setDetectedCols(null);
      setDuplicateRegs([]);
      setDuplicateChips([]);
      setMissingBreedCount(0);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#C9A86A', '#E7C888', '#10B981', '#FFFFFF'],
        });
      } catch (e) {}
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar los ejemplares en la base de datos de Supabase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'N° REGISTRO': 'INBR-99001',
        'MICROCHIP (15 DÍGITOS)': '981098108429999',
        'NOMBRE DEL EJEMPLAR': 'EJEMPLO SHAR PEI',
        'RAZA': 'Shar Pei',
        'VARIEDAD': 'Standard',
        'SEXO': 'Macho',
        'COLOR': 'Fawn',
        'FECHA NACIMIENTO': '2023-04-12',
        'PADRE': 'PADRE EJEMPLO',
        'REG PADRE': 'INBR-84920',
        'MADRE': 'MADRE EJEMPLO',
        'REG MADRE': 'INBR-00192',
        'PROPIETARIO': 'Propietario Ejemplo',
        'CRIADERO': 'Criadero Ejemplo',
        'PAÍS': 'México',
        'PUNTOS': 0,
        'TÍTULOS': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'REGISTROS_INBR');
    XLSX.writeFile(wb, 'Plantilla_Oficial_Excel_INBR_Registros.xlsx');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#121212] border-2 border-[#C9A86A] rounded-3xl shadow-[0_0_60px_rgba(201,168,106,0.3)] overflow-hidden my-4 sm:my-8 flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="p-5 bg-gradient-to-r from-[#1C1811] via-[#161616] to-[#1C1811] border-b border-[#C9A86A]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-bold shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white font-serif-luxury">
                  Centro de Carga Masiva Excel / CSV
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                  SOPORTE 100% XLSX
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Sube tus planillas de Excel para poblar exactamente tus registros oficiales en Supabase sin alterar razas ni microchips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#E7C888] bg-[#1F180B] border border-[#C9A86A]/60 hover:bg-[#2A2110] transition-colors"
              title="Descargar Plantilla Oficial"
            >
              <Download className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span>Descargar Plantilla .xlsx</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Total en Base de Datos:</span>
              <span className="text-sm font-bold font-mono text-white">{dogs.length} Ejemplares</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Registros en Nube:</span>
              <span className="text-sm font-bold font-mono text-[#E7C888]">{totalCustomRecords} Ejemplares</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Estado de Sincronización:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> SUPABASE DIRECTO
              </span>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-[#C9A86A] bg-[#C9A86A]/15 scale-[1.01]'
                : 'border-neutral-700 hover:border-[#C9A86A]/60 bg-[#0E0E0E]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-[#1C1810] border border-[#C9A86A]/60 flex items-center justify-center text-[#C9A86A] mx-auto mb-4 shadow-lg">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-bold text-white font-serif-luxury mb-1">
              Arrastra y suelta tu archivo Excel (.xlsx, .xls o .csv) aquí
            </h4>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4 leading-relaxed">
              O haz clic para explorar tus carpetas. Lee todas las hojas del archivo respetando la raza, microchip, folio y padres exactos de tu Excel.
            </p>

            <button
              type="button"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 shadow-md inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Seleccionar Archivo Excel</span>
            </button>
          </div>

          {/* Success Banner */}
          {importSuccess !== null && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/80 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 shrink-0" />
                <div>
                  <strong className="text-white block text-sm sm:text-base font-bold">
                    ¡Se importaron y guardaron {importSuccess} registros a la base de datos oficial INBR!
                  </strong>
                  <span className="text-neutral-300">
                    Los datos han sido integrados con éxito. Puedes continuar subiendo más bases de datos Excel sin salirte de aquí.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleUploadAnother}
                  className="px-4 py-2 rounded-xl bg-gold-gradient text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow flex items-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>➕ Cargar Otro Archivo Excel</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 font-bold text-xs hover:text-white hover:bg-neutral-800 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-3 animate-fadeIn">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Preview Table of Parsed Excel Rows */}
          {parsedDogs.length > 0 && (
            <div className="space-y-3 animate-fadeIn">
              {/* Sheet selector when workbook has multiple sheets */}
              {sheetNames.length > 1 && (
                <div className="p-3 rounded-xl bg-[#0D0D0D] border border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-300 font-semibold">
                    Archivo con {sheetNames.length} pestañas detectadas:
                  </span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#181818] border border-[#C9A86A]/60 text-[#FFE885] font-mono text-xs"
                  >
                    <option value="__ALL__">Todas las hojas válidas ({sheetNames.length})</option>
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        Solo hoja: {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Detected Column Mapping Summary */}
              {detectedCols && (
                <div className="p-3.5 rounded-2xl bg-[#0B120F] border border-emerald-700/40 text-[11px] space-y-1.5">
                  <div className="font-bold text-emerald-300 font-mono uppercase">
                    Columnas detectadas en "{fileName}":
                  </div>
                  <div className="flex flex-wrap gap-2 text-neutral-300 font-mono">
                    <span>Registro: <strong className={detectedCols.reg ? 'text-white' : 'text-rose-400'}>{detectedCols.reg || 'NO DETECTADA'}</strong></span>
                    <span>•</span>
                    <span>Microchip: <strong className={detectedCols.chip ? 'text-white' : 'text-amber-400'}>{detectedCols.chip || 'NO DETECTADA'}</strong></span>
                    <span>•</span>
                    <span>Nombre: <strong className={detectedCols.name ? 'text-white' : 'text-amber-400'}>{detectedCols.name || 'NO DETECTADA'}</strong></span>
                    <span>•</span>
                    <span>Raza: <strong className={detectedCols.breed ? 'text-white' : 'text-rose-400'}>{detectedCols.breed || 'NO DETECTADA'}</strong></span>
                    <span>•</span>
                    <span>Padre: <strong className="text-white">{detectedCols.sire || '—'}</strong></span>
                    <span>•</span>
                    <span>Madre: <strong className="text-white">{detectedCols.dam || '—'}</strong></span>
                  </div>
                </div>
              )}

              {missingBreedCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300">
                      Aviso: {missingBreedCount} filas no tenían columna o valor de Raza (quedarán como "SIN ESPECIFICAR")
                    </strong>
                    <span className="text-[11px] text-amber-200/90">
                      Si tu Excel tiene la raza en otra columna, asegúrate de que el encabezado diga "RAZA" o "BREED" para que no se pierda.
                    </span>
                  </div>
                </div>
              )}

              {(duplicateRegs.length > 0 || duplicateChips.length > 0) && (
                <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {duplicateRegs.length > 0 && (
                      <div>
                        <strong className="block text-amber-300">
                          ⚠️ Se detectaron {duplicateRegs.length} números de registro repetidos dentro de este Excel
                        </strong>
                        <span className="text-[11px] text-amber-200/90">
                          Ejemplos: {duplicateRegs.slice(0, 5).join(', ')}
                        </span>
                      </div>
                    )}
                    {duplicateChips.length > 0 && (
                      <div>
                        <strong className="block text-amber-300">
                          ⚠️ Se detectaron {duplicateChips.length} microchips repetidos dentro de este Excel
                        </strong>
                        <span className="text-[11px] text-amber-200/90">
                          Ejemplos: {duplicateChips.slice(0, 5).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#C9A86A]" />
                  <h5 className="text-sm font-bold text-white font-serif-luxury">
                    Vista Previa de Filas Detectadas en "{fileName}" ({parsedDogs.length} filas listas)
                  </h5>
                </div>

                <button
                  onClick={handleCommitImport}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow-xl transition-all disabled:opacity-60"
                >
                  <Database className="w-4 h-4" />
                  <span>{isProcessing ? 'Guardando...' : `Integrar ${parsedDogs.length} Ejemplares a la Base Oficial`}</span>
                </button>
              </div>

              <div className="rounded-2xl bg-[#0D0D0D] border border-neutral-800 overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141414] text-neutral-400 font-mono uppercase tracking-wider sticky top-0 border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">N° Registro</th>
                      <th className="py-2.5 px-3">Microchip</th>
                      <th className="py-2.5 px-3">Nombre Ejemplar</th>
                      <th className="py-2.5 px-3">Raza</th>
                      <th className="py-2.5 px-3">Sexo</th>
                      <th className="py-2.5 px-3">Propietario / Criador</th>
                      <th className="py-2.5 px-3">Padre / Madre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {parsedDogs.slice(0, 100).map((dog, idx) => (
                      <tr key={idx} className="hover:bg-[#1a1711] transition-colors">
                        <td className="py-2 px-3 text-neutral-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-[#E7C888]">{dog.regNumber}</td>
                        <td className="py-2 px-3 font-mono text-neutral-400">{dog.microchip || '—'}</td>
                        <td className="py-2 px-3 font-bold text-white">{dog.name}</td>
                        <td className={`py-2 px-3 ${dog.breed === 'SIN ESPECIFICAR' ? 'text-amber-400 font-bold' : 'text-neutral-300'}`}>
                          {dog.breed}
                        </td>
                        <td className="py-2 px-3 text-neutral-400">{dog.gender}</td>
                        <td className="py-2 px-3 text-neutral-300 truncate max-w-[150px]">{dog.owner}</td>
                        <td className="py-2 px-3 text-neutral-400 truncate max-w-[150px]">
                          {dog.sire} / {dog.dam}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedDogs.length > 100 && (
                <p className="text-[11px] text-neutral-500 italic text-center">
                  Mostrando las primeras 100 filas de {parsedDogs.length}. Al confirmar se importarán todas.
                </p>
              )}
            </div>
          )}

          {/* Quick FAQ / Assistance */}
          <div className="p-4 rounded-2xl bg-[#0D0D0D] border border-neutral-800/80 text-xs text-neutral-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
              <HelpCircle className="w-4 h-4 text-[#C9A86A]" />
              <span>¿Cómo deben venir las columnas en tus archivos Excel?</span>
            </div>
            <p className="leading-relaxed">
              No te preocupes por el orden exacto. Nuestro motor detecta automáticamente columnas como:
              <span className="text-[#E7C888] font-mono"> Registro, Microchip, Nombre, Raza, Sexo, Color, Nacimiento, Padre, Madre, Propietario, Criador, País, Puntos</span>.
            </p>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-[#141414] border-t border-neutral-800 flex items-center justify-between">
          {dogs.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                if (confirm('¿ESTÁS SEGURO? Esto vaciará por completo TODOS los perros y registros de la base de datos en Supabase para dejarla en ceros.')) {
                  setIsProcessing(true);
                  const res = await clearAllDogs();
                  setIsProcessing(false);
                  if (res.success) {
                    setParsedDogs([]);
                    setImportSuccess(null);
                    setErrorMessage(null);
                  } else {
                    setErrorMessage(res.error || 'No se pudo vaciar la base de datos.');
                  }
                }
              }}
              disabled={isProcessing}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar toda la base de datos</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 bg-neutral-800 hover:text-white"
            >
              Cerrar
            </button>

            {parsedDogs.length > 0 && (
              <button
                onClick={handleCommitImport}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow-md disabled:opacity-60"
              >
                {isProcessing ? 'Guardando...' : `Confirmar e Importar (${parsedDogs.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
