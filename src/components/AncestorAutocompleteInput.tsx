import React, { useState, useRef, useEffect } from 'react';
import { useSupabaseAncestorSearch, AncestorSuggestion } from '../hooks/useSupabaseAncestorSearch';
import { 
  Search, 
  Loader2, 
  Dna, 
  Check, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Database,
  ChevronRight,
  Info
} from 'lucide-react';

interface AncestorAutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelectAncestor?: (ancestor: AncestorSuggestion) => void;
  placeholder?: string;
  genderFilter?: 'MACHO' | 'HEMBRA' | 'ALL';
  required?: boolean;
  className?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const AncestorAutocompleteInput: React.FC<AncestorAutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSelectAncestor,
  placeholder = 'Escribe el nombre o registro del ancestro...',
  genderFilter = 'ALL',
  required = false,
  className = '',
  helperText,
  disabled = false,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [selectedRecord, setSelectedRecord] = useState<AncestorSuggestion | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { suggestions, isLoading } = useSupabaseAncestorSearch(value, {
    genderFilter,
    limit: 6,
    debounceMs: 180,
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when suggestions appear and user is typing
  useEffect(() => {
    if (suggestions.length > 0 && document.activeElement === inputRef.current) {
      setIsOpen(true);
    }
  }, [suggestions]);

  const handleSelect = (item: AncestorSuggestion) => {
    onChange(item.name);
    setSelectedRecord(item);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onSelectAncestor) {
      onSelectAncestor(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark key={i} className="bg-transparent text-[#FFE885] font-black underline decoration-[#D4AF37]">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className={`relative text-left ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-neutral-300">
            {label} {required && <span className="text-red-400">*</span>}
          </label>
          {genderFilter !== 'ALL' && (
            <span
              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${
                genderFilter === 'MACHO'
                  ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              {genderFilter === 'MACHO' ? 'Macho / Sire' : 'Hembra / Dam'}
            </span>
          )}
        </div>
      )}

      {/* Input Field with Live Supabase Indicator */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedRecord(null);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#080808] border border-neutral-700 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37] shadow-inner transition-colors"
        />

        {/* Left Icon (Search or DNA) */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
          <Search className="w-4 h-4 text-[#D4AF37]" />
        </div>

        {/* Right Status (Loading or Clear) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSelectedRecord(null);
                setIsOpen(false);
              }}
              className="text-neutral-500 hover:text-white p-0.5 transition-colors"
              title="Borrar texto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Helper text or verified badge */}
      {selectedRecord ? (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono animate-fadeIn">
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Ejemplar enlazado: {selectedRecord.regNumber} ({selectedRecord.color || selectedRecord.breed})</span>
        </div>
      ) : helperText ? (
        <p className="mt-1 text-[10px] text-neutral-500">{helperText}</p>
      ) : null}

      {/* Intelligent Floating Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl bg-[#0D0D0D] border-2 border-[#D4AF37] shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(212,175,55,0.25)] py-2 z-50 animate-fadeIn max-h-72 overflow-y-auto">
          {/* Header indicator */}
          <div className="px-3.5 py-1.5 border-b border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
            <span className="flex items-center gap-1 text-[#FFE885] font-bold">
              <Database className="w-3 h-3 text-[#D4AF37]" />
              <span>Base de Datos Supabase (1,219 Ejemplares)</span>
            </span>
            {isLoading && <span className="animate-pulse">Consultando...</span>}
          </div>

          {/* Suggestions List */}
          {suggestions.length > 0 ? (
            <div className="p-1 space-y-1">
              {suggestions.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const isSire = item.gender === 'MACHO';

                return (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#211A0E] to-[#120F09] border border-[#D4AF37]/70 text-white'
                        : 'hover:bg-neutral-900 border border-transparent text-neutral-300'
                    }`}
                  >
                    {/* Dog Avatar / Thumbnail */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#D4AF37]/50 shrink-0 shadow"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSire
                            ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <Dna className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-xs font-bold text-white truncate block font-serif-luxury">
                          {highlightMatch(item.name, value)}
                        </strong>

                        <span
                          className={`text-[8.5px] font-mono font-bold uppercase px-1 rounded shrink-0 border ${
                            isSire
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {item.gender}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono truncate">
                        <span className="text-[#FFE885] font-bold">
                          REG: {highlightMatch(item.regNumber, value)}
                        </span>
                        <span>•</span>
                        <span className="truncate">{item.breed}</span>
                      </div>

                      {item.color && (
                        <div className="text-[9px] text-neutral-400 truncate mt-0.5">
                          Capa: <span className="text-neutral-300">{item.color}</span>
                        </div>
                      )}

                      {/* Display Parents if known in Supabase (accelerates genogram construction) */}
                      {(item.sire || item.dam) && (
                        <div className="mt-1 pt-1 border-t border-neutral-800/80 flex items-center gap-2 text-[9px] text-neutral-400 font-mono">
                          <span className="text-neutral-500">Padres:</span>
                          {item.sire && (
                            <span className="text-blue-300 truncate">
                              P: {item.sire}
                            </span>
                          )}
                          {item.dam && (
                            <span className="text-rose-300 truncate">
                              M: {item.dam}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#D4AF37] opacity-60 self-center shrink-0" />
                  </button>
                );
              })}
            </div>
          ) : !isLoading && value.trim().length >= 2 ? (
            <div className="p-4 text-center text-xs text-neutral-400 space-y-1">
              <Info className="w-4 h-4 text-[#D4AF37] mx-auto opacity-70" />
              <p>No se encontraron ancestros registrados para "{value}".</p>
              <p className="text-[10px] text-neutral-500">
                Puedes continuar escribiendo para registrar un nuevo ejemplar o fundador F1.
              </p>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-neutral-500">
              Escribe al menos 2 letras para consultar los 1,219 perros de Supabase...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
