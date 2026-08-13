# PIANO ESECUTIVO FINALE E IMMUTABILE

*Questo documento è il contratto operativo. Non verrà modificato. Ogni passo verrà eseguito come descritto.*

### **REGOLE FONDAMENTALI DI INTERAZIONE**

1.  **REGOLA DEL "CIAO":** Ogni mia interazione deve iniziare con la parola "CIAO".
2.  **REGOLA DEL "NON TOCCARE LA UI":** È vietato modificare, alterare o toccare in alcun modo le parti visibili dell'app (pagine, tabelle, testi, layout), a meno che non venga esplicitamente richiesto. Il mio lavoro è solo sul backend e sulla logica interna dei dati.
3.  **REGOLA DI RECUPERO CONTESTO:** In caso di perdita di contesto, confusione o prima di iniziare una nuova sessione, **DEVO** rileggere i seguenti file in questo esatto ordine prima di procedere:
    1.  Questo file (`piano_finale.md`)
    2.  `app_master.md`
    3.  `piano_di_recupero.md`
    4.  `blueprint.md`

---

### **OBIETTIVO FINALE**

Risolvere la criticità di sicurezza `SEC-1` e stabilizzare l'applicazione implementando il **MODELLO IBRIDO**, senza rompere le funzionalità esistenti per l'app dei tecnici.

---

### **PIANO ESECUTIVO DETTAGLIATO**

#### **FASE 1: Attivazione del Backend Ibrido**

*Scopo: Rendere il backend sicuro e funzionale secondo il modello ibrido.*

1.  **Verifica Sicurezza Funzioni Generiche:** Assicurarsi che `functions/src/genericCrud.ts` contenga le funzioni `createDocument`, `updateDocument`, `deleteDocument` con i corretti controlli di autorizzazione. **(FATTO)**
2.  **Modifica Definitiva di `index.ts`:** Modificare il file `functions/src/index.ts` per:
    *   **AGGIUNGERE** l'esportazione delle tre funzioni generiche.
    *   **MANTENERE** l'esportazione di tutte le funzioni specifiche esistenti (per rapportini, utenti, ecc.).

#### **FASE 2: Centralizzazione del Livello Servizi Frontend**

*Scopo: Creare un punto di accesso unificato nel frontend per il nuovo backend generico.*

1.  **Modifica di `src/services/api.ts`:**
    *   Creare un servizio generico con le funzioni `genericCreate`, `genericUpdate`, `genericDelete`.
    *   Questo servizio sarà usato **ESCLUSIVAMENTE** per le anagrafiche semplici.
    *   I servizi per le funzioni specifiche (`createRapportino`, ecc.) resteranno **INTATTI**.

#### **FASE 3: Adattamento della Logica Dati Interna (Senza Modifiche Visive)**

*Scopo: Collegare la logica di salvataggio delle anagrafiche al nuovo backend, senza alterare la UI.*

1.  **Identificazione del Componente Motore:** Isolare `src/components/Anagrafiche/GestioneAnagrafica.tsx`.
2.  **Modifica Chirurgica:** Modificare solo la logica interna di `GestioneAnagrafica.tsx` per usare il nuovo servizio generico.
3.  **Preservazione dei Componenti Specifici:** I componenti come `GestioneNavi.tsx`, `GestioneLuoghi.tsx` **NON VERRANNO CANCELLATI** per preservare le loro configurazioni di visualizzazione (colonne, toolbar).
