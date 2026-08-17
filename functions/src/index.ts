
import * as admin from "firebase-admin";

admin.initializeApp();

// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
export { createDocument, updateDocument, deleteDocument } from './genericCrud';

// --- FUNZIONI DI BUSINESS SPECIFICHE ---

// Rapportini - API HTTP Completa per App Tecnici e App Master
// Ultima modifica per forzare rebuild: 2024-10-26 11:00
export { createRapportino, updateRapportino, deleteRapportino } from './rapportini';

// Gestione Tecnici e Utenti
export { createTecnico } from './createTecnico';
export { amministrazione_gestisciUtenti } from './amministrazione-gestisciUtenti';
export { risorseUmane_gestisciAccessoTecnico } from './risorseUmane-gestisciAccessoTecnico';
export { eliminaTecnico } from './risorseUmane-eliminaTecnico';

// --- Funzioni obsolete che verranno eliminate con questo deploy ---
// La vecchia 'manageRapportino' non è più esportata, quindi Firebase la rimuoverà.
