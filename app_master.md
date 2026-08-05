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

## **Fase Attuale: Piano di Risanamento da Debito Tecnico (Ottobre 2026)**

L'analisi approfondita dell'intera codebase è **conclusa**. È stata rilevata una serie di criticità significative che rendono l'applicazione lenta, fragile, insicura e difficile da mantenere. Questa sezione documenta in modo definitivo tutte le criticità identificate e servirà come traccia per il piano di risanamento.

### **Report Finale Consolidato delle Criticità**

| ID | Sezione | Criticità | Impatto Primario | Priorità |
| :--- | :--- | :--- | :--- | :--- |
| **A-1** | Architettura | **Caos Architetturale Totale**: Coesistenza di 4 strategie di gestione dati/logica: Dexie (`useLiveQuery`), `getDocs` manuali, `react-firebase-hooks` e **Cloud Functions**. | Manutenibilità, Coerenza | **CRITICA** |
| **A-2** | Architettura | **Stato Globale Frammentato**: Uso misto e incoerente di `Context API` e `Zustand` per lo stato globale. | Manutenibilità | **MASSIMA** |
| **A-3** | Architettura | **Conflitto di Nomi Critico**: Esistenza di due hook diversi (`useAnagraficaData`) che creano confusione e rischio di bug. | Manutenibilità | **MASSIMA** |
| **A-4** | Architettura | **Violazione Principio Offline-First**: Componenti chiave lavorano solo online, tradendo lo scopo di Dexie. | Coerenza, UX | **ALTA** |
| **A-5** | Architettura | **"Provider Hell"**: Eccessivo annidamento di `Context Provider` che causa re-render a cascata. | Performance | **ALTA** |
| **SEC-1**| Sicurezza | **Modello di Sicurezza Incoerente**: L'app usa un modello sicuro (Cloud Functions) solo in una sezione, lasciando il resto esposto a scritture dirette e non controllate dal client. | **Sicurezza Funzionale**| **CRITICA** |
| **DI-1** | Integrità Dati | **Operazioni Non Atomiche**: Salvataggi, modifiche ed eliminazioni non garantiscono coerenza tra DB. | **Perdita/Inconsistenza Dati** | **CRITICA** | 
| **DI-2** | Integrità Dati | **Fonte Ruoli Frammentata**: Il ruolo "admin" è calcolato incrociando due collezioni Firestore invece di usare una fonte atomica (es. Custom Claims). | Integrità Dati, Sicurezza | **ALTA** |
| **DI-3** | Integrità Dati | **Feedback Utente Fuorviante**: Conferme di operazioni solo in locale, senza garanzia di successo sul server. | UX, Integrità Dati | **ALTA** |
| **PERF-1**| Performance | **Elaborazione Dati Bloccante**: Elaborazione dell'intero dataset nel rendering, bloccando l'UI. | **Performance** | **ALTA** |
| **PERF-2**| Performance | **Uso di Hook Obsoleti**: L'hook `useAnagraficaData()` (lento) è usato in componenti critici. | Performance | **ALTA** |
| **MNT-1**| Manutenibilità | **"God Component"**: Componenti come `RapportinoEdit` accentrano troppa logica e stato. | Manutenibilità | **ALTA** |
| **MNT-2**| Manutenibilità | **Logica Duplicata**: Calcoli, mappature e utility sono duplicati in più file. | Rischio Bug | **MEDIA** |
| **MNT-3**| Manutenibilità | **Dipendenze Ridondanti**: Uso contemporaneo di librerie equivalenti. | Bundle Size | **MEDIA** |
| **MNT-4**| Manutenibilità | **Logica Fragile ("Magic Strings")**: Logiche di business basate su stringhe di testo. | Rischio Bug Funzionale | **MEDIA** |

---

## **STORIA DEL PROGETTO (ARCHIVIO)**

*Questa sezione archivia le fasi concluse e le lezioni apprese per fornire contesto storico ed evitare la ripetizione degli stessi errori.*

### **Lezione Appresa: L'Errore Originale (Luglio 2026)**

L'analisi dello storico Git ha rivelato un punto di svolta catastrofico in data **29 Luglio 2026**. Un precedente piano di risanamento, dettagliato e in corso d'opera, fu interrotto bruscamente. Il documento `app_master.md` dell'epoca, che conteneva la mappa delle criticità, fu cancellato e sostituito con un messaggio di "Lavoro Concluso".

Questa azione, dichiarando vittoria prematuramente, ha **cancellato la memoria storica del progetto**. Le criticità non risolte sono state dimenticate e le successive modifiche al codice sono avvenute senza una guida, portando al caos architetturale attuale.

**Monito:** Mai più dichiarare un lavoro "concluso" senza aver sistematicamente chiuso tutte le criticità documentate. La memoria del progetto deve essere preservata come bene primario.

### **Anatomia di un Disastro: La Corruzione dell'Ambiente (Agosto 2026)**

*(Questa sezione rimane come monito sull'importanza di una corretta diagnosi dei problemi a livello di infrastruttura)*

(...)