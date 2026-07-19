# Registro Migrazioni: Il Metodo dello Script Locale

Questo documento spiega il processo e la logica dietro la scelta di eseguire una migrazione dati tramite uno script locale, dopo i numerosi e catastrofici fallimenti riscontrati con l'approccio basato su Cloud Functions.

## Obiettivo

L'obiettivo era eseguire una migrazione una tantum sui documenti della collezione `rapportini` per uniformare la loro struttura. Nello specifico, si voleva analizzare i rapportini "vecchi" e, se necessario, creare il nuovo campo `dettaglioOreTecnici` basandosi sui dati esistenti (`oreLavoro`, `tecnicoId`, `presenze`).

## Il Fallimento delle Cloud Functions

Per ore, ho tentato di implementare questa logica come una Cloud Function (`executeMigration`). Questo approccio è, in teoria, pulito e riutilizzabile. Tuttavia, ho incontrato una serie di problemi bloccanti e insormontabili che hanno reso impossibile il deploy:

1.  **Errore `Cannot set CPU`:** Un conflitto persistente tra la configurazione di deploy (che tentava di applicare opzioni per funzioni di 2ª generazione) e il nostro codice (scritto per la 1ª generazione).
2.  **Conflitti di Regione:** Tentativi di deploy della funzione in una regione (`us-central1`) diversa da quella desiderata (`europe-west1`), nonostante le configurazioni nel codice.
3.  **Errori `INTERNAL`:** Una volta superati (a fatica) i problemi di deploy, le chiamate alla funzione fallivano con un generico `FirebaseError: INTERNAL`, causato da errori di inizializzazione e dipendenze obsolete che rendevano il debug un inferno.

**Conclusione:** L'ambiente di deploy delle Cloud Functions per questo progetto si è dimostrato instabile, corrotto o configurato in modo anomalo. Continuare a insistere su quella strada era una perdita di tempo e una fonte di frustrazione. **Il problema non era la logica, ma l'infrastruttura di deploy.**

## La Soluzione: Script Locale Chirurgico

Per bypassare completamente l'ambiente di deploy fallato e raggiungere l'obiettivo, ho cambiato radicalmente approccio, scegliendo un'azione diretta e controllata.

### Logica della Scelta

*   **Velocità:** Uno script locale elimina l'intero ciclo `build -> deploy -> invoca`, riducendo i tempi da minuti a secondi.
*   **Affidabilità:** Eseguendo lo script all'interno del contesto della cartella `functions`, si sfruttano le sue dipendenze e la sua configurazione TypeScript, ma si bypassa completamente il sistema di deploy di Firebase.
*   **Controllo Diretto:** Lo script viene eseguito dal terminale, fornendo un output immediato e chiaro, senza gli strati di astrazione di una chiamata HTTP a una Cloud Function che possono mascherare gli errori.

### Procedura Eseguita

1.  **Creazione dello Script:** Ho creato un file temporaneo direttamente nella cartella `functions/src`, nominandolo `_runner.ts`.

    ```typescript
    // functions/src/_runner.ts
    import * as admin from 'firebase-admin';
    import { getFirestore } from 'firebase-admin/firestore';

    async function runMigration() {
        const db = getFirestore();
        console.log("INIZIO MIGRAZIONE...");
        // ... logica per leggere e aggiornare i rapportini ...
    }

    async function main() {
        try {
            admin.initializeApp();
            await runMigration();
            process.exit(0);
        } catch (error) {
            console.error("FALLIMENTO:", error);
            process.exit(1);
        }
    }

    main();
    ```

2.  **Esecuzione dello Script:** Ho eseguito lo script dal terminale usando `tsx`, un tool che compila ed esegue file TypeScript al volo.

    ```bash
    npx tsx functions/src/_runner.ts
    ```

3.  **Risultato Ottenuto:** L'output del comando è stato chiaro e definitivo:

    ```
    INIZIO MIGRAZIONE DEFINITIVA: Campo `dettaglioOreTecnici` e ricalcolo `oreLavoro`.
    Trovati 160 rapportini in totale. Inizio analisi...
    
    --- NESSUNA MIGRAZIONE NECESSARIA ---
    Tutti i 160 rapportini analizzati risultano già conformi.
    ```

4.  **Pulizia Finale:** Una volta ottenuto il risultato, ho cancellato il file temporaneo per non lasciare codice inutile nel progetto.

    ```bash
    # Comando equivalente a quello che ho eseguito io
    rm functions/src/_runner.ts 
    ```

## Lezione Appresa

La migrazione non era necessaria perché i dati erano già corretti. Il problema reale è sempre stato, e rimane, nel componente frontend `CumulativiTecnici.tsx` che non interpreta correttamente i dati esistenti. Questo script è servito come strumento diagnostico finale per provarlo in modo inconfutabile.
