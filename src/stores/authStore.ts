
import { create } from 'zustand';
import { logger } from '@/utils/logger';
import type { User } from 'firebase/auth';
import { collection, Timestamp, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase';
import { db as localDb } from '@/db/database';
import { useGlobalStore } from '@/stores/globalStore';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import type { CollectionName, Rapportino } from '@/models/definitions';

// Funzione di utilità per la conversione sicura di timestamp a Date
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

// Processa i rapportini per garantire la coerenza dei dati
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
        delete cleanData.dataInizio; // Rimuove campo legacy se presente

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
  runInitialSync: () => Promise<void>; // DEVE essere una Promise
  logout: () => void;
}

// Sincronizza una singola collezione da Firestore a Dexie
const syncCollection = async (config: { name: CollectionName; table: any; processor?: (docs: any[]) => any[] }) => {
    const snapshot = await getDocs(collection(firestoreDb, config.name));
    if (snapshot.empty) return;
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const dataToStore = config.processor ? config.processor(docs) : docs;
    if (dataToStore.length > 0) {
        await config.table.bulkPut(dataToStore);
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
    logger.log(`AuthStore: setAuthLoading -> ${loading}`);
    set({ authLoading: loading });
  },

  setUserAndProfile: async (user, profile, isAdmin) => {
    const currentUser = get().user;
    if (user && currentUser?.uid !== user.uid) {
        logger.log(`AuthStore: Nuovo utente (uid: ${user.uid}), isAdmin: ${isAdmin}.`);
        set({ user, profile, isAdmin });
        await get().runInitialSync(); // Attende la fine della sincronizzazione
    } else if (!user) {
        logger.log(`AuthStore: Utente sloggato.`);
        get().logout(); // Usa l'azione interna per pulire tutto
    } else {
        set({ user, profile, isAdmin }); // Aggiorna i dati per l'utente corrente
    }
  },

  runInitialSync: () => {
    if (syncPromise) {
        logger.log('Sync già in corso. Accodo alla Promise esistente.');
        return syncPromise;
    }

    logger.log('AuthStore: Avvio sincronizzazione dati centralizzata...');
    set({ isSyncing: true });
    useGlobalStore.getState().setAppLoading(true);
    useRapportiniStore.getState().setLoading(true);

    syncPromise = (async () => {
        try {
            const allPromises = [
                ...collectionConfig.anagrafiche.map(syncCollection),
                syncCollection(collectionConfig.rapportini),
                syncCollection(collectionConfig.checkins),
                syncCollection(collectionConfig.documenti),
            ];
            await Promise.all(allPromises);
            logger.log('*** SYNC FIRESTORE -> DEXIE COMPLETATO ***');

            // Popola lo store Zustand dai dati appena salvati su Dexie
            const anagraficheData = {
                tecnici: await localDb.tecnici.toArray(),
                clienti: await localDb.clienti.toArray(),
                ditte: await localDb.ditte.toArray(),
                navi: await localDb.navi.toArray(),
                luoghi: await localDb.luoghi.toArray(),
                categorie: await localDb.categorie.toArray(),
                tipiGiornata: await localDb.tipiGiornata.toArray(),
                veicoli: await localDb.veicoli.toArray(),
            };
            const rapportini = await localDb.rapportini.toArray();
            useRapportiniStore.getState().setData({ ...anagraficheData, rapportini });
            logger.log('*** HYDRATION DEXIE -> ZUSTAND COMPLETATO ***');

            useGlobalStore.getState().setLastSync(new Date());

        } catch (error) {
            logger.error('ERRORE CRITICO durante la sincronizzazione centralizzata.', error);
        } finally {
            set({ isSyncing: false });
            useGlobalStore.getState().setAppLoading(false);
            useRapportiniStore.getState().setLoading(false);
            logger.log('AuthStore: Fine ciclo di sincronizzazione centralizzata.');
            syncPromise = null;
        }
    })();

    return syncPromise;
  },

  logout: () => {
    logger.log(`AuthStore: Eseguo logout completo e pulizia dati.`);
    set({ user: null, profile: null, isAdmin: false, isSyncing: false, authLoading: false });
    useRapportiniStore.getState().setLoading(false); // Ferma il loading allo sloggarsi
    
    const tablesToClear = [
      ...collectionConfig.anagrafiche.map(c => c.table),
      collectionConfig.rapportini.table,
      collectionConfig.checkins.table,
      collectionConfig.documenti.table,
    ];

    const cleanupPromises = tablesToClear.map(table => {
      if (!table || typeof table.clear !== 'function') {
        logger.warn("Tentativo di pulire una tabella non valida o inesistente.", table);
        return Promise.resolve();
      }
      return table.clear();
    });

    Promise.all(cleanupPromises).then(() => {
        logger.log('Tabelle Dexie svuotate con successo.');
    }).catch(err => {
        logger.error('Errore durante la pulizia di Dexie al logout:', err);
    });
  },
}));

export { useAuthStore };
