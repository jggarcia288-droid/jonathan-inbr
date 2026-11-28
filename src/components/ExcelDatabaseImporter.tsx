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
  RefreshCw, 
  Table, 
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';

interface ExcelDatabaseImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessNavigate?: () => void;
}

export const ExcelDatabaseImporter: React.FC<ExcelDatabaseImporterProps> = ({
  isOpen,
  onClose,
  onSuccessNavigate,
}) => {
  const { addDogsFromExcel, dogs, totalCustomRecords, resetToDefaults } = useRegistry();
  
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedDogs, setParsedDogs] = useState<DogRecord[]>([]);
  const [duplicateRegs, setDuplicateRegs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Intelligent column header normalizer
  const normalizeKey = (key: string): string => {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
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

        // Take the first sheet or the sheet named 'EJEMPLARES' / 'REGISTROS'
        const sheetName = 
          workbook.SheetNames.find(n => /ejemplar|registro|perro|dog|inbr/i.test(n)) || 
          workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        // Auto-detect real header row (handles Excel files with banner/title rows above column headers)
        const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        let headerRowIdx = 0;
        let bestScore = -1;
        const headerKeywords = ['registro', 'folio', 'microchip', 'chip', 'nombre', 'ejemplar', 'raza', 'padre', 'madre', 'propietario', 'color', 'sexo'];
        for (let r = 0; r < Math.min(10, aoa.length); r++) {
          const rowCells = (aoa[r] || []).map((c) => normalizeKey(String(c ?? '')));
          const score = rowCells.reduce((acc, cell) => {
            if (!cell) return acc;
            return acc + (headerKeywords.some((kw) => cell.includes(kw)) ? 1 : 0);
          }, 0);
          if (score > bestScore) {
            bestScore = score;
            headerRowIdx = r;
          }
        }

        const rawJsonAll: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          range: headerRowIdx,
        });

        // Filter out completely blank rows so they don't become EJEMPLAR #N / INBR-EXCEL-N
        const rawJson = rawJsonAll.filter((row) =>
          Object.values(row).some((v) => String(v ?? '').trim() !== '')
        );

        if (!rawJson || rawJson.length === 0) {
          throw new Error('El archivo Excel está vacío o no contiene filas con datos válidos.');
        }

        // Map columns intelligently (exact key matches first, then partial matches)
        const normalizedDogs: DogRecord[] = rawJson.map((row, index) => {
          const keys = Object.keys(row);

          const findVal = (patterns: string[], exclude: string[] = []): string => {
            // 1. Exact normalized header match first
            for (const p of patterns) {
              for (const k of keys) {
                const norm = normalizeKey(k);
                if (exclude.some(ex => norm.includes(ex))) continue;
                if (norm === p) {
                  const val = String(row[k] ?? '').trim();
                  if (val) return val;
                }
              }
            }
            // 2. Partial header match in pattern priority order
            for (const p of patterns) {
              for (const k of keys) {
                const norm = normalizeKey(k);
                if (exclude.some(ex => norm.includes(ex))) continue;
                if (norm.includes(p)) {
                  const val = String(row[k] ?? '').trim();
                  if (val) return val;
                }
              }
            }
            return '';
          };

          const reg = findVal(
            ['numeroregistro', 'noregistro', 'nroregistro', 'numero_registro', 'numregistro', 'nregistro', 'noreg', 'nreg', 'folioregistro', 'folioinbr', 'folio', 'certificado', 'matricula', 'registro', 'regnumber', 'reg', 'codigo', 'clave', 'pedigree', 'inbr', 'id'],
            ['padre', 'madre', 'sire', 'dam', 'fecha', 'tipo', 'region', 'estado', 'anterior', 'previo', 'chip', 'microchip']
          ) || `INBR-EXCEL-${1000 + index}`;
          const chip = findVal(['microchip', 'chip', 'iso', 'rfid'], ['padre', 'madre']);

          // Distinct relational column extraction (avoid NOMBRE DEL PADRE / MADRE as dog name)
          let name = findVal(['nombreejemplar', 'nombreperro', 'nombre', 'ejemplar', 'cachorro', 'cria'], ['padre', 'madre', 'sire', 'dam', 'propietario', 'dueno', 'criador', 'owner']);
          const sire = findVal(['padre', 'sire', 'papa', 'idpadre'], ['madre', 'dam', 'mama', 'regpadre']) || 'INBR CHAMPION SIRE';
          const sireReg = findVal(['regpadre', 'sirereg', 'regsire']) || '—';
          const dam = findVal(['madre', 'dam', 'mama', 'idmadre'], ['padre', 'sire', 'papa', 'regmadre']) || 'INBR CHAMPION DAM';
          const damReg = findVal(['regmadre', 'damreg', 'regdam']) || '—';
          let owner = findVal(['propietario', 'propietarionombre', 'dueno', 'owner', 'titular'], ['padre', 'madre', 'sire', 'dam']) || 'Criador Afiliado INBR';

          const isCamada = reg.toUpperCase().startsWith('CA');

          // If it is a Camada and puppy name was empty or mistakenly set to sire name:
          if (isCamada && (!name || name.toUpperCase() === sire.toUpperCase() || name.toUpperCase() === dam.toUpperCase())) {
            name = `CACHORRO ${reg.toUpperCase()}`;
          } else if (!name) {
            name = `Ejemplar #${index + 1}`;
          }

          // Owner must never be the sire or dam dog
          if (owner.toUpperCase() === sire.toUpperCase() || owner.toUpperCase() === dam.toUpperCase()) {
            owner = 'Criadero Oficial INBR';
          }

          const breed = findVal(['raza', 'breed']) || 'American Bully';
          const variety = findVal(['variedad', 'tipo', 'variety', 'clase'], ['registro']) || (isCamada ? 'Camada Registrada' : 'Standard');
          const genderRaw = findVal(['sexo', 'gender', 'sex']).toLowerCase();
          const gender = genderRaw.startsWith('h') || genderRaw.startsWith('f') ? 'Hembra' : 'Macho';
          const color = findVal(['color', 'manto', 'marcas']) || 'Sable / Blue';
          const dob = findVal(['fechanac', 'nacimiento', 'dob', 'fecha'], ['registro']) || new Date().toISOString().split('T')[0];
          const breeder = findVal(['criador', 'breeder', 'criadero', 'kennel'], ['padre', 'madre']) || owner;
          const country = findVal(['pais', 'country', 'nacion', 'origen']) || 'México / USA';
          const pointsRaw = findVal(['puntos', 'points', 'pts']);
          const points = parseInt(pointsRaw) || Math.floor(Math.random() * 150 + 50);
          const titlesRaw = findVal(['titulos', 'titles', 'campeonato']);
          const titles = titlesRaw ? titlesRaw.split(/[,;/]/).map(t => t.trim()).filter(Boolean) : (points >= 100 ? ['CH'] : []);

          return {
            regNumber: reg.toUpperCase(),
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
          };
        });

        // Detect duplicate registration numbers inside the Excel sheet
        const seen = new Set<string>();
        const dupes = new Set<string>();
        normalizedDogs.forEach((d) => {
          const key = d.regNumber.trim().toUpperCase();
          if (seen.has(key)) dupes.add(key);
          else seen.add(key);
        });
        setDuplicateRegs(Array.from(dupes));
        setParsedDogs(normalizedDogs);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err.message || 'Error al procesar el archivo Excel. Asegúrate de que sea un archivo .xlsx, .xls o .csv.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
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

  // Generate and download template Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'N° REGISTRO': 'INBR-99001',
        'MICROCHIP (15 DÍGITOS)': '981098108429999',
        'NOMBRE DEL EJEMPLAR': 'DIAMOND KHALEEZI',
        'RAZA': 'American Bully',
        'VARIEDAD': 'Pocket',
        'SEXO': 'Hembra',
        'COLOR': 'Lilac Tri Ghost',
        'FECHA NACIMIENTO': '2023-04-12',
        'PADRE': 'KING VULCAN',
        'REG PADRE': 'INBR-84920',
        'MADRE': 'QUEEN BELLA',
        'REG MADRE': 'INBR-00192',
        'PROPIETARIO': 'Jonathan Garcia',
        'CRIADERO': 'Imperial Bullyz',
        'PAÍS': 'México / USA',
        'PUNTOS': 180,
        'TÍTULOS': 'CH, NAT CH',
      },
      {
        'N° REGISTRO': 'INBR-99002',
        'MICROCHIP (15 DÍGITOS)': '981098108429998',
        'NOMBRE DEL EJEMPLAR': 'GOLIATH THE BEAST',
        'RAZA': 'American Bully',
        'VARIEDAD': 'XL',
        'SEXO': 'Macho',
        'COLOR': 'Blue Brindle',
        'FECHA NACIMIENTO': '2022-11-20',
        'PADRE': 'SUPREME DIABLO',
        'REG PADRE': 'INBR-55201',
        'MADRE': 'TEXAS STORM',
        'REG MADRE': 'INBR-20212',
        'PROPIETARIO': 'Carlos Otero',
        'CRIADERO': 'Lone Star Bullies',
        'PAÍS': 'USA',
        'PUNTOS': 220,
        'TÍTULOS': 'GR CH',
      },
      {
        'N° REGISTRO': 'INBR-99003',
        'MICROCHIP (15 DÍGITOS)': '981098108429997',
        'NOMBRE DEL EJEMPLAR': 'ROYAL PARIS FLUFFY',
        'RAZA': 'French Bulldog',
        'VARIEDAD': 'Fluffy Exotic',
        'SEXO': 'Hembra',
        'COLOR': 'Isabella Visual',
        'FECHA NACIMIENTO': '2023-08-01',
        'PADRE': 'LADY VALKYRIE',
        'REG PADRE': 'INBR-77119',
        'MADRE': 'PARIS JEWEL',
        'REG MADRE': 'INBR-31121',
        'PROPIETARIO': 'Yordi Supremacy',
        'CRIADERO': 'Supremacy Kennel',
        'PAÍS': 'Perú',
        'PUNTOS': 130,
        'TÍTULOS': 'CH',
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
                Sube tus planillas de Excel para poblar instantáneamente las bases de verificación y campeones INBR.
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
              <span className="text-xs text-neutral-400">Importados por Excel:</span>
              <span className="text-sm font-bold font-mono text-[#E7C888]">{totalCustomRecords} Ejemplares</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0D0D0D] border border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Estado de Sincronización:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> MEMORIA & CLOUD
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
              O haz clic para explorar tus carpetas. El sistema detectará automáticamente nombres de columnas como Registro, Microchip, Ejemplar, Raza, Padres, Propietario y Puntos.
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
              {duplicateRegs.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300">
                      ⚠️ Atención: Se detectaron {duplicateRegs.length} números de registro repetidos dentro de este Excel
                    </strong>
                    <span className="text-[11px] text-amber-200/90">
                      Ejemplos: {duplicateRegs.slice(0, 5).join(', ')}. Revisa la tabla antes de importar para que no se sobrescriban perros distintos.
                    </span>
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow-xl transition-all"
                >
                  <Database className="w-4 h-4" />
                  <span>Integrar {parsedDogs.length} Ejemplares a la Base Oficial</span>
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
                      <th className="py-2.5 px-3">Raza & Variedad</th>
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
                        <td className="py-2 px-3 font-mono text-neutral-400">{dog.microchip}</td>
                        <td className="py-2 px-3 font-bold text-white">{dog.name}</td>
                        <td className="py-2 px-3 text-neutral-300">{dog.breed} ({dog.variety})</td>
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
              No te preocupes por el orden exacto. Nuestro motor inteligente detecta columnas con nombres como:
              <span className="text-[#E7C888] font-mono"> Registro, Microchip, Nombre, Raza, Sexo, Color, Nacimiento, Padre, Madre, Propietario, Criador, País, Puntos</span>.
            </p>
          </div>
        </div>

        {/* Modal Bottom Controls */}
        <div className="p-4 bg-[#141414] border-t border-neutral-800 flex items-center justify-between">
          {totalCustomRecords > 0 ? (
            <button
              onClick={() => {
                if (confirm('¿Deseas restaurar la base de datos a los ejemplares originales por defecto?')) {
                  resetToDefaults();
                  setParsedDogs([]);
                  setImportSuccess(null);
                }
              }}
              className="text-xs text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar datos por defecto</span>
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
                className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-gold-gradient hover:brightness-110 active:scale-95 shadow-md"
              >
                Confirmar e Importar ({parsedDogs.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
