
import { useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { authService } from './authService';

/**
 * Hook per inizializzare e sincronizzare lo stato di autenticazione.
 * Applica una regola di accesso rigida: solo gli amministratori possono procedere.
 */
export const useAuthInitializer = () => {
    const { setUserAndProfile, logout, setAuthLoading, setAdminStatus } = useGlobalStore();

    useEffect(() => {
        setAuthLoading(true);

        const unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const idTokenResult = await user.getIdTokenResult(true); // Forza refresh
                    const isAdmin = idTokenResult.claims.admin === true;
                    setAdminStatus(isAdmin);

                    if (isAdmin) {
                        setUserAndProfile(user, null);
                    } else {
                        await authService.logout(); // Esegue il logout da Firebase e pulisce lo store
                    }

                } catch (error) {
                    console.error("[AuthInitializer] Errore critico durante l'inizializzazione auth:", error);
                    await authService.logout();
                }

            } else {
                logout(); // Assicura che lo stato sia pulito se non c'è utente
            }
            
            setAuthLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [setUserAndProfile, logout, setAuthLoading, setAdminStatus]);
};
