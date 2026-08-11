# Piano di Ricostruzione e Recupero

*Questo documento è la nostra checklist operativa per **ricostruire** il refactoring andato perso. Ogni fase è un passo per ripristinare l'architettura corretta, basata sull'analisi di `app_master.md`.*

**Obiettivo Strategico:** Ricostruire l'architettura frontend che era stata completata, risolvendo le criticità identificate, principalmente:
- **A-2 (Stato Globale Frammentato)** e **A-5 ("Provider Hell")**: Ricostruendo l'architettura basata su un unico store globale `Zustand` (`globalStore.ts`).
- **SEC-1 (Modello di Sicurezza Incoerente)** e **DI-1 (Operazioni Non Atomiche)**: Ripristinando l'uso obbligatorio delle Cloud Functions tramite un servizio `api.ts`.

---

### **FASE 1: Ricostruzione delle Fondamenta (Store e Servizi Centrali)**

*Questa fase ricostruisce l'infrastruttura centrale che era andata persa.*

1.  **Ricrea `src/stores/globalStore.ts`**: Il cuore dello stato globale.
2.  **Ricrea `src/services/api.ts`**: Il punto di accesso unico per le operazioni sui dati (chiamate alle Cloud Functions).
3.  **Ricrea `src/auth.ts`**: Logica di autenticazione centralizzata che idrata `globalStore`.
4.  **Ricrea `src/components/DataHydrator.tsx`**: Componente per la sincronizzazione tra database e `globalStore`.
5.  **Ricrea `src/components/GlobalAlert.tsx`**: Sistema di notifiche e dialoghi centralizzato.

---

### **FASE 2: Ricostruzione della Migrazione dei Provider**

*Questa è la fase operativa per smantellare il "Provider Hell" che è stato reintrodotto a causa del restore.*

1.  **Migra `AuthProvider`:** (Da rieseguire)
    -   Logica da reintegrare in `globalStore`.
    -   `useAuth()` da risostituire con `useGlobalStore()`.
    -   **Obiettivo:** Eliminare di nuovo `AuthProvider.tsx`.

2.  **Migra `DataProvider` e `RefreshProvider`:** (Da rieseguire)
    -   Logica da reintegrare in `globalStore`.
    -   `useData()` e `useRefresh()` da risostituire con `useGlobalStore()`.
    -   **Obiettivo:** Eliminare di nuovo `DataProvider.tsx`, `RefreshProvider.tsx`.

3.  **Migra `NotificationProvider`:** (Da rieseguire)
    -   Logica da reintegrare in `globalStore`.
    -   `useNotifications()` da risostituire con `useGlobalStore()`.
    -   **Obiettivo:** Eliminare di nuovo `NotificationProvider.tsx`.

4.  **Migra `AlertProvider`:** (Da rieseguire)
    -   Logica da reintegrare in `globalStore`.
    -   `useAlert()` da risostituire con `useGlobalStore()`.
    -   **Obiettivo:** Eliminare di nuovo `AlertProvider.tsx`.

5.  **Migra `ThemeProvider`:** (Da rieseguire)
    -   Logica da reintegrare in `globalStore`.
    -   `useTheme()` da risostituire con `useGlobalStore()`.
    -   **Obiettivo:** Eliminare di nuovo `ThemeProvider.tsx`.

---

### **FASE 3: Pulizia, Verifica e Consolidamento Finale**

1.  **Verifica `main.tsx`:** Assicurarsi che l'entrypoint sia di nuovo minimale.
2.  **Validazione Funzionale:** Testare l'intera applicazione per confermare che tutte le funzionalità siano state ripristinate.
3.  **Chiusura Criticità:** Aggiornare `app_master.md` per segnare le criticità come **RISOLTE** (di nuovo).
