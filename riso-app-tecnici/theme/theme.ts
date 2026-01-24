import { DefaultTheme } from 'react-native-paper';

// Palette di colori ispirata a un design tech/professionale
export const AppColors = {
  // Colori di base
  primary: '#007AFF',      // Un blu vibrante e standard per le azioni principali
  accent: '#FF9500',       // Un arancione per enfasi o azioni secondarie
  white: '#FFFFFF',
  black: '#000000',

  // Sfumature di grigio per sfondi e testo
  background: '#121212',   // Sfondo quasi nero per la modalità scura
  surface: '#1E1E1E',       // Superficie per card e modali, leggermente più chiara
  border: '#2D2D2D',        // Bordi sottili per separatori o contorni
  text: '#FFFFFF',          // Testo principale bianco per alto contrasto
  placeholder: '#8E8E93', // Testo segnaposto grigio medio
  error: '#FF3B30',         // Rosso per errori e azioni distruttive
};

// Creazione del tema per React Native Paper
export const paperTheme = {
  ...DefaultTheme,
  dark: true, // Tema scuro di base
  mode: 'adaptive', // Permette a Paper di adattarsi, ma forziamo il dark
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.primary,
    accent: AppColors.accent,
    background: AppColors.background,
    surface: AppColors.surface,
    text: AppColors.text,
    placeholder: AppColors.placeholder,
    error: AppColors.error,
    onSurface: AppColors.text, // Colore del testo sopra le superfici
    notification: AppColors.accent, // Usato per badge o notifiche
  },
  // Aggiungiamo qui eventuali altre personalizzazioni (fonts, rotondità, etc.)
  roundness: 8, // Bordi leggermente arrotondati per un look moderno
};
