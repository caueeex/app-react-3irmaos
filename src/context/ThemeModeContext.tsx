import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider } from 'styled-components/native';
import {
  darkTheme,
  lightTheme,
  type AppTheme,
  type ThemeMode,
} from '../styles/theme';

const STORAGE_KEY = '@tres_irmaos/theme-mode';

export type { ThemeMode };

type ThemeModeContextValue = {
  mode: ThemeMode;
  theme: AppTheme;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(
  undefined,
);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      void AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(
    (): AppTheme =>
      mode === 'dark' ? darkTheme : (lightTheme as unknown as AppTheme),
    [mode],
  );

  const value = useMemo(
    () => ({
      mode,
      theme,
      setMode,
      toggleMode,
    }),
    [mode, theme, setMode, toggleMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return ctx;
}
