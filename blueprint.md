# Blueprint: R.I.S.O. App Tecnici (Versione Mobile)

## 1. Panoramica del Progetto

**Scopo:** Realizzare la versione mobile per Android e iOS dell'applicazione "R.I.S.O. App Tecnici". Quest'app è uno strumento di lavoro mirato per i tecnici sul campo, permettendo loro di compilare e gestire i propri rapportini di lavoro giornalieri in modo efficiente, anche in assenza di connessione internet.

**Obiettivo:** Sviluppare un'app nativa basata sulla logica e le funzionalità del repository di riferimento `riso-app-tecnici`, garantendo stabilità, performance e un'esperienza utente ottimizzata per il mobile.

---

## 2. Funzionalità Chiave (Basate sull'analisi del Repository)

L'applicazione sarà focalizzata sulle seguenti macro-funzionalità:

*   **Autenticazione Sicura:**
    *   Schermata di Login per l'identificazione del tecnico.
*   **Dashboard e Riepilogo:**
    *   Una schermata `Home` che presenta un riepilogo delle attività giornaliere o recenti.
*   **Gestione Completa dei Rapportini:**
    *   **Creazione:** Form dedicato per l'inserimento di un nuovo rapportino, specificando dettagli come ore, tipo di intervento, cliente, descrizione.
    *   **Modifica:** Possibilità di correggere e aggiornare rapportini già inseriti.
    *   **Visualizzazione:** Liste filtrate per visualizzare i rapportini odierni, giornalieri e passati.
*   **Modalità Offline e Sincronizzazione:**
    *   L'app deve poter funzionare senza una connessione internet attiva.
    *   Una funzione di **Sincronizzazione** manuale o automatica per inviare i dati locali (nuovi rapportini) al server centrale (Firebase) e ricevere aggiornamenti sulle anagrafiche (clienti, luoghi, ecc.).
*   **Impostazioni e Dati Locali:**
    *   Un'area `Impostazioni` per configurare l'app e gestire i dati.
    *   Visualizzazione delle anagrafiche salvate localmente (es. luoghi, navi, tariffe) per la compilazione offline dei rapportini.
*   **Statistiche Personali:**
    *   Una sezione per mostrare al tecnico le proprie statistiche di lavoro (es. ore lavorate, numero di interventi).

### Funzionalità Escluse (come da indicazioni):

*   Gestione delle firme dei clienti.
*   Accesso diretto all'anagrafica completa dei clienti (se non per selezione in un rapportino).
*   Gestione documentale complessa.
*   Gestione delle presenze generali dell'azienda.
*   Gestione delle scadenze aziendali.

---

## 3. Piano di Sviluppo (Originale)

*Questa sezione rappresenta il piano iniziale, che è stato superato dagli sviluppi successivi.*

### Stack Tecnologico Proposto:

*   **Framework:** **React Native con Expo**.
*   **Libreria UI:** **React Native Paper**.
*   **Navigazione:** **React Navigation**.
*   **Backend:** **Firebase** (Firestore e Authentication).

### Passi Concreti:

1.  **Setup del Progetto:** Inizializzare un nuovo progetto React Native con Expo.
2.  **Copiare la Logica Esistente:** Migrare i file di logica.
3.  **Sviluppo Schermata di Login:** Creare la UI e la logica per l'autenticazione.
4.  **Sviluppo Core (Rapportini):** Implementare il flusso completo dei rapportini.
5.  **Implementazione Sincronizzazione:** Sviluppare il meccanismo di sync.
6.  **Sviluppo Funzionalità Secondarie:** Aggiungere Impostazioni e Statistiche.
7.  **Test e Rifinitura:** Debug e ottimizzazione.

---

## 4. Aggiornamento e Piano Operativo

*Stato attuale: Il progetto è già stato inizializzato nella cartella `riso-app-tecnici` ed esiste una schermata di Login. L'app tuttavia non è funzionante e presenta numerosi errori di build che impediscono la visualizzazione dell'anteprima.*

**Problema Identificato:** La build fallisce a causa di una configurazione errata che mescola l'ambiente dell'app mobile con quello dell'app web "Master Office". L'errore principale è il tentativo di usare alias di percorso (`@/`) e contesti (`AuthContext`) appartenenti al progetto sbagliato.

**Nuovo Piano d'Azione:**

1.  **Stabilizzare l'Ambiente (Fix Immediato):**
    *   **Creare un `AuthContext` dedicato:** Isolare la logica di autenticazione all'interno dell'app mobile. Creare `riso-app-tecnici/contexts/AuthContext.tsx`.
    *   **Implementare il Layout di Root:** Creare il file `riso-app-tecnici/app/_layout.tsx`. Questo file sarà il cuore della navigazione e gestirà il flusso di autenticazione, decidendo se mostrare la schermata di login o la home page.
    *   **Ristrutturare le Pagine (Routing):** Seguire le convenzioni di Expo Router.
        *   Spostare la schermata di Login esistente in `riso-app-tecnici/app/(auth)/login.tsx`.
        *   Creare un gruppo `(app)` per le schermate accessibili solo dopo il login.
        *   Il file `index.tsx` principale diventerà un semplice file di "ingresso" che reindirizzerà l'utente.
    *   **Correggere la Schermata di Login:** Aggiornare la schermata di login per usare il nuovo `AuthContext` dedicato e risolvere gli stili deprecati.

2.  **Sviluppo della Home (Prossimo Obiettivo):**
    *   Creare il file `riso-app-tecnici/app/(app)/home.tsx`.
    *   Questa schermata sarà la destinazione dopo un login andato a buon fine.
    *   Implementare una UI di base per la Dashboard/Home page, mostrando un messaggio di benvenuto e un pulsante di Logout per testare il flusso completo.

3.  **Visualizzazione nell'Anteprima Android:**
    *   Ogni passo verrà eseguito con l'obiettivo di risolvere gli errori di build e rendere l'app visibile e funzionante nell'anteprima Android.

**Prossimo Passo Concreto:** Inizierò immediatamente con il **Punto 1** del nuovo piano: la creazione del file `_layout.tsx`, la ristrutturazione delle cartelle e la creazione del `AuthContext` dedicato. Questo sbloccherà la situazione e ci permetterà di procedere.
