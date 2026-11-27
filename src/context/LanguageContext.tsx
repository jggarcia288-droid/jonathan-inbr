import React, { createContext, useContext, useState, useEffect } from 'react';
import esTranslations from '../../locales/es.json';
import enTranslations from '../../locales/en.json';
import ptTranslations from '../../locales/pt.json';

export type SupportedLocale = 'es' | 'en' | 'pt';

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const translations: Record<SupportedLocale, any> = {
  es: esTranslations,
  en: enTranslations,
  pt: ptTranslations,
};

export const LANGUAGES: { code: SupportedLocale; name: string; flag: string; label: string }[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸', label: 'ES' },
  { code: 'en', name: 'English', flag: '🇺🇸', label: 'EN' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', label: 'PT' },
];

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inbr_lang') as SupportedLocale;
      if (saved && (saved === 'es' || saved === 'en' || saved === 'pt')) {
        return saved;
      }
    }
    return 'es';
  });

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inbr_lang', newLocale);
      document.documentElement.lang = newLocale;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = translations[locale];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to Spanish if key not found in current locale
        let fallbackResult: any = translations.es;
        for (const fk of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && fk in fallbackResult) {
            fallbackResult = fallbackResult[fk];
          } else {
            fallbackResult = undefined;
            break;
          }
        }
        result = fallbackResult !== undefined ? fallbackResult : key;
        break;
      }
    }

    if (typeof result !== 'string') {
      return key;
    }

    if (replacements) {
      let text = result;
      for (const [rKey, rVal] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`\\{${rKey}\\}`, 'g'), String(rVal));
      }
      return text;
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
