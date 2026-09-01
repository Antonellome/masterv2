
import {
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '@/firebase-config'; 
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

export const authService = {
    /**
     * Esegue il login dell'utente.
     * La logica di controllo permessi e aggiornamento dello stato è DEMANDATA
     * all'hook useAuthInitializer che ascolta l'evento onAuthStateChanged.
     */
    login: async (email: string, pass: string) => {
        logger.log("[AuthService] Tentativo di login...");
        try {
            // Si limita a eseguire il sign-in. La gestione dello stato utente, 
            // dei claims e dei profili è demandata centralmente all'hook useAuthInitializer.
            await signInWithEmailAndPassword(auth, email, pass);
            logger.log("[AuthService] signInWithEmailAndPassword completato. In attesa del listener onAuthStateChanged.");
        } catch (error) {
            logger.error("[AuthService] Errore durante signInWithEmailAndPassword:", error);
            // Rilanciamo l'errore per gestirlo nella UI (es. notifica "credenziali errate").
            throw error;
        }
    },

    /**
     * Esegue il logout dell'utente.
     */
    logout: async () => {
        try {
            await signOut(auth);
            // La pulizia dello stato Zustand viene ora gestita centralmente dal listener
            // onAuthStateChanged in useAuthInitializer, che rileverà l'assenza di un utente.
            logger.log("[AuthService] Logout completato.");
        } catch (error) {
            logger.error("[AuthService] Errore durante il logout:", error);
            throw error;
        }
    },

    /**
     * Fornisce un wrapper attorno a onAuthStateChanged di Firebase.
     * Usato dall'hook di inizializzazione.
     */
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return onAuthStateChanged(auth, callback);
    }
}; 
