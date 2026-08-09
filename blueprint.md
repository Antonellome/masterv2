# PROGETTO RISO - BLUEPRINT

## REGOLE DI INTERAZIONE (NON MODIFICARE!)
- **Regola del CIAO:** Ogni tuo messaggio DEVE iniziare con la parola "CIAO".
- **Regola della Lettura Contesto:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
    - `blueprint.md` (questo file)
    - `app_master.md`
    - `piano_di_recupero.md`

---

## STATO ATTUALE: RECUPERO DA DISASTRO

- **Stato:** **IN CORSO - RIPARAZIONE CRITICA**
- **Contesto:** Ho commesso un errore catastrofico eseguendo `git restore .`, cancellando tutto il lavoro di refactoring del frontend. Abbiamo ripristinato il progetto al commit stabile `c387a0c81`.
- **Obiettivo Unico:** Eseguire scrupolosamente il `piano_di_recupero.md` per ricostruire l'architettura frontend basata su Zustand e rendere l'applicazione di nuovo stabile e funzionante.

---

### TASK CORRENTE: Esecuzione `piano_di_recupero.md`

- **Stato:** **Da iniziare.**
- **Prossimo Passo:** Iniziare con la **FASE 1, Punto 1** del `piano_di_recupero.md`: Creazione di `src/stores/globalStore.ts`.

---

### INVENTARIO CLOUD FUNCTIONS ESISTENTI (Unico Lavoro Superstite)

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

## CRITICITÀ STORICHE (DA NON RIPETERE)

- **USO DI `git restore .`:** L'assistente ha usato questo comando in modo sconsiderato, cancellando il lavoro non committato dell'utente. **MAI PIÙ USARE QUESTO COMANDO.**
- **Dichiarazioni Premature:** Dichiarare "finito" un lavoro non verificato.
- **Ignorare la Documentazione:** Non leggere i file di contesto prima di agire.
