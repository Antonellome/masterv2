
// Questo è uno script di migrazione "una tantum" e non deve essere parte del bundle finale dell'app.
// Va eseguito manualmente da un ambiente di sviluppo con accesso a Firebase.

import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { getAuth, listUsers } from 'firebase/auth';
import { db, functions } from './firebase'; // Assicurati che l'init di firebase sia corretto

interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
}

/**
 * Esegue la migrazione per sanare i tecnici "fantasma".
 * 
 * 1. Recupera tutti gli utenti da Firebase Authentication.
 * 2. Recupera tutti i documenti dalla collezione `tecnici` in Firestore.
 * 3. Confronta le due liste per trovare gli utenti Auth a cui manca un documento in `tecnici`.
 * 4. Per ogni utente mancante, crea un documento `tecnico` di base.
 */
export const runMigration = async () => {
  console.log("Inizio migrazione...");

  const auth = getAuth();
  let allAuthUsers: AuthUser[] = [];
  let pageToken: string | undefined = undefined;

  try {
    // 1. Recupera tutti gli utenti da Firebase Authentication con paginazione
    console.log("Recupero utenti da Firebase Authentication...");
    do {
      const listUsersResult = await listUsers(auth, 1000, pageToken);
      const users = listUsersResult.users.map(u => ({ 
        uid: u.uid, 
        email: u.email, 
        displayName: u.displayName 
      }));
      allAuthUsers = allAuthUsers.concat(users);
      pageToken = listUsersResult.pageToken;
      console.log(`Recuperati ${users.length} utenti... (totale: ${allAuthUsers.length})`);
    } while (pageToken);
    console.log(`Recupero utenti Auth completato. Trovati ${allAuthUsers.length} utenti.`);

  } catch (error) {
    console.error("Errore durante il recupero degli utenti da Firebase Authentication:", error);
    throw new Error("Migrazione fallita in fase di recupero Auth.");
  }

  try {
    // 2. Recupera tutti gli ID dei tecnici da Firestore
    console.log("Recupero documenti dalla collezione 'tecnici'...");
    const tecniciSnapshot = await getDocs(collection(db, 'tecnici'));
    const firestoreTecniciIds = new Set(tecniciSnapshot.docs.map(doc => doc.id));
    console.log(`Recupero da Firestore completato. Trovati ${firestoreTecniciIds.size} documenti.`);

    // 3. Confronta e trova i tecnici "fantasma"
    const missingTecnici = allAuthUsers.filter(user => !firestoreTecniciIds.has(user.uid));
    console.log(`Trovati ${missingTecnici.length} tecnici \"fantasma\" da creare.`);

    if (missingTecnici.length === 0) {
      console.log("Nessun tecnico fantasma trovato. Il database è già allineato!");
      return { success: true, createdCount: 0 };
    }

    // 4. Crea i documenti mancanti
    console.log("Inizio creazione documenti mancanti...");
    const creationPromises = missingTecnici.map(user => {
      const [nome, ...cognomeParts] = (user.displayName || 'Nome Cognome').split(' ');
      const cognome = cognomeParts.join(' ') || 'Mancante';

      const nuovoTecnico = {
        nome: nome,
        cognome: cognome,
        email: user.email || 'email@mancante.com',
        attivo: true,
        appAccess: true, // Abilita l'accesso di default
        // Aggiungi qui altri campi obbligatori con valori di default
        dittaId: '', 
        categoriaId: '',
        tipoContratto: 'da definire',
      };

      console.log(`Creo documento per UID: ${user.uid}, email: ${user.email}`);
      return setDoc(doc(db, 'tecnici', user.uid), nuovoTecnico);
    });

    await Promise.all(creationPromises);
    
    console.log(`Migrazione completata con successo! Creati ${missingTecnici.length} nuovi documenti tecnico.`);
    return { success: true, createdCount: missingTecnici.length, createdUids: missingTecnici.map(u => u.uid) };

  } catch (error) {
    console.error("Errore durante la migrazione dei dati in Firestore:", error);
    throw new Error("Migrazione fallita in fase di scrittura su Firestore.");
  }
};
