
# Analisi Completa Applicazione - v2

Questo documento traccia un nuovo ciclo di analisi dell'applicazione, ripartendo da zero come richiesto.

## Piano di Analisi

1.  **Fase 1: Struttura del Progetto (Completata)**
    *   **Risultati:** Struttura solida, ma rilevata **duplicazione di `AuthProvider`** e un potenziale **"Context Hell"**.

2.  **Fase 2: Analisi dei Dati e dei "Custom Hooks" (Completata)**
    *   **Risultati:** L'architettura dati si basa su un pattern **errato e non scalabile** di caricamento "tutto e subito" tramite `onSnapshot`, causando lentezza e costi. L'approccio on-demand di `useRapportini` è corretto ma implementato in modo **incompleto e difettoso**.

3.  **Fase 3: Analisi delle Pagine Principali (Completata)**
    *   **Dashboard (`DashboardPage.tsx`):** Soffre del caricamento in blocco delle anagrafiche.
    *   **Reportistica (`RicercaAvanzata.tsx`):** Esempio critico di inefficienza. Carica tutte le anagrafiche per i filtri e usa un filtraggio ibrido che massimizza le letture da Firestore.
    *   **Anagrafiche (`GestioneAnagrafica.tsx`):** **Anomalia positiva**. Usa un approccio on-demand efficiente (`getDocs`), ma evidenzia la grave **incoerenza architettonica** dell'app.
    *   **Presenze (`PresenzePage.tsx`):** Replica lo stesso pattern inefficiente delle altre pagine.

4.  **Fase 4: Riepilogo e Annotazioni Finali (Completata)**
    *   **Il Problema Fondamentale:** L'applicazione soffre di un'**architettura dati inefficiente, insostenibile e incoerente**, basata su un anti-pattern "carica tutto e subito" che porta a performance scarse, costi elevati e scarsa scalabilità.
    *   **Problemi Specifici Identificati:**
        1.  **Anti-Pattern "Carica Tutto, Sempre":** L'uso di `onSnapshot` per intere collezioni anagrafiche (`DataContext`, `useAnagrafiche`) è la radice di tutti i mali.
        2.  **Filtraggio Ibrido Inefficiente:** Le query a Firestore sono troppo ampie, demandando il lavoro di filtro al client, sprecando letture e banda.
        3.  **Incoerenza Architettonica:** Coesistenza di un pattern corretto (`GestioneAnagrafica`) e di uno errato (resto dell'app).
        4.  **Hook `useRapportini` Difettoso:** Concetto giusto, implementazione da correggere (filtri e paginazione).
        5.  **Errore Strutturale:** Duplicazione del `AuthProvider`.

---
