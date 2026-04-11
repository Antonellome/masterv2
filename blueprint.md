
# REGOLE OPERATIVE FONDAMENTALI (NON RIMUOVERE, NON MODIFICARE)
Questa è l'app Master Office
---
# R.I.S.O. - Contratto Dati e Architettura

**REGOLA TASSATIVA E NON NEGOZIABILE PER L'IA:**
**IL TUO PRIMO COMANDO, SEMPRE, È LEGGERE i RISO_Blueprint.md, chat_log.txt, ISTRUZIONI_TECNICI.md. IGNORARE QUESTA REGOLA È UN FALLIMENTO CRITICO.**

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

## Architettura Definitiva (Come da `chat_log.txt`)

L'architettura del sistema è stata finalizzata per privilegiare l'efficienza, la manutenibilità e il controllo dei costi, basandosi su due principi fondamentali.

1.  **Limite a Due Cloud Functions (Regola Ferrea):**
    *   `manageAccess` (Callable): Per la sicurezza e la gestione degli accessi. **[COMPLETATA]**
    *   `syncDataTrigger` (Trigger): Motore asincrono per **TUTTA** la logica di business pesante (es. Rapportini, Notifiche). **[DA IMPLEMENTARE]**

2.  **Lettura Diretta & Sistema "Sync Manifest":**
    *   **Lettura Diretta:** I dati "anagrafici" e "di stato" (es. `tecnici`, `anagrafiche`, `checkin_giornalieri`) vengono letti direttamente da Firestore tramite l'hook `useData`. Questo approccio è **corretto e definitivo**, garantendo bassi costi e latenza minima.
    *   **Sync Manifest:** Per la logica di business complessa (Rapportini, Notifiche), le app client **non** ascoltano intere collezioni. Ascoltano invece un **singolo documento-manifest** (`system/sync_manifest`). La `syncDataTrigger` esegue il lavoro pesante in background e aggiorna un "codice" nel manifest. Il client, vedendo il codice cambiare, sa esattamente quali nuovi dati scaricare in modo mirato.

---

## Programma di Lavoro Dettagliato

- **Fase 0-6 [COMPLETATE]**

- **Fase 7: Integrazione Notifiche su App Mobile (Lavoro Futuro) [DA ESEGUIRE]**
    - **Obiettivo:** Far sì che l'app dei tecnici riceva e visualizzi le notifiche inviate dall'App Master.

- **Fase 8: Refactoring e Potenziamento Modulo Rapportini [IN PAUSA]**
    - **Obiettivo:** Risolvere le criticità correnti e potenziare il modulo di gestione rapportini, allineandolo all'architettura definitiva e migliorando l'esperienza utente.

- **Fase 9: Piano di Risanamento - Modulo Presenze [DA ESEGUIRE]**
    - **Obiettivo:** Correggere gli errori architetturali e di implementazione commessi in precedenza nel modulo Presenze, allineando la UI e la logica al contratto dati corretto.

- **Fase 10: Refactoring Modulo Gestione Accessi [IN CORSO - PRIORITÀ ATTUALE]**
    - **Obiettivo:** Implementare l'interfaccia di gestione degli amministratori e candidati, allineandola alle specifiche di sicurezza e architetturali definite nel file `RISO_Blueprint.md`.
    - **Task Specifico:** Rifattorizzare il componente `src/components/Settings/GestioneAmministratori.tsx` per:
        1. Caricare e visualizzare gli utenti dalle collezioni `amministratori` e `utenti_master`.
        2. Invocare la Cloud Function `manageAccess` per tutte le operazioni (creazione, promozione, revoca, eliminazione).
        3. Implementare la regola di sicurezza che impedisce all'amministratore loggato di modificare il proprio stato.
