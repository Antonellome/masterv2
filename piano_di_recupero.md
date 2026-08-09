# Piano di Recupero Ristrutturazione Frontend

*Questo documento è la checklist operativa per ripristinare il refactoring andato perso. Ogni passo deve essere eseguito in sequenza.*

**Obiettivo:** Ristrutturare il frontend migrando tutti i `Context` ad un unico store globale `Zustand` (`globalStore.ts`), eliminando il "Provider Hell" e centralizzando la gestione dello stato.

---

### **FASE 1: Creazione delle Fondamenta (Store e Idratazione)**

1.  **Crea `src/stores/globalStore.ts`:**
    -   Definire la struttura base dello store con Zustand, inizialmente vuota.

2.  **Crea `src/services/api.ts`:**
    -   Implementare il servizio per la comunicazione con le Cloud Functions (necessario per le fasi successive).

3.  **Crea `src/auth.ts`:**
    -   Implementare l'inizializzatore `initializeAuth` che ascolta `onAuthStateChanged` e aggiorna lo store.

4.  **Crea `src/components/DataHydrator.tsx`:**
    -   Implementare il componente che usa `useLiveQuery` per leggere da Dexie e popola `globalStore`.

5.  **Crea `src/components/GlobalAlert.tsx`:**
    -   Implementare il componente per la visualizzazione centralizzata di `Snackbar` e `Dialog` di conferma.

6.  **Modifica `src/models/definitions.ts`:**
    -   Assicurarsi che tutte le interfacce dei dati (es. `EventoGiornaliero`, `Notifica`) siano definite.

7.  **Modifica `src/db/db.ts`:**
    -   Assicurarsi che lo schema di Dexie includa tutte le tabelle necessarie (`eventi_giornalieri`, `notifiche`, etc.).

---

### **FASE 2: Migrazione dei Context Provider**

1.  **Migra `AuthProvider`:**
    -   Integrare `user`, `isAdmin`, `login`, `logout` in `globalStore`.
    -   Modificare `main.tsx` per chiamare `initializeAuth`.
    -   Sostituire `useAuth()` con `useGlobalStore()` in `LoginPage`, `ProtectedRoute`, `MainLayout`.
    -   **Elimina `AuthProvider.tsx` e i file associati.**

2.  **Migra `DataProvider` e `RefreshProvider`:**
    -   Integrare i dati delle anagrafiche e la logica di `refreshKey`/`triggerRefresh` in `globalStore`.
    -   Sostituire `useData()` e `useRefresh()` con `useGlobalStore()` in tutti i componenti (`App.tsx`, `GestioneAnagrafica`, etc.).
    -   **Elimina `DataProvider.tsx`, `RefreshProvider.tsx` e i file associati.**

3.  **Migra `NotificationProvider`:**
    -   Integrare `notifications`, `unreadCount` e le azioni `markAsRead`/`markAllAsRead` in `globalStore`.
    -   Spostare la logica `onSnapshot` di Firestore dentro `DataHydrator.tsx`.
    -   Sostituire `useNotifications()` con `useGlobalStore()` in `MainLayout` e altri widget.
    -   **Elimina `NotificationProvider.tsx` e i file associati.**

4.  **Migra `AlertProvider`:**
    -   Integrare `alertOptions`, `confirmOptions` e le azioni `showAlert`/`showConfirm` in `globalStore`.
    -   Sostituire `useAlert()` con `useGlobalStore()` in tutti i componenti.
    -   Inserire `<GlobalAlert />` in `App.tsx`.
    -   **Elimina `AlertProvider.tsx` e i file associati.**

5.  **Migra `ThemeProvider`:**
    -   Integrare `themeMode` e `toggleTheme` in `globalStore`.
    -   Creare `ThemeManager.tsx` che applica il tema MUI.
    -   Sostituire `useTheme()` con `useGlobalStore()` in `ThemeSwitcher.tsx`.
    -   **Elimina `ThemeProvider.tsx` e i file associati.**

---

### **FASE 3: Pulizia e Verifica Finale**

1.  **Verifica `main.tsx`:** Assicurarsi che il file di entrypoint sia pulito e contenga solo i provider strettamente necessari (Router, `ThemeManager`, `LocalizationProvider`).
2.  **Verifica Funzionale:** Testare il login, la navigazione, la visualizzazione dei dati e le interazioni principali (cambio tema, refresh) per confermare il successo del refactoring.
