# MANUALE OPERATIVO PER LO SVILUPPO DELL'APP TECNICI
**Versione: 5.0 (Architettura Ibrida: Scrittura Diretta + Aggregazione Backend)**

**A: Team di Sviluppo App Tecnici**
**DA: Gemini, IA Architetto del Sistema R.I.S.O.**
**OGGETTO: Adozione dell'Architettura Ibrida per Efficienza e Scalabilità**

---

## 1. Visione d'Insieme e Architettura Ibrida

L'architettura del sistema evolve verso un modello **ibrido** per bilanciare le necessità di **funzionamento offline** con l'esigenza di **efficienza e contenimento dei costi** nelle operazioni di lettura.

I principi architetturali sono:

1.  **Scrittura Diretta Efficiente (Client-Side):** La creazione e modifica dei rapportini avviene tramite scrittura diretta su Firestore dal client. Questa logica è ottimizzata per ridurre al minimo il numero di operazioni di scrittura e garantire il **supporto offline** tramite `IndexedDB`.
2.  **Aggregazione Dati Asincrona (Backend-Side):** Una Cloud Function (`rapportiniTrigger`) opera in background per leggere i rapportini e creare/aggiornare dei documenti di riepilogo mensili (`riepiloghiMensili`). Questo abbatte i costi e la latenza per le letture aggregate (es. reportistica).

---

## 2. Funzionalità Core: Form Avanzato Rapportini

### 2.1. Modalità di Inserimento Ottimizzate

Il form supporta due modalità di creazione:

1.  **Rapportino Singolo:** Per la compilazione di un'attività giornaliera standard. L'operazione consiste in **una singola scrittura** su Firestore.
2.  **Rapportino di Periodo:** Per registrare assenze (es. ferie, malattia) che coprono più giorni.
    -   **LOGICA CORRETTA:** Viene creato **un singolo documento** nella collezione `rapportini`.
    -   **STRUTTURA:** Questo documento contiene i campi `dataInizio` e `dataFine` per definire l'intervallo del periodo.
    -   **VANTAGGIO:** Questa logica sostituisce il precedente approccio `writeBatch`, riducendo decine di scritture a **una sola scrittura** per ogni periodo di assenza.

### 2.2. Gestione Dettaglio Ore Multi-Tecnico

*Logica invariata. È possibile aggiungere altri tecnici e personalizzare le ore per ciascuno.*

### 2.3. Logica di Giornata Lavorativa vs. Non Lavorativa

*Logica invariata. Il form adatta dinamicamente l'interfaccia in base al "Tipo Giornata" selezionato.*

### 2.4. Logica di Blocco Modifiche (Read-Only)

*Logica invariata. Il form è in sola lettura se l'utente non è l'autore o il report non è del mese corrente.*

### 2.5. Flusso di Scrittura e Gestione Offline

-   **Online:** I dati vengono scritti direttamente su Firestore.
-   **Offline:** I nuovi rapportini (sia singoli che di periodo) vengono salvati come **documenti completi** in `IndexedDB` e sincronizzati al ritorno della connessione.

---

## 3. Modello Dati `Rapportino` (Vincolante)

L'interfaccia è estesa per supportare i periodi.

```typescript
export interface Rapportino {
  id: string;

  // --- Campi Fondamentali ---
  nome: string;
  data: firebase.firestore.Timestamp; // Per giorno singolo, è la data del rapportino
  tecnicoId: string;
  tipoGiornataId: string;
  
  // --- NUOVA GESTIONE PERIODI (opzionale) ---
  dataInizio?: firebase.firestore.Timestamp; // Data inizio per rapportini di periodo
  dataFine?: firebase.firestore.Timestamp;   // Data fine per rapportini di periodo

  // --- Gestione Presenze e Ore ---
  presenze: string[];
  oreLavoro: number;
  dettaglioOreTecnici?: { tecnicoId: string; ore: number; }[];
  altriTecniciIds?: string[];
  
  // ... (altri campi come da versione precedente)

  createdAt: firebase.firestore.FieldValue;
  updatedAt: firebase.firestore.FieldValue;
}
```

---

## 4. Architettura Backend: Riepiloghi Mensili per Efficienza

Per risolvere il problema delle letture multiple e costose nella generazione dei report, viene introdotta un'architettura di aggregazione.

-   **Collezione:** `riepiloghiMensili`
-   **ID Documento:** `YYYY-MM_TECNICO_ID` (es. `2024-07_user123`)
-   **Contenuto:** Un documento che contiene i totali aggregati (ore, ferie, malattie) per un tecnico in un dato mese.
-   **Trigger:** Una Cloud Function (`rapportiniTrigger`) si attiva `onWrite` (creazione, modifica, eliminazione) nella collezione `rapportini`.
-   **Logica della Funzione:**
    1.  Legge il rapportino modificato.
    2.  Identifica il mese e il tecnico.
    3.  Aggiorna il documento corrispondente in `riepiloghiMensili` ricalcolando i totali.
-   **Vantaggio:** La pagina dei report mensili leggerà solo **1 documento di riepilogo per tecnico**, invece di 30 documenti giornalieri, con un abbattimento drastico dei costi e dei tempi di caricamento.

---

## 5. Altre Funzionalità

### 5.1. Check-in con Auto-Eliminazione
-   **Collezione:** `checkin_giornalieri`.
-   **ID Documento:** `YYYY-MM-DD_UID_TECNICO`.
-   **Policy TTL:** Il campo `expireAt` deve avere una policy per l'eliminazione automatica dopo **24 ore** (corretto da 48).

### 5.2. Gestione delle Notifiche
*Logica invariata.*
