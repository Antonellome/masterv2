
import { useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { authService } from './authService';
// Importiamo il nostro nuovo servizio!
import { firestoreService } from '@/services/firestoreService';

/**
 * Hook per inizializzare e sincronizzare lo stato di autenticazione dell'utente
 * con lo stato di Firebase Auth all'avvio dell'applicazione.
 */
export const useAuthInitializer = () => {
    // L'hook NON USA PIÙ setUser e clearUser direttamente, ma le azioni corrette
    const { setUserAndProfile, logout, setAuthLoading } = useGlobalStore();

    useEffect(() => {
        console.log("[AuthInitializer] Hook montato. Inizio ascolto auth...");
        setAuthLoading(true);

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log(`[AuthInitializer] Firebase Auth ha rilevato un utente: ${user.uid}`);
                // DELEGA il recupero del profilo al servizio dedicato
                const profile = await firestoreService.fetchUserProfile(user.uid);

                if (profile) {
                    // Usa l'azione corretta per aggiornare lo store
                    setUserAndProfile(user, profile);
                    console.log("[AuthInitializer] Profilo caricato e store aggiornato.");
                } else {
                    // L'utente esiste in Firebase Auth ma non ha un profilo nel DB.
                    // Questo è un errore di consistenza dei dati. Logout forzato.
                    console.warn(`[AuthInitializer] Utente ${user.uid} senza profilo. Logout forzato.`);
                    await authService.logout();
                }
            } else {
                // Nessun utente rilevato da Firebase Auth, assicura che lo store sia pulito.
                console.log("[AuthInitializer] Nessun utente rilevato. Stato pulito.");
                logout();
            }
            setAuthLoading(false);
        });

        // Cleanup: rimuove il listener quando l'app viene chiusa o il componente smontato
        return () => {
            console.log("[AuthInitializer] Hook smontato. Rimuovo listener auth.");
            unsubscribe();
        };
        // Le dipendenze assicurano che l'hook non si riattivi inutilmente
    }, [setUserAndProfile, logout, setAuthLoading]);
};
