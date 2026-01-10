import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { getTheme } from '@/theme';

// Funzione per determinare la modalità iniziale del tema
const getInitialMode = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return 'light'; // Default per SSR o ambienti non-browser
};


type ThemeContextType = {
  toggleTheme: () => void;
  mode: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialMode);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', newMode);
      }
      return newMode;
    });
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  const contextValue = useMemo(() => ({ toggleTheme, mode }), [mode, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

export { ThemeContext };
