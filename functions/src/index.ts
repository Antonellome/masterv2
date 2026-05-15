
// Importazioni unificate per lo stile V2
import * as admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { setGlobalOptions, https } from "firebase-functions/v2"; // Aggiunto https
import * as logger from "firebase-functions/logger";

// Inizializza l'app UNA SOLA VOLTA
admin.initializeApp();
const db = admin.firestore();
const messaging = getMessaging();

// Imposto la regione GLOBALE per tutte le funzioni v2
setGlobalOptions({ region: "europe-west1" });

/**
 * ===================================================================
 *  FUNZIONE PER INVIARE NOTIFICHE (V2)
 * ===================================================================
 */
export const fanOutNotifications = onDocumentCreated(
  "notificheRichieste/{docId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.log("[fanOutNotifications] Nessun dato associato all'evento.");
      return;
    }
    const docId = event.params.docId;
    const notificaData = snapshot.data();
    logger.log(`[fanOutNotifications] Triggered for doc: ${docId}`);
    try {
      const message = {
        notification: {
          title: notificaData.title || "Nuova Notifica",
          body: notificaData.body || "Hai un nuovo messaggio",
        },
        topic: "all",
      };
      const fcmResponse = await messaging.send(message);
      logger.log("[fanOutNotifications] Notifica FCM inviata:", fcmResponse);
      
      const sentNotificaData = {
        ...notificaData,
        // ++ LA CORREZIONE DEFINITIVA ++
        // Uso il serverTimestamp di Firestore per garantire coerenza assoluta.
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        fcmMessageId: fcmResponse,
        status: "sent",
      };
      
      await db.collection("notificheInviate").add(sentNotificaData);
      logger.log(`[fanOutNotifications] Storico creato per doc: ${docId}`);
      
    } catch (error) {
      logger.error(`[fanOutNotifications] Errore per doc ${docId}:`, error);
    }
  }
);

/**
 * ===================================================================
 *  FUNZIONE PER MARCARE NOTIFICA COME LETTA (V2 - Callable)
 * ===================================================================
 */
export const markNotificationAsRead = https.onCall(async (request) => {
  logger.info("[markNotificationAsRead] Chiamata ricevuta", { auth: request.auth, data: request.data });

  if (!request.auth) {
    throw new https.HttpsError(
      "unauthenticated",
      "L'utente deve essere autenticato per marcare una notifica come letta."
    );
  }

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new https.HttpsError(
      "invalid-argument",
      "L'ID della notifica è obbligatorio."
    );
  }

  const uid = request.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const userName = userDoc.data()?.displayName || 'Utente Master';

  const notificationRef = db.collection("notificheInviate").doc(notificationId);

  try {
    const fieldToUpdate = `readBy.${uid}`;
    await notificationRef.update({
      [fieldToUpdate]: {
        nome: userName,
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      status: 'read'
    });
    
    logger.info(`[markNotificationAsRead] Notifica ${notificationId} marcata come letta da ${userName} (${uid})`);
    return { status: "success", message: `Notifica ${notificationId} marcata come letta.` };

  } catch (error) {
    logger.error(`[markNotificationAsRead] Errore durante l'aggiornamento della notifica ${notificationId}:`, error);
    throw new https.HttpsError(
      "internal",
      "Errore interno durante l'aggiornamento della notifica."
    );
  }
});


/**
 * ===================================================================
 *  FUNZIONE PER AGGREGAZIONE RAPPORTINI (Convertita a V2)
 * ===================================================================
 */
export const rapportiniTrigger = onDocumentWritten(
  "rapportini/{rapportinoId}",
  async (event) => {
    const change = event.data;
    if (!change) {
        logger.log("[rapportiniTrigger] Nessun dato di modifica trovato nell'evento.");
        return null;
    }

    const data = change.after?.data() ?? change.before?.data();

    if (!data) {
      logger.log("[rapportiniTrigger] Nessun dato da processare.");
      return null;
    }
    const { tecnicoId } = data;
    if (!tecnicoId) {
      logger.error("[rapportiniTrigger] ID Tecnico mancante.");
      return null;
    }
    const timestamp = data.data || data.dataInizio;
    if (!timestamp || !timestamp.toDate) {
      logger.error("[rapportiniTrigger] Timestamp non valido.");
      return null;
    }
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const monthKey = `${year}-${month}`;
    logger.log(`[rapportiniTrigger] Ricalcolo per tecnico ${tecnicoId} nel mese ${monthKey}.`);
    const riepilogoId = `${monthKey}_${tecnicoId}`;
    const riepilogoRef = db.collection("riepiloghiMensili").doc(riepilogoId);
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0, 23, 59, 59);
    const rapportiniSnapshot = await db
      .collection("rapportini")
      .where("tecnicoId", "==", tecnicoId)
      .where("data", ">=", startOfMonth)
      .where("data", "<=", endOfMonth)
      .get();
    const aggregato = {
      oreLavorate: 0,
      giorniLavorati: 0,
      giorniFerie: 0,
      giorniMalattia: 0,
      giorniPermesso: 0,
    };
    rapportiniSnapshot.forEach((doc) => {
      const rapportino = doc.data();
      switch (rapportino.tipoGiornata?.nome.toLowerCase()) {
        case "lavoro":
        case "lavoro straordinario":
          aggregato.oreLavorate += rapportino.oreLavoro || 0;
          aggregato.giorniLavorati += 1;
          break;
        case "ferie":
          aggregato.giorniFerie += 1;
          break;
        case "malattia":
          aggregato.giorniMalattia += 1;
          break;
        case "permesso":
          aggregato.giorniPermesso += 1;
          break;
        default:
          break;
      }
    });
    await riepilogoRef.set(
      {
        tecnicoId: tecnicoId,
        mese: monthKey,
        ...aggregato,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: false }
    );
    logger.log(`[rapportiniTrigger] Riepilogo per ${tecnicoId} nel mese ${monthKey} aggiornato.`);
    return null;
  }
);
