
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Inizializza l'SDK di Admin UNA SOLA VOLTA
admin.initializeApp();

// --- ESPORTAZIONE FUNZIONI PULITE ---

// 1. Esporta la funzione forceAdmin
import { forceAdmin as forceAdminFunction } from "./forceAdmin";
export const forceAdmin = forceAdminFunction;

// 2. Esporta la funzione di migrazione
import { executeMigration as executeMigrationFunction } from "./migration";
export const executeMigration = executeMigrationFunction;
