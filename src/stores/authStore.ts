
import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { User } from 'firebase/auth';
import { collection, Timestamp, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase'; 
import { db as localDb } from '@/db/database';
import { useGlobalStore } from '@/stores/globalStore';
import type { CollectionName, Rapportino } from '@/models/definitions';

const toDateSafe = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number') {
        try {
            return new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0).toDate();
        } catch (e) { return null; }
    }
    const d = new Date(timestamp);
    return !isNaN(d.getTime()) ? d : null;
};

const processRapportini = (docs: any[]): Rapportino[] => {
    return docs.map(docData => {
        const finalDate = toDateSafe(docData.data) || toDateSafe(docData.dataInizio) || toDateSafe(docData.createdAt);
        if (!finalDate) {
            logger.warn(`Rapportino scartato (ID: ${docData.id}) per mancanza di data valida.`);
            return null;
        }
        const createdAtDate = toDateSafe(docData.createdAt) || finalDate;
        const updatedAtDate = toDateSafe(docData.updatedAt) || createdAtDate;
        const cleanData: any = { ...docData };
        delete cleanData.dataInizio;

        return {
            ...cleanData,
            id: docData.id,
            data: finalDate,
            createdAt: createdAtDate,
            updatedAt: updatedAtDate,
            dettaglioOreTecnici: Array.isArray(cleanData.dettaglioOreTecnici) ? cleanData.dettaglioOreTecnici : [],
        } as Rapportino;
    }).filter((r): r is Rapportino => r !== null);
};

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
    rapportini: { name: 'rapportini' as CollectionName, table: localDb.rapportini, processor: processRapportini },
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

const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  authLoading: true,
  isSyncing: false,

  setAuthLoading: (loading) => {
    logger.log(`AuthStore: setAuthLoading -> ${loading}`);
    set({ authLoading: loading });
  },

  setUserAndProfile: async (user, profile, isAdmin) => {
    const currentUser = get().user;
    // Se l'utente è nuovo o diverso, avvia la sincronizzazione
    if (user && currentUser?.uid !== user.uid) {
        logger.log(`AuthStore: Nuovo utente (uid: ${user.uid}), isAdmin: ${isAdmin}. Avvio sync.`);
        set({ user, profile, isAdmin, isSyncing: true });
        await get().runInitialSync();
    } else if (!user) {
        logger.log(`AuthStore: Utente sloggato.`);
        set({ user: null, profile: null, isAdmin: false });
    } else {
        // Aggiorna lo stato anche se l'utente è lo stesso (es. refresh dei permessi)
        set({ user, profile, isAdmin });
    }
  },

  runInitialSync: async () => {
    if (get().isSyncing) {
        logger.log('Sync già in corso. Salto.');
        return;
    }
    logger.log('AuthStore: Avvio sincronizzazione dati...');
    set({ isSyncing: true });
    useGlobalStore.getState().setAppLoading(true);

    try {
        const syncCollection = async (config: { name: CollectionName; table: any; processor?: (docs: any[]) => any[] }) => {
            const snapshot = await getDocs(collection(firestoreDb, config.name));
            if (snapshot.empty) return;
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const dataToStore = config.processor ? config.processor(docs) : docs;
            if (dataToStore.length > 0) {
                await config.table.bulkPut(dataToStore);
            }
        };

        const allPromises = [
            ...collectionConfig.anagrafiche.map(syncCollection),
            syncCollection(collectionConfig.rapportini),
            syncCollection(collectionConfig.checkins),
            syncCollection(collectionConfig.documenti),
        ];

        await Promise.all(allPromises);
        logger.log('*** Sincronizzazione dati COMPLETATA con successo. ***');
        useGlobalStore.getState().setLastSync(new Date());

    } catch (error) {
        logger.error('ERRORE CRITICO durante la sincronizzazione.', error);
    } finally {
        set({ isSyncing: false });
        useGlobalStore.getState().setAppLoading(false);
        logger.log('AuthStore: Fine ciclo di sincronizzazione.');
    }
  },

  logout: () => {
    logger.log(`AuthStore: logout`);
    set({ user: null, profile: null, isAdmin: false, isSyncing: false });
    // Pulisci i dati locali al logout
    Object.values(collectionConfig.anagrafiche).forEach(c => c.table.clear());
    collectionConfig.rapportini.table.clear();
    collectionConfig.checkins.table.clear();
    collectionConfig.documenti.table.clear();
  },
}));

export { useAuthStore };
