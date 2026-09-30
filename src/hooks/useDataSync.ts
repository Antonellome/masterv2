
import { useGlobalStore } from '@/stores/globalStore';
import { db } from '@/db/database';
import { syncService } from '@/services/syncService';
import { CollectionName } from '@/models/definitions';

const COLLECTIONS_TO_SYNC: CollectionName[] = [
    'tecnici',
    'clienti',
    'ditte',
    'navi',
    'luoghi',
    'categorie',
    'tipiGiornata',
    'veicoli',
    'rapportini',
    'checkin_giornalieri',
    'documenti' // 'documenti' è l'alias per le scadenze in Firestore
];

export const useDataSync = () => {
    const { setSyncing, setLastSync, setIsSyncing, showNotification } = useGlobalStore();

    const syncAllData = async (force = false) => {
        if (useGlobalStore.getState().isSyncing && !force) {
            console.log("Sincronizzazione già in corso.");
            return;
        }

        setIsSyncing(true);
        showNotification('Sincronizzazione dati in corso...', 'info');

        try {
            for (const collectionName of COLLECTIONS_TO_SYNC) {
                // @ts-ignore
                const localTable = db[collectionName];
                if (!localTable) {
                    console.warn(`Tabella locale non trovata per ${collectionName}, saltata.`);
                    continue;
                }

                // 'documenti' in Firestore corrisponde a 'scadenze' in Dexie.
                const firestoreCollection = collectionName === 'documenti' ? 'scadenze' : collectionName;

                await syncService.syncCollection(firestoreCollection, localTable);
            }

            setLastSync(new Date());
            showNotification('Sincronizzazione completata.', 'success');
        } catch (error) {
            console.error("Errore durante la sincronizzazione:", error);
            showNotification('Errore di sincronizzazione.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    return { syncAllData };
};
