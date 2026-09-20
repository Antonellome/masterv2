
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGlobalStore } from '@/stores/globalStore';
import { authService } from './authService';
import { logger } from '@/utils/logger';

/**
 * Hook per inizializzare e sincronizzare lo stato di autenticazione.
 * Applica una regola di accesso rigida: solo gli amministratori possono procedere.
 */
export const useAuthInitializer = () => {
    const { setUserAndProfile, setAuthLoading } = useAuthStore.getState();
    const { setAppLoading } = useGlobalStore.getState();

    useEffect(() => {
        logger.log("[AuthInitializer] Inizio controllo stato autenticazione...");
        setAuthLoading(true);

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                logger.log("[AuthInitializer] Utente Firebase rilevato:", user.uid);
                try {
                    const idTokenResult = await user.getIdTokenResult(true);
                    const isAdmin = idTokenResult.claims.admin === true;
                    logger.log(`[AuthInitializer] L'utente è admin? ${isAdmin}`);

                    if (isAdmin) {
                        await setUserAndProfile(user, null, true);
                    } else {
                        logger.warn("[AuthInitializer] L'utente non è admin. Logout forzato.");
                        await authService.logout();
                        await setUserAndProfile(null, null, false);
                        setAppLoading(false); // Sblocca l'app per mostrare AccessDenied
                    }

                } catch (error) {
                    logger.error("[AuthInitializer] Errore critico durante la verifica dei permessi:", error);
                    await authService.logout();
                    await setUserAndProfile(null, null, false);
                    setAppLoading(false); // Sblocca l'app per mostrare l'errore
                }

            } else {
                logger.log("[AuthInitializer] Nessun utente Firebase. Stato pulito.");
                await setUserAndProfile(null, null, false);
                setAppLoading(false); // Sblocca l'app per mostrare la pagina di login
            }
            
            setAuthLoading(false);
        });

        return () => {
            logger.log("[AuthInitializer] Unsubscribe dal listener di auth state.");
            unsubscribe();
        };
        
    }, []);
};
