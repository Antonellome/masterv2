# Specifiche di Integrazione: Dati Check-in - v4 (FINALE E CORRETTA)

**A:** Sviluppatore App Master
**Da:** Sviluppatore App Tecnici
**Oggetto:** **(REVISIONE FINALE E OBBLIGATORIA)** Struttura dati per la pagina "Presenze".

**Nota di Revisione:** Questa versione è l'unica valida. È basata sull'ispezione diretta di un documento nel database Firestore. Tutte le versioni precedenti sono errate e devono essere ignorate e distrutte.

---

## 1. Fonte dei Dati

La collection di primo livello su Firestore che contiene i dati è:

**`checkin_giornalieri`**

---

## 2. Struttura del Dato Reale su Firestore

Ogni documento nella collection `checkin_giornalieri` ha la seguente struttura. **QUESTA È LA VERITÀ.**

| Nome Campo           | Tipo Dati Firestore | Descrizione                                                                 | Esempio Reale                                |
| -------------------- | ------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| **`id`**             | `string`            | ID univoco del record, generato localmente.                                 | `"local_1790887237654..."`                   |
| **`tecnicoId`**      | `string`            | UID del tecnico. Da usare per join e filtri.                                | `"IDAvSZayB1XBnF4E8CLHJAoYpqe2"`             |
| **`tecnicoName`**    | `string`            | Nome e cognome del tecnico. **DA USARE PER LA VISUALIZZAZIONE.**            | `"Antonio Scuderi"`                          |
| **`tipo`**           | `string`            | Tipo di evento registrato.                                                  | `"inizio_giornata"`                          |
| **`data`**           | `string`            | La data dell'evento in formato `YYYY-MM-DD`.                                | `"2026-10-01"`                               |
| **`timestampImpostato`** | `string`            | Data e ora scelte dal tecnico, in formato stringa ISO 8601 UTC.             | `"2026-10-01T05:30:00.000Z"`                 |
| **`timestampReale`**   | `string`            | Data e ora effettive della registrazione, in formato stringa ISO 8601 UTC.  | `"2026-10-01T20:40:37.654Z"`                 |
| **`timestampSync`**    | `Timestamp`         | Timestamp di Firestore che indica quando il record è stato sincronizzato. | `1 ottobre 2026 alle 22:40:37 UTC+2`         |
| **`checkIn`**        | `string`            | *Campo legacy/duplicato, si può ignorare in favore di `timestampImpostato`.* | `"2026-10-01T20:40:37.654Z"`                 |
| **`checkOut`**       | `string`            | *Campo legacy/duplicato, si può ignorare.*                                  | `"2026-10-01T20:40:37.654Z"`                 |
| **`userId`**         | `string`            | *Campo legacy/duplicato di `tecnicoId`, si può ignorare.*                    | `"IDAvSZayB1XBnF4E8CLHJAoYpqe2"`             |
| **`luogoId` / `naveId`** | `string`        | (Condizionali) ID di luogo o nave, presenti solo negli eventi `check_in_luogo`/`check_out_luogo`. | N/A nell'esempio, ma presenti in altri doc. |

---

## 3. Requisiti Funzionali per la Pagina "Presenze" (App Master)

I requisiti restano gli stessi, ma devono usare i campi corretti:

*   **Dati Visualizzati (Colonne):**
    1.  **Data:** Usare il campo `data`.
    2.  **Tecnico:** Usare `tecnicoName`.
    3.  **Tipo Evento:** Usare `tipo` (formattato in modo leggibile, es. "Inizio Giornata").
    4.  **Ora Impostata:** Estrarre e formattare l'orario da `timestampImpostato`.
    5.  **Ora Reale:** Estrarre e formattare l'orario da `timestampReale`.

*   **Filtri:**
    *   **Filtro Tecnico:** Filtrare su `tecnicoId`.
    *   **Filtro Data:** Filtrare sul campo `data`.
    *   **Filtro Luogo/Nave:** Filtrare sui campi `luogoId` o `naveId`.

Il resto delle specifiche (PDF, condivisione, navigazione mensile) rimane invariato.

