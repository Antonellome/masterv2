
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
    // Estrae solo le azioni necessarie, lo stato verrà gestito internamente
    const { setUserAndProfile, logout, setAuthLoading } = useAuthStore.getState();
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
                        // Chiamata UNIFICATA: passa utente e permessi INSIEME
                        await setUserAndProfile(user, null, true);
                    } else {
                        logger.warn("[AuthInitializer] L'utente non è admin. Logout forzato.");
                        await authService.logout(); 
                        await setUserAndProfile(null, null, false);
                    }

                } catch (error) {
                    logger.error("[AuthInitializer] Errore critico durante la verifica dei permessi:", error);
                    await authService.logout();
                    await setUserAndProfile(null, null, false);
                }

            } else {
                logger.log("[AuthInitializer] Nessun utente Firebase. Stato pulito.");
                await setUserAndProfile(null, null, false);
            }
            
            setAuthLoading(false);
            setAppLoading(false);
        });

        return () => {
            logger.log("[AuthInitializer] Unsubscribe dal listener di auth state.");
            unsubscribe();
        };
        
    }, []);
};
