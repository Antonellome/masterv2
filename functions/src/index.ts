
import * as admin from "firebase-admin";

// Inizializza l'SDK di Admin UNA SOLA VOLTA
admin.initializeApp();

// --- ESPORTAZIONE FUNZIONI PULITE ---

// 1. Esporta la funzione forceAdmin
export { forceAdmin } from "./forceAdmin";

// 2. Esporta la funzione di migrazione
export { executeMigration } from "./migration";

// 3. Esporta la funzione per la creazione dei tecnici
export { createTecnico } from "./createTecnico";

// --- NUOVE FUNZIONI PER SOSTITUIRE I SERVIZI OBSOLETI ---
export { risorseUmane_gestisciAccessoTecnico } from "./risorseUmane-gestisciAccessoTecnico";
export { amministrazione_gestisciUtenti } from "./amministrazione-gestisciUtenti";
