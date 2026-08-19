# Istruzioni di Integrazione per App Tecnici (Backend v2)

**Versione Documento:** 1.1
**Data:** 19/08/2026
**Regione Target:** `europe-west1`

---

## 1. Introduzione

Questo documento fornisce tutte le specifiche tecniche necessarie agli sviluppatori dell'**App Tecnici** per integrare il nuovo backend basato su Cloud Functions v2, completamente migrate sulla regione `europe-west1`. L'aggiornamento è obbligatorio per garantire la stabilità, la sicurezza e la coerenza dei dati.

**TUTTE le chiamate API devono essere eseguite verso gli endpoint specificati in questo documento.**

---

## 2. Autenticazione e Formato Chiamata (OBBLIGATORIO)

Le funzioni del backend sono implementate come **Funzioni Richiamabili (`onCall`)**. Questo impone un formato specifico per ogni richiesta HTTP.

### **2.1 Header**
Ogni singola richiesta **DEVE** includere l'ID Token dell'utente Firebase autenticato.

**Esempio Header:**
```
Authorization: Bearer <ID_TOKEN_DI_FIREBASE>
Content-Type: application/json
```

### **2.2 Corpo della Richiesta (Body)**
Il corpo di una richiesta `POST` **DEVE** essere un oggetto JSON contenente una chiave `"data"`. Il valore di questa chiave sarà il payload effettivo per la funzione.

**Esempio Corpo Richiesta:**
```json
{
  "data": { ... payload specifico della funzione ... }
}
```
Se una funzione non richiede dati specifici (come per la sincronizzazione), il valore di `data` deve essere `null`.

**Esempio Corpo per Funzioni senza Payload:**
```json
{
  "data": null
}
```

---

## 3. Gestione Rapportini

### **3.1 Crea Rapportino**

- **Nome Funzione:** `createRapportino`
- **URL Endpoint:** `https://createrapportino-2xbiermwyq-ew.a.run.app`
- **Corpo Richiesta (valore di `data`):** Un oggetto JSON con i dati del rapportino, come da `report_tecnici.md`.
- **Risposta Successo:** `{ "result": { "status": "success", "id": "<ID_NUOVO_DOC>" } }`

### **3.2 Aggiorna Rapportino**

- **Nome Funzione:** `updateRapportino`
- **URL Endpoint:** `https://updaterapportino-2xbiermwyq-ew.a.run.app`
- **Corpo Richiesta (valore di `data`):** `{ "id": "<ID_RAPPORTO>", "data": { ...dati da aggiornare... } }`
- **Risposta Successo:** `{ "result": { "status": "success" } }`

### **3.3 Elimina Rapportino (Solo Admin)**

- **Nome Funzione:** `deleteRapportino`
- **URL Endpoint:** `https://deleterapportino-2xbiermwyq-ew.a.run.app`
- **Nota:** Riservata all'App Master. Non implementare nell'App Tecnici.
- **Corpo Richiesta (valore di `data`):** `{ "rapportinoId": "<ID_RAPPORTO>" }`
- **Risposta Successo:** `{ "result": { "status": "success", "message": "..." } }`

### **3.4 Sincronizzazione Rapportini per Tecnico**

- **Nome Funzione:** `getAllRapportiniForSync`
- **URL Endpoint:** `https://getallrapportiniforsync-2xbiermwyq-ew.a.run.app`
- **Corpo Richiesta (valore di `data`):** `null`
- **Risposta Successo:** `{ "result": { "data": [ { ...rapportino1... }, { ... } ] } }`

---

## 4. Sincronizzazione Anagrafiche

### **4.1 Sincronizza Tutte le Anagrafiche**

- **Nome Funzione:** `syncAllAnagrafiche`
- **URL Endpoint:** `https://syncallanagrafiche-2xbiermwyq-ew.a.run.app`
- **Scopo:** Endpoint unico per la sincronizzazione di tutte le anagrafiche.
- **Corpo Richiesta (valore di `data`):** `null`
- **Risposta Successo:**
  ```json
  {
    "result": {
      "data": {
        "clienti": [ ... ],
        "navi": [ ... ],
        // etc.
      }
    }
  }
  ```

---

## 5. Gestione Presenze (Check-in)

### **5.1 Crea Check-in**

- **Nome Funzione:** `createCheckin`
- **URL Endpoint:** `https://createcheckin-2xbiermwyq-ew.a.run.app`
- **Corpo Richiesta (valore di `data`):**
  ```json
  {
    "tecnicoId": "<string>",
    "timestamp": "<timestamp>",
    "type": "in" or "out",
    "location": { "latitude": <number>, "longitude": <number> }
  }
  ```
- **Risposta Successo:** `{ "result": { "status": "success", "id": "<ID_NUOVO_DOC>" } }`

---

## 6. API CRUD Generica (Uso Avanzato)

### **6.1 Crea Documento Generico**
- **URL:** `https://createdocument-2xbiermwyq-ew.a.run.app`
- **Payload (`data`):** `{ "collection": "<NOME_COLLEZIONE>", "data": { ... } }`

### **6.2 Aggiorna Documento Generico**
- **URL:** `https://updatedocument-2xbiermwyq-ew.a.run.app`
- **Payload (`data`):** `{ "collection": "<NOME_COLLEZIONE>", "docId": "<ID>", "data": { ... } }`

### **6.3 Elimina Documento Generico**
- **URL:** `https://deletedocument-2xbiermwyq-ew.a.run.app`
- **Payload (`data`):** `{ "collection": "<NOME_COLLEZIONE>", "docId": "<ID>" }`
