import { create } from 'zustand';
import { logger } from '@/utils/logger';
import { db } from '@/db/database';
import { getDocs, collection } from 'firebase/firestore';
import { db as firestoreDb } from '@/config/firebase';
import type { User } from 'firebase/auth';
import type { GlobalState, GlobalActions, NotificationType, DialogState, CollectionName, Rapportino } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

// --- UTILITIES ---
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
        { name: 'tecnici' as CollectionName, table: db.tecnici },
        { name: 'clienti' as CollectionName, table: db.clienti },
        { name: 'ditte' as CollectionName, table: db.ditte },
        { name: 'navi' as CollectionName, table: db.navi },
        { name: 'luoghi' as CollectionName, table: db.luoghi },
        { name: 'categorie' as CollectionName, table: db.categorie },
        { name: 'tipi_giornata' as CollectionName, table: db.tipiGiornata },
        { name: 'veicoli' as CollectionName, table: db.veicoli },
    ],
    rapportini: { name: 'rapportini' as CollectionName, table: db.rapportini, processor: processRapportini },
    checkins: { name: 'checkin_giornalieri' as CollectionName, table: db.checkins },
    documenti: { name: 'scadenze' as CollectionName, table: db.documenti },
};


// --- STORE ---
const useGlobalStore = create<GlobalState & GlobalActions>((set, get) => ({
  // STATO
  appLoading: true,
  authLoading: true,
  isSyncing: false,
  lastSync: null,
  isSidebarOpen: true,
  user: null,
  profile: null,
  isAdmin: false,
  notification: { message: '', type: 'info', open: false },
  dialog: { open: false, title: '', message: '' },

  // AZIONI
  setAppLoading: (loading) => set({ appLoading: loading }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  setLastSync: (syncDate) => set({ lastSync: syncDate }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  showNotification: (message, type: NotificationType = 'info') => {
    set({ notification: { message, type, open: true } });
    setTimeout(() => get().hideNotification(), 4000);
  },
  hideNotification: () => set({ notification: { message: '', type: 'info', open: false } }),
  showDialog: (options: Omit<DialogState, 'open'>) => set({ dialog: { ...options, open: true } }),
  hideDialog: () => set({ dialog: { open: false, title: '', message: '' } }),
  
  setUserAndProfile: async (user, profile, isAdmin) => {
    const currentUser = get().user;
    if (user && currentUser?.uid !== user.uid) {
        logger.log(`GlobalStore: Nuovo utente (uid: ${user.uid}), isAdmin: ${isAdmin}. Avvio sync.`);
        set({ user, profile, isAdmin, isSyncing: true });
        await get().runInitialSync();
    } else if (!user) {
        logger.log(`GlobalStore: Utente sloggato.`);
        set({ user: null, profile: null, isAdmin: false });
    } else {
        set({ user, profile, isAdmin });
    }
  },

  runInitialSync: async () => {
    if (get().isSyncing) return;
    logger.log('GlobalStore: Avvio sincronizzazione dati...');
    set({ isSyncing: true, appLoading: true });

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
        set({ lastSync: new Date() });

    } catch (error) {
        logger.error('ERRORE CRITICO durante la sincronizzazione.', error);
    } finally {
        set({ isSyncing: false, appLoading: false });
        logger.log('GlobalStore: Fine ciclo di sincronizzazione.');
    }
  },

  logout: () => {
    logger.log(`GlobalStore: logout`);
    set({ user: null, profile: null, isAdmin: false, isSyncing: false });
    Object.values(collectionConfig.anagrafiche).forEach(c => c.table.clear());
    collectionConfig.rapportini.table.clear();
    collectionConfig.checkins.table.clear();
    collectionConfig.documenti.table.clear();
  },
}));

export { useGlobalStore };
