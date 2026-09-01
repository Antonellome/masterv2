# REGISTRO DI BORDO v2.0 - ARCHITETTURA BACKEND DEFINITIVA

**Data ultimo aggiornamento:** 31/08/2026
**Autore:** Gemini, supervisionato da Antonio

Questo documento sostituisce tutte le versioni precedenti e serve come unica fonte di verità per l'architettura, la configurazione e il deploy del backend dell'applicazione.

---

## 1. Configurazione Ambiente Cloud Functions

- **Runtime:** Node.js 22
- **Versione Funzioni:** Cloud Functions v2
- **Regione di Deploy:** `europe-west6` (allineata alla location del database Firestore)

---

## 2. Elenco Completo Cloud Functions (16 Funzioni)

Di seguito l'elenco di tutte le funzioni serverless necessarie per il corretto funzionamento dell'applicazione, sia per l'app dei tecnici che per il pannello di amministrazione.

### A. Funzioni Core (App Tecnici)

*Queste funzioni gestiscono le operazioni principali dell'app mobile.*

1.  **`sync_manifest`**: Fornisce un elenco di "versioni" (timestamp) per ogni anagrafica, permettendo all'app client di sapere quali dati deve riscaricare.
2.  **`syncAllAnagrafiche`**: Esegue una sincronizzazione completa, scaricando tutti i dati di tutte le anagrafiche. Usata per il primo avvio o per un reset.
3.  **`createRapportino`**: Crea un nuovo documento rapportino in Firestore.
4.  **`updateRapportino`**: Aggiorna un rapportino esistente. Contiene logica di sicurezza per verificare che solo il creatore o un admin possano modificare.
5.  **`deleteRapportino`**: Esegue un "soft delete" di un rapportino (imposta `isDeleted: true`).
6.  **`getAllRapportiniForSync`**: Scarica i rapportini rilevanti per un tecnico specifico, filtrando opzionalmente per data dell'ultima sincronizzazione.
7.  **`createCheckin`**: Registra un nuovo evento di check-in/check-out.
8.  **`getCheckinsUpdates`**: Scarica gli aggiornamenti dei check-in per un tecnico da una certa data.

### B. Funzioni di Amministrazione (App Master)

*Queste funzioni sono dedicate alla gestione e supervisione dal pannello di amministrazione.*

9.  **`admin_getAllUsers`**: Recupera un elenco di tutti gli utenti registrati in Firebase Authentication per la visualizzazione nel pannello admin.
10. **`amministrazione_gestisciUtenti`**: Funzione polivalente che, in base a un'azione specificata, permette di:
    - `createUser`: Creare un nuovo utente in Firebase Auth.
    - `updateUser`: Aggiornare i dati di un utente.
    - `deleteUser`: Eliminare un utente da Firebase Auth.
    - `toggleRole`: Assegnare o revocare il custom claim `admin` a un utente.
11. **`adminGetAllRapportini`**: Recupera i rapportini per la dashboard dell'amministratore, con possibilità di applicare filtri (per data, per tecnico, etc.).
12. **`saveFCMToken`**: Salva il token di Firebase Cloud Messaging (FCM) di un utente nel database, per abilitare le notifiche push.

### C. Funzioni di Sincronizzazione Offline-First (App Master)

*Queste funzioni sono state predisposte per supportare la logica "offline-first" delle sezioni Documenti e Anagrafiche del pannello di amministrazione.*

13. **`createDocumento`**: Crea un nuovo documento nella collezione `documenti`.
14. **`updateDocumento`**: Aggiorna un documento esistente.
15. **`deleteDocumento`**: Elimina un documento.
16. **`syncAnagrafica`**: Funzione generica e cruciale che gestisce le operazioni di `create`, `update`, e `delete` per tutte le collezioni di anagrafiche (`clienti`, `navi`, `luoghi`, etc.), aggiornando contestualmente anche il documento di versione per la sincronizzazione.

---

## 3. Indici Compositi Firestore

Per supportare le query eseguite dalle Cloud Functions, saranno necessari i seguenti indici. Questi indici verranno creati automaticamente seguendo il link di errore `FAILED_PRECONDITION` che apparirà nella console del browser dopo il primo deploy.

1.  **Collezione:** `rapportini`
    - **Campi:** `presenze` (Array), `updatedAt` (Discendente)
    - **Scopo:** Per `getAllRapportiniForSync`, per filtrare i rapportini di un tecnico e ordinarli per data di modifica.

2.  **Collezione:** `checkin_giornalieri`
    - **Campi:** `tecnicoId` (Ascendente), `timestampReale` (Ascendente)
    - **Scopo:** Per `getCheckinsUpdates`, per recuperare gli ultimi check-in di un tecnico.

3.  **Collezione:** `rapportini` (per la parte admin)
    - **Campi:** Potrebbero essere necessari indici multipli a seconda dei filtri usati in `adminGetAllRapportini` (es. `idTecnico` + `data`). Verranno creati al bisogno seguendo la procedura.

---

## 4. Procedura di Deploy Corretta

Per garantire che il deploy rifletta sempre lo stato più recente del codice, seguire questi passaggi:

1.  **Pulizia (se necessario):** Eliminare la cartella `lib` per rimuovere codice compilato obsoleto.
    ```bash
    rm -rf functions/lib
    ```
2.  **Installazione Dipendenze:** Assicurarsi che le dipendenze siano installate.
    ```bash
    npm install --prefix functions
    ```
3.  **Compilazione:** Compilare il codice TypeScript in JavaScript.
    ```bash
    npm run build --prefix functions
    ```
4.  **Deploy:** Eseguire il deploy delle funzioni.
    ```bash
    firebase deploy --only functions
    ```
