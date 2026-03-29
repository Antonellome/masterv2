
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cloud Function Callable potenziata per la gestione completa degli utenti.
 * NUOVE FUNZIONI: createUser, deleteUser e filtro server-side per list.
 */
exports.manageUsers = functions.region('europe-west1').https.onCall(async (data, context) => {
  const action = data.action;
  const payload = data.payload;
  const callerUid = context.auth?.uid;

  // 1. Azione di auto-promozione per il primo admin (invariata)
  if (action === "promoteToAdmin") {
    if (!callerUid) {
      throw new functions.https.HttpsError("unauthenticated", "Devi essere loggato per auto-promuoverti.");
    }
    const listUsersResult = await admin.auth().listUsers(1);
    if (listUsersResult.users.length > 1) {
         const existingAdmin = listUsersResult.users.find(u => u.customClaims?.role === 'admin');
         if(existingAdmin) {
            throw new functions.https.HttpsError("permission-denied", "Un amministratore esiste già.");
         }
    }
    await admin.auth().setCustomUserClaims(callerUid, { role: "admin" });
    return { status: "success", message: `Complimenti! L'utente è ora il primo amministratore.` };
  }

  // 2. Protezione per tutte le altre azioni: Richiede il ruolo di ADMIN
  const isCallerAdmin = context.auth?.token?.role === 'admin';
  if (!isCallerAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Accesso negato. Questa operazione richiede privilegi di amministratore."
    );
  }

  // 3. Azioni riservate agli ADMIN
  switch (action) {
    // --- AZIONE LISTA POTENZIATA ---
    case "list":
      try {
        const listUsersResult = await admin.auth().listUsers(1000);
        let users = listUsersResult.users.map(userRecord => ({
          uid: userRecord.uid,
          email: userRecord.email,
          role: userRecord.customClaims?.role || 'utente',
        }));

        // Filtro server-side, come da blueprint
        if (payload && payload.role) {
            if (payload.role.startsWith('!')) {
                const roleToExclude = payload.role.substring(1);
                users = users.filter(u => u.role !== roleToExclude);
            } else {
                users = users.filter(u => u.role === payload.role);
            }
        }
        
        return { users };

      } catch (error) {
        console.error("Errore nel listare gli utenti:", error);
        throw new functions.https.HttpsError("internal", "Errore durante il recupero degli utenti.");
      }

    // --- NUOVA AZIONE: CREAZIONE UTENTE ---
    case "createUser":
        if (!payload || !payload.email || !payload.nome) {
            throw new functions.https.HttpsError("invalid-argument", "Email e nome sono richiesti per creare un utente.");
        }
        try {
            // Crea l'utente in Firebase Auth
            const userRecord = await admin.auth().createUser({
                email: payload.email,
                displayName: `${payload.nome} ${payload.cognome || ''}`.trim(),
            });

            // Imposta immediatamente il ruolo a 'tecnico'
            await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'tecnico' });

            return { 
                status: "success", 
                message: `Utente ${payload.email} creato con successo.`,
                user: {
                    uid: userRecord.uid,
                    email: userRecord.email,
                    role: 'tecnico'
                }
            };
        } catch (error) {
            console.error("Errore nella creazione dell'utente:", error);
            // Converte l'errore di Firebase (es. email-already-exists) in un errore Https
            if (error.code === 'auth/email-already-exists') {
                 throw new functions.https.HttpsError("already-exists", `L'utente con email ${payload.email} esiste già.`);
            }
            throw new functions.https.HttpsError("internal", "Errore sconosciuto durante la creazione dell'utente.");
        }

    // --- AZIONE SETROLE (invariata nella logica di base) ---
    case "setRole":
      try {
        const { uid: targetUid, role } = payload;
        if (!targetUid || !role) {
          throw new functions.https.HttpsError("invalid-argument", "UID utente e nuovo ruolo sono richiesti.");
        }
        await admin.auth().setCustomUserClaims(targetUid, { role: role });
        return { status: "success", message: `Ruolo aggiornato con successo.` };
      } catch (error) {
        console.error("Errore nell'impostare il ruolo:", error);
        throw new functions.https.HttpsError("internal", "Errore durante l'aggiornamento del ruolo.");
      }
    
    // --- NUOVA AZIONE: ELIMINAZIONE UTENTE ---
    case "deleteUser":
        if (!payload || !payload.uid) {
            throw new functions.https.HttpsError("invalid-argument", "L'UID dell'utente è richiesto per l'eliminazione.");
        }
        try {
            await admin.auth().deleteUser(payload.uid);
            return { status: "success", message: "Utente eliminato con successo." };
        } catch (error) {
            console.error("Errore nell'eliminazione dell'utente:", error);
            throw new functions.https.HttpsError("internal", "Impossibile eliminare l'utente.");
        }

    default:
      throw new functions.https.HttpsError("invalid-argument", `L'azione richiesta '${action}' non è valida.`);
  }
});
