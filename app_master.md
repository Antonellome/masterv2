# Mappa Concettuale Applicazione "Gestione Lavoro SRL" (app_master.md)

**Scopo del Documento:** Questo documento è la fonte unica della verità sull'architettura, la logica e il flusso dei dati dell'applicazione. Viene aggiornato dinamicamente per riflettere lo stato attuale delle analisi e delle criticità.

---
## Regole di Interazione

**IMPORTANTE: QUESTA SEZIONE NON DEVE ESSERE MAI MODIFICATA O CANCELLATA.**

**Regola della Lingua:** Da questo momento in poi, puoi e devi rispondere **esclusivamente in italiano**.

**Regola del CIAO:** Ogni messaggio in questa chat DEVE iniziare con la parola "CIAO".

**Regola della Lettura:** All'inizio di ogni sessione, DEVI leggere i seguenti file per avere il contesto completo:
*   `calcoli.md`
*   `tabella.md`
*   `app_master.md`
*   `rapportino_standard.md`

---

## **Stato Architetturale e Piano di Lavoro: CONCLUSO**

Questo documento archivia il completamento del piano di lavoro per l'analisi e la risoluzione delle criticità fondamentali dell'applicazione. Tutte le fasi sono state completate con successo.

### **Fase 1 & 2: Analisi e Risoluzione Criticità Storiche - COMPLETATA**

Le analisi e le correzioni delle criticità storiche (gestione accessi, coerenza dati) e della sicurezza di Firestore sono state completate con successo.

### **Fase 3: Mitigazione Rischio Perdita Dati - COMPLETATA**

La vulnerabilità critica di sovrascrittura silenziosa dei dati è stata eliminata tramite l'implementazione di una strategia di **Blocco Ottimistico (Optimistic Locking)** in `src/services/SyncService.ts`. Il sistema ora previene la perdita di dati durante la sincronizzazione.

### **Fase 4: Miglioramento Esperienza Utente (UX) - COMPLETATA**

La criticità finale relativa all'esperienza utente è stata risolta, chiudendo il cerchio tra la logica di backend e l'interfaccia utente.

#### **CRITICITÀ UX: Mancata Notifica dei Conflitti - RISOLTA**

*   **Soluzione Implementata:** Il sistema di notifiche esistente (`AlertContext`) è stato collegato alla logica di sincronizzazione.
*   **Comportamento Finale:** Quando viene rilevato un conflitto di dati, l'utente riceve una **notifica in-app** chiara e immediata (un "toast" di avvertimento). Il messaggio informa l'utente che la sua modifica non è stata salvata perché i dati erano obsoleti e che il sistema ha scaricato automaticamente la versione più recente. Questo previene la confusione e aumenta la fiducia nell'affidabilità dell'applicazione.
*   **Impatto:** L'applicazione è ora non solo tecnicamente robusta, ma anche trasparente nel suo funzionamento verso l'utente finale.

---

## **Anatomia di un Disastro: La Corruzione dell'Ambiente (Agosto 2026)**

*(Questa sezione rimane invariata come monito)*

(...)
