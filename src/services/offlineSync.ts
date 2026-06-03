import { doc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase';
import { rapportinoConverter } from '@/utils/converters';
import { Rapportino } from '@/models/definitions';

// NOTA PER L'APP MASTER: Questa è un'implementazione "bridge" del servizio di offline sync.
// Il componente ReportFormPage chiama `aggiungiAllaCoda` per salvare i dati.
// Invece di accodare i dati per la sincronizzazione offline (come fa l'App Tecnici),
// questa versione scrive direttamente su Firestore, dato che l'App Master è sempre online.

export const aggiungiAllaCoda = async (payload: Rapportino, entityId?: string): Promise<string> => {
    console.log("App Master: Esecuzione di aggiungiAllaCoda in modalità pass-through (scrittura diretta su Firestore)");

    try {
        if (entityId) {
            // Modalità aggiornamento: l'ID esiste già
            const reportRef = doc(firestoreDb, 'rapportini', entityId).withConverter(rapportinoConverter);
            await updateDoc(reportRef, payload as Partial<Rapportino>); // Esegui l'aggiornamento
            console.log(`Rapportino ${entityId} aggiornato direttamente su Firestore.`);
            return entityId;
        } else {
            // Modalità creazione: nuovo rapportino
            const collectionRef = collection(firestoreDb, 'rapportini').withConverter(rapportinoConverter);
            const docRef = await addDoc(collectionRef, payload);
            console.log(`Rapportino ${docRef.id} creato direttamente su Firestore.`);
            return docRef.id;
        }
    } catch (error) {
        console.error("Errore durante la scrittura diretta su Firestore: ", error);
        // Rilancia l'errore per farlo gestire dal chiamante (es. mostrare uno snackbar)
        throw new Error("Impossibile salvare il rapportino su Firestore.");
    }
};
