# Specifica Tecnica Definitiva: Sistema di Presenze (Check-in/Check-out)

## 1. Introduzione

Questo documento fornisce la specifica tecnica **corretta e verificata** del sistema di rilevazione presenze. L\'analisi si basa sull\'ispezione diretta del codice sorgente (`offlineSync.ts` e `definitions.ts`). Lo scopo è fornire al sistema "Master" le informazioni esatte per leggere i dati di check-in da Cloud Firestore.

**Errore Precedente Riconosciuto:** Il nome della collezione era errato. Il nome corretto è `checkin_giornalieri`.

## 2. Collezione Firestore

I dati relativi alle presenze sono archiviati **esclusivamente** nella seguente collezione Firestore:

-   **Nome Collezione:** `checkin_giornalieri`

## 3. Modello Dati su Firestore (`CheckinGiornaliero`)

Ogni documento nella collezione `checkin_giornalieri` rappresenta un singolo evento di presenza. La struttura dati su Firestore è una versione del tipo `CheckinGiornaliero` locale, con alcune differenze chiave dovute alla sincronizzazione.

**Nota importante:** Il campo `isSync` presente nel database locale **NON esiste** su Firestore, poiché viene rimosso prima del salvataggio.

### Struttura del Documento su Firestore

| Nome Campo         | Tipo Dati Firestore                                                              | Obbligatorio | Descrizione Dettagliata                                                                                                                              | Esempio Valido                                          |
| ------------------ | -------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `id`               | `string`                                                                         | No (Auto-gen)  | ID del documento generato automaticamente da Firestore. **Non è l\'ID locale**.                                                                      | `"XyZ123Abc456Def789GhI"`                              |
| `data`             | `string`                                                                         | Sì           | Data dell\'evento in formato stringa `YYYY-MM-DD`.                                                                                                  | `"2023-10-27"`                                        |
| `tecnicoId`        | `string`                                                                         | Sì           | UID Firebase dell\'utente (tecnico) che ha eseguito l\'azione.                                                                                        | `"zYxWvUtSrQpOnMlKjIhGfEdCbA12"`                       |
| `tecnicoName`      | `string`                                                                         | No           | Nome e cognome del tecnico, per convenienza. Potrebbe non essere sempre presente.                                                                   | `"Mario Rossi"`                                         |
| `tipo`             | `string`                                                                         | Sì           | Enum che descrive la natura dell\'evento. Valori possibili: `"checkin"`, `"checkout"`, `"inizio_giornata"`, `"fine_giornata"`, `"check_in_luogo"`, `"check_out_luogo"`. | `"inizio_giornata"`                                   |
| `checkIn`          | `Timestamp` di Firestore                                                         | No           | Timestamp che indica l\'orario di inizio. Può essere nullo in un evento di `checkout`.                                                              | `October 27, 2023 at 8:00:00 AM UTC+2`                  |
| `checkOut`         | `Timestamp` di Firestore                                                         | No           | Timestamp che indica l\'orario di fine. Può essere nullo in un evento di `checkin`.                                                                 | `October 27, 2023 at 5:00:00 PM UTC+2`                  |
| `userId`           | `string`                                                                         | Sì           | Alias di `tecnicoId`. Presente per retrocompatibilità o usi specifici.                                                                              | `"zYxWvUtSrQpOnMlKjIhGfEdCbA12"`                       |
| `timestampImpostato` | `Timestamp` di Firestore                                                         | Sì           | L\'orario che l\'utente ha **intenzionalmente** impostato. Se l\'utente modifica l\'orario, questo campo contiene il valore scelto da lui.                  | `October 27, 2023 at 8:01:15 AM UTC+2`                  |
| `timestampReale`     | `Timestamp` di Firestore                                                         | Sì           | Il timestamp effettivo, registrato dall\'orologio del dispositivo (`new Date()`) nel momento esatto in cui è avvenuto l\'evento.                    | `October 27, 2023 at 8:01:10 AM UTC+2`                  |
| `naveId`           | `string`                                                                         | No           | ID della nave associata all\'evento, se applicabile (es. `check_in_luogo`).                                                                           | `"NAV-003"`                                           |
| `luogoId`          | `string`                                                                         | No           | ID del luogo specifico associato all\'evento, se applicabile.                                                                                     | `"LUO-102-SALA-MACCHINE"`                               |
| `timestampSync`    | `Timestamp` di Firestore                                                         | **Sì (per i nuovi)** | **Campo CRUCIALE**. Viene aggiunto solo quando un *nuovo* record locale viene creato su Firestore. Contiene il `serverTimestamp()` del momento della sincronizzazione. | `October 27, 2023 at 8:01:20 AM UTC+2`                  |


## 4. Logica di Sincronizzazione (Corretta)

1.  **Creazione Locale:** L\'app crea un oggetto `CheckinGiornaliero` nel database locale (Dexie) con un `id` temporaneo (es. `"local-12345"`) e `isSync: false`.

2.  **Processo di Coda (`syncCheckin`):**
    *   Un servizio rileva il record locale con `isSync: false`.
    *   Prepara i dati per Firestore **rimuovendo il campo `isSync`**.
    *   Chiama `addDoc` sulla collezione `checkin_giornalieri`.
    *   **Aggiunge il campo `timestampSync` con il valore `serverTimestamp()`**.
    *   Firestore genera un ID documento univoco.
    *   L\'app aggiorna il record locale, sostituendo l\'ID temporaneo con l\'ID di Firestore e impostando `isSync: true`.

## 5. Esempio JSON di un Documento su Firestore

Questo è un esempio **reale e corretto** di come appare un documento nella collezione `checkin_giornalieri` dopo la creazione e sincronizzazione.

```json
{
  "data": "2023-10-27",
  "tecnicoId": "zYxWvUtSrQpOnMlKjIhGfEdCbA12",
  "tecnicoName": "Mario Rossi",
  "tipo": "inizio_giornata",
  "checkIn": "2023-10-27T06:00:00.000Z", // Formato Timestamp Firestore
  "checkOut": null,
  "userId": "zYxWvUtSrQpOnMlKjIhGfEdCbA12",
  "timestampImpostato": "2023-10-27T06:00:15.000Z",
  "timestampReale": "2023-10-27T06:00:10.000Z",
  "naveId": null,
  "luogoId": null,
  "timestampSync": "2023-10-27T06:00:20.000Z"
}
```

--- 

Mi scuso di nuovo per l\'inaccuratezza precedente. Questo documento è ora basato sull\'analisi diretta del codice e dovrebbe essere la fonte di verità per l\'integrazione.
