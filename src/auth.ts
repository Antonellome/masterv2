
import { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import type { Tecnico } from '@/models/definitions';

let unsubscribeProfile: (() => void) | null = null;

/**
 * Hook per inizializzare e gestire lo stato di autenticazione dell'utente.
 * Ascolta i cambiamenti di stato di Firebase Auth e aggiorna lo store globale (Zustand).
 * Quando un utente si autentica, recupera il suo profilo dal database e lo mantiene sincronizzato.
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
      // Se c'è già una sottoscrizione attiva per il profilo, la cancello
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        console.log("[Auth] Utente autenticato:", user.uid);
        // L'utente è loggato. Ora recupero e sincronizzo il suo profilo.
        const profileRef = doc(db, 'tecnici', user.uid);

        // Ascolto in tempo reale le modifiche al profilo
        unsubscribeProfile = onSnapshot(profileRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              const profileData = { id: docSnap.id, ...docSnap.data() } as Tecnico;
              console.log("[Auth] Profilo utente caricato/aggiornato:", profileData);
              setUserAndProfile(user, profileData);
            } else {
              // Il profilo non esiste nel DB. L'utente è autenticato ma non autorizzato.
              console.warn(`[Auth] Profilo non trovato per l'utente ${user.uid}. Logout forzato.`);
              setUserAndProfile(user, null); // Imposto il profilo a null
            }
          },
          (error) => {
            console.error("[Auth] Errore durante l'ascolto del profilo:", error);
            logout(); // In caso di errore, effettuo il logout per sicurezza
          }
        );

      } else {
        // L'utente non è loggato.
        console.log("[Auth] Nessun utente autenticato. Eseguo logout.");
        logout();
      }
    });

    // Cleanup: rimuovo i listener quando il componente viene smontato
    return () => {
      console.log("[Auth] Cleanup: rimozione listeners.");
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [setUserAndProfile, setAuthLoading, logout]);
};
