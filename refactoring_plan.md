
# Piano di Refactoring

1.  **Obiettivo:** Trasformare l'architettura dati dell'applicazione da un modello inefficiente "carica-tutto" a un modello scalabile e on-demand. Questo migliorerà drasticamente le performance, ridurrà i costi di Firestore e creerà una codebase coerente e manutenibile.

2.  **Interventi Chiave (La "To-Do" List):**

    *   **Fase A: Correzioni Fondamentali & Refactoring degli Hook**
        1.  **Correggi Duplicazione Provider:** Rimuovere il `AuthProvider` ridondante da `main.tsx` o `App.tsx`.
        2.  **Depreca e Sostituisci `DataContext`:**
            *   Eliminare `src/contexts/DataContext.tsx`.
            *   Eliminare l'hook associato `src/hooks/useData.ts`.
            *   Rimuovere il `DataProvider` da `App.tsx`.
        3.  **Refactor `useRapportini.ts`:**
            *   **Correggi Paginazione:** Implementare una `fetchNextPage` corretta che aggiunge i nuovi risultati.
            *   **Correggi Filtro `tecnicoId`:** Cambiare la query in `where('presenze', 'array-contains', ...)`.
            *   **Implementa Filtri Mancanti:** Aggiungere il filtraggio server-side per `clienteId` e `tipoGiornataId`.

    *   **Fase B: Refactoring di `useFirestoreData` (Il Cuore della Modifica)**
        1.  **Introduci Modalità `getDocs`:** Modificare `useFirestoreData.ts` per accettare un'opzione `{ listen: boolean }`.
        2.  Se `listen: false`, l'hook deve usare `getDocs` per un recupero dati una-tantum.
        3.  Se `listen: true`, l'hook mantiene il comportamento `onSnapshot`.

    *   **Fase C: Refactoring a Livello di Componente (Applicazione della Nuova Architettura)**
        1.  **Refactor `useAnagrafiche.ts`:**
            *   Deve usare il nuovo `useFirestoreData` con `listen: false`.
            *   Deve diventare più flessibile per caricare singole anagrafiche on-demand (es. `useAnagrafica('clienti')`).
        2.  **Refactor `RicercaAvanzata.tsx`:**
            *   Rimuovere la dipendenza da `useData`.
            *   Usare il `useRapportini` modificato per i filtri server-side.
            *   Usare il nuovo `useAnagrafica` per popolare i menu a tendina dei filtri.
        3.  **Refactor `DashboardPage.tsx` e `PresenzePage.tsx`:**
            *   Applicare la stessa logica di `RicercaAvanzata`: rimuovere le dipendenze dai dati globali e caricare tutto on-demand.

3.  **Strategia di Esecuzione:** Procederò passo dopo passo attraverso le fasi, iniziando dalla Fase A.
