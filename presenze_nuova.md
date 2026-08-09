# Specifiche Pagina "Check-in/Out" (Presenze Nuova)

Questo documento descrive il funzionamento della nuova pagina di check-in e la struttura dei dati inviati all'applicazione "master" per la gestione e visualizzazione.

## Scopo della Pagina

La pagina consente ai tecnici di registrare l'inizio e la fine della loro giornata lavorativa o di specifici interventi. La caratteristica principale è la distinzione tra l'orario **reale** dell'evento e l'orario **scelto** dal tecnico, per gestire eventuali correzioni o inserimenti posticipati.

## Struttura Dati Inviata (Oggetto Check-in)

Ogni evento di check-in o check-out genera un oggetto con la seguente struttura, che viene salvato nel database (es. Firestore) per essere letto dall'applicazione master.

```json
{
  "checkinId": "string",
  "tecnicoId": "string",
  "tipo": "ingresso" | "uscita",
  "timestampReale": "string (ISO 8601)",
  "timestampScelto": "string (ISO 8601)",
  "note": "string | null"
}
```

### Dettaglio dei Campi

*   `checkinId`: (Stringa) ID univoco generato per l'evento di registrazione.
*   `tecnicoId`: (Stringa) ID univoco del tecnico che ha effettuato la registrazione.
*   `tipo`: (Stringa) Indica il tipo di evento. Può essere:
    *   `"ingresso"`: Per l'inizio di un'attività.
    *   `"uscita"`: Per la fine di un'attività.
*   **`timestampReale`**: (Stringa, formato ISO 8601) **Questa è la fonte di verità tecnica.** Rappresenta il momento esatto in cui il record è stato creato nel database del dispositivo. **NON è modificabile dall'utente.**
*   **`timestampScelto`**: (Stringa, formato ISO 8601) Questo è il valore di data e ora che il tecnico ha **selezionato manualmente** dall'interfaccia utente. Potrebbe differire dal `timestampReale` se il tecnico sta inserendo un'attività passata.
*   `note`: (Stringa o `null`) Eventuali note o commenti aggiunti dal tecnico per contestualizzare la registrazione.

## Implementazione nell'App Master

Per integrare e visualizzare correttamente questi dati, l'applicazione master dovrà:

1.  **Leggere i dati** dalla collezione Firestore (o altro database) in cui vengono salvati questi oggetti.
2.  **Creare o modificare la pagina di visualizzazione** delle presenze.
3.  **Visualizzare entrambe le informazioni di tempo** per ogni evento, per garantire massima trasparenza e tracciabilità.

### Esempio di Visualizzazione

Per ogni riga di check-in/out, la UI dovrebbe mostrare chiaramente sia l'orario scelto che quello reale.

| Tecnico | Tipo | Orario Scelto dal Tecnico | Orario Reale Registrazione |
| :--- | :--- | :--- | :--- |
| Mario Rossi | Ingresso | **08/08/2024 08:30** | 08/08/2024 09:15 |
| Mario Rossi | Uscita | **08/08/2024 17:30** | 08/08/2024 17:32 |

In questo esempio, è immediatamente evidente che il tecnico ha inserito la sua entrata alle 09:15, ma ha dichiarato di aver iniziato a lavorare alle 08:30. Questo è il dato fondamentale che l'app master deve mostrare.

**Azione richiesta:** Modificare la pagina di ricezione dati nell'app master per leggere la struttura dati sopra descritta e implementare una visualizzazione simile a quella proposta.
