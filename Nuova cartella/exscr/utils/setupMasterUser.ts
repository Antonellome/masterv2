import { doc, getFirestore, setDoc } from 'firebase/firestore';

/**
 * Script una tantum per creare o sovrascrivere il documento dell'utente master (admin).
 * L'ID utente deve corrispondere a quello creato nel servizio di autenticazione Firebase.
 */
export const setupMasterUser = async () => {
  const db = getFirestore();
  
  // !!! ATTENZIONE: SOSTITUIRE CON L'UID EFFETTIVO DELL'UTENTE ADMIN IN FIREBASE AUTH !!!
  const adminUid = 'pXTA4Qy2Qfg0O8qngAoTGvWFP593'; 

  const userDocRef = doc(db, 'tecnici', adminUid);

  const userData = {
    nome: 'Antonio',
    cognome: 'Scuderi',
    email: '', // L'email di solito è già in Auth, ma puoi aggiungerla se serve
    ruolo: 'admin', // Ruolo fondamentale per i permessi
    attivo: true,     // L'utente è abilitato
    sincronizzazioneAttiva: true, // Altre impostazioni di default
    ditta: 'Master', // Ditta di default o specifica
    qualifica: 'Admin', // Qualifica di default
    telefono: ''
  };

  try {
    // Usiamo setDoc per creare o sovrascrivere il documento con l'ID specifico.
    await setDoc(userDocRef, userData);
    console.log(`SUCCESSO: Utente master Antonio Scuderi (ID: ${adminUid}) creato/aggiornato correttamente nel database.`);
  } catch (error) {
    console.error("FALLIMENTO: Impossibile creare il documento dell'utente master:", error);
    alert("Si è verificato un errore critico nella configurazione dell'utente master. Controlla la console.");
  }
};
