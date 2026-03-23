/**
 * @file Definisce il modello di dati per il Sync Manifest.
 */

/**
 * Rappresenta il documento di "Sync Manifest" in Firestore.
 * Questo documento centrale tiene traccia delle "versioni" (timestamp)
 * delle collezioni principali.
 * 
 * Le app client leggono questo documento per determinare se hanno bisogno
 * di sincronizzare una specifica collezione, confrontando il timestamp remoto
 * con l'ultimo timestamp che hanno salvato localmente.
 */
export interface SyncManifest {
  // Ogni campo rappresenta una collezione da sincronizzare.
  // Il valore è il timestamp dell'ultima modifica a quella collezione.
  tecnici: number; // Timestamp Unix
  clienti: number; // Timestamp Unix
  destinazioni: number; // Timestamp Unix
  // ...altre anagrafiche aggiunte in futuro seguiranno questo pattern

  // Sezione per le notifiche amministrative (messaggi da Master a Tecnici)
  messaggi: number; // Timestamp Unix
}
