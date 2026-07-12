
import { collection, getDocs, query, where, Timestamp, doc, writeBatch } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { db, bulkPutAnagrafiche } from '@/db/db';
import type { Rapportino, Tecnico, Nave, Luogo, TipoGiornata, AdminUser, Cliente } from '@/models/definitions';
import { rapportinoConverter } from '@/firebase/converters';

// --- SEZIONE DOWNLOAD --- //

// Helper per 'pulire' gli ID che da Firestore arrivano come oggetti/riferimenti
const normalizeId = (id: any): string | undefined => {
    if (typeof id === 'string') return id;
    if (id && typeof id === 'object' && id.id) return id.id;
    return undefined;
};

async function fetchCollection<T>(collectionName: string): Promise<any[]> {
    const querySnapshot = await getDocs(collection(firestore, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Funzione di trasformazione specifica per anagrafiche con campi di riferimento
const processAnagrafica = (items: any[], fieldName: string) => {
    return items.map(item => {
        const newItem = { ...item };
        if (newItem[fieldName]) {
            newItem[fieldName] = normalizeId(newItem[fieldName]);
        }
        return newItem;
    });
};

export async function syncStandard() {
    console.log('Inizio Sincronizzazione Standard...');
    try {
        const [tecnici, naviData, luoghiData, tipiGiornata, admins, clienti] = await Promise.all([
            fetchCollection<Tecnico>('tecnici'),
            fetchCollection<Nave>('navi'),
            fetchCollection<Luogo>('luoghi'),
            fetchCollection<TipoGiornata>('tipiGiornata'),
            fetchCollection<AdminUser>('admins'),
            fetchCollection<Cliente>('clienti'),
        ]);

        const navi = processAnagrafica(naviData, 'clienteId');
        const luoghi = processAnagrafica(luoghiData, 'clienteId');

        await bulkPutAnagrafiche({ tecnici, navi, luoghi, tipiGiornata, admins, clienti });
        console.log('Anagrafiche (con clienteId corretto) sincronizzate.');

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const startCurrent = Timestamp.fromDate(new Date(year, month, 1));
        const rapportiniCurrentMonth = await fetchCollection<Rapportino>('rapportini');
        await saveSafeRapportini(rapportiniCurrentMonth);
        console.log(`Sincronizzati e normalizzati ${rapportiniCurrentMonth.length} rapportini.`);
        
        console.log('Sincronizzazione Standard completata.');
    } catch (error) {
        console.error('ERRORE CRITICO in Sincronizzazione Standard:', error);
    }
}

export async function syncCompleta() {
    console.log('Inizio Sincronizzazione Completa...');
    try {
        const [tecnici, naviData, luoghiData, tipiGiornata, admins, clienti] = await Promise.all([
            fetchCollection<Tecnico>('tecnici'),
            fetchCollection<Nave>('navi'),
            fetchCollection<Luogo>('luoghi'),
            fetchCollection<TipoGiornata>('tipiGiornata'),
            fetchCollection<AdminUser>('admins'),
            fetchCollection<Cliente>('clienti'),
        ]);

        const navi = processAnagrafica(naviData, 'clienteId');
        const luoghi = processAnagrafica(luoghiData, 'clienteId');

        await bulkPutAnagrafiche({ tecnici, navi, luoghi, tipiGiornata, admins, clienti });
        const allRapportini = await fetchCollection<Rapportino>('rapportini');
        await saveSafeRapportini(allRapportini);
        console.log('Sincronizzazione Completa terminata.');
    } catch (error) {
        console.error('ERRORE CRITICO in Sincronizzazione Completa:', error);
    }
}

// --- LA CORREZIONE DEFINITIVA È QUI ---
async function saveSafeRapportini(rapportiniFromFirestore: any[]) {
    const dirtyIds = await db.rapportini.where('isDirty').equals(1).primaryKeys();
    const rapportiniToSave = rapportiniFromFirestore.filter(r => !dirtyIds.includes(r.id));

    if (rapportiniToSave.length > 0) {
        const rapportiniPuliti = rapportiniToSave.map(r => ({
            ...r,
            // Normalizza tutti i campi di riferimento a semplici stringhe
            naveId: normalizeId(r.naveId),
            luogoId: normalizeId(r.luogoId),
            tipoGiornataId: normalizeId(r.tipoGiornataId),
            tecnicoId: normalizeId(r.tecnicoId),
            presenze: Array.isArray(r.presenze) ? r.presenze.map(normalizeId).filter(Boolean) as string[] : [],
            isDirty: 0, // Imposta lo stato a non-sporco
        }));

        await db.rapportini.bulkPut(rapportiniPuliti);
        console.log(`Salvataggio sicuro: ${rapportiniPuliti.length} rapportini salvati (e normalizzati). ${dirtyIds.length} protetti.`);
    } else {
        console.log(`Salvataggio sicuro: Nessun nuovo rapportino da salvare. ${dirtyIds.length} protetti.`);
    }
}


// --- SEZIONE UPLOAD --- //

export async function pushRapportinoToQueue(rapportinoId: string) {
    await db.sync_queue.add({
        entityId: rapportinoId,
        entityType: 'rapportino',
        timestamp: Date.now(),
        status: 'pending',
        attempts: 0,
    });
    processSyncQueue(); 
}

let isSyncing = false;
export async function processSyncQueue() {
    if (isSyncing) return;
    isSyncing = true;

    try {
        const tasks = await db.sync_queue.where('status').equals('pending').sortBy('timestamp');
        if (tasks.length === 0) {
            isSyncing = false;
            return;
        }

        const batch = writeBatch(firestore);
        let processedTaskIds: number[] = [];

        for (const task of tasks) {
            if (task.entityType === 'rapportino') {
                const rapportino = await db.rapportini.get(task.entityId);
                if (rapportino) {
                    const docRef = doc(firestore, 'rapportini', rapportino.id).withConverter(rapportinoConverter);
                    batch.set(docRef, rapportino);
                    await db.rapportini.update(rapportino.id, { isDirty: 0 });
                    processedTaskIds.push(task.id!);
                }
            }
        }

        await batch.commit();
        await db.sync_queue.bulkDelete(processedTaskIds);

    } catch (error) {
        console.error('ERRORE durante il processo della coda di sincronizzazione:', error);
    } finally {
        isSyncing = false;
        const remainingTasks = await db.sync_queue.where('status').equals('pending').count();
        if (remainingTasks > 0) {
            setTimeout(processSyncQueue, 1000); 
        }
    }
}
