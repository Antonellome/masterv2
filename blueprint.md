
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

L'applicazione è stabile. Il backend è stato rifattorizzato con successo su Cloud Functions v2. La sfida principale si è rivelata essere la gestione delle incoerenze dei dati tra Firebase Authentication e Firestore, unita a problemi di caching aggressivo durante il deploy.

### Lezione Appresa: La Resilienza è la Chiave

La battaglia con la funzione `manageAccess` ha insegnato una lezione fondamentale: **il codice deve essere resiliente alle incoerenze dei dati.**

- **Il Problema:** Un utente poteva esistere in Authentication ma non avere un documento corrispondente in Firestore. Il metodo `.update()` falliva, creando un errore di sincronizzazione.
- **La Soluzione Definitiva:** L'uso di `.set({ abilitato: ... }, { merge: true })` è diventato un **principio architetturale non negoziabile** per tutte le operazioni di aggiornamento stato. Questo garantisce che se un documento non esiste, viene creato, sanando automaticamente l'incoerenza.
- **La Strategia "Terra Bruciata":** Per superare i problemi di caching di Firebase, è stata adottata una procedura di deploy forzato che prevede la cancellazione manuale della cache di compilazione (`functions/lib`) prima di ogni deploy critico.

### Visione Frontend Unificata

La separazione tra anagrafica e gestione accessi ha creato confusione. La nuova direzione è chiara:

- **Pagina `Tecnici` Unificata:** Questa pagina diventerà il centro di controllo unico per tutto ciò che riguarda i tecnici. Conterrà sia i dati anagrafici sia lo switch per l'abilitazione all'app mobile. Non ci saranno più tab o sezioni separate.

---

## Reset Architetturale e Nuovo Vocabolario

### Il Nuovo Vocabolario Unico

| Termine | Descrizione | Collezione Firestore | Sezione nell'App Master |
| :--- | :--- | :--- | :--- |
| **Amministratore** | Utente ufficio con pieni poteri sull'App Master. | `amministratori` | `Impostazioni > Amministratori` |
| **Tecnico** | Anagrafica dell'operaio con stato di accesso integrato. | `tecnici` | **`Tecnici` (Pagina Principale Unificata)** |

## Architettura Applicativa

### Flusso 1: Check-in Giornaliero
- **Scopo:** Tracciamento rapido della posizione di inizio lavoro dei tecnici.
- **App Master:** Pagina "Presenze" > tab "Check-in".
- **Regola Dati (RISCHIO COSTI):** La policy TTL per l'auto-eliminazione dei documenti dopo 24 ore è fondamentale. **STATO: NON VERIFICABILE DAL CODICE.** Se non attiva, i costi aumenteranno.

## Architettura Backend (Cloud Functions v2)

### Funzioni di Gestione (Callable)
- **`setAdminClaim`**: Imposta i custom claims. **Stato: COMPLETATO (v2)**.
- **`manageAccess`**: Gestisce l'abilitazione/disabilitazione dei tecnici. **Stato: COMPLETATO (v2) e RESILIENTE**.
- **`getMasterData`**: Recupera tutti i dati anagrafici in una sola chiamata. **Stato: COMPLETATO (v2) e OTTIMIZZATO PER I COSTI**.

## Programma di Lavoro Dettagliato

- **Fase 0-2 [COMPLETATE]**
- **Fase 3: Refactoring Frontend MASTER [IN CORSO]** - Allineare l'interfaccia alla visione della Pagina `Tecnici` Unificata.
- **Fase 4: Refactoring Frontend TECNICI**

