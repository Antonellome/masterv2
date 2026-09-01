CIAO

# Blueprint del Progetto R-Evolution M-O-V 3

## Overview

Questo documento descrive l'architettura, le funzionalità e lo stato di avanzamento del backend per l'applicazione R-Evolution M-O-V 3, basato su Firebase Cloud Functions.

Il file `risposta.md` contiene uno snapshot completo del codice sorgente di tutte le funzioni, salvato durante la fase di allineamento, e rappresenta una base di codice verificata e coerente.

## Regole di Comunicazione

1.  **Regola del CIAO:** Inizia ogni commento in chat con "CIAO".
2.  **Regola della Lingua ITALIANA:** Qui si commenta solo in ITALIANO.

## Struttura e Design

Il backend è composto da diverse Cloud Functions scritte in TypeScript, che gestiscono la logica di business principale dell'applicazione.

### Elenco Funzioni Attuali:

*   **`syncAllAnagrafiche`**: Fornisce dati anagrafici essenziali (tecnici, clienti, navi, etc.) alle app client.
*   **`createCheckin`**: Salva un nuovo check-in giornaliero per un tecnico.
*   **`getCheckinsUpdates`**: Ottiene gli aggiornamenti dei check-in per un dato tecnico in modo incrementale.
*   **`getAllRapportiniForSync`**: Sincronizza i report basandosi sulla presenza dei tecnici e gestisce il soft-delete.
*   **`saveRapportino`**: Crea o aggiorna un report con controllo di proprietà.
*   **`softDeleteRapportino`**: Esegue la cancellazione logica dei report previa verifica autore.
*   **`saveFCMToken`**: Salva il token per le notifiche push.

## Piano di Lavoro e Cronistoria

### Sessione di Debugging Avanzato: Il Mistero dei Deploy Silenti

1.  **Obiettivo:** Risolvere gli errori `internal` e `Manifest non trovato` che persistevano lato client.
2.  **Causa Radice:** L'ispezione del file `firebase.json` ha rivelato che era completamente vuoto, rendendo i deploy inefficaci.
3.  **Risoluzione:** Ripristino della configurazione di deploy corretta.

### Sessione Risolutiva Finale (30 Agosto 2026): Allineamento Dati e Proprietà

1.  **Obiettivo:** Risolvere la mancata visualizzazione dei 300+ report storici e implementare la logica di proprietà.
2.  **Problema Identificato:** È stata rilevata una discrepanza critica tra il codice proposto inizialmente (che cercava il campo `tecniciIds`) e la realtà del database Firestore, che utilizza invece il campo **`presenze`** per l'elenco dei tecnici coinvolti.
3.  **Implementazione VERSIONE 11:** È stata deployata la versione definitiva delle Cloud Functions (`functions/src/rapportini.ts`) che:
    *   Utilizza `presenze` con operatore `array-contains` per la sincronizzazione dei dati.
    *   Utilizza **`tecnicoScriventeId`** come campo di riferimento per i permessi di proprietà (ownership). Solo l'autore può modificare o cancellare un report.
    *   Gestisce correttamente il **soft-delete** tramite il flag `isDeleted`, garantendo che i dati storici (dove il campo era assente) rimangano visibili.
4.  **Configurazione Indici:** Sono stati configurati e attivati con successo gli indici compositi necessari su Firestore:
    *   Collezione `rapportini`: `presenze` (Array) + `updatedAt` (Decrescente).
    *   Collezione `checkin_giornalieri`: `tecnicoId` (Ascendente) + `updatedAt` (Decrescente).
5.  **Stato Finale:** Il backend è ora **DEFINITIVO**, allineato alla struttura dati storica e protetto da logiche di accesso sicure. Il sistema è pienamente operativo per la sincronizzazione dell'app tecnici.