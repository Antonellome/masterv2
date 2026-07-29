# PROGETTO RISO - BLUEPRINT

## REGOLE DI INTERAZIONE (NON MODIFICARE!)
- **Regola del CIAO:** Ogni tuo messaggio DEVE iniziare con la parola "CIAO".
  - **Spiegazione:** Questa non è una regola di cortesia, ma un test di stato critico. Se l'assistente non inizia un messaggio con "CIAO", significa che ha perso il contesto e la sua memoria interna si è corrotta. In questo caso, l'utente deve immediatamente interrompere l'attività corrente e forzare un reset con il comando: "Leggi il blueprint.md". Discutere o insistere è inutile.
- **Regola della Lettura Contesto:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
    - `calcoli.md`
    - `tabella.md`
    - `app_master.md`
    - `rapportino_standard.md`
- **Regola del Blueprint:** Questo file è la memoria a lungo termine. Va letto all'inizio e aggiornato con cautela, chiedendo sempre l'approvazione dell'utente prima di ogni scrittura.

---

## META-INFORMAZIONI
- **ID Progetto Firebase:** riso-project-app
- **Sito di Deploy Target:** riso-master-office-prod
- **Nota Importante:** Anche se l'ID del progetto è `riso-project-app`, il deploy viene eseguito per esplicita e corretta richiesta dell'utente sul sito `riso-master-office-prod`. Questa configurazione è intenzionale e non è un errore.
- **Email Sviluppatore:** antonio.scuderi@gmail.com

---

## OBIETTIVO STRATEGICO ATTUALE (dal vecchio blueprint)
- **Focus:** Risolvere le criticità architetturali emerse.
- **Dettagli Tecnici:** La documentazione di dettaglio va mantenuta nel file `app_master.md`.
- **Aree Critiche:**
    1.  **Permessi Amministratori:** Correggere la logica di autorizzazione passando a un sistema basato sulla collezione `admins` in Firestore, abbandonando i `claims` (deprecati).
    2.  **Gestione Dati Tecnici:** Risolvere il problema "ID Sconosciuto" con una separazione netta tra `tecnici` (personale) e `utenti` (amministratori). Prevede un hard reset del DB locale (Dexie.js) e la centralizzazione dei dati dei tecnici in una `tecniciMap`.
- **Modifiche UI correlate:**
    - La pagina `Anagrafiche` non gestirà più i tecnici.
    - Creare o designare una `Pagina Tecnici` come unico punto di gestione del personale.

---

## REGISTRO FUNZIONALITÀ E INTERVENTI
- **[Data Ignota] - Creazione Iniziale:** Implementata app per gestione rapportini, anagrafiche, tecnici e report con Dexie.js ed esportazione Excel.
- **[29/07/26] - Deploy:** Eseguito deploy su `riso-master-office-prod` dopo fallimenti iniziali.
- **[29/07/26] - Riorganizzazione Blueprint:** Adottata questa struttura rigida per evitare la perdita di contesto.

---

## CRITICITÀ STORICHE (DA NON RIPETERE)
- **Confusione Progetto/Sito:** L'assistente ha confuso l'ID Progetto con il Sito di Deploy.
- **Perdita di Contesto:** L'assistente ha una memoria a breve termine.
- **Corruzione del Blueprint:** L'assistente tende a sovrascrivere questo file in modo distruttivo.

---

## TASK CORRENTE
- **Azione:** Aggiornare il blueprint con le spiegazioni richieste dall'utente.
- **Stato:** In attesa di approvazione per la scrittura.
