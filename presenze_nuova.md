# Specifiche per la Lettura dei Dati di Check-in (Lato Master)

**Data Ultimo Aggiornamento:** 31/07/2024

Questo documento fornisce le specifiche tecniche essenziali e corrette per leggere e interpretare i dati di check-in inviati dalle app dei tecnici.

---

## 1. Collezione Firestore di Riferimento

I dati di presenza sono archiviati nella seguente collezione Cloud Firestore:

- **Nome Collezione:** `checkin_giornalieri`

---

## 2. Struttura del Documento (`checkin_giornalieri`)

Ogni documento rappresenta un singolo evento atomico (es. inizio giornata, entrata in un luogo). Per ricostruire la giornata di un tecnico, è necessario leggere tutti i suoi documenti in ordine cronologico.

| Campo                | Tipo Dati        | Descrizione                                                                                                   |
|----------------------|------------------|---------------------------------------------------------------------------------------------------------------|
| `id`                 | `string`         | L'ID univoco del documento, generato da Firestore.                                                             |
| `tecnicoId`          | `string`         | **Chiave fondamentale.** L'UID Firebase del tecnico a cui l'evento si riferisce. Da usare per le query.        |
| `tecnicoName`        | `string`         | Il nome visualizzato del tecnico al momento della creazione dell'evento.                                       |
| `tipo`               | `string`         | **Campo critico per la logica.** Indica il tipo di evento. Valori possibili:
                                                                                                                  | - `inizio_giornata`
                                                                                                                  | - `fine_giornata`
                                                                                                                  | - `check_in_luogo`
                                                                                                                  | - `check_out_luogo` |
| `timestampImpostato` | `string` (ISO)   | **Timestamp di riferimento.** L'orario scelto manualmente dal tecnico per l'evento, in formato stringa ISO 8601 (es. `"2024-07-31T08:00:00"`). **Usare questo campo per ordinare gli eventi.** |
| `timestampReale`     | `string` (ISO)   | L'orario effettivo del dispositivo al momento della creazione dell'evento. Può essere usato per verifiche.     |
| `luogoId`            | `string`         | (Opzionale) L'ID del documento nella collezione `luoghi` (presente solo per `check_in_luogo` e `check_out_luogo`). |
| `naveId`             | `string`         | (Opzionale) L'ID del documento nella collezione `navi` (presente solo per `check_in_luogo` e `check_out_luogo`).     |
| `userId`             | `string`         | L'UID Firebase di chi ha materialmente creato il record (solitamente coincide con `tecnicoId`).              |
| `timestampSync`      | `Timestamp`      | Il timestamp di Firestore che indica quando il record è stato sincronizzato dal dispositivo al cloud.        |

---

## 3. Come Leggere e Ricostruire i Dati

Per ottenere un quadro completo delle presenze di uno o più tecnici, segui questi passaggi:

1.  **Interrogazione della Collezione:** Esegui una query sulla collezione `checkin_giornalieri`.
2.  **Filtro per Tecnico (Opzionale ma Raccomandato):** Per visualizzare i dati di un singolo tecnico, filtra i documenti per `tecnicoId`.
3.  **Ordinamento Cronologico:** **È fondamentale** ordinare i documenti in base al campo `timestampImpostato` in ordine ascendente (`asc`) per ricostruire correttamente la sequenza degli eventi della giornata.

### Esempio di Query (Javascript - SDK v9)

```javascript
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase-config"; // La tua configurazione Firebase

// Funzione per ottenere gli eventi di un tecnico in ordine cronologico
async function getCheckinEventsByTecnico(tecnicoId) {
  const collectionRef = collection(db, "checkin_giornalieri");

  const q = query(
    collectionRef,
    where("tecnicoId", "==", tecnicoId),
    orderBy("timestampImpostato", "asc") // Ordinamento fondamentale
  );

  const querySnapshot = await getDocs(q);

  const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return events;
}

// Esempio di utilizzo
const tecnicoDaCercare = "uid_del_tecnico_qui";
getCheckinEventsByTecnico(tecnicoDaCercare).then(events => {
  console.log(`Eventi per il tecnico ${tecnicoDaCercare}:`, events);
  // Qui puoi processare l'array 'events' per visualizzare la timeline
});
```

### Ricostruzione della Timeline

Una volta ottenuto l'array di eventi ordinato, puoi iterarlo per ricostruire la giornata:

- Un evento `inizio_giornata` segna l'inizio delle attività.
- Un `check_in_luogo` indica l'ingresso in un cantiere (identificato da `luogoId` o `naveId`).
- Un `check_out_luogo` indica l'uscita.
- Un `fine_giornata` chiude tutte le attività.

Combinando queste informazioni, puoi calcolare le ore di presenza totali e quelle trascorse in ogni singolo luogo.