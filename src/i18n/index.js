import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ja from './ja';
import en from './en';
import ko from './ko';

const translations = { ja, en, ko };
const STORAGE_KEY = 'oasis_language';

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('ja');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v) setLang(v);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const switchLang = useCallback(async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  const t = useCallback((key, params) => {
    let text = translations[lang]?.[key] || translations.ja[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, switchLang, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LANGUAGES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
];
