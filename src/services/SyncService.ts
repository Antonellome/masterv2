import { db, bulkPutGeneric } from '../db/db';
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Rapportino } from '../models/definitions';

const getLastSyncTimestamp = async (tableName: string): Promise<number> => {
    const syncStatus = await db.sync_status.get(tableName);
    return syncStatus ? syncStatus.value : 0;
};

const setLastSyncTimestamp = async (tableName: string, timestamp: number) => {
    await db.sync_status.put({ id: tableName, value: timestamp });
};

const pushDirtyRecords = async (tableName: 'rapportini') => {
    if (tableName !== 'rapportini') {
        console.error("pushDirtyRecords supporta solo la tabella 'rapportini' per ora.");
        return;
    }

    const dirtyRapportini = await db.rapportini.where('isDirty').equals(1).toArray();

    if (dirtyRapportini.length === 0) {
        console.log(`[Sync] Nessun rapportino locale da caricare.`);
        return;
    }

    console.log(`[Sync] Trovati ${dirtyRapportini.length} rapportini locali da caricare.`);

    // CORREZIONE: Specifichiamo la regione anche per queste funzioni per coerenza.
    const createRapportino = httpsCallable(functions, 'createRapportino', { region: 'us-central1' });
    const updateRapportino = httpsCallable(functions, 'updateRapportino', { region: 'us-central1' });

    for (const rapportino of dirtyRapportini) {
        const { isDirty, ...dataToSync } = rapportino;

        try {
            let result;
            if (rapportino.id && rapportino.id.length > 20) { 
                console.log(`[Sync] Aggiornamento del rapportino con ID: ${rapportino.id}`);
                result = await updateRapportino({ id: rapportino.id, data: dataToSync });
            } else {
                console.log(`[Sync] Creazione di un nuovo rapportino...`);
                result = await createRapportino({ data: dataToSync });
                const newId = (result.data as any).id;
                if(newId) {
                    await db.rapportini.delete(rapportino.id);
                    rapportino.id = newId;
                }
            }
            
            await db.rapportini.put({ ...rapportino, isDirty: 0 });
            console.log(`[Sync] Rapportino ${rapportino.id} sincronizzato con successo.`);

        } catch (error) {
            console.error(`[Sync] Errore durante la sincronizzazione del rapportino ${rapportino.id}:`, error);
        }
    }
};

export const syncRapportini = async () => {
    console.log("--- Inizio Sincronizzazione Rapportini ---");

    await pushDirtyRecords('rapportini');

    console.log("[Sync] Avvio del recupero degli aggiornamenti dal server...");
    const lastSync = await getLastSyncTimestamp('rapportini');
    const now = Date.now();

    try {
        // CORREZIONE: Anche questa funzione è in us-central1
        const getAllRapportiniForSync = httpsCallable(functions, 'getAllRapportiniForSync', { region: 'us-central1' });
        const response = await getAllRapportiniForSync();
        
        const serverRapportini = (response.data as any[]).map(r => ({ ...r, data: new Date(r.data) })) as Rapportino[];
        const serverIds = new Set(serverRapportini.map(r => r.id));

        const localRapportini = await db.rapportini.toArray();
        const localIds = new Set(localRapportini.map(r => r.id));

        const idsToDelete = [...localIds].filter(id => !serverIds.has(id));
        if (idsToDelete.length > 0) {
            console.log(`[Sync] ${idsToDelete.length} rapportini da eliminare localmente.`);
            await db.rapportini.bulkDelete(idsToDelete);
        }

        if(serverRapportini.length > 0) {
            console.log(`[Sync] Aggiornamento/Inserimento di ${serverRapportini.length} rapportini dal server.`);
            await bulkPutGeneric('rapportini', serverRapportini);
        }
        
        await setLastSyncTimestamp('rapportini', now);
        console.log("[Sync] Sincronizzazione pull completata con successo.");

    } catch (error) {
        console.error("[Sync] Errore critico durante la fase di pull:", error);
    }

    console.log("--- Fine Sincronizzazione Rapportini ---");
};

export const syncAnagrafiche = async () => {
    console.log("--- Inizio Sincronizzazione Anagrafiche ---");

    try {
        // LA CORREZIONE CHIRURGICA: Specifichiamo esplicitamente la regione corretta per la funzione.
        const syncAllAnagrafiche = httpsCallable(functions, 'syncAllAnagrafiche', { region: 'us-central1' });
        console.log("[Sync Anagrafiche] Chiamata alla Cloud Function 'syncAllAnagrafiche' in us-central1...");

        const response = await syncAllAnagrafiche();
        const collections = response.data as { [key: string]: any[] };

        if (!collections || Object.keys(collections).length === 0) {
            console.warn("[Sync Anagrafiche] La funzione non ha restituito collezioni da sincronizzare.");
            return;
        }

        console.log(`[Sync Anagrafiche] Ricevute ${Object.keys(collections).length} collezioni dal server.`);

        for (const collectionName in collections) {
            const data = collections[collectionName];
            if (data && data.length > 0) {
                console.log(`[Sync Anagrafiche] Sincronizzazione di ${data.length} record per la collezione '${collectionName}'...`);
                await bulkPutGeneric(collectionName as any, data);
                 console.log(`[Sync Anagrafiche] Collezione '${collectionName}' sincronizzata con successo.`);
            } else {
                console.log(`[Sync Anagrafiche] Nessun record da sincronizzare per la collezione '${collectionName}'.`);
            }
        }

        console.log("--- Fine Sincronizzazione Anagrafiche ---");

    } catch (error) {
        console.error("[Sync Anagrafiche] Errore critico durante la sincronizzazione:", error);
    }
};
