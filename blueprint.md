
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

## Stato Attuale e Visione Architetturale

L'applicazione è stabile. Il backend è stato rifattorizzato con successo su Cloud Functions v2. Il frontend è stato unificato e la base di codice è stata messa in sicurezza.

### Lezione Appresa: La Resilienza e la Sicurezza sono Fondamentali

1.  **Resilienza dei Dati:** L'uso di `.set({ ... }, { merge: true })` è un **principio architetturale non negoziabile** per tutte le operazioni di aggiornamento, garantendo la creazione di documenti mancanti e prevenendo errori di sincronizzazione tra Auth e Firestore.
2.  **Bonifica e Sicurezza del Repository:** È stata eseguita una profonda operazione di pulizia della cronologia Git per rimuovere credenziali di servizio esposte (`gcloud-service-key.json`). È stato implementato un file `.gitignore` robusto per prevenire future inclusioni di file sensibili e cartelle di build, garantendo la sicurezza e l'integrità del repository.

### Visione Frontend Unificata [COMPLETATA]

La pagina `Tecnici` è ora il centro di controllo unico per l'anagrafica e la gestione degli accessi, eliminando la precedente confusione.

---

## Reset Architetturale e Nuovo Vocabolario

| Termine | Descrizione | Collezione Firestore | Sezione nell'App Master |
| :--- | :--- | :--- | :--- |
| **Amministratore** | Utente ufficio con pieni poteri sull'App Master. | `amministratori` | `Impostazioni > Amministratori` |
| **Tecnico** | Anagrafica dell'operaio con stato di accesso integrato. | `tecnici` | **`Tecnici` (Pagina Principale Unificata)** |

---

## Architettura Backend (Cloud Functions v2)

- **`setAdminClaim`**: Imposta i custom claims. **Stato: COMPLETATO (v2)**.
- **`manageAccess`**: Gestisce l'abilitazione/disabilitazione dei tecnici. **Stato: COMPLETATO (v2) e RESILIENTE**.
- **`getMasterData`**: Recupera tutti i dati anagrafici. **Stato: COMPLETATO (v2)**.

---

## Piano di Allineamento Architetturale Post-Fix [DA ESEGUIRE]

**Premessa:** È stato creato un hook `useData` per risolvere un bug critico e centralizzare il fetching dei dati. Questo hook attualmente legge i dati direttamente da Firestore (lettura client-side). Il `chat_log.txt` prevede una gestione più centralizzata tramite Cloud Functions. Questo piano delinea i passi per completare l'allineamento.

1.  **Anagrafiche e Tecnici (Gestione Centralizzata):**
    *   **Problema:** Attualmente i dati di `tecnici` e `anagrafiche` vengono letti da ogni client. Sebbene efficiente per la lettura, la gestione delle modifiche (CRUD) è decentralizzata.
    *   **Soluzione (`chat_log.txt`):** Centralizzare la logica di business. La funzione `getMasterData` (già v2) è il punto di partenza. Verrà estesa per diventare l'endpoint unico per recuperare **tutti** i dati anagrafici necessari, garantendo che il client riceva sempre un set di dati coerente e validato dal backend.
    *   **Azione:** Modificare l'hook `useData` affinché, invece di fare snapshot diretti, invochi la Cloud Function `getMasterData` per ricevere un pacchetto di dati completo (`tecnici`, `anagrafiche`, etc.).

2.  **Rapportini (Logica di Business su Backend):
    *   **Problema:** La logica dei rapportini (es. calcoli, validazioni) è attualmente implicita nel frontend. L'hook `useData` legge i dati grezzi.
    *   **Soluzione (`chat_log.txt`):** La Cloud Function `syncDataTrigger` (da implementare) deve diventare il motore della logica di business. Quando un rapportino viene creato o modificato (dall'app dei tecnici), questo trigger dovrebbe eseguire tutte le operazioni necessarie (es. aggiornare totali, inviare notifiche, validare dati) e salvare il risultato pulito in Firestore.
    *   **Azione:** Implementare la funzione `syncDataTrigger`. L'app Master (tramite `useData`) continuerà a leggere la collezione `rapportini`, ma questa conterrà dati già processati e validati dal backend, non più dati grezzi.

---

## Programma di Lavoro Dettagliato

- **Fase 0-4 [COMPLETATE]**
- **Fase 5: Implementazione Funzionalità 'Presenze' (ex Check-in) [IN CORSO]**
  - **Obiettivo:** Creare una dashboard giornaliera per monitorare la dislocazione della forza lavoro.
  - **Flusso Dati:** L'app dei tecnici invia un check-in selezionando da una lista predefinita.
  - **Fonte della Verità:** La collezione `anagrafiche` è l'unica fonte per la lista di navi e luoghi. Questo garantisce coerenza dei dati.
  - **Piano di Azione:
**
    1.  **Pagina `PresenzePage.tsx` (App Master):**
        - **Layout:** Pagina divisa in due sezioni.
        - **Header:** Mostra la data odierna.
        - **Sezione 1 - Filtri:** Aggiungere un `TextField` per il nome del tecnico e due menu a tendina (`Select`) per `nave` e `luogo`, popolati dalla collezione `anagrafiche`.
        - **Sezione 2 - Riepilogo Aggregato:** Creare una tabella che mostri, per ogni `nave/luogo`, il **conteggio** dei tecnici presenti.

    2.  **Backend (Nuova Cloud Function):**
        - **Creare la funzione `submitCheckIn` (Callable):** Riceverà l'ID dell'anagrafica (`anagraficaId`). Il nome del tecnico e l'ID verranno recuperati dal contesto di autenticazione per sicurezza.
        - **Logica:** Salverà un nuovo documento nella collezione `checkins`.
        - **Struttura Documento:** `{ tecnicoId: string, tecnicoNome: string, anagraficaId: string, anagraficaNome: string, timestamp: Timestamp }`. Il `anagraficaNome` verrà aggiunto per denormalizzazione, semplificando le letture.

    3.  **Regole di Sicurezza e Dati:**
        - **Firestore Rules:** Aggiornare `firestore.rules` per permettere la scrittura dei check-in solo ai diretti interessati e la lettura solo agli amministratori.
        - **TTL (Time-To-Live):** Impostare una policy TTL sulla collezione `checkins` per l'**eliminazione automatica dei documenti dopo 24 ore**. Questo è FONDAMENTALE per la gestione dei costi.

    4.  **Integrazione App Mobile (Fase Successiva):** L'app dei tecnici dovrà recuperare la lista dalla collezione `anagrafiche` per popolare un menu a tendina e, alla selezione, invocare la funzione `submitCheckIn` con l'ID scelto.
