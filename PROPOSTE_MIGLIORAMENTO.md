# Proposte di Miglioramento - Applicazione RISO

Questo documento elenca tutte le potenziali correzioni, ottimizzazioni e migliorie identificate durante la fase di analisi. Ogni punto verrà discusso prima di un'eventuale implementazione.

---

### Area: Performance & Costi

1.  **Rifattorizzare il Caricamento Dati dei Rapportini (Criticità Massima)**
    *   **File Coinvolti:** `src/components/Reportistica/RicercaAvanzata.tsx`, `src/components/Reportistica/ReportMensili.tsx`, `src/pages/DashboardPage.tsx`.
    *   **Problema:** Due dei tre componenti di reportistica e la dashboard scaricano **l'intera collezione `rapportini`** da Firestore per poi filtrare i dati lato client. Questo è il problema di performance più grave dell'applicazione, non è scalabile e genera costi non necessari.
    *   **Soluzione Proposta:** Adottare universalmente un approccio "query-first". La logica di filtro deve essere spostata da lato client a lato server, costruendo **query Firestore dinamiche** basate sui filtri dell'utente. Il componente `AnalisiOre.tsx` usa già una versione parziale di questa tecnica, dimostrandone la fattibilità e l'efficacia.

2.  **Eliminare Letture Ridondanti nell'Esportazione PDF**
    *   **File Coinvolto:** `src/components/Reportistica/ReportMensili.tsx`
    *   **Problema:** La funzione di esportazione PDF riesegue una `getDoc` per ogni singolo rapportino, causando letture non necessarie e rallentando il processo.
    *   **Soluzione Proposta:** Rifattorizzare la funzione per utilizzare i dati dei rapportini già presenti in memoria, eliminando le chiamate ridondanti a Firestore.

---

### Area: Coerenza del Codice e Manutenibilità

1.  **Unificare la Logica di Recupero Dati con un Hook `useRapportini` (Alta Priorità)**
    *   **File Coinvolti:** Tutta la sezione Reportistica (`RicercaAvanzata.tsx`, `ReportMensili.tsx`, `AnalisiOre.tsx`), `DashboardPage.tsx`.
    *   **Problema:** Esistono tre strategie diverse per recuperare i rapportini all'interno della stessa sezione, creando incoerenza e duplicazione del codice. Questo rende la manutenzione complessa e soggetta a errori.
    *   **Soluzione Proposta:** Creare un unico custom hook, ad esempio `useRapportini(filtri)`, che diventi l'unica fonte di verità per il recupero dei rapportini. Questo hook dovrà: 
        *   Accettare un oggetto di filtri (date, tecnico, cliente, etc.).
        *   Costruire e eseguire una query Firestore dinamica ed efficiente.
        *   Gestire lo stato di caricamento e di errore.
    *   **Benefici:** Centralizzare questa logica in un unico punto risolverà il problema di performance (#1), eliminerà la duplicazione di codice e renderà l'intera applicazione più robusta, prevedibile e facile da mantenere.

2.  **Rifattorizzare `useCheckinData` per usare `useFirestoreData`**
    *   **File Coinvolto:** `src/hooks/useCheckinData.ts`
    *   **Problema:** L'hook reimplementa logica già presente nell'hook generico `useFirestoreData`.
    *   **Soluzione Proposta:** Rifattorizzare `useCheckinData` per sfruttare `useFirestoreData`, riducendo la duplicazione.

3.  **Migliorare l'hook `useAnagrafiche`**
    *   **File Coinvolto:** `src/hooks/useAnagrafiche.ts`
    *   **Problema:** L'hook è incompleto e non permette filtri.
    *   **Soluzione Proposta:** Espandere l'hook per includere tutte le anagrafiche e consentire filtri per ottimizzare i caricamenti.

---

### Area: Gestione Errori e UX

1.  **Migliorare la Gestione Errori in `AuthProvider`**
    *   **File Coinvolto:** `src/contexts/AuthProvider.tsx`
    *   **Problema:** Un fallimento nel recupero dei custom claims può portare a una UI bloccata.
    *   **Soluzione Proposta:** Valutare un logout automatico in caso di errore per fornire un feedback chiaro all'utente.

