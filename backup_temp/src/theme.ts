import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const getInitialMode = () => {
  if (typeof window !== 'undefined') {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  }
  return 'light';
};

const getTheme = (mode: 'light' | 'dark') => {
  let theme = createTheme({
    unstable_shouldUseGrid: true, // Re-enabling Grid v2
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light Mode Palette
            primary: {
              main: '#1976d2', // Blu elettrico
              light: '#63a4ff',
              dark: '#004ba0',
            },
            secondary: {
              main: '#ffab40', // Un arancione ambrato
              light: '#ffdd71',
              dark: '#c77c02',
            },
            background: {
              default: '#f5f5f5', // Grigio molto chiaro
              paper: '#ffffff',
            },
            text: {
                primary: 'rgba(0, 0, 0, 0.87)',
                secondary: '#0d47a1', // Blu scuro
            }
          }
        : {
            // Dark Mode Palette
            primary: {
              main: '#1976d2', // Blu elettrico
              light: '#63a4ff',
              dark: '#004ba0',
            },
            secondary: {
                main: '#ffd180', // Ambrato chiaro
                light: '#ffffb1',
                dark: '#ca9f52',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
                primary: '#ffffff',
                secondary: '#64b5f6', // Blu chiaro
            }
          }),
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '2.5rem', fontWeight: 500 },
      h6: { fontWeight: 600 },
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: 12,
                    boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.primary.main : 'transparent'}`,
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 20px 0 rgba(0,0,0,0.12)',
                    }
                })
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                }
            }
        }
    }
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export { getInitialMode, getTheme };
