
import * as admin from "firebase-admin";

admin.initializeApp();

// Funzioni di migrazione e test (da rimuovere o disabilitare in produzione)
// export { executeMigration } from './migration';
export { createTecnico } from './createTecnico';
// export { forceAdmin } from './forceAdmin';

// Funzioni di produzione per la gestione degli accessi e degli utenti
export { amministrazione_gestisciUtenti } from './amministrazione-gestisciUtenti';
export { risorseUmane_gestisciAccessoTecnico } from './risorseUmane-gestisciAccessoTecnico';
export { eliminaTecnico } from './risorseUmane-eliminaTecnico'; // <-- Funzione aggiunta

