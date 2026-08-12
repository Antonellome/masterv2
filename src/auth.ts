import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import type { Tecnico } from '@/models/definitions'; // Useremo Tecnico come tipo base, ma da una collezione diversa

let unsubscribeProfile: (() => void) | null = null;

/**
 * Hook per inizializzare e gestire lo stato di autenticazione dell'utente.
 * Per l'App Master, cerca il profilo nella collezione 'utenti_master'.
 */
export const useAuthInitializer = () => {
  const { setUserAndProfile, setAuthLoading, logout } = useGlobalStore(state => ({
    setUserAndProfile: state.setUserAndProfile,
    setAuthLoading: state.setAuthLoading,
    logout: state.logout,
  }));

  useEffect(() => {
    setAuthLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        console.log("[Auth] Utente Master autenticato:", user.uid);
        
        // --- CORREZIONE CHIAVE: Cerco nella collezione 'utenti_master' --- //
        const profileRef = doc(db, 'utenti_master', user.uid);

        unsubscribeProfile = onSnapshot(profileRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              // Assumiamo che il profilo admin abbia una struttura simile a Tecnico
              const profileData = { id: docSnap.id, ...docSnap.data() } as Tecnico; 
              console.log("[Auth] Profilo Amministratore caricato:", profileData);
              setUserAndProfile(user, profileData);
            } else {
              console.error(`[Auth] Profilo Amministratore NON TROVATO nella collezione 'utenti_master' per l'UID ${user.uid}. Logout forzato.`);
              setUserAndProfile(user, null); // Logout forzato logico
            }
          },
          (error) => {
            console.error("[Auth] Errore durante l'ascolto del profilo admin:", error);
            logout();
          }
        );
      } else {
        console.log("[Auth] Nessun utente autenticato.");
        logout();
      }
    });

    return () => {
      console.log("[Auth] Cleanup: rimozione listeners auth.");
      unsubscribeAuth();
      if (unsubscribeProfile) {
        console.log("[Auth] Cleanup: rimozione listeners profilo.");
        unsubscribeProfile();
      }
    };
  }, [setUserAndProfile, setAuthLoading, logout]);
};
