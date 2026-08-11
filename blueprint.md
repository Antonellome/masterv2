# Blueprint Applicazione: Gestione Lavoro SRL

*Questo documento serve come fonte di verità per lo sviluppo, il design, l'architettura e la roadmap dell'applicazione. Viene aggiornato ad ogni cambiamento significativo.*

---

## 1. Stato Attuale: RECUPERO DA DISASTRO

- **Contesto:** In seguito a un errore catastrofico dell'assistente AI, l'intero refactoring del frontend è stato perso. L'applicazione è stata riportata a uno stato precedente, instabile e non funzionante.
- **Obiettivo Primario:** Ricostruire il lavoro perduto seguendo scrupolosamente il `piano_di_recupero.md`.
- **Verità Architetturale:** L'architettura **target**, che era già stata raggiunta, prevede l'uso di **Cloud Functions** per tutte le scritture e di **Zustand** per lo stato globale. Questo è l'obiettivo che dobbiamo ri-raggiungere.

---

## 2. Inventario Cloud Functions (Lavoro Superstite)

*Questa sezione elenca le funzioni backend già implementate e funzionanti, che rappresentano l'unica parte del lavoro di refactoring sopravvissuta al disastro. L'applicazione client DEVE usare queste funzioni.*

| Funzione | Trigger | Regione |
| :--- | :--- | :--- |
| `updateVeicolo` | Richiesta HTTPS | `us-central1` |
| `updateTecnico` | Richiesta HTTPS | `us-central1` |
| `createDitta` | Richiesta HTTPS | `us-central1` |
| `updateCliente` | Richiesta HTTPS | `us-central1` |
| `deleteCliente` | Richiesta HTTPS | `us-central1` |
| `updateRapportino`| Richiesta HTTPS | `us-central1` |
| `deleteVeicolo` | Richiesta HTTPS | `us-central1` |
| `createRapportino`| Richiesta HTTPS | `us-central1` |
| `deleteTecnico` | Richiesta HTTPS | `us-central1` |
| `deleteRapportino`| Richiesta HTTPS | `us-central1` |
| `createVeicolo` | Richiesta HTTPS | `us-central1` |
| `updateDitta` | Richiesta HTTPS | `us-central1` |
| `deleteDitta` | Richiesta HTTPS | `us-central1` |
| `createCliente` | Richiesta HTTPS | `us-central1` |
| `createTecnico` | Richiesta HTTPS | `us-central1` |
| `makeuppercase` | Scrittura Firestore | `us-central1` |

---

## 3. Piano di Lavoro Attuale

**Obbligo Assoluto:** Seguire il file `piano_di_recupero.md` senza alcuna deviazione. Quel documento contiene la sequenza esatta di azioni per ricostruire il frontend.

- **TASK CORRENTE:** Risolvere il crash dell'applicazione causato dal file `RapportinoEdit.tsx` che utilizza ancora logiche obsolete.
- **PROSSIMA AZIONE:** Modificare `RapportinoEdit.tsx` per:
    1. Usare l'hook `useData()` per il caricamento dati.
    2. Usare le Cloud Functions `createRapportino` e `updateRapportino` per il salvataggio dei dati.
