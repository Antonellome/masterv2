
import { useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { authService } from './authService';
import { firestoreService } from '@/services/firestoreService';

/**
 * Hook per inizializzare e sincronizzare lo stato di autenticazione.
 * Applica una regola di accesso rigida: solo gli amministratori possono procedere.
 */
export const useAuthInitializer = () => {
    const { setUserAndProfile, logout, setAuthLoading, setAdminStatus } = useGlobalStore();

    useEffect(() => {
        console.log("[AuthInitializer] Hook montato. Inizio ascolto auth con policy ADMIN-ONLY.");
        setAuthLoading(true);

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log(`[AuthInitializer] Firebase Auth ha rilevato un utente: ${user.uid}`);
                try {
                    // 1. Leggi i custom claims per i permessi
                    console.log("[AuthInitializer] Refresh token per custom claims...");
                    const idTokenResult = await user.getIdTokenResult(true); // Forza refresh
                    const isAdmin = idTokenResult.claims.admin === true;
                    console.log(`[AuthInitializer] Claim 'admin' rilevato: ${isAdmin}`);
                    setAdminStatus(isAdmin);

                    // 2. REGOLA DI ACCESSO FERREA
                    if (isAdmin) {
                        // 2.1. L'utente è un admin: procedi
                        console.log("[AuthInitializer] ACCESSO CONSENTITO. L'utente è un admin.");
                        const profile = await firestoreService.fetchUserProfile(user.uid);
                        setUserAndProfile(user, profile);
                    } else {
                        // 2.2. L'utente NON è un admin: espulsione immediata
                        console.warn("[AuthInitializer] ACCESSO NEGATO. L'utente non è un admin. Logout forzato.");
                        await authService.logout(); // Esegue il logout da Firebase e pulisce lo store
                    }

                } catch (error) {
                    console.error("[AuthInitializer] Errore critico durante l'inizializzazione auth:", error);
                    await authService.logout();
                }

            } else {
                console.log("[AuthInitializer] Nessun utente rilevato. Stato pulito.");
                logout(); // Assicura che lo stato sia pulito se non c'è utente
            }
            
            // Indipendentemente da tutto, alla fine smettiamo di caricare
            setAuthLoading(false);
        });

        return () => {
            console.log("[AuthInitializer] Hook smontato. Rimuovo listener auth.");
            unsubscribe();
        };
    }, [setUserAndProfile, logout, setAuthLoading, setAdminStatus]);
};
