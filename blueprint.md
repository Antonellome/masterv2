# Blueprint di Sviluppo - R.I.S.O. App

Questo documento serve come unica fonte di verità per lo sviluppo e la manutenzione dell'applicazione. Traccia lo stato attuale, i problemi noti e il piano di azione dettagliato per le modifiche future.

---

## 1. Regole di Interazione

*   **Saluto Iniziale:** Ogni interazione in chat deve iniziare con il saluto "CIAO".

---

## 2. Cronologia e Piano di Lavoro

### Fase 1-12: Analisi Iniziale (Completata)

*   **Stato:** **Completato**
*   **Sintesi:** Risoluzione problemi di deploy, pulizia Git e identificazione della causa radice del problema dei "tecnici fantasma" (creazione utente in Auth ma non in Firestore).

### Fase 13: Primo Tentativo di Migrazione (Fallito e Abbandonato)

*   **Stato:** **FALLITO**
*   **Sintesi del Fallimento:** L'approccio iniziale è stato un disastro completo a causa di una serie di errori gravi da parte dell'IA.

### Fase 14: Correzione Definitiva Permessi e Migrazione (In sospeso)

*   **Stato:** **In Sospeso**
*   **Obiettivo:** Correggere in modo automatico, invisibile e permanente i permessi dell'utente corrente per sbloccare l'esecuzione della migrazione dati.
*   **Nota:** Questa fase è stata sospesa per affrontare un problema più critico.

### Fase 15: Risoluzione Problema Quota Firestore (Completata)

*   **Stato:** **Completato**
*   **Problema Rilevato:** L'applicazione stava consumando in modo anomalo la quota di lettura di Firestore, causando potenziali costi imprevisti e instabilità. L'analisi ha rivelato che la causa era un loop di lettura infinito innescato da custom hook React implementati in modo errato (`useCollectionData` e `useFirestoreData`).
*   **Causa Radice:** Gli hook utilizzavano una funzione instabile (`getQueryPath`) per generare una chiave di dipendenza per `useEffect`. Questa funzione produceva una nuova chiave ad ogni rendering, causando la ri-esecuzione continua della query a Firestore.

*   **Piano d'Azione Eseguito:**
    1.  **Analisi e Diagnosi:** Ho identificato il comportamento anomalo e isolato la causa nei custom hook che gestiscono i dati di Firestore.
    2.  **Correzione di `useCollectionData`:** Ho riscritto `useCollectionData.tsx`, eliminando la funzione `getQueryPath` e utilizzando direttamente l'oggetto `query` di Firestore (opportunamente memoizzato nei componenti) come dipendenza stabile per l'hook `useEffect`.
    3.  **Refactoring di `useCollectionData`:** Ho migliorato l'hook per supportare sia l'ascolto in tempo reale (default) sia fetch una-tantum (`{ listen: false }`), rendendolo più flessibile.
    4.  **Identificazione e Sostituzione:** Ho cercato tutte le istanze del vecchio e difettoso hook `useFirestoreData.ts`.
    5.  **Correzione dei Componenti:** Ho modificato i seguenti file per utilizzare il nuovo e corretto `useCollectionData`, assicurandomi di memoizzare le query con `useMemo` per garantire la stabilità:
        *   `src/hooks/useAnagrafiche.ts`
        *   `src/components/Reportistica/AnalisiOre.tsx`
        *   `src/hooks/useAnagraficaData.ts`
        *   `src/pages/DashboardPage.tsx`
    6.  **Pulizia del Codice:** Ho eliminato definitivamente il file `src/hooks/useFirestoreData.ts` per prevenire usi futuri.

*   **Risultato:** Il loop di lettura è stato interrotto. L'applicazione ora esegue le query a Firestore in modo efficiente e solo quando necessario, risolvendo il problema del consumo anomalo della quota. La base di codice è più stabile e affidabile.

---

Ora che il problema critico delle letture infinite da Firestore è stato risolto e documentato, posso riprendere il lavoro sulla **Fase 14: Correzione Definitiva Permessi e Migrazione**.
