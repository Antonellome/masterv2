
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

const REGION = "europe-west1";

// --- INIZIO DEFINIZIONE TIPO LOCALE ---
// Duplico la definizione qui per rendere la funzione auto-contenuta.
interface Checkin {
  id: string;
  tecnicoId: string;
  tecnicoName: string;
  tipo: "inizio_giornata" | "fine_giornata" | "check_in_luogo" | "check_out_luogo";
  timestampImpostato: Timestamp | Date;
  timestampReale: Timestamp | Date;
  naveId?: string;
  luogoId?: string;
}
// --- FINE DEFINIZIONE TIPO LOCALE ---


/**
 * Crea un nuovo documento di check-in/out nella collezione `checkin_giornalieri`.
 */
export const createCheckin = onCall({ region: REGION }, async (request) => {
  const { data, auth } = request;

  // 1. CONTROLLO DI SICUREZZA FONDAMENTALE
  if (!auth || auth.uid !== data.tecnicoId) {
    logger.error(
      `Operazione non autorizzata: UID chiamante [${
        auth?.uid
      }] non corrisponde a tecnicoId [${data.tecnicoId}]`,
      { data }
    );
    throw new HttpsError(
      "unauthenticated",
      "Non sei autorizzato a eseguire questa operazione."
    );
  }

  logger.info(`Richiesta di check-in autorizzata per l'utente: ${auth.uid}`, {
    data,
  });

  // 2. VALIDAZIONE DEI DATI IN INGRESSO
  const tipiValidi: Checkin["tipo"][] = [
    "inizio_giornata",
    "fine_giornata",
    "check_in_luogo",
    "check_out_luogo",
  ];
  if (!tipiValidi.includes(data.tipo)) {
    logger.error(`Tipo di check-in non valido: ${data.tipo}`, { data });
    throw new HttpsError(
      "invalid-argument",
      `Il tipo di evento "${data.tipo}" non è valido.`
    );
  }

  // 3. PREPARAZIONE DEL DOCUMENTO DA SCRIVERE
  const newCheckinData: Omit<Checkin, "id" | "timestampReale"> & {
    timestampReale: FieldValue;
  } = {
    tecnicoId: data.tecnicoId,
    tecnicoName: data.tecnicoName,
    tipo: data.tipo,
    timestampImpostato: new Date(data.timestampImpostato),
    timestampReale: FieldValue.serverTimestamp(),
  };

  if (data.naveId) {
    (newCheckinData as any).naveId = data.naveId;
  }
  if (data.luogoId) {
    (newCheckinData as any).luogoId = data.luogoId;
  }

  // 4. SCRITTURA SU FIRESTORE
  try {
    const docRef = await getFirestore()
      .collection("checkin_giornalieri")
      .add(newCheckinData);
    logger.info(
      `Nuovo check-in creato con successo con ID: ${docRef.id} per utente ${auth.uid}`
    );
    return { id: docRef.id };
  } catch (error) {
    logger.error(
      "Errore durante la scrittura del documento di check-in su Firestore:",
      { error, data }
    );
    throw new HttpsError(
      "internal",
      "Si è verificato un errore interno durante il salvataggio."
    );
  }
});
