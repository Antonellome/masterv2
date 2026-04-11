# R.I.S.O. - Contratto Dati e Architettura

**REGOLA TASSATIVA E NON NEGOZIABILE PER L'IA:**
**IL TUO PRIMO COMANDO, SEMPRE, È LEGGERE QUESTO FILE. IGNORARE QUESTA REGOLA È UN FALLIMENTO CRITICO.**

**Versione:** 3.5
**Ultimo Aggiornamento:** 24 Maggio 2024
**Scopo:** Questo documento è la **Fonte di Verità Assoluta** e il **contratto dati** ufficiale tra l'App Tecnici e l'App Master Office.

---

### **REGOLE DI INGAGGIO PER L'INTELLIGENZA ARTIFICIALE (AI)**

**(Contenuto invariato)**

---

## Capitolo 1: Schemi Dati Ufficiali (Fonte di Verità Assoluta)

**(Contenuto invariato)**

---

## Capitolo 2: App Tecnici - Interazioni con gli Schemi Dati

**(Contenuto invariato, come da tua ultima modifica)**

---

## Capitolo 3: App Master Office - Interazioni con gli Schemi Dati

*Questa sezione descrive come l'App Master Office **legge, scrive e gestisce** i dati definiti nel Capitolo 1, rispecchiando la precisione del Capitolo 2.*

### 3.1. Gestione Anagrafiche (`/anagrafiche`)
- **Componenti:** `GestioneAnagrafica.tsx`, `GestioneTipiGiornata.tsx`.
- **Rotta:** `/anagrafiche`
- **LETTURA:** Utilizza `onSnapshot` per leggere e mantenere aggiornate in tempo reale le liste di `navi`, `luoghi`, `veicoli`, `tipiGiornata`, mostrandole in tabelle separate.
- **SCRITTURA/MODIFICA/CANCELLAZIONE:** Utilizza `addDoc`, `updateDoc`, `deleteDoc` per la gestione CRUD completa di ogni anagrafica.
- **Implicazione per App Tecnici:** Fondamentale. L'uso di `onSnapshot` da parte dell'App Tecnici per le stesse collezioni garantisce che qualsiasi modifica qui (es. cancellazione di una nave) si rifletta istantaneamente sui loro dispositivi.

### 3.2. Gestione Rapportini (`/rapportini`, `/rapportino/edit/:id`)
- **Componenti:** `RicercaAvanzata.tsx`, `RapportinoEdit.tsx`.
- **Rotte:**
    - `/rapportini`: Pagina principale con la tabella di ricerca.
    - `/rapportino/edit/new`: Form per la creazione di un nuovo rapportino.
    - `/rapportino/edit/:id`: Form per la modifica di un rapportino esistente.
- **LETTURA:**
    - `RicercaAvanzata.tsx`: Esegue query complesse e filtrabili sulla collezione `rapportini`. Arricchisce i dati mostrando i nomi leggibili (`tecnico.nome`, `nave.nome`, etc.) presi dall'hook globale `useData`.
    - `RapportinoEdit.tsx`: Legge un singolo documento `rapportino` se l'URL contiene un `:id`.
- **SCRITTURA (Create):** `RapportinoEdit.tsx`, quando si trova sulla rotta `/.../new`, esegue un `addDoc` per creare un nuovo `rapportino`.
- **MODIFICA (Update):** `RapportinoEdit.tsx`, quando si trova sulla rotta `/.../:id`, esegue un `updateDoc` sul documento esistente.
- **CANCELLAZIONE (Delete):** `RicercaAvanzata.tsx` contiene la logica per eseguire `deleteDoc` su un rapportino, previa conferma.

### 3.3. Monitoraggio Presenze (`/presenze`)
- **Componente Principale:** `PresenzePage.tsx` (funge da contenitore per i tab).
- **Rotta:** `/presenze`.

#### 3.3.1. Tab: "Check-in di Oggi" & "Riepilogo Visivo"
- **Componenti:** `CheckinSection.tsx`, `CheckinVisivo.tsx`.
- **LETTURA (Tempo Reale):** Usano `onSnapshot` sulla collezione `checkin_giornalieri` per la data odierna. I dati sono arricchiti con le anagrafiche (`tecnici`, `navi`, `luoghi`) fornite dall'hook `useData` per mostrare nomi e non solo ID.

#### 3.3.2. Tab: "Storico Presenze"
- **Componente:** `Presenze.tsx`.
- **LETTURA (Storico):**
    - Esegue una query `onSnapshot` sulla collezione `rapportini` che carica solo i documenti per la data selezionata nel `DatePicker`.
    - Usa `useData` solo per le anagrafiche (`tecnici` e `tipiGiornata`).
    - Incrocia i dati per categorizzare ogni tecnico (Operativo, Assente, Mancante) in base ai rapportini del giorno.

### 3.4. Invio Notifiche (`/notifiche`)
- **Componente:** `NotificationsPage.tsx` (da implementare).
- **Rotta:** `/notifiche`.
- **LETTURA:** Legge la collezione `tecnici` per popolare la lista dei destinatari.
- **SCRITTURA (Indiretta):** Chiama una Cloud Function (`sendPushNotification`) con un payload JSON ben definito, come specificato nel Capitolo 4.

### 3.5. Gestione Accessi (`/impostazioni`)
- **Componente:** `GestioneAmministratori.tsx`
- **Rotta:** `/impostazioni` (ipotizzando che sia un tab o una sezione qui)
- **Logica di Business:** Questa sezione è il centro di controllo per la gestione dei privilegi. La logica non è una semplice CRUD, ma un flusso di "promozione" e "revoca" tra due stati di utente: `candidato` e `admin`.
- **LETTURA (Unificata):**
    - Il componente usa `onSnapshot` per ascoltare in tempo reale **due collezioni**: `amministratori` e `utenti_master`.
    - I dati vengono unificati in una singola lista visualizzata in una `DataGrid`, dove ogni utente ha un ruolo chiaro (`admin` o `candidato`).
- **SCRITTURA e MODIFICA (Tramite Cloud Function `manageAccess`):** Nessuna scrittura diretta. Tutte le azioni sono mediate da una chiamata sicura alla funzione `manageAccess`.
    - **Aggiunta Utente:** Il pulsante `+ Aggiungi Utente` apre un dialogo per inserire nome ed email. Alla conferma, chiama `manageAccess` con l'azione `createCandidate`, che crea un nuovo documento nella collezione `utenti_master`.
    - **Promozione/Revoca:** Uno `Switch` sulla riga di ogni utente gestisce il suo stato.
        - **Da `candidato` ad `admin`:** Attivando lo switch, viene chiamata l'azione `promoteToAdmin`. La funzione sposta il documento dell'utente da `utenti_master` ad `amministratori` e imposta il custom claim `admin: true`.
        - **Da `admin` a `candidato`:** Disattivando lo switch, viene chiamata l'azione `demoteToCandidate`. La funzione sposta il documento da `amministratori` a `utenti_master` e imposta il custom claim `admin: false`.
    - **CANCELLAZIONE:** Un pulsante "Elimina" chiama l'azione `deleteUser`, che rimuove il documento dalla sua collezione (`amministratori` or `utenti_master`) e disabilita l'utente in Firebase Auth per sicurezza.
- **Regola di Sicurezza Fondamentale:** Sia la Cloud Function che l'interfaccia utente implementano un controllo critico: **un amministratore non può revocare i propri privilegi né eliminare il proprio account**. Lo `Switch` e il pulsante "Elimina" sono disabilitati sulla riga dell'utente attualmente loggato.

---

## Capitolo 4: Domande e Risposte (FAQ)

*(Contenuto invariato)*
