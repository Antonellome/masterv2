# Specifiche Dati Inviati da App Tecnici (Pagina Check-in) - VERSIONE UFFICIALE

Questo documento è la fonte di verità definitiva e inequivocabile per l'applicazione **Master**. Descrive la struttura dati esatta inviata dalla pagina "Presenze giornaliere" (`CheckinPage.tsx`) dell'applicazione **Tecnici**. Non ci sono altre funzionalità o dati nascosti.

## Destinazione dei Dati

*   **Collezione Firestore:** `checkin_giornalieri`

## Struttura del Singolo Documento di Evento

Ogni azione eseguita nella pagina di check-in crea un nuovo documento nella collezione `checkin_giornalieri` con la seguente, esatta struttura:

```json
{
  "tecnicoId": "string",
  "tecnicoName": "string",
  "tipo": "string",
  "timestampImpostato": "Timestamp",
  "timestampReale": "Timestamp",
  "naveId": "string | undefined",
  "luogoId": "string | undefined"
}
```

### Descrizione Obbligatoria dei Campi

*   `tecnicoId`: (Stringa) L'ID utente di Firebase (UID) del tecnico che ha generato l'evento.
*   `tecnicoName`: (Stringa) Nome e cognome del tecnico, inclusi per facilitare la visualizzazione nell'app Master.
*   `tipo`: (Stringa) Una stringa che definisce l'azione. I **soli valori possibili** sono:
    *   `"inizio_giornata"`
    *   `"fine_giornata"`
    *   `"check_in_luogo"`
    *   `"check_out_luogo"`
*   `timestampImpostato`: (Oggetto `Timestamp` di Firestore) L'orario **scelto dal tecnico** nel campo data/ora dell'interfaccia. Rappresenta l'orario dichiarato dall'utente.
*   `timestampReale`: (Oggetto `Timestamp` di Firestore) L'orario esatto in cui l'evento è stato ricevuto e salvato dal server (`Timestamp.now()`). **È la fonte di verità tecnica, non è manipolabile dall'utente e deve essere usata per ogni verifica.**
*   `naveId`: (Stringa, Opzionale) Presente **solo** se l'evento è di tipo `check_in_luogo` o `check_out_luogo` e il tecnico ha selezionato una **nave** dal menu a tendina. Se non selezionato, il campo è assente.
*   `luogoId`: (Stringa, Opzionale) Presente **solo** se l'evento è di tipo `check_in_luogo` o `check_out_luogo` e il tecnico ha selezionato un **luogo generico** dal menu a tendina. Se non selezionato, il campo è assente.

### Guida all'Implementazione per l'App Master

1.  **Leggere i Dati:** L'app Master deve leggere i documenti dalla collezione `checkin_giornalieri`.
2.  **Raggruppare i Dati:** Raggruppare gli eventi per `tecnicoId` e per data (basandosi su uno dei due timestamp, preferibilmente `timestampReale` per coerenza).
3.  **Visualizzare i Dati:** Per ogni singolo evento, la pagina di visualizzazione delle presenze sull'app Master **DEVE OBBLIGATORIAMENTE** mostrare:
    *   Il nome del tecnico (`tecnicoName`).
    *   Il tipo di evento (`tipo`).
    *   L'eventuale nome del luogo (ottenuto usando `naveId` o `luogoId` per cercare nelle anagrafiche `navi` e `luoghi`).
    *   **Entrambi gli orari**: `timestampImpostato` e `timestampReale`. La differenza tra i due è un'informazione cruciale e deve essere immediatamente visibile.

Non ci sono altri dati o campi inviati. Questa è la totalità delle informazioni trasmesse.
