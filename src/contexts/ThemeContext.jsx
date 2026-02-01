import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'greenteam-theme';

function getThemeForTime() {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 20 ? 'light' : 'dark';
}

function resolveTheme(mode) {
  return mode === 'auto' ? getThemeForTime() : mode;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [theme, setTheme] = useState(() => resolveTheme(
    (() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    })()
  ));

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    setTheme(resolveTheme(mode));
  }, []);

  // Re-evaluate auto theme every 60 seconds
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const id = setInterval(() => {
      setTheme(getThemeForTime());
    }, 60_000);
    return () => clearInterval(id);
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
