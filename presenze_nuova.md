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

---

## Guida all'Integrazione per l'App Tecnici (Client-Side) - SOSTITUISCE LA SCRITTURA DIRETTA

L'app dei tecnici **NON DEVE PIÙ SCRIVERE DIRETTAMENTE** nella collezione `checkin_giornalieri`. Per garantire la sicurezza e l'integrità dei dati, ogni evento di check-in/out deve essere creato invocando la **Cloud Function `createCheckin`**.

### Come Chiamare la Funzione

1.  **Ottenere un'istanza di Firebase Functions.**
2.  **Ottenere un riferimento alla funzione `createCheckin`.**
3.  **Invocare la funzione** passando un oggetto contenente i dati dell'evento.

**IMPORTANTE:** Il campo `timestampReale` **non deve essere inviato**. Viene generato e aggiunto in modo sicuro dal server. L'app deve inviare solo il `timestampImpostato` (l'orario scelto dal tecnico).

### Esempio di Codice (TypeScript)

Questo esempio mostra come implementare la logica di salvataggio all'interno dell'app Tecnici.

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";

// Dati dell'evento da inviare (esempio)
const eventoDaSalvare = {
  tecnicoId: "kZCSQlaFpJO4nr4sHcVy1zuLkQJ3", // DEVE corrispondere all'UID dell'utente loggato
  tecnicoName: "Mario Rossi",
  tipo: "check_in_luogo",
  timestampImpostato: new Date().toISOString(), // L'orario scelto dal tecnico, in formato ISO string
  naveId: "ID_DELLA_NAVE_SELEZIONATA"
  // luogoId verrebbe usato in alternativa a naveId
};

// Funzione per eseguire il salvataggio
async function salvaCheckin() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    console.error("Nessun utente autenticato.");
    return;
  }
  
  // Verifica di sicurezza lato client (la funzione lo verificherà di nuovo lato server)
  if (user.uid !== eventoDaSalvare.tecnicoId) {
      console.error("Errore: Stai cercando di salvare dati per un altro utente!");
      return;
  }

  try {
    const functions = getFunctions(); // Ottieni l'istanza delle functions
    const createCheckin = httpsCallable(functions, 'createCheckin'); // Ottieni il riferimento alla funzione

    console.log("Invio dati alla Cloud Function:", eventoDaSalvare);
    
    const result = await createCheckin(eventoDaSalvare);
    
    console.log("Check-in creato con successo! ID Documento:", result.data.id);
    // Puoi usare l'ID restituito se necessario

  } catch (error) {
    console.error("Errore durante la chiamata alla Cloud Function 'createCheckin':", error);
    // Gestisci l'errore, mostrandolo all'utente se appropriato
  }
}

// Esegui la funzione
salvaCheckin();
```

### Riepilogo dei Cambiamenti per l'App Tecnici:

1.  **Rimuovere** qualsiasi codice che usa `addDoc` o `setDoc` sulla collezione `checkin_giornalieri`.
2.  **Implementare** la chiamata alla Cloud Function `createCheckin` come mostrato nell'esempio.
3.  **Assicurarsi** che il `tecnicoId` inviato sia sempre l'UID dell'utente attualmente loggato.
4.  **Inviare** `timestampImpostato` ma **NON** `timestampReale`.
