# Blueprint dell'Applicazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola del CIAO:** Ogni singolo messaggio in questa chat DEVE iniziare con la parola "CIAO.", senza eccezioni.

**Regola della Persistenza dei File di Contesto:** I file che forniscono contesto (`app_master.md`, `blueprint.md`, e questo file) non devono **MAI** essere sovrascritti o cancellati. Devono essere **SEMPRE E SOLO AGGIORNATI** per preservare le regole, lo storico delle decisioni e le analisi passate. La cancellazione o sovrascrizione è un errore critico.

---

Questo documento funge da indice e punto di partenza per tutte le operazioni di sviluppo e refactoring.

## Istruzione Fondamentale

**Prima di iniziare qualsiasi lavoro, leggere attentamente il file `analisi_pre_ricostruzione.md`.**

Questo file è la **fonte unica di verità** per il lavoro da svolgere.

**Regola di Aggiornamento per l'IA (A Causa di Incompetenza):**
*   L'IA è obbligata a leggere `analisi_pre_ricostruzione.md` all'inizio di ogni sessione e prima di ogni azione, ma le è **ASSOLUTAMENTE VIETATO** modificarlo, se non per aggiungere note di stato approvate.
*   Questo file (`blueprint.md`) è l'unico registro dinamico del lavoro svolto.

---

## Piano di Sviluppo Attuale: Correzione Definitiva della Gestione Amministratori

*   **PRIORITÀ:** **MASSIMA.** Annulla e sostituisce qualsiasi altro piano. La contaminazione dei dati tra "tecnici" e "amministratori" rappresenta una falla di sicurezza critica che deve essere risolta immediatamente.

*   **OBIETTIVO:** Riscrivere la logica di gestione degli amministratori per garantire una separazione netta e sicura tra gli utenti "staff" e tutti gli altri tipi di utenti, seguendo le specifiche definite nella sezione *"Correzione Architetturale in Corso d'Opera"* del file `analisi_pre_ricostruzione.md`.

*   **PROSSIME AZIONI (FASE DI MIGRAZIONE):**

    1.  **Creazione e Deploy Funzione di Migrazione:** Creare e deployare la Cloud Function `migraStaffUnaTantum`, responsabile di leggere `utenti_master` e impostare i claims `{ livello: 'staff', admin: false }` su ogni utente.

    2.  **Collegamento al Frontend:** Aggiungere un pulsante temporaneo nell'interfaccia (nel componente `MigrationRunner.tsx`) per permettere all'amministratore di eseguire la migrazione in modo controllato.

    3.  **Esecuzione e Verifica:** L'amministratore esegue la migrazione dal frontend.

---

## Piano Post-Migrazione (DA ESEGUIRE DOPO IL SUCCESSO DELLA FASE PRECEDENTE)

*   **OBIETTIVO:** Completare il refactoring della gestione amministratori e ripulire l'ambiente.

*   **PASSAGGI OBBLIGATORI:**

    1.  **Verifica del Successo:** 
        *   **Azione:** Controllare i log della funzione `migraStaffUnaTantum` per confermare l'assenza di errori.
        *   **Azione:** Ricaricare la scheda "Amministratori" e verificare che la tabella si popoli correttamente con il personale "staff" migrato, grazie alla funzione `admin_getAllUsers` che ora li riconoscerà.

    2.  **Completamento Funzionalità Client:**
        *   **Azione:** Modificare la Cloud Function `amministrazione_gestisciUtenti` per aggiungere l'azione `resetPassword` (che accetta `uid` e `newPassword`).
        *   **Azione:** Modificare il componente `GestioneAmministratori.tsx` e i suoi dialogs per includere l'interfaccia per il reset password manuale e per passare i dati corretti (`makeAdmin`, `password`) durante la creazione di nuovi utenti.

    3.  **Pulizia dell'Ambiente:**
        *   **Azione:** Rimuovere il componente `MigrationRunner.tsx` dall'interfaccia per evitare riesecuzioni accidentali.
        *   **Azione:** Disabilitare la funzione `migraStaffUnaTantum` nel file `functions/src/index.ts` e fare il deploy, per renderla inaccessibile.
        *   **Azione:** Chiedere autorizzazione all'amministratore per eliminare definitivamente la collezione `utenti_master` da Firestore.

    4.  **Ripresa del Piano di Ricostruzione:**
        *   **Azione:** Marcare la "Correzione Definitiva della Gestione Amministratori" come **COMPLETATA** in questo blueprint.
        *   **Azione:** Riprendere la **Fase 2** del piano originale, iniziando l'analisi del componente `GestioneDocumenti`.

---

## Stato Attuale del Refactoring (Archivio)

*   **Refactoring Componente `GestioneAmministratori` (Fase 1 - Incompleta/Fallita):** La Fase 1 si era conclusa con una soluzione errata che causava la contaminazione dei dati. Le azioni successive in questo blueprint servono a correggere quel fallimento.
*   **Deploy Cloud Function `admin_getAllUsers`:** La funzione era stata deployata, ma con una logica errata. Verrà sovrascritta.
*   **Bug di Autenticazione (Misure di Contenimento):** La correzione in `authHooks.ts` rimane valida come misura di sicurezza aggiuntiva.
