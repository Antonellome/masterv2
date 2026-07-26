import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche } from '@/db/db';
import type { Rapportino } from '@/models/definitions';
import dayjs from 'dayjs';

// --- HELPERS ---
const getLastSyncTimestamp = async (): Promise<Date | null> => {
    try {
        const lastSync = await db.sync_status.get('lastSyncTimestamp');
        return lastSync ? new Date(lastSync.value) : null;
    } catch (e) {
        console.error("Errore nel recuperare l'ultimo timestamp di sincronizzazione:", e);
        return null; // Ritorna null per forzare una sincronizzazione completa in caso di errore
    }
};

const setLastSyncTimestamp = async (timestamp: Date) => {
    await db.sync_status.put({ id: 'lastSyncTimestamp', value: timestamp.getTime() });
};

// NUOVA FUNZIONE INCREMENTALE GENERICA
const fetchModifiedCollection = async (collectionName: string, startDate: Date | null): Promise<any[]> => {
    let q;
    // Se non c'è una data di inizio (prima sync), scarica tutto.
    // Altrimenti, scarica solo i documenti modificati dopo quella data.
    if (startDate) {
        q = query(
            collection(firestore, collectionName),
            where("updatedAt", ">", Timestamp.fromDate(startDate))
        );
    } else {
        q = query(collection(firestore, collectionName));
    }
    const querySnapshot = await getDocs(q);
    // LA CORREZIONE FONDAMENTALE È QUI
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Se la collezione è 'tecnici', usiamo il campo 'uid' come ID principale.
        // Per tutte le altre, usiamo l'ID del documento.
        const id = collectionName === 'tecnici' ? data.uid : doc.id;
        return { id, ...data };
    });
};

// --- LOGICA DI SINCRONIZZAZIONE CORRETTA E INCREMENTALE ---
export async function syncStandard() {
    console.log('Inizio Sincronizzazione Standard...');
    try {
        const lastSync = await getLastSyncTimestamp();
        const now = new Date();

        if (lastSync) {
            console.log(`Sincronizzazione incrementale avviata da: ${lastSync.toISOString()}`);
        } else {
            console.log('Prima sincronizzazione o database vuoto. Scarico tutti i dati e pulisco la cache dei tecnici.');
            // Pulisce la tabella tecnici solo alla prima sincronizzazione per forzare il refresh
            await db.table('tecnici').clear();
        }

        const anagraficheMap: { [key: string]: (item: any) => any } = {
            tecnici: item => item, // La mappatura ora è corretta a monte
            navi: item => ({ ...item, clienteId: item.clienteId?.id || item.clienteId }),
            luoghi: item => ({ ...item, clienteId: item.clienteId?.id || item.clienteId }),
            tipiGiornata: item => item,
            clienti: item => item,
            ditte: item => item,
            categorie: item => item,
            qualifiche: item => item,
            veicoli: item => item,
        };

        const anagraficheToSync = Object.keys(anagraficheMap);

        // Eseguiamo il fetch INCREMENTALE per ogni anagrafica
        for (const name of anagraficheToSync) {
            console.log(`... sincronizzo ${name}...`);
            const data = await fetchModifiedCollection(name, lastSync);
            if (data.length > 0) {
                const processedData = data.map(item => convertFirestoreTimestamps(anagraficheMap[name](item)));
                await bulkPutAnagrafiche(name, processedData);
                console.log(`Trovati e aggiornati ${data.length} record in ${name}.`);
            } else {
                 console.log(`Nessun dato da aggiornare per ${name}.`);
            }
        }
        console.log('Tutte le anagrafiche sono state sincronizzate.');

        // Sincronizzazione rapportini (già incrementale, ma usiamo la nuova funzione per coerenza)
        const rapportiniRecenti = await fetchModifiedCollection('rapportini', lastSync);
        if (rapportiniRecenti.length > 0) {
            await saveSafeRapportini(rapportiniRecenti);
            console.log(`Sincronizzati ${rapportiniRecenti.length} rapportini modificati di recente.`);
        } else {
            console.log('Nessun rapportino recente da aggiornare.');
        }
        
        await setLastSyncTimestamp(now);
        console.log('Sincronizzazione Standard completata con successo.');
    } catch (error) {
        console.error('ERRORE CRITICO in Sincronizzazione Standard:', error);
        // Non rilanciamo l'errore per non far crashare l'app, ma lo logghiamo.
        // L'app continuerà a funzionare con i dati offline.
    }
}

// --- FUNZIONI DI SUPPORTO (INVARIATE MA IMPORTANTI) ---
function convertFirestoreTimestamps(data: any): any {
    if (data && typeof data.toDate === 'function') {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(convertFirestoreTimestamps);
    }
    if (data && typeof data === 'object') {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertFirestoreTimestamps(data[key]);
        }
        return res;
    }
    return data;
}

async function saveSafeRapportini(rapportiniFromFirestore: any[]) {
    // Escludi dalla sovrascrittura i rapportini che sono stati modificati localmente
    const dirtyIds = await db.rapportini.where('isDirty').equals(1).primaryKeys();
    const rapportiniToSave = rapportiniFromFirestore.filter(r => !dirtyIds.includes(r.id));
    
    if (rapportiniToSave.length > 0) {
        const rapportiniPuliti = rapportiniToSave.map(r => {
            const rapportinoConDate = convertFirestoreTimestamps(r);
            return {
                ...rapportinoConDate,
                // Appiattisci eventuali reference di Firestore
                naveId: r.naveId?.id || r.naveId,
                luogoId: r.luogoId?.id || r.luogoId,
                tipoGiornataId: r.tipoGiornataId?.id || r.tipoGiornataId,
                tecnicoId: r.tecnicoId?.id || r.tecnicoId,
                presenze: Array.isArray(r.presenze) ? r.presenze.map(p => p.id || p).filter(Boolean) as string[] : [],
                isDirty: 0, // Imposta come 'pulito'
            };
        });
        await db.rapportini.bulkPut(rapportiniPuliti);
    }
}
