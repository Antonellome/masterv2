# Specifiche Tecniche per Invio Notifiche (App Master -> App Tecnici)

**Versione:** 1.0 (Verificata)
**Oggetto:** Questo documento fornisce le specifiche tecniche definitive e verificate per permettere all'App Master di creare documenti di notifica che vengano correttamente visualizzati nell'App Tecnici. Ogni altra documentazione precedente è da considerarsi obsoleta.

---

## 1. Collection di Destinazione

Tutte le notifiche devono essere create come nuovi documenti all'interno della collection di primo livello su Firestore denominata:

**`notifiche`**

---

## 2. Struttura del Documento `Notifica`

Ogni documento creato nella collection `notifiche` deve rispettare la seguente struttura e tipi di dato per essere considerato valido.

| Nome Campo    | Tipo Dati Firestore | Obbligatorio?          | Descrizione                                                                                                                     |
| :------------ | :------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **`title`**   | `string`            | **Sì**                 | Il titolo della notifica. Verrà mostrato in grassetto.                                                                          |
| **`body`**    | `string`            | **Sì**                 | Il corpo del messaggio della notifica. Supporta testo semplice.                                                                 |
| **`createdAt`** | `Timestamp`         | **Sì**                 | Il timestamp del momento della creazione. L'App Tecnici usa questo campo per ordinare le notifiche dalla più recente alla più vecchia. |
| **`isRead`**  | `boolean`           | **Sì**                 | Impostare sempre a **`false`** alla creazione. L'App Tecnici aggiornerà questo campo a `true` quando l'utente la leggerà.           |
| **`letta`**   | `boolean`           | **Sì**                 | Campo legacy. Impostare sempre a **`false`** alla creazione per coerenza.                                                       |
| `target`      | `string`            | No (per targeting)     | Usato per inviare la notifica a tutti. Inserire il valore esatto **`'all'`**. Se presente, `tecnicoId` e `categoriaId` vengono ignorati. |
| `tecnicoId`   | `string`            | No (per targeting)     | L'ID (UID) del tecnico specifico a cui è destinata la notifica.                                                                 |
| `categoriaId` | `string`            | No (per targeting)     | L'ID della categoria di tecnici a cui è destinata la notifica.                                                                  |

**Importante:** Per ogni notifica, deve essere specificato **uno e uno solo** dei campi di targeting (`target`, `tecnicoId`, `categoriaId`).

---

## 3. Logica di Targeting (Come Inviare a Chi)

Per inviare una notifica, scegli una delle tre modalità seguenti.

### 3.1. Invia a TUTTI i Tecnici
Crea un documento con il campo `target` impostato su `'all'`.

**Esempio:**
```json
{
  "title": "Manutenzione Straordinaria Server",
  "body": "Dalle 18:00 alle 19:00 di oggi, i servizi potrebbero essere rallentati per manutenzione.",
  "createdAt": Timestamp.now(),
  "isRead": false,
  "letta": false,
  "target": "all"
}
```

### 3.2. Invia a un Singolo Tecnico
Crea un documento specificando il campo `tecnicoId` con l'UID del tecnico desiderato.

**Esempio:**
```json
{
  "title": "Documentazione Richiesta",
  "body": "Ciao Mario, per favore carica la foto della patente aggiornata nella tua anagrafica.",
  "createdAt": Timestamp.now(),
  "isRead": false,
  "letta": false,
  "tecnicoId": "ID_MARIO_ROSSI_XYZ"
}
```

### 3.3. Invia a una Categoria di Tecnici
Crea un documento specificando il campo `categoriaId` con l'ID della categoria desiderata (es. "Elettricisti", "Idraulici").

**Esempio:**
```json
{
  "title": "Nuovo Corso di Formazione",
  "body": "È stato schedulato un nuovo corso obbligatorio sulla sicurezza per tutti gli elettricisti.",
  "createdAt": Timestamp.now(),
  "isRead": false,
  "letta": false,
  "categoriaId": "ID_CATEGORIA_ELETTRICISTI"
}
```
---