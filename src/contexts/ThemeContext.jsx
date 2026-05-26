import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

// Hub is permanently branded light (mostly white). Remove the dark mode entirely.
export function ThemeProvider({ children }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', themeMode: 'light', setThemeMode: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
