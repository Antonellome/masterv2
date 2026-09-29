
import { create } from 'zustand';
import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useGlobalStore } from './globalStore';

interface AuthState {
    user: User | null;
    profile: any | null; 
    isAdmin: boolean;
    authLoading: boolean;
    setAuthLoading: (loading: boolean) => void; // REINTRODOTTA LA FUNZIONE MANCANTE
    setUserAndProfile: (user: User | null) => Promise<void>;
    logout: () => void;
}

const clearLocalData = async () => {
    try {
        useGlobalStore.getState().logout();
        logger.log("Dati locali cancellati tramite globalStore.");
    } catch (error) {
        logger.error("Errore durante la pulizia dei dati locali:", error);
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isAdmin: false,
    authLoading: true,

    setAuthLoading: (loading) => set({ authLoading: loading }), // REINTRODOTTA L'IMPLEMENTAZIONE

    setUserAndProfile: async (user) => {
        if (user) {
            set({ authLoading: true });
            try {
                const profileRef = doc(firestoreDb, 'admins', user.uid);
                const profileSnap = await getDoc(profileRef);

                if (profileSnap.exists()) {
                    const profileData = profileSnap.data();
                    set({ user, profile: profileData, isAdmin: true, authLoading: false });

                    logger.log(`AuthStore: Utente admin valido. Si notifica a globalStore di avviare il sync.`);
                    await useGlobalStore.getState().runInitialSync();

                } else {
                    set({ user, profile: null, isAdmin: false, authLoading: false });
                    await clearLocalData(); 
                }
            } catch (error) { 
                logger.error("Errore nel recuperare il profilo utente:", error);
                set({ user: null, profile: null, isAdmin: false, authLoading: false });
                await clearLocalAta();
            }
        } else { 
            set({ user: null, profile: null, isAdmin: false, authLoading: false });
            await clearLocalData();
        }
    },

    logout: () => {
        logger.log("AuthStore: Eseguo il logout.");
        set({ user: null, profile: null, isAdmin: false, authLoading: false });
        clearLocalData();
    },
}));
