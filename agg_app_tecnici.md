
# Analisi e Proposte di Miglioramento: App Tecnici

**Data Analisi:** 24/05/2024
**Autore:** Gemini AI (per conto del team Tecnici)

---

## 1. Panoramica Generale e Stato Attuale

L'applicazione per i tecnici ha raggiunto un punto di svolta cruciale. Dopo un'intensa fase di stabilizzazione, i problemi critici di performance (`Resource exhausted`) causati da un'architettura ibrida e non ottimizzata sono stati **risolti**. L'app ora adotta in modo più coerente un'architettura **offline-first**, basata su un database locale (Dexie) per le letture e su chiamate a Cloud Functions (Backend v2) per le scritture.

Questo documento analizza lo stato attuale di ogni pagina, identifica le aree di miglioramento rimanenti e formalizza le richieste necessarie al team dell'App Master per completare la transizione e abilitare nuove funzionalità.

---

## 2. Analisi Dettagliata per Pagina

### `ReportListPage.tsx` (Lista Rapportini)
*   **Stato Attuale:** **OTTIMALE**. Completamente refattorizzata.
*   **Caratteristiche:**
    *   **Fonte Dati:** Legge i dati esclusivamente dal database locale Dexie, garantendo caricamento istantaneo e funzionamento offline.
    *   **Logica Dati:** Tutta la complessità di caricamento, arricchimento e ordinamento dei dati è stata spostata nell'hook `useEnrichedRapportini.ts`, rendendo il componente UI pulito e focalizzato sulla visualizzazione.
    *   **Performance:** Eccellenti. Nessuna chiamata di rete diretta blocca il rendering.
    *   **UI:** Mostra una lista mensile navigabile dei rapportini, con indicatori visivi per stato (offline), firma e creatore.

### `NuovoRapportinoPage.tsx` (Creazione/Modifica Rapportino)
*   **Stato Attuale:** **OTTIMALE**. Completamente refattorizzata.
*   **Caratteristiche:**
    *   **Modalità Creazione:** L'utente compila un form vuoto.
    *   **Modalità Modifica:** I dati del rapportino vengono caricati istantaneamente dal database locale Dexie.
    *   **Logica di Salvataggio:** Utilizza il service `rapportiniService.ts` per chiamare le Cloud Functions `createRapportino` e `updateRapportino`. L'interazione con il backend è asincrona e non blocca l'UI.
    *   **UX:** L'interfaccia è reattiva. L'utente può compilare e salvare i dati in modo fluido, con un feedback chiaro sullo stato del salvataggio.

### `ReportMensilePage.tsx` (Report Mensile)
*   **Stato Attuale:** **CRITICO / DA RIFARE**.
*   **Caratteristiche:**
    *   **Fonte Dati:** Attualmente utilizza una chiamata diretta a Firestore (`getDocs`). Sebbene il loop infinito sia stato fermato, questo approccio viola l'architettura offline-first.
    *   **Performance:** Scadenti. La pagina richiede una connessione a internet per funzionare e il caricamento è lento.
    *   **Debito Tecnico:** Rappresenta l'ultimo residuo significativo della vecchia architettura. È una potenziale fonte di instabilità e costi futuri.

### `NotificationsPage.tsx` (Pagina Notifiche)
*   **Stato Attuale:** **INCOMPLETA / BLOCCATA**.
*   **Caratteristiche:**
    *   **UI:** La struttura base della pagina esiste, ma è vuota o contiene dati fittizi.
    *   **Funzionalità Mancante:** Non esiste un meccanismo per recuperare le notifiche dal backend, né per segnarle come lette/interagite.
    *   **Blocco:** Lo sviluppo è fermo in attesa della creazione delle necessarie Cloud Functions da parte dell'App Master.

### `AnagraficaForm.tsx` e altre Pagine Anagrafiche
*   **Stato Attuale:** **FUNZIONALE MA DA VERIFICARE**.
*   **Caratteristiche:**
    *   Anche queste sezioni sono state create con logica di accesso diretto a Firestore.
    *   Sebbene un primo fix abbia mitigato i loop, non sono ancora state allineate all'architettura basata su Cloud Functions e DB locale.
    *   **Funzionalità:** Permettono la visualizzazione e (potenzialmente) la modifica delle anagrafiche (navi, luoghi, ecc.).

---

## 3. Piano di Lavoro e Richieste Post-Analisi

### Azioni Interne (App Tecnici)

1.  **Refactoring Immediato di `ReportMensilePage.tsx`:**
    *   **Obiettivo:** Allineare la pagina all'architettura offline-first.
    *   **Azioni:** Rimuovere la chiamata a `getDocs` e collegare il componente all'hook `useEnrichedRapportini` (o crearne uno specifico se le esigenze di dati sono diverse) per leggere i dati dal DB locale.

2.  **Verifica e Refactoring delle Pagine Anagrafiche:**
    *   **Obiettivo:** Assicurarsi che anche la gestione delle anagrafiche segua il pattern corretto.
    *   **Azioni:** Analizzare le pagine dedicate alle anagrafiche. Sostituire le chiamate dirette a Firestore con letture dal DB locale. Le modifiche (se permesse ai tecnici) dovranno usare le Cloud Functions `aggiornaAnagrafica`.

### Azioni Esterne (Richieste per App Master)

Di seguito le specifiche per le Cloud Functions necessarie all'App Tecnici, da implementare e deployare a cura del team App Master.

**Sezione: Notifiche**

1.  **NUOVA Cloud Function: `getNotifiche`**
    *   **Scopo:** Recuperare l'elenco delle notifiche destinate a un tecnico specifico.
    *   **Trigger:** HTTPS Request.
    *   **Input (`data`):** `{ lastFetchTimestamp: number | null }` (per recuperare solo le notifiche nuove dall'ultima sincronizzazione).
    *   **Logica:**
        1.  Autentica l'utente tramite token.
        2.  Interroga la collection `notifiche` (o simile) filtrando i documenti dove il `tecnicoId` corrisponde all'UID dell'utente autenticato.
        3.  Se `lastFetchTimestamp` è fornito, aggiunge un filtro per `createdAt > lastFetchTimestamp`.
        4.  Restituisce un array di oggetti notifica.
    *   **Output (`result.data`):** `[{ id: string, titolo: string, corpo: string, tipo: string, dataCreazione: Timestamp, letto: boolean, ...altriDati }]`

2.  **NUOVA Cloud Function: `markNotificaAsRead`**
    *   **Scopo:** Segnare una o più notifiche come lette.
    *   **Trigger:** HTTPS Request.
    *   **Input (`data`):** `{ notificaIds: string[] }` (un array di ID di notifiche da aggiornare).
    *   **Logica:**
        1.  Autentica l'utente.
        2.  Per ogni ID in `notificaIds`, verifica che il documento esista e che appartenga all'utente autenticato.
        3.  Aggiorna il campo `letto` a `true` per ogni notifica validata.
    *   **Output:** `{ success: true, updatedCount: number }`

**Sezione: Rapportini**

1.  **MODIFICA Cloud Function: `createRapportino` e `updateRapportino`**
    *   **Scopo:** Includere l'invio di notifiche push ai tecnici menzionati.
    *   **Modifica Richiesta:** Dopo aver creato o aggiornato con successo un rapportino, la funzione deve:
        1.  Controllare il campo `altriTecniciIds` (o `partecipanti`).
        2.  Per ogni ID tecnico presente (escluso il creatore), recuperare il suo token di notifica dal documento utente.
        3.  Inviare una notifica push (tramite FCM) a quel tecnico, informandolo che è stato aggiunto a un rapportino. Esempio: `"Sei stato aggiunto al rapportino di [Nome Creatore] del [Data]."`

**Sezione: Anagrafiche**

1.  **VERIFICA Cloud Function Esistenti:**
    *   Confermare che le funzioni `creaAnagrafica`, `aggiornaAnagrafica`, `eliminaAnagrafica` siano pienamente operative e gestiscano correttamente i permessi (es. un tecnico potrebbe non avere il permesso di creare/eliminare, ma solo di leggere).
    *   Assicurarsi che `syncAllAnagrafiche` fornisca tutti i dati necessari all'app Tecnici per funzionare offline.

---
