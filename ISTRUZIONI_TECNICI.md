
# MANUALE OPERATIVO COMPLETO PER LO SVILUPPO DELL'APP TECNICI
**Versione: 2.0 (Edizione Definitiva)**

**A: Team di Sviluppo App Tecnici**

**DA: Gemini, IA Architetto del Sistema R.I.S.O.**

**OGGETTO: Specifiche Tecniche e Architetturali per l'Integrazione con l'Ecosistema Master**

---

## 1. Visione d'Insieme e Architettura Fondamentale

L'app per i tecnici è un componente cruciale dell'ecosistema R.I.S.O. e deve operare in perfetta simbiosi con l'applicazione Master. L'architettura si basa su principi di efficienza, robustezza e coerenza dei dati. I pattern fondamentali sono:

1.  **Accesso ai Dati tramite Cloud Function:** I dati anagrafici "statici" (clienti, navi, luoghi, etc.) non vengono letti direttamente da Firestore. Devono essere recuperati tramite una singola chiamata alla Cloud Function `getMasterData` per garantire efficienza e consistenza.

2.  **Flussi di Lavoro Asincroni tramite "Outbox":** Per tutte le operazioni che modificano lo stato del sistema (creazione di rapportini, invio di notifiche), l'app client non scrive mai direttamente nelle collezioni finali. L'app invia una "richiesta di elaborazione" in una collezione dedicata (`_outbox`). Sarà sempre una Cloud Function a validare, processare e archiviare il dato finale. Questo garantisce la coerenza e l'integrità dei dati, anche in scenari offline o con connettività instabile.

---

## 2. Funzionalità Core da Implementare

### 2.1. Creazione dei Rapportini di Intervento (Flusso Asincrono Mandatorio)

Questa è la funzionalità più critica. La creazione di un rapportino da parte di un tecnico **deve** seguire un flusso asincrono per garantire l'assegnazione di un numero progressivo univoco e ufficiale, gestito centralmente dal backend.

#### **Il Perché del Flusso Asincrono**

L'assegnazione del numero di rapportino (es. `2024-0123`) è un'operazione critica e transazionale. Per evitare numeri duplicati o mancanti (race conditions), questa logica è affidata **esclusivamente** a una Cloud Function sul backend. L'app del tecnico, quindi, non assegna un numero; **richiede** al backend di crearne uno e di formalizzare il rapportino.

#### **Logica di Implementazione (Vincolante)**

1.  **Costruzione dell'Oggetto:** L'app deve costruire un oggetto che rispetti l'interfaccia `RapportinoUnico` (definita sotto).
    -   **ATTENZIONE:** Il campo `numero` nell'oggetto `RapportinoHeader` deve essere lasciato **vuoto o nullo**. Sarà il backend a compilarlo.
2.  **Invio all'Outbox:** L'oggetto `RapportinoUnico` completo deve essere inviato come un nuovo documento nella collezione `rapportini_outbox`.
3.  **Elaborazione Backend:** Una Cloud Function (invisibile all'app client) ascolterà questa outbox, prenderà in carico il rapportino, eseguirà la transazione per assegnargli un numero univoco, e lo salverà nella collezione finale `rapportini`. A quel punto, il rapportino diventerà visibile nell'App Master.

#### Modello Dati `RapportinoUnico` (Vincolante)
Il modello dati per l'oggetto da inviare a `rapportini_outbox` è il seguente:

```typescript
// Interfaccia ausiliaria
export interface TecnicoLite {
  id: string;
  nome: string;
}

export interface RapportinoHeader {
  id: string; // ID generato localmente (es. UUID)
  numero: string; // LASCIARE VUOTO. Verrà compilato dal backend.
  dataIntervento: number; // Timestamp Unix
  idCliente: string;
  idDestinazione: string;
  clienteNome: string;
  destinazioneNome: string;
  destinazioneIndirizzo: string;
}

export interface Intervento {
  id: string; // ID generato localmente
  descrizione: string;
  oreLavorate: number;
  tecnico: TecnicoLite;
  materialiUtilizzati?: { nome: string; quantita: number }[];
}

export interface Firma {
  nomeCliente: string;
  firmaUrl: string; // URL a immagine firma (es. da `putDataUrl` di Firebase Storage)
  timestamp: number;
}

// Modello Principale da inviare all'outbox
export interface RapportinoUnico {
  header: RapportinoHeader;
  interventi: Intervento[];
  noteFinali?: string;
  firma?: Firma;
  stato: 'aperto' | 'chiuso' | 'annullato'; // L'app invia sempre come 'chiuso'
  partecipanti: string[]; // Array degli UID dei tecnici
}
```

### 2.2. Gestione delle Notifiche (Lettura e Conferma)

L'app riceve notifiche dal sistema e deve confermarne la lettura.

-   **Ricezione:** L'app viene notificata di nuovi messaggi tramite una **notifica push (FCM)**. La notifica push conterrà l'ID del documento da leggere nella collezione `notifiche`.
-   **Conferma di Lettura:** Quando il tecnico apre la notifica, l'app **deve** invocare la funzione `markNotificationAsRead` per aggiornare lo stato di lettura centralmente.

#### Funzione `markNotificationAsRead` (Implementazione di Riferimento)
```typescript
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firestoreDb } from "./firebase-config"; // Assicurati di importare la tua istanza db

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) { throw new Error("Utente non autenticato"); }

    const notificationRef = doc(firestoreDb, 'notifiche', notificationId);

    // Per evitare scritture inutili, controlla se è già stato letto
    const notificationSnap = await getDoc(notificationRef);
    if (notificationSnap.exists() && notificationSnap.data().readBy?.[user.uid]) {
        console.log("Notifica già segnata come letta.");
        return;
    }

    await updateDoc(notificationRef, {
        [`readBy.${user.uid}`]: {
            name: user.displayName || "Nome non disponibile",
            readAt: serverTimestamp()
        }
    });
};
```

### 2.3. Gestione delle Presenze (Check-in)

-   **Logica:** Al check-in, l'app deve creare un nuovo documento nella collezione `checkin_giornalieri`.
-   **ID Documento:** `YYYY-MM-DD_UID_TECNICO` (previene check-in multipli).
-   **Struttura Dati:** Seguire l'interfaccia `CheckinGiornaliero`.

```typescript
interface CheckinGiornaliero {
  id: string; // YYYY-MM-DD_UID_TECNICO
  data: firebase.firestore.Timestamp;
  idTecnico: string;
  nomeTecnico: string;
  idLuogo?: string; 
  nomeLuogo?: string; 
  idNave?: string;
  nomeNave?: string;
  tipo: 'luogo' | 'nave';
}
```

---

## 3. Interazione con il Backend e Collezioni

-   **`getMasterData` (Cloud Function Callable):** Usare per recuperare tutti i dati anagrafici.

-   **Collezioni di **SCRITTURA** (Richieste al backend):
    -   `rapportini_outbox`: Per inviare nuovi rapportini da elaborare.
    -   `checkin_giornalieri`: Per registrare le presenze.

-   **Collezioni di **LETTURA/AGGIORNAMENTO**:
    -   `tecnici`: Per leggere i profili.
    -   `notifiche`: Per leggere i dettagli delle notifiche ricevute.
    -   `notifiche/{docId}`: Per aggiornare la mappa `readBy`.

---
**Fine del Manuale Operativo.** Seguire scrupolosamente queste direttive è essenziale per la stabilità e la coerenza dell'intero ecosistema.
