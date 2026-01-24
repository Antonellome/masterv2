import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from '../theme/theme'; // <-- 1. IMPORTO IL TEMA

// Impedisce allo splash screen di nascondersi automaticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // 2. APPLICO IL TEMA AL PROVIDER
    <PaperProvider theme={paperTheme}> 
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </PaperProvider>
  );
}

function MainLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Nasconde lo splash screen una volta che abbiamo lo stato di auth
      SplashScreen.hideAsync();
      
      if (user) {
        // Se l'utente è loggato, reindirizza alla home dell'app
        router.replace('/(app)/home');
      } else {
        // Se l'utente non è loggato, reindirizza alla pagina di login
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading]);

  // Mostra uno stack diverso a seconda dello stato di autenticazione
  return (
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
  );
}