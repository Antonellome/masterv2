
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
// Correggo l'importazione
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";

// Imposto la regione per tutte le funzioni in questo file
setGlobalOptions({ region: "europe-west1" });

// Inizializza l'app Firebase Admin
initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// Modalità sicura DISATTIVATA DEFINITIVAMENTE
const SAFE_MODE = false;

// Funzione V3 (per tracciamento) che si attiva alla creazione di un documento in 'notificheRichieste'
export const syncDataTrigger = onDocumentCreated(
  "notificheRichieste/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.log("Nessun dato associato all'evento, uscita.");
      return;
    }

    const docId = event.params.docId;
    const notificaData = snapshot.data();

    // Questo controllo è ora permanentemente disattivato
    if (SAFE_MODE) {
      logger.log(`[syncDataTrigger V3 - SAFE MODE] Triggered for doc: ${docId}. No action will be taken.`);
      return;
    }

    // NUOVO LOG DI VERSIONE
    logger.log(`[syncDataTrigger V3 - REGION europe-west1] Triggered for doc: ${docId}`);
    logger.log("[syncDataTrigger V3] Data:", notificaData);

    try {
      // 1. Invia la notifica FCM
      const message = {
        notification: {
          title: notificaData.title || "Nuova Notifica",
          body: notificaData.body || "Hai un nuovo messaggio",
        },
        topic: "all",
      };

      const fcmResponse = await messaging.send(message);
      logger.log("[syncDataTrigger V3] Notifica FCM inviata con successo:", fcmResponse);

      // 2. Prepara il documento per 'notificheInviate'
      const sentNotificaData = {
        ...notificaData,
        sentAt: Timestamp.now(), 
        fcmMessageId: fcmResponse, 
        status: "sent",
      };

      // 3. Salva nella collezione 'notificheInviate'
      await db.collection("notificheInviate").add(sentNotificaData);
      logger.log(`[syncDataTrigger V3] Documento ${docId} archiviato in notificheInviate.`);

      // 4. Elimina il documento originale da 'notificheRichieste'
      await db.collection("notificheRichieste").doc(docId).delete();
      logger.log(`[syncDataTrigger V3] Documento originale ${docId} eliminato da notificheRichieste.`);

    } catch (error) {
      logger.error(`[syncDataTrigger V3] Errore durante l'elaborazione del documento ${docId}:`, error);
    }
  }
);
