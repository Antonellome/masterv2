
import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase';
import { db as localDb } from '@/db/database';
import { useGlobalStore } from '@/stores/globalStore';
import type { CollectionName } from '@/models/definitions';

// Configurazione centralizzata delle collezioni e tabelle locali
const collectionConfig = {
    anagrafiche: [
        { name: 'tecnici' as CollectionName, table: localDb.tecnici },
        { name: 'clienti' as CollectionName, table: localDb.clienti },
        { name: 'ditte' as CollectionName, table: localDb.ditte },
        { name: 'navi' as CollectionName, table: localDb.navi },
        { name: 'luoghi' as CollectionName, table: localDb.luoghi },
        { name: 'categorie' as CollectionName, table: localDb.categorie },
        { name: 'tipi_giornata' as CollectionName, table: localDb.tipiGiornata },
        { name: 'veicoli' as CollectionName, table: localDb.veicoli },
    ],
    rapportini: { name: 'rapportini' as CollectionName, table: localDb.rapportini },
    checkins: { name: 'checkin_giornalieri' as CollectionName, table: localDb.checkins },
    documenti: { name: 'scadenze' as CollectionName, table: localDb.documenti },
};

interface AuthState {
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  authLoading: boolean;
  isSyncing: boolean;
}

interface AuthActions {
  setUserAndProfile: (user: User | null, profile: any | null, isAdmin: boolean) => Promise<void>;
  setAuthLoading: (loading: boolean) => void;
  runInitialSync: () => Promise<void>;
  logout: () => void;
}

// Sincronizza una singola collezione da Firestore a Dexie
const syncCollection = async (config: { name: CollectionName; table: any; }) => {
    try {
        const snapshot = await getDocs(collection(firestoreDb, config.name));
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (docs.length > 0) {
            await config.table.bulkPut(docs);
        }
        logger.log(`Sync completato per ${config.name}: ${docs.length} documenti.`);
    } catch (error) {
        logger.error(`Errore durante la sincronizzazione di ${config.name}:`, error);
        throw error; // Rilancia l'errore per essere gestito da Promise.all
    }
};

let syncPromise: Promise<void> | null = null;

const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  authLoading: true,
  isSyncing: false,

  setAuthLoading: (loading) => {
    set({ authLoading: loading });
  },

  setUserAndProfile: async (user, profile, isAdmin) => {
    const currentUser = get().user;
    const needsSync = user && !currentUser;

    set({ user, profile, isAdmin });

    if (needsSync) {
      logger.log(`AuthStore: Nuovo utente (uid: ${user.uid}), isAdmin: ${isAdmin}. Avvio SINCRONIZZAZIONE INIZIALE.`);
      await get().runInitialSync();
    }
  },

  runInitialSync: () => {
    if (syncPromise) {
        logger.log('Sync già in corso. Mi accodo alla Promise esistente.');
        return syncPromise;
    }

    logger.log('AuthStore: Avvio sincronizzazione dati centralizzata...');
    set({ isSyncing: true });
    useGlobalStore.getState().setAppLoading(true);

    syncPromise = (async () => {
        try {
            const allPromises = [
                ...collectionConfig.anagrafiche.map(syncCollection),
                syncCollection(collectionConfig.rapportini),
                syncCollection(collectionConfig.checkins),
                syncCollection(collectionConfig.documenti),
            ];
            await Promise.all(allPromises);
            logger.log('*** SYNC COMPLETO: Firestore -> Dexie ***');
            useGlobalStore.getState().setLastSync(new Date());
        } catch (error) {
            logger.error('ERRORE CRITICO durante la sincronizzazione centralizzata.', error);
        } finally {
            set({ isSyncing: false });
            useGlobalStore.getState().setAppLoading(false);
            logger.log('AuthStore: Fine ciclo di sincronizzazione centralizzata.');
            syncPromise = null;
        }
    })();

    return syncPromise;
  },

  logout: async () => {
    logger.log(`AuthStore: Eseguo logout completo e pulizia dati.`);
    const tablesToClear = [
      ...collectionConfig.anagrafiche.map(c => c.table),
      collectionConfig.rapportini.table,
      collectionConfig.checkins.table,
      collectionConfig.documenti.table,
    ];
    try {
        await Promise.all(tablesToClear.map(table => table.clear()));
        logger.log('Tabelle Dexie svuotate con successo.');
    } catch (err) {
        logger.error('Errore durante la pulizia di Dexie al logout:', err);
    }
    set({ user: null, profile: null, isAdmin: false, isSyncing: false, authLoading: false });
  },
}));

export { useAuthStore };
