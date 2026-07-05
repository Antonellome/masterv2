
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// L'SDK di Admin è già inizializzato nel file index.ts principale

export const createTecnico = onCall(
  { region: "europe-west1", cors: true }, // <-- Correzione: Aggiunta regione e CORS
  async (request) => {
  // In futuro, si potrebbe verificare se l'utente chiamante è un amministratore
  // if (!request.auth || !request.auth.token.admin) {
  //   throw new HttpsError("unauthenticated", "Solo un amministratore può creare nuovi tecnici.");
  // }

  const { nome, cognome, email, password, attivo } = request.data;

  // 1. Validazione dei dati ricevuti dal frontend
  if (!nome || !cognome || !email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "Dati incompleti. Sono richiesti nome, cognome, email e password."
    );
  }

  logger.info(`Richiesta di creazione tecnico per l'email: ${email}`);

  let userRecord;
  try {
    // 2. CREA L'UTENTE IN FIREBASE AUTHENTICATION
    userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: `${nome} ${cognome}`,
      disabled: false,
    });
    logger.info(`Utente di autenticazione creato con successo. UID: ${userRecord.uid}`);
  } catch (error: any) {
    logger.error("ERRORE durante la creazione dell'utente in Firebase Authentication:", error);
    if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Questo indirizzo email è già stato registrato.');
    }
    throw new HttpsError("internal", "Si è verificato un errore imprevisto durante la creazione dell'utente.");
  }

  const uid = userRecord.uid;

  // 3. PREPARA I DATI PER FIRESTORE (basandosi sul modello 'Scuderi')
  const tecnicoData = {
    uid: uid,
    email: email,
    nome: nome,
    cognome: cognome,
    nomeCompleto: `${nome} ${cognome}`,
    attivo: attivo ?? true, // Usa il valore passato o default a true
    appAccess: true,   // Default a true alla creazione
    accessoApp: true,  // Default a true alla creazione
    // Inizializza gli altri campi con valori di default per coerenza
    cap: "",
    categoriaId: "",
    categoriaPatente: "",
    citta: "",
    codiceFiscale: "",
    dataAssunzione: null,
    dittaId: "",
    fcmToken: "",
    indirizzo: "",
    note: "",
    numeroCQC: "",
    numeroCartaIdentita: "",
    numeroPassaporto: "",
    numeroPatente: "",
    provincia: "",
    scadenzaAntincendio: null,
    scadenzaCQC: null,
    scadenzaCartaIdentita: null,
    scadenzaContratto: null,
    scadenzaCorsoSicurezza: null,
    scadenzaPassaporto: null,
    scadenzaPatente: null,
    scadenzaPrimoSoccorso: null,
    scadenzaUnilav: null,
    scadenzaVisita: null,
    sincronizzazioneAttiva: false,
    tariffe: {}, // Inizializzato vuoto, da gestire separatamente
    telefono: "",
    tipoContratto: "",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // 4. CREA IL DOCUMENTO IN FIRESTORE usando l'UID come ID del documento
    await admin.firestore().collection("tecnici").doc(uid).set(tecnicoData);
    logger.info(`Documento tecnico creato con successo in Firestore per l'UID: ${uid}`);
  } catch (error) {
    logger.error("ERRORE GRAVE durante la creazione del documento in Firestore:", error);
    // ROLLBACK: Se fallisce la scrittura su Firestore, l'utente di autenticazione
    // appena creato viene eliminato per non lasciare record orfani.
    await admin.auth().deleteUser(uid);
    logger.warn(`ROLLBACK ESEGUITO: L'utente di autenticazione ${uid} è stato eliminato.`);
    throw new HttpsError("internal", "Non è stato possibile salvare i dati del tecnico nel database.");
  }

  // 5. Successo!
  return {
    status: "success",
    message: `Tecnico ${nome} ${cognome} creato con successo.`,
    uid: uid,
  };
});
