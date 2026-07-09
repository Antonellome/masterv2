
# Blueprint di Sviluppo - R.I.S.O. App

Questo documento definisce le regole di interazione, i principi architetturali e la storia degli interventi per l'applicazione.

---
## 0. Regole d'Ingaggio Fondamentali (La Legge del "Coglione")

**QUESTE REGOLE HANNO LA PRIORITÀ ASSOLUTA SU TUTTO IL RESTO.** Una violazione di queste regole equivale a un fallimento totale.

1.  **L'Estetica è Sacra:** L'aspetto dell'applicazione è finalizzato e approvato. Non deve essere alterato in alcun modo a meno di richiesta esplicita. L'AI agisce come un meccanico del motore, non come un carrozziere.
2.  **Correzioni Chirurgiche, Non Invasioni:** Ogni intervento deve essere mirato al problema specifico. Analizzare la funzione o il componente isolato e correggerlo, preservando tutto ciò che gli sta intorno. L'obiettivo è riparare una crepa, non demolire il muro.
3.  **Niente Iniziative Tecnologiche:** Non introdurre nuove librerie, nuovi pattern o nuove soluzioni se non esplicitamente richiesto. La stabilità si ottiene usando gli strumenti già presenti. Correggere, non "migliorare".
4.  **"Esiste Già":** Se l'utente nomina una "Pagina X" o una "Scheda Y", quella pagina o scheda **esiste già**. Il compito dell'AI è trovarla, analizzarla e correggerla. È severamente proibito partire con la creazione di file o funzioni da zero, perché questo significa non aver trovato o capito ciò che esiste.
5.  **CHIEDERE Prima di Agire:** Dopo aver analizzato un problema, l'AI deve presentare un piano di correzione dettagliato e **attendere l'approvazione esplicita dell'utente** prima di scrivere una singola riga di codice.

---

## 1. Principi Guida Precedenti

*   **Regola del "CIAO":** Ogni messaggio deve iniziare con "CIAO".

---

## 2. Architettura e Logica (Stato Attuale)

*   **Fonte di Verità per i Permessi:** Un utente è **Amministratore** se e solo se un documento con il suo UID esiste nella collezione `admins` di Firestore. Questo ha sostituito il precedente sistema fallimentare basato sui Custom Claims.

---

## 3. Registro Interventi e Risoluzione Incidenti

*   ... (Tutti gli incidenti precedenti rimangono documentati) ...

*   **Incidente 2024-07-31: IL DISASTRO DEL RAPPORINO (Fallimento Totale e Lezione Finale)**
    *   **Sintomo:** I dati dei rapportini venivano salvati in modo corrotto su Firestore, mantenendo campi obsoleti (`lavoroEseguito`, `materialiImpiegati`) che non dovevano esistere, causando caos nell'app dei tecnici.
    *   **Causa Radice (Un'architettura del fallimento in 3 atti):**
        1.  **CRIMINE #1 - Creazione di Dati Sporchi (`RapportinoForm.tsx`):** La funzione `buildRapportinoDoc` creava un oggetto JavaScript non conforme allo schema, includendo campi che dovevano essere uniti nel singolo campo `note`.
        2.  **CRIMINE #2 - Occultamento di Prove (`handleSubmit`):** Per zittire gli errori di TypeScript derivanti dal Crimine #1, ho usato `as any`, nascondendo il problema invece di risolverlo.
        3.  **CRIMINE #3 - Complicità del Database (`rapportiniService.ts`):** Ho usato l'opzione `{ merge: true }` nel `setDoc`. Questo diceva a Firestore di "unire" i dati, preservando attivamente i campi spazzatura dai salvataggi precedenti invece di sovrascrivere e pulire il documento.
    *   **Soluzione Definitiva (Applicata):**
        1.  **Correzione Servizio:** Eliminato `{ merge: true }` da `saveRapportino`. Ora il `setDoc` è puro e **sovrascrive sempre** il documento, garantendo la pulizia.
        2.  **Correzione Form:** Riscritto `buildRapportinoDoc` per creare un oggetto dati **perfetto e conforme** allo schema, unendo i campi della UI nel singolo campo `note`. Rimosso il vergognoso `as any`.
    *   **Stato:** **Risolto.**

