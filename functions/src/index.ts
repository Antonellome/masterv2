
import * as admin from "firebase-admin";

admin.initializeApp();

// ===================================================================
// !! NUOVA FUNZIONE DI MIGRAZIONE UNA TANTUM !!
export { migraStaffUnaTantum } from './migraStaffUnaTantum';
// ===================================================================

// --- Funzioni CRUD Generiche (NUOVA ARCHITETTURA) ---
export { createDocument, updateDocument, deleteDocument } from './genericCrud';

// --- FUNZIONI DI BUSINESS SPECIFICHE ---

// Rapportini - API HTTP Completa
export { 
    createRapportino, 
    updateRapportino, 
    deleteRapportino, 
    getAllRapportiniForSync
} from './rapportini';

// Anagrafiche - API HTTP Completa (NUOVA AGGIUNTA FASE D)
export { 
    creaAnagrafica, 
    syncAllAnagrafiche, 
    aggiornaAnagrafica, 
    eliminaAnagrafica 
} from './anagrafiche';

// Check-in - API Sicura per le Presenze (NUOVA AGGIUNTA FASE F2)
export { createCheckin } from './checkin';

// Gestione Tecnici e Utenti
export { createTecnico } from './createTecnico';
export { amministrazione_gestisciUtenti } from './amministrazioneGestisciUtenti';
export { risorseUmane_gestisciAccessoTecnico } from './risorseUmaneGestisciAccessoTecnico';
export { eliminaTecnico } from './risorseUmaneEliminaTecnico';
export { forceAdmin } from './forceAdmin';
export { admin_getAllUsers } from './adminGetAllUsers';
export { riparaScuderi } from './riparaScuderi';
