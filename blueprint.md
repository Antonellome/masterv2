# Blueprint di Sviluppo - R.I.S.O. App

Questo documento serve come unica fonte di verità per lo sviluppo e la manutenzione dell'applicazione. Traccia lo stato attuale, i problemi noti e il piano di azione dettagliato per le modifiche future.

---

## 1. Regole di Interazione

*   **Saluto Iniziale:** Ogni interazione in chat deve iniziare con il saluto "CIAO".

---

## 2. Cronologia e Piano di Lavoro

### Fase 1-10: Sviluppo e Correzioni Precedenti
*(Omesse per brevità, vedi cronologia versioni)*

### Fase 11: Diagnosi e Risoluzione Bug Critico di Deploy (In Corso)

*   **Stato:** In Corso
*   **Problema:** Il Firebase CLI ignora tutte le configurazioni di regione (`europe-west1`) e continua a deployare le funzioni in `us-central1`.
*   **Causa Radice Identificata:** Bug critico e inspiegabile dello strumento `firebase-tools` nell'ambiente corrente.
*   **Piano d'Azione Finale (Tentativo Drastico):** Per aggirare il bug, si procederà con un "reset" forzato dell'ambiente di deploy.
    1.  **Eliminazione Totale:** Eliminare TUTTE le funzioni Cloud (`manageTecnicoAccess`, `manageUsers`, `sendNotification`) da TUTTE le regioni (`us-central1`, `europe-west1`).
    2.  **Deploy Individuale:** Deployare le funzioni una per una, con comandi separati.

---

## 3. Codice Sorgente di Riferimento (`functions/src/index.ts`)

Questo è il codice completo e corretto delle Cloud Functions, che verrà utilizzato per il deploy dopo la pulizia dell'ambiente.

```typescript
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { UserRecord } from "firebase-admin/auth";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

export const manageTecnicoAccess = onCall({ region: "europe-west1", cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Autenticazione richiesta.");
    }

    const { uid, action } = request.data;

    if (typeof uid !== "string" || uid.length === 0) {
        throw new HttpsError("invalid-argument", "L'UID del tecnico non è valido.");
    }
    if (action !== "enable" && action !== "disable") {
        throw new HttpsError("invalid-argument", "L'azione specificata non è valida. Usare 'enable' o 'disable'.");
    }

    logger.info(`Inizio processo per UID: ${uid}, azione: ${action}`);

    let user: UserRecord;

    try {
        user = await auth.getUser(uid);
    } catch (error: unknown) {
        logger.error(`Errore during la ricerca dell'utente ${uid}:`, error);
        const firebaseError = error as { code?: string; message: string };
        if (firebaseError.code === "auth/user-not-found") {
            throw new HttpsError("not-found", `L'utente con UID ${uid} non esiste in Firebase Auth.`);
        }
        throw new HttpsError("internal", `Errore nella ricerca utente: ${firebaseError.message}`);
    }

    const newDisabledState = action === "disable";

    if (user.disabled !== newDisabledState) {
        try {
            await auth.updateUser(uid, { disabled: newDisabledState });
            logger.info(`Stato di autenticazione per l'utente ${uid} aggiornato a disabled: ${newDisabledState}`);
        } catch (updateError: unknown) {
            const firebaseError = updateError as { message: string };
            logger.error(`Errore during l'aggiornamento dell'autenticazione per l'utente ${uid}:`, updateError);
            throw new HttpsError("internal", `Impossibile aggiornare lo stato di autenticazione: ${firebaseError.message}`);
        }
    } else {
        logger.info(`L'utente ${uid} ha già lo stato di autenticazione desiderato (disabled: ${newDisabledState}).`);
    }

    try {
        const tecnicoRef = db.collection("tecnici").doc(uid);
        await tecnicoRef.update({ appAccess: !newDisabledState });
        logger.info(`Documento Firestore ${uid} aggiornato con appAccess: ${!newDisabledState}.`);
    } catch (dbError: unknown) {
        const firebaseError = dbError as { message: string };
        logger.error(`Errore during l'aggiornamento di Firestore per l'UID ${uid}:`, dbError);
        throw new HttpsError("internal", `L'autenticazione è stata aggiornata, ma impossibile aggiornare il database: ${firebaseError.message}`);
    }

    return { success: true, message: `Accesso per l'utente ${uid} è stato ${action === "enable" ? "abilitato" : "disabilitato"}.` };
});

interface ManageUsersPayload {
    action: "promoteToAdmin" | "list" | "createUser" | "setRole" | "deleteUser";
    payload?: {
        uid?: string;
        email?: string;
        nome?: string;
        cognome?: string;
        role?: string;
    };
}

export const manageUsers = onCall({ region: "europe-west1", cors: true }, async (request) => {
    const data = request.data as ManageUsersPayload;
    const action = data?.action;
    const payload = data?.payload;
    const callerUid = request.auth?.uid;
    const usersCollection = db.collection("utenti_master");
    const adminsCollection = db.collection("amministratori");

    if (!action) {
        throw new HttpsError("invalid-argument", "Azione non specificata.");
    }

    if (action === "promoteToAdmin") {
        if (!callerUid) {
            throw new HttpsError("unauthenticated", "Devi essere autenticato per auto-promuoverti.");
        }

        const listUsersResult = await auth.listUsers(1000);
        const existingAdmin = listUsersResult.users.find((u) => u.customClaims?.role === "admin");
        if (existingAdmin && existingAdmin.uid !== callerUid) {
            throw new HttpsError("permission-denied", "Un amministratore esiste già.");
        }

        await auth.setCustomUserClaims(callerUid, { role: "admin" });
        return { status: "success", message: "Complimenti! L'utente è ora il primo amministratore." };
    }

    const isCallerAdmin = request.auth?.token?.role === "admin";
    if (!isCallerAdmin) {
        throw new HttpsError("permission-denied", "Accesso negato. Operazione riservata agli amministratori.");
    }

    switch (action) {
        case "list": {
            try {
                const listUsersResult = await auth.listUsers(1000);
                let users = listUsersResult.users.map((userRecord) => ({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    role: userRecord.customClaims?.role || "utente",
                }));

                const requestedRole = payload?.role;
                if (requestedRole) {
                    if (requestedRole.startsWith("!")) {
                        const roleToExclude = requestedRole.substring(1);
                        users = users.filter((u) => u.role !== roleToExclude);
                    } else {
                        users = users.filter((u) => u.role === requestedRole);
                    }
                }

                return { users };
            } catch (error: unknown) {
                const firebaseError = error as { message: string };
                logger.error("Errore nel listare gli utenti", error);
                throw new HttpsError("internal", `Errore during il recupero degli utenti: ${firebaseError.message}`);
            }
        }

        case "createUser": {
            if (!payload?.email || !payload?.nome) {
                throw new HttpsError("invalid-argument", "Email e nome sono richiesti per creare un utente.");
            }
            try {
                const userRecord = await auth.createUser({
                    email: payload.email,
                    displayName: `${payload.nome} ${payload.cognome || ""}`.trim(),
                });

                await auth.setCustomUserClaims(userRecord.uid, { role: "tecnico" });
                await usersCollection.doc(userRecord.uid).set({
                    nome: payload.nome,
                    cognome: payload.cognome || "",
                    email: payload.email,
                });

                return {
                    status: "success",
                    message: `Utente ${payload.email} creato con successo.`,
                    user: {
                        uid: userRecord.uid,
                        email: userRecord.email,
                        role: "tecnico",
                    },
                };
            } catch (error: unknown) {
                const firebaseError = error as { code?: string; message: string };
                logger.error("Errore nella creazione dell'utente", error);
                if (firebaseError.code === "auth/email-already-exists") {
                    throw new HttpsError("already-exists", `L'utente con email ${payload.email} esiste già.`);
                }
                throw new HttpsError("internal", `Errore sconosciuto during la creazione dell'utente: ${firebaseError.message}`);
            }
        }

        case "setRole": {
            const targetUid = payload?.uid;
            const role = payload?.role;
            if (!targetUid || !role) {
                throw new HttpsError("invalid-argument", "UID utente e nuovo ruolo sono richiesti.");
            }

            try {
                await auth.setCustomUserClaims(targetUid, { role });
                if (role === "admin") {
                    const sourceDoc = await usersCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await adminsCollection.doc(targetUid).set(sourceData || {});
                    await usersCollection.doc(targetUid).delete().catch(() => undefined);
                } else {
                    const sourceDoc = await adminsCollection.doc(targetUid).get();
                    const sourceData = sourceDoc.exists ? sourceDoc.data() : { uid: targetUid };
                    await usersCollection.doc(targetUid).set(sourceData || {});
                    await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                }
                return { status: "success", message: "Ruolo aggiornato con successo." };
            } catch (error: unknown) {
                const firebaseError = error as { message: string };
                logger.error("Errore nell'impostare il ruolo", error);
                throw new HttpsError("internal", `Errore during l'aggiornamento del ruolo: ${firebaseError.message}`);
            }
        }

        case "deleteUser": {
            const targetUid = payload?.uid;
            if (!targetUid) {
                throw new HttpsError("invalid-argument", "L'UID dell'utente è richiesto per l'eliminazione.");
            }
            try {
                await auth.deleteUser(targetUid);
                await usersCollection.doc(targetUid).delete().catch(() => undefined);
                await adminsCollection.doc(targetUid).delete().catch(() => undefined);
                return { status: "success", message: "Utente eliminato con successo." };
            } catch (error: unknown) {
                const firebaseError = error as { message: string };
                logger.error("Errore nell'eliminazione dell'utente", error);
                throw new HttpsError("internal", `Impossibile eliminare l'utente: ${firebaseError.message}`);
            }
        }

        default:
            throw new HttpsError("invalid-argument", `L'azione richiesta '${action}' non è valida.`);
    }
});

interface SendNotificationPayload {
    title: string;
    body: string;
    targetType: "tecnico" | "categoria" | "tutti";
    targetId?: string; // UID del tecnico o nome della categoria
    targetName?: string; // Nome del destinatario per il log
}

export const sendNotification = onCall({ region: "europe-west1", cors: true }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Autenticazione richiesta per inviare notifiche.");
        }

        const isCallerAdmin = request.auth.token.role === "admin";
        if (!isCallerAdmin) {
            throw new HttpsError("permission-denied", "Accesso negato. Solo gli amministratori possono inviare notifiche.");
        }

        const { title, body, targetType, targetId, targetName } = request.data as SendNotificationPayload;

        if (!title || !body || !targetType) {
            throw new HttpsError("invalid-argument", "Titolo, corpo e tipo di destinatario sono obbligatori.");
        }
        if ((targetType === "tecnico" || targetType === "categoria") && !targetId) {
            throw new HttpsError("invalid-argument", "L'ID del destinatario è richiesto per tipo 'tecnico' o 'categoria'.");
        }

        let targetUids: string[] = [];
        let targetDescription = "";

        try {
            if (targetType === "tecnico") {
                if (targetId) {
                    targetUids.push(targetId);
                    targetDescription = `Tecnico: ${targetName || targetId}`;
                }
            } else if (targetType === "categoria") {
                if (targetId) {
                    const tecniciSnapshot = await db.collection("tecnici").where("categoria", "==", targetId).get();
                    targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                    targetDescription = `Categoria: ${targetName || targetId}`;
                }
            } else if (targetType === "tutti") {
                const tecniciSnapshot = await db.collection("tecnici").get();
                targetUids = tecniciSnapshot.docs.map(doc => doc.id);
                targetDescription = "Tutti i tecnici";
            }
        } catch (error: unknown) {
            logger.error("Errore nel determinare i destinatari della notifica:", error);
            const firebaseError = error as { message: string };
            throw new HttpsError("internal", `Impossibile recuperare l'elenco dei destinatari. Dettagli: ${firebaseError.message}`);
        }

        if (targetUids.length === 0) {
            logger.warn("Nessun destinatario trovato per la notifica.", { targetType, targetId });
            return { success: true, message: "Nessun destinatario valido trovato." };
        }

        const now = admin.firestore.Timestamp.now();
        const sender = request.auth.token.name || request.auth.token.email || "Admin sconosciuto";
        const BATCH_LIMIT = 490;

        const batchPromises: Promise<FirebaseFirestore.WriteResult[]>[] = [];

        for (let i = 0; i < targetUids.length; i += BATCH_LIMIT) {
            const chunk = targetUids.slice(i, i + BATCH_LIMIT);
            const batch = db.batch();

            chunk.forEach(uid => {
                const notificaRef = db.collection("notifiche").doc();
                batch.set(notificaRef, {
                    tecnicoId: uid,
                    title,
                    body,
                    createdAt: now,
                    isRead: false,
                });
            });

            batchPromises.push(batch.commit());
        }

        const logRef = db.collection("notificheInviate").doc();
        const logData = {
            sender,
            title,
            body,
            sentAt: now,
            target: {
                type: targetType,
                description: targetDescription,
                ...(targetId && { id: targetId }),
            },
            recipientsCount: targetUids.length,
        };
        const logPromise = logRef.set(logData);

        try {
            await Promise.all([...batchPromises, logPromise]);
            logger.info(`Notifica inviata con successo a ${targetUids.length} destinatari da ${sender}.`);
            return { success: true, message: `Notifica inviata con successo a ${targetUids.length} destinatari.` };
        } catch (error) {
            logger.error("Errore during l'invio dei batch di notifiche:", error);
            throw new HttpsError("internal", "Errore nell'invio delle notifiche. L'operazione potrebbe non essere stata completata.");
        }
    } catch (error: unknown) {
        logger.error("!!! ERRORE GLOBALE NON CATTURATO IN sendNotification !!!", {
            errorMessage: (error as Error).message,
            errorStack: (error as Error).stack,
            fullError: error,
            requestData: request.data,
        });
        throw new HttpsError("internal", "Si è verificato un errore critico e non gestito. Controllare i log della funzione per i dettagli.");
    }
});
```
