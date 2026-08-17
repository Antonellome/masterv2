
import * as admin from "firebase-admin";

admin.initializeApp();

// ===================================================================
// !! NUOVA FUNZIONE DI MIGRAZIONE UNA TANTUM !!
export { migraStaffUnaTantum } from './migraStaffUnaTantum';
// ===================================================================

// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
export { createDocument, updateDocument, deleteDocument } from './genericCrud';

// --- FUNZIONI DI BUSINESS SPECIFICHE ---

// Rapportini - API HTTP Completa per App Tecnici e App Master
export { createRapportino, updateRapportino, deleteRapportino } from './rapportini';

// Gestione Tecnici e Utenti
export { createTecnico } from './createTecnico';
export { amministrazione_gestisciUtenti } from './amministrazioneGestisciUtenti';
export { risorseUmane_gestisciAccessoTecnico } from './risorseUmaneGestisciAccessoTecnico';
export { eliminaTecnico } from './risorseUmaneEliminaTecnico';
export { forceAdmin } from './forceAdmin';
export { admin_getAllUsers } from './adminGetAllUsers';
export { riparaScuderi } from './riparaScuderi';
