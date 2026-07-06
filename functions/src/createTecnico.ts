
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// L'SDK di Admin è già inizializzato nel file index.ts principale

export const createTecnico = onCall(
  { region: "europe-west1", cors: true },
  async (request) => {
    // 1. CONTROLLO AUTENTICAZIONE E PERMESSI DA AMMINISTRATORE
    if (request.auth?.token.role !== "admin") {
      logger.error(`Tentativo di accesso non autorizzato a createTecnico. UID: ${request.auth?.uid || 'Nessuno'}`
      );
      throw new HttpsError(
        "permission-denied",
        "Solo un amministratore può creare nuovi tecnici."
      );
    }

    // 2. ESTRAZIONE E VALIDAZIONE DEI DATI DI INPUT
    const { nome, cognome, email, password, appAccess, ...rest } = request.data;

    if (!nome || !cognome || !email) {
      throw new HttpsError(
        "invalid-argument",
        "Dati incompleti. Nome, cognome ed email sono obbligatori."
      );
    }

    logger.info(`Inizio creazione tecnico per ${email}. Richiesta da admin: ${request.auth.token.email}. Accesso App richiesto: ${appAccess}`
    );

    let userRecord;
    try {
      // 3. LOGICA DI CREAZIONE UTENTE IN BASE AD APPACCESS
      if (appAccess === true) {
        // CASO 1: L'utente deve avere accesso all'app
        if (!password || password.length < 6) {
          throw new HttpsError(
            "invalid-argument",
            "Per abilitare l'accesso è richiesta una password di almeno 6 caratteri."
          );
        }
        logger.info(`Creazione utente ABILITATO per ${email}`);
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: `${nome} ${cognome}`,
          disabled: false, // L'utente è attivo
        });
      } else {
        // CASO 2: L'utente NON deve avere accesso all'app
        // Creo comunque l'utente per avere un UID, ma lo lascio disabilitato.
        // La password è casuale e irrilevante.
        logger.info(`Creazione utente DISABILITATO per ${email}`);
        userRecord = await admin.auth().createUser({
          email: email,
          password: `disabled_${Date.now()}_${Math.random().toString(36).slice(-8)}`,
          displayName: `${nome} ${cognome}`,
          disabled: true, // L'utente NON può accedere
        });
      }
      logger.info(`Utente di autenticazione creato con UID: ${userRecord.uid}. Stato: ${appAccess ? "Abilitato" : "Disabilitato"}`
      );

    } catch (error: any) {
      logger.error(
        "ERRORE Critico durante la creazione dell'utente in Firebase Authentication:", error
      );
      if (error.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Questo indirizzo email è già in uso da un altro utente."
        );
      }
      throw new HttpsError(
        "internal",
        "Errore imprevisto durante la creazione dell'utente di autenticazione."
      );
    }

    const uid = userRecord.uid;

    // 4. PREPARAZIONE E SCRITTURA DEI DATI IN FIRESTORE
    const tecnicoData = {
      ...rest,
      uid: uid, // Lega il documento all'utente di autenticazione
      email: email,
      nome: nome,
      cognome: cognome,
      nomeCompleto: `${nome} ${cognome}`,
      attivo: rest.attivo ?? true, // Se non specificato, è attivo di default
      appAccess: appAccess ?? false, // Se non specificato, l'accesso è negato
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await admin.firestore().collection("tecnici").doc(uid).set(tecnicoData);
      logger.info(`Documento tecnico salvato con successo in Firestore con ID: ${uid}`);
    } catch (error) {
      logger.error(
        `ERRORE GRAVE durante la scrittura su Firestore per UID: ${uid}`, error
      );

      // Se la scrittura su Firestore fallisce, elimino l'utente appena creato
      // per evitare di lasciare un utente di autenticazione "orfano".
      await admin.auth().deleteUser(uid);
      logger.warn(`ROLLBACK ESEGUITO: L'utente di autenticazione ${uid} è stato eliminato.`);

      throw new HttpsError(
        "internal",
        "Non è stato possibile salvare i dati del tecnico nel database. L'utente creato è stato rimosso."
      );
    }

    // 5. OPERAZIONE COMPLETATA CON SUCCESSO
    return {
      status: "success",
      message: `Tecnico ${nome} ${cognome} creato con successo con UID: ${uid}.`,
      uid: uid,
    };
  }
);
