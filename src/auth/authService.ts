
import {
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useGlobalStore } from '@/stores/globalStore';
// Importiamo il nostro nuovo servizio!
import { firestoreService } from '@/services/firestoreService';

export const authService = {
    /**
     * Esegue il login manuale.
     * Responsabilità: Autenticazione + Coordinamento recupero profilo.
     */
    login: async (email: string, pass: string) => {
        try {
            console.log("[AuthService] Inizio login manuale...");
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;
            
            // DELEGA il recupero del profilo al servizio dedicato
            const profile = await firestoreService.fetchUserProfile(user.uid);

            if (user && profile) {
                useGlobalStore.getState().setUserAndProfile(user, profile);
                console.log("[AuthService] Login manuale completato con successo.");
            } else {
                // Logout forzato se l'utente Auth esiste ma non ha un profilo nel DB
                await signOut(auth);
                useGlobalStore.getState().logout();
                throw new Error("Login fallito: il profilo utente non esiste in Firestore.");
            }
        } catch (error) {
            console.error("[AuthService] Errore durante il login manuale:", error);
            useGlobalStore.getState().logout(); // Assicura pulizia stato
            throw error; // Rilancia per la UI
        }
    },

    /**
     * Esegue il logout dell'utente.
     */
    logout: async () => {
        try {
            await signOut(auth);
            useGlobalStore.getState().logout();
            console.log("[AuthService] Logout completato.");
        } catch (error) {
            console.error("[AuthService] Errore durante il logout:", error);
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
