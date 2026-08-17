
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Tecnico } from '@/models/definitions';

/**
 * L'UNICA FUNZIONE autorizzata a recuperare un profilo utente da Firestore.
 * @param uid L'ID dell'utente.
 * @returns Una Promise che si risolve con il profilo del tecnico o null.
 */
export const fetchUserProfile = async (uid: string): Promise<Tecnico | null> => {
    try {
        const userDocRef = doc(db, 'tecnici', uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const profile = { id: userDoc.id, ...userDoc.data() } as Tecnico;
            console.log(`[FirestoreService] Profilo trovato: ${profile.nome} ${profile.cognome}`);
            return profile;
        }
        
        console.warn(`[FirestoreService] Profilo non trovato per UID: ${uid}`);
        return null;
    } catch (error) {
        console.error(`[FirestoreService] Errore critico recupero profilo:`, error);
        return null;
    }
};

export const firestoreService = {
    fetchUserProfile,
};
