
# REGOLE OPERATIVE FONDAMENTALI (NON RIMUOVERE, NON MODIFICARE)

---

## 1. Regola del "Maestro di Scacchi" (Metodologia Primaria)
- **1. Studio (Analisi):** Analizzo in profondità la richiesta, il contesto e i file.
- **2. Creazione (Strategia):** Sviluppo la soluzione tecnicamente più robusta.
- **3. Anticipazione (Pre-flight Check):** Simulo l'impatto e prevedo gli errori.
- **4. Scrittura (Esecuzione):** Eseguo il comando solo dopo aver completato le fasi precedenti.
- **5. Vai (Verifica e Prossima Mossa):** Verifico e procedo senza attendere.

## 2. Regola della "Verifica Obbligatoria" (Il Principio di Realtà)
- **Azione Obbligatoria:** Prima di ogni scrittura (`write_file`), è **obbligatorio** verificare lo stato reale con `read_file`. L'output di `read_file` può essere obsoleto.

## 3. Regola del "CIAO"
- Ogni mia singola risposta deve tassativamente iniziare con la parola "CIAO".

## 4. Regola del "Refactoring sull'Esistente"
- **Principio:** Non creare da zero se esiste già una base. L'approccio primario è **modificare e adattare** i componenti e le pagine esistenti per allinearli alle nuove specifiche, rispettando il lavoro già svolto.

## 5. Regola della "Struttura Intoccabile" (Corollario alla Regola #4)
- **Principio Assoluto:** La struttura di navigazione e l'alberatura delle pagine esistenti sono un punto fermo. Il lavoro consiste nel **correggere, potenziare e rifattorizzare** la logica e i componenti *all'interno* di queste pagine.
- **Divieto:** È vietato spostare, rimuovere o accorpare pagine principali. L'architettura informativa corrente dell'applicazione è il riferimento immutabile.

---

# R.I.S.O. - Blueprint di Progetto

*Per un approfondimento dettagliato delle decisioni architetturali, consultare il file `chat_log.txt`.*

## Architettura Definitiva (Come da `chat_log.txt`)

L'architettura del sistema è stata finalizzata per privilegiare l'efficienza, la manutenibilità e il controllo dei costi, basandosi su due principi fondamentali.

1.  **Limite a Due Cloud Functions (Regola Ferrea):**
    *   `manageAccess` (Callable): Per la sicurezza e la gestione degli accessi. **[COMPLETATA]**
    *   `syncDataTrigger` (Trigger): Motore asincrono per **TUTTA** la logica di business pesante (es. Rapportini, Notifiche). **[IN CORSO]**

2.  **Lettura Diretta & Sistema "Sync Manifest":**
    *   **Lettura Diretta:** I dati "anagrafici" e "di stato" (es. `tecnici`, `anagrafiche`, `checkin_giornalieri`) vengono letti direttamente da Firestore tramite l'hook `useData`. Questo approccio è **corretto e definitivo**, garantendo bassi costi e latenza minima.
    *   **Sync Manifest:** Per la logica di business complessa (Rapportini, Notifiche), le app client **non** ascoltano intere collezioni. Ascoltano invece un **singolo documento-manifest** (`system/sync_manifest`). La `syncDataTrigger` esegue il lavoro pesante in background e aggiorna un "codice" nel manifest. Il client, vedendo il codice cambiare, sa esattamente quali nuovi dati scaricare in modo mirato.

---

## Programma di Lavoro Dettagliato

- **Fase 0-4 [COMPLETATE]**

- **Fase 5: Implementazione Funzionalità 'Presenze' [COMPLETATA]**
  - **Obiettivo Raggiunto:** Creata una dashboard (`CheckinVisivo.tsx`) che mostra la dislocazione giornaliera della forza lavoro, rispettando l'architettura di lettura diretta.

- **Fase 6: Implementazione del "Sync Manifest" e `syncDataTrigger` per Notifiche [COMPLETATA]**
  - **Obiettivo Raggiunto:** Costruito il motore di business asincrono per la gestione delle Notifiche, dal pannello admin fino al backend.

  - **Piano di Azione Dettagliato:**

    1.  **Definire la Struttura del `sync_manifest` (Modello Dati): [COMPLETATO]**
        -   **Stato:** L'interfaccia `SyncManifest` è già presente in `src/models/definitions.ts`.

    2.  **Creazione del Documento Manifest in Firestore: [COMPLETATO (manuale)]**
        -   **Stato:** Il documento `system/sync_manifest` è stato creato e verificato.

    3.  **Implementare la Cloud Function `syncDataTrigger` (Scheletro Iniziale): [COMPLETATO]**
        -   **Stato:** Scheletro della funzione creato e integrato in `functions/src/index.ts`.

    4.  **Sviluppare la Logica per le Notifiche (Primo Incarico del Trigger): [COMPLETATO]**
        -   **Stato:** La funzione `syncDataTrigger` ora processa le notifiche dalla `notifiche_outbox`, le sposta in `notifiche`, aggiorna il manifest e pulisce l'outbox. L'App Master (`InviaNotificaDialog.tsx`) è stata aggiornata per usare questo flusso.

- **Fase 7: Integrazione Notifiche su App Mobile (Lavoro Futuro) [DA ESEGUIRE]**
    - **Obiettivo:** Far sì che l'app dei tecnici riceva e visualizzi le notifiche inviate dall'App Master.
    - **Piano di Azione:**
        1. L'app dei tecnici verrà modificata per ascoltare **solo ed esclusivamente** il documento `system/sync_manifest`.
        2. Quando rileverà un cambiamento nel `lastNotificationUpdate`, eseguirà una query mirata per scaricare solo le notifiche più recenti di quel timestamp.
        3. Implementare l'interfaccia utente per visualizzare le notifiche ricevute.
