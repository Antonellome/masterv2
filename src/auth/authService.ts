
import {
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { firestoreService } from '@/services/firestoreService';

export const authService = {
    /**
     * Esegue il login manuale basandosi ESCLUSIVAMENTE sul custom claim 'admin'.
     * Impedisce l'accesso a chiunque non sia amministratore.
     */
    login: async (email: string, pass: string) => {
        console.log("[AuthService] Inizio login manuale basato su permessi ADMIN...");
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            if (!user) {
                throw new Error("Credenziali non valide.");
            }

            // 1. FORZIAMO L'AGGIORNAMENTO DEL TOKEN PER LEGGERE I PERMESSI
            console.log("[AuthService] Verifico i permessi dell'utente...");
            const idTokenResult = await user.getIdTokenResult(true); // true = forza refresh

            // 2. REGOLA DI ACCESSO INAPPELLABILE
            const isAdmin = idTokenResult.claims.admin === true;

            if (isAdmin) {
                // 3. SUCCESSO: L'utente è un admin
                console.log("[AuthService] Accesso consentito: l'utente è un AMMINISTRATORE.");
                // Il profilo tecnico non viene cercato né richiesto.
                // Le altre modifiche (authHooks, globalStore) gestiranno lo stato.
                useGlobalStore.getState().setUserAndProfile(user, null); // Passiamo null per il profilo
                useGlobalStore.getState().setAdminStatus(true);
            } else {
                // 4. FALLIMENTO: L'utente non è un admin, ACCESSO NEGATO.
                console.warn("[AuthService] ACCESSO NEGATO: l'utente non è un amministratore.");
                await signOut(auth);
                useGlobalStore.getState().logout();
                throw new Error("Accesso negato: solo gli amministratori possono entrare.");
            }
        } catch (error) {
            console.error("[AuthService] Errore durante il login manuale:", error);
            await signOut(auth); // Assicura che l'utente sia disconnesso in caso di qualsiasi errore
            useGlobalStore.getState().logout();
            // Rilanciamo l'errore per mostrarlo nella UI (es. "Credenziali errate" o "Accesso negato")
            throw error;
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
