import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightTheme, darkTheme,
  ELEMENT_COLORS, ELEMENT_COLORS_DARK,
} from '../theme';

const ThemeContext = createContext();
const STORAGE_KEY = 'oasis_dark_mode';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v !== null) setIsDark(JSON.parse(v));
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [isDark]);

  const colors = isDark ? darkTheme : lightTheme;
  const elementColors = isDark ? ELEMENT_COLORS_DARK : ELEMENT_COLORS;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, elementColors, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
