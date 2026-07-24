```markdown
**A:** Sviluppatori App Tecnici
**DA:** App Master
**OGGETTO:** Specifica Tecnica Definitiva - Struttura Dati Rapportini

---

### **1. Introduzione**

Per assicurare la corretta elaborazione, fatturazione e analisi dei dati, questa specifica definisce il **contratto dati ufficiale e non negoziabile** per i documenti inviati alla collezione `rapportini` in Firestore. Il rispetto di questo standard è obbligatorio.

### **2. Struttura del Documento JSON**

Ogni singolo rapportino deve essere un documento JSON con la seguente struttura:

```json
{
  "id": "string",
  "idTecnico": "string",
  "nomeTecnico": "string",
  "data": "Timestamp",
  "idTipoGiornata": "string",
  "descrizioneTipoGiornata": "string",
  "ordineLavoro": "string | null",
  "oreLavorate": "number",
  "sede": {
    "idLuogo": "string",
    "descrizioneLuogo": "string",
    "idNave": "string | null",
    "nomeNave": "string | null"
  },
  "cliente": {
    "idCliente": "string",
    "ragioneSocialeCliente": "string"
  },
  "attivitaSvolte": "string",
  "trasferta": {
    "kmPercorsi": "number",
    "pedaggi": "number",
    "vitto": "number",
    "alloggio": "number"
  },
  "stato": "string",
  "metadata": {
    "createdAt": "Timestamp",
    "updatedAt": "Timestamp",
    "createdBy": "string"
  }
}
```

### **3. Dettaglio Campi e Regole di Compilazione**

| Campo | Obbligatorio? | Tipo Dati | Descrizione e Regole |
| :--- | :--- | :--- | :--- |
| **`id`** | **Sì** | `string` | UUID generato dal client. Chiave primaria del documento. |
| **`idTecnico`** | **Sì** | `string` | **UID Firebase Authentication** del tecnico. Questa è la fonte della verità. |
| **`nomeTecnico`** | **Sì** | `string` | Nome e Cognome del tecnico. Campo denormalizzato per nostra convenienza. |
| **`data`** | **Sì** | `Timestamp` | Data di riferimento del lavoro, come Timestamp Firestore. |
| **`idTipoGiornata`** | **Sì** | `string` | ID del documento dalla collezione `tipiGiornata`. Es: "LAVORO_ORD". |
| **`descrizioneTipoGiornata`** | **Sì** | `string` | Descrizione denormalizzata. Es: "Lavoro Ordinario". |
| **`ordineLavoro`** | Opzionale | `string \| null` | Riferimento alfanumerico dell'ordine di lavoro. Se non applicabile, `null`. |
| **`oreLavorate`** | **Sì** | `number` | Ore lavorate. Se `idTipoGiornata` non prevede lavoro (es. `FERIE`), questo valore **deve** essere `0`. |
| `sede.idLuogo` | Condizionale¹ | `string` | ID del documento dalla collezione `luoghi`. |
| `sede.descrizioneLuogo` | Condizionale¹ | `string` | Descrizione denormalizzata del luogo. |
| `sede.idNave` | Opzionale | `string \| null` | ID del documento dalla collezione `navi`. Se non applicabile, il valore deve essere `null`. |
| `sede.nomeNave` | Opzionale | `string \| null` | Nome denormalizzato della nave. Se non applicabile, il valore deve essere `null`. |
| `cliente.idCliente` | **Nuovo/Condizionale²** | `string` | **ID del documento dalla collezione `clienti`.** |
| `cliente.ragioneSocialeCliente`| **Nuovo/Condizionale²** | `string` | **Ragione sociale denormalizzata del cliente.** |
| **`attivitaSvolte`** | Condizionale¹ | `string` | Descrizione testuale del lavoro svolto. Può essere un testo lungo. |
| **`trasferta`** | **Sì** | `object` | Oggetto delle spese. Se non ci sono spese, inviare un oggetto con tutti i campi a `0`. |
| `trasferta.*` | **Sì** | `number` | Tutti i campi (`kmPercorsi`, `pedaggi`, `vitto`, `alloggio`) devono essere presenti e numerici. |
| **`stato`** | **Sì** | `string` | Workflow: `bozza` (in compilazione) o `confermato` (finale, pronto per l'elaborazione). |
| `metadata.*` | **Sì** | `Timestamp` / `string`| Tutti i campi (`createdAt`, `updatedAt`, `createdBy`) sono obbligatori per il tracciamento. `createdBy` deve coincidere con `idTecnico`. |

¹ **Condizionale¹**: Questi campi sono obbligatori se `oreLavorate > 0`.
² **Condizionale²**: **(NUOVO REQUISITO FONDAMENTALE)** L'oggetto `cliente` e i suoi campi sono **obbligatori** se `oreLavorate > 0`. Un'attività lavorativa deve **sempre** essere associata a un cliente per permettere la fatturazione. I rapportini di lavoro senza cliente non saranno considerati validi.

---

### **4. Regole Architetturali Fondamentali**

1.  **USARE SEMPRE GLI ID**: Per tutte le associazioni (tecnico, tipo giornata, luogo, nave, cliente), il campo `id*` è la fonte della verità. I campi con le descrizioni testuali sono solo copie di cortesia. La logica di business si baserà **esclusivamente** sugli ID.
2.  **IL CLIENTE È OBBLIGATORIO PER IL LAVORO**: Come da regola **Condizionale²**, non è più possibile registrare ore di lavoro senza specificare per quale cliente sono state svolte.
3.  **WORKFLOW DELLO STATO**: Noi processeremo in via definitiva solo i rapportini con `stato: "confermato"`. Assicuratevi che l'utente possa salvare `bozza` multiple, ma che esista un'azione chiara per confermare il rapportino e renderlo immutabile.

Il rispetto di queste specifiche è essenziale per la stabilità e la scalabilità dell'intero ecosistema.

Grazie per la collaborazione.
```
