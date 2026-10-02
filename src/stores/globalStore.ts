
import { create } from 'zustand';
import { logger } from '@/utils/logger';
import { db } from '@/db/database';
import { getDocs, collection } from 'firebase/firestore';
import { db as firestoreDb, auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { GlobalState, GlobalActions, NotificationType, DialogState, CollectionName, Rapportino } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

// --- UTILITIES ---
const toDateSafe = (timestamp: any): Date | null => {
    if (!timestamp) { 
        return null;
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (typeof timestamp === 'object' && timestamp !== null) {
        const seconds = timestamp.seconds || timestamp._seconds;
        if (typeof seconds === 'number') {
            const nanoseconds = timestamp.nanoseconds || timestamp._nanoseconds || 0;
            try {
                return new Timestamp(seconds, nanoseconds).toDate();
            } catch (e) {
                logger.error('Fallita conversione di un oggetto-Timestamp non valido', { data: timestamp, error: e });
                return null; 
            }
        }
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
            return d;
        }
    }
    return null;
};


const processRapportini = (docs: any[]): Rapportino[] => {
    return docs.map(docData => {
        const data = toDateSafe(docData.data);
        const createdAt = toDateSafe(docData.createdAt);
        const updatedAt = toDateSafe(docData.updatedAt);

        if (!data) {
            logger.warn(`Rapportino scartato (ID: ${docData.id}) per campo \'data\' invalido o non riconosciuto.`, { dataField: docData.data });
            return null;
        }

        return {
            id: docData.id,
            clienteId: docData.clienteId || '',
            completed: docData.completed === true,
            createdAt: createdAt || new Date(),
            createdBy: docData.createdBy || '',
            data: data,
            descrizioneBreve: docData.descrizioneBreve || '',
            dettaglioOreTecnici: Array.isArray(docData.dettaglioOreTecnici) ? docData.dettaglioOreTecnici : [],
            dittaId: docData.dittaId || '',
            firmaFirmatarioNome: docData.firmaFirmatarioNome || '',
            firmaFirmatarioSocieta: docData.firmaFirmatarioSocieta || '',
            firmaVettoriale: docData.firmaVettoriale || '',
            includeTrasferta: docData.includeTrasferta === true,
            isDeleted: docData.isDeleted === true,
            isLocked: docData.isLocked === true,
            lavoroEseguito: docData.lavoroEseguito || '',
            luogoId: docData.luogoId || '',
            materialiImpiegati: docData.materialiImpiegati || '',
            naveId: docData.naveId || '',
            nome: docData.nome || '',
            ordineLavoro: docData.ordineLavoro || '',
            oreLavoro: typeof docData.oreLavoro === 'number' ? docData.oreLavoro : 0,
            presenze: Array.isArray(docData.presenze) ? docData.presenze : [],
            tecnicoId: docData.tecnicoId || '',
            tecnicoScriventeId: docData.tecnicoScriventeId || '',
            tipoGiornataId: docData.tipoGiornataId || '',
            trasfertaId: docData.trasfertaId || '',
            updatedAt: updatedAt || createdAt || new Date(),
            userId: docData.userId || '',
            veicoloId: docData.veicoloId || '',
            version: typeof docData.version === 'number' ? docData.version : 1,
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
        { name: 'tipiGiornata' as CollectionName, table: db.tipiGiornata },
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
  silencedScadenze: [],

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
  toggleScadenzaSilence: (id) => set(state => ({
    silencedScadenze: state.silencedScadenze.includes(id)
      ? state.silencedScadenze.filter(scadenzaId => scadenzaId !== id)
      : [...state.silencedScadenze, id],
  })),
  
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

  syncCollectionByName: async (collectionName: CollectionName) => {
    logger.log(`GlobalStore: Avvio sincronizzazione mirata per "${collectionName}"...`);
    set({ isSyncing: true });

    try {
        const allConfigs = [
            ...collectionConfig.anagrafiche,
            collectionConfig.rapportini,
            collectionConfig.checkins,
            collectionConfig.documenti
        ];
        const config = allConfigs.find(c => c.name === collectionName);

        if (!config) {
            throw new Error(`Configurazione non trovata per la collezione: ${collectionName}`);
        }

        await config.table.clear();
        logger.log(`GlobalStore: Tabella locale "${config.name}" pulita.`);

        const snapshot = await getDocs(collection(firestoreDb, config.name));
        if (snapshot.empty) {
            logger.log(`GlobalStore: Nessun record da sincronizzare per "${config.name}".`);
            return;
        }

        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const dataToStore = config.processor ? config.processor(docs) : docs;

        if (dataToStore.length > 0) {
            await config.table.bulkPut(dataToStore);
            logger.log(`GlobalStore: ${dataToStore.length} record inseriti nella tabella "${config.name}".`);
        }

    } catch (error) {
        const typedError = error as Error;
        logger.error(`ERRORE durante la sincronizzazione mirata di "${collectionName}".`, typedError.message);
        get().showNotification(`Errore sincronizzazione ${collectionName}`, 'error');
    } finally {
        set({ isSyncing: false });
        logger.log(`GlobalStore: Fine ciclo di sincronizzazione mirata per "${collectionName}".`);
    }
  },

  logout: async () => {
    logger.log(`GlobalStore: Chiamata a signOut di Firebase...`);
    await signOut(auth);
    logger.log(`GlobalStore: Logout da Firebase completato. Pulizia stato e DB locale.`);
    set({ user: null, profile: null, isAdmin: false, isSyncing: false, silencedScadenze: [] });
    const tablesToClear = [
        ...Object.values(collectionConfig.anagrafiche).map(c => c.table),
        collectionConfig.rapportini.table,
        collectionConfig.checkins.table,
        collectionConfig.documenti.table
    ];
    for (const table of tablesToClear) {
        await table.clear();
    }
    logger.log('GlobalStore: Tutte le tabelle locali sono state pulite.');
  },
}));

export { useGlobalStore };
