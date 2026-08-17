
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Tecnico, Cliente, Veicolo, Cantiere, Ditta, TipoGiornata, Luogo, Nave, Categoria, Rapportino, Checkin, Documento } from '@/models/definitions';
import { authService } from '@/auth/authService';

// ================================================
// FUNZIONE MANCANTE - ORA IMPLEMENTATA
// ================================================

/**
 * Recupera il profilo di un tecnico da Firestore dato il suo UID.
 * @param uid L'UID dell'utente (corrisponde all'ID del documento in 'tecnici').
 * @returns Il profilo del tecnico o null se non trovato.
 */
export const getUserProfile = async (uid: string): Promise<Tecnico | null> => {
    console.log(`[API] Tentativo di recupero profilo per UID: ${uid}`);
    try {
        const userDocRef = doc(db, 'tecnici', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const profileData = { id: userDoc.id, ...userDoc.data() } as Tecnico;
            console.log(`[API] Profilo trovato per ${profileData.nome} ${profileData.cognome}`);
            return profileData;
        }
        console.warn(`[API] Profilo non trovato in Firestore per l'UID: ${uid}`);
        return null;
    } catch (error) {
        console.error("[API] Errore grave durante il recupero del profilo utente:", error);
        return null;
    }
};


// Questo file agisce come un "barrel" per tutti i servizi dell'applicazione,
// fornendo un unico punto di accesso.

export const api = {
    auth: authService,
    getUserProfile,
    // In futuro, potremmo aggiungere altri servizi qui:
    // rapportini: rapportinoService,
    // anagrafiche: anagraficaService,
};
