import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import ar from './ar.json';
import en from './en.json';

const TRANSLATIONS = { ar, en };

const LanguageContext = createContext({
  lang: 'ar',
  t: (key) => key,
  setLang: () => {},
  isRTL: true,
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('app_lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const applyDirection = (l) => {
    const dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = l;
    document.body.style.fontFamily = l === 'ar'
      ? "'Segoe UI', Tahoma, 'Arabic Typesetting', sans-serif"
      : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  };

  useEffect(() => {
    applyDirection(lang);
  }, [lang]);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('app_lang', newLang);
    applyDirection(newLang);
  };

  const t = useCallback((key, params) => {
    const dict = TRANSLATIONS[lang];
    const fallback = TRANSLATIONS[lang === 'ar' ? 'en' : 'ar'];
    let str = dict?.[key] ?? fallback?.[key] ?? key;
    if (params && typeof str === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
export default LanguageContext;
