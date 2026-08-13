
import * as admin from "firebase-admin";

admin.initializeApp();

// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
// Esportate per gestire le anagrafiche semplici (clienti, navi, luoghi, etc.)
export { createDocument, updateDocument, deleteDocument } from './genericCrud';

// --- Funzioni Specifiche Mantenute (LOGICA COMPLESSA) ---
// Queste funzioni sono mantenute perché gestiscono logica di business specifica
// (es. creazione utenti Auth, gestione rapportini) che non può essere generalizzata.
export { createTecnico } from './createTecnico';
export { amministrazione_gestisciUtenti } from './amministrazione-gestisciUtenti';
export { risorseUmane_gestisciAccessoTecnico } from './risorseUmane-gestisciAccessoTecnico';
export { eliminaTecnico } from './risorseUmane-eliminaTecnico';

// --- Funzioni di Sviluppo (NON PER PRODUZIONE) ---
// Manteniamo i commenti originali per contesto storico.
// export { executeMigration } from './migration';
// export { forceAdmin } from './forceAdmin';
