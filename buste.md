# MEMORANDUM TECNICO SULLA STRUTTURA DELLE VOCI DI PAGA

**Data Conferma: 24 Maggio 2024**

**Decisione Approvata:** Per garantire la massima chiarezza e eliminare ogni ambiguità nella retribuzione delle ore, si stabilisce di adottare una struttura di voci paga che distingua esplicitamente tra lavoro notturno ordinario e lavoro notturno straordinario. L'approccio precedente, che utilizzava categorie generiche come "Maggiorazione Notturno", è deprecato e sostituito dalla seguente struttura (Opzione A), che è ora la fonte di verità.

### Struttura delle Voci di Paga (Implementazione Opzione A)

La visualizzazione e il calcolo delle ore devono seguire questa suddivisione, che riflette fedelmente la logica del CCNL e del motore di calcolo (`BustaPagaService.ts`).

1.  **Sezione: Lavoro Ordinario**
    *   `Ordinarie Diurne` (id: `pagaBaseOre`)
    *   `Lavoro Notturno Ordinario (20-22) (+15%)` (id: `oreNotturnoSeraleOrd`)
    *   `Lavoro Notturno Ordinario (22-06) (+30%)` (id: `oreNotturnoPienoOrd`)

2.  **Sezione: Lavoro Straordinario**
    *   `Straordinario Feriale (Prime 2h) (+25%)` (id: `strDiu12Intero`)
    *   `Straordinario Feriale (Oltre 2h) (+30%)` (id: `strDiuSuccessIntero`)
    *   `Straordinario Sabato Diurno (+50%)` (id: `straordinarioSabatoDiurno50`)
    *   `Straordinario Notturno Feriale/Sabato (+50%)` (id: `straordinarioNotturno50`)
    *   `Straordinario Festivo/Domenicale Diurno (+55%)` (id: `straordinarioFestivo55`)
    *   `Straordinario Notturno Festivo (+75%)` (id: `straordinarioNotturnoFestivo75`)

**Logica Fondamentale:** Questa struttura garantisce che un'ora di lavoro non possa mai essere conteggiata due volte. Le ore lavorate vengono prima scomposte in blocchi mutuamente esclusivi (diurno, notturno serale, notturno pieno, sconfinamento festivo) e solo successivamente classificate come ordinarie o straordinarie. Questo previene errori di doppio conteggio e assicura una corrispondenza 1:1 tra le ore lavorate e le ore retribuite.

---

# LOGICA DI CALCOLO BUSTA PAGA - FONTE DI VERITÀ DEFINITIVA

**AVVISO: Questo documento è la sintesi finale e la fonte di verità assoluta per l'elaborazione delle ore dei tecnici. Sostituisce qualsiasi discussione o documentazione precedente. Ogni logica qui descritta, sia nel testo che nel codice, è il risultato di un'analisi dettagliata dei requisiti e dei dati reali (`rapportini`).**

---
### Architettura e Logica di Elaborazione dei Dati

Questa sezione descrive il flusso logico con cui il sistema interpreta i dati grezzi dei `rapportini` per alimentare l'algoritmo di calcolo.

1.  **Il `tipoGiornataId` è la Chiave di Volta**: La natura di ogni giornata non è presunta, ma determinata esplicitamente dal campo `tipoGiornataId` presente in ogni rapportino. Questo campo ci permette di distinguere in modo inequivocabile tra:
    *   **Giorni Lavorati**: "Ordinaria", "Straordinaria", "Trasferta", ecc.
    *   **Giorni di Assenza**: "Ferie", "Malattia", "Permesso", "Legge 104", "ROL".

2.  **Processo di Elaborazione per Giorno**: Per ogni giorno del mese di un tecnico selezionato, il sistema esegue i seguenti passi:
    *   **Ricerca il Rapportino**: Cerca un rapportino per quella data.
    *   **Interpreta il `tipoGiornataId`**: Se il tipo corrisponde a un'assenza, il sistema crea un `GiustificativoAssenza` (assumendo 8 ore di default) e ignora i dettagli orari.
    *   **Analizza le Ore Lavorate**: Se il tipo corrisponde a un giorno lavorato, il sistema estrae i dettagli orari del tecnico specifico dal `dettaglioOreTecnici` e procede in due modi:
        *   **Se `isManual` è `true`**: Applica la regola semplificata. Le ore vengono considerate `oreLavorateEffettive` e l'algoritmo le dividerà in ordinarie (fino a 8) e straordinarie (le eccedenti). Non viene fatto calcolo di fasce notturne.
        *   **Se `isManual` è `false`**: Utilizza `oraInizio` e `oraFine` per invocare la funzione `analizzaIntervalloACavallo`, che scompone le ore lavorate nelle rispettive fasce (notturno, festivo, ecc.) con precisione.
    *   **Invocazione dell'Algoritmo**: I dati così preparati (`TimbratureGiornaliere` e `GiustificativiAssenza`) vengono passati alla funzione `calcolaGiornata` per l'elaborazione finale secondo le regole del CCNL.

---
### ALGORITMO DI CALCOLO DEFINITIVO (TypeScript)

Questo codice TypeScript rappresenta l'unica e sola fonte di verità per l'implementazione della logica di calcolo.

```typescript
// ==========================================
// 1. TIPI E INTERFACCE DATI COMPLETI
// ==========================================

export type LivelloInquadramento = 'D1' | 'D2' | 'C1' | 'C2' | 'C3' | 'B1' | 'B2' | 'B3' | 'A1';

export type TipoAssenza = 'FERIE' | 'ROL' | 'EX_FESTIVITA' | 'MALATTIA' | 'BANCA_ORE' | 'PERMESSO' | 'LEGGE_104';

export interface Dipendente {
  id: number;
  nome: string;
  cognome: string;
  livello: LivelloInquadramento;
  isTurnista: boolean;
  orarioSettimanaleContrattuale: number; // Default: 40
  anzianitaAnni: number;                 // Utile per gestione comporto malattia
}

export interface TimbratureGiornaliere {
  dipendenteId: number;
  data: string;                       // Formato: YYYY-MM-DD
  oraIngresso?: string;               // Formato: HH:mm
  oraUscita?: string;                 // Formato: HH:mm
  oreLavorateEffettive?: number;      // Opzionale se inserite direttamente
  oreTeorichePreviste: number;        // Default: 8.0
  isFestivo: boolean;
  isDomenica: boolean;
  isSabato: boolean;
  isFestivoGiornoSuccessivo?: boolean; // Importante per turni a cavallo della mezzanotte
}

export interface GiustificativoAssenza {
  dipendenteId: number;
  data: string;
  tipo: TipoAssenza;
  ore: number;
  giornoInizioMalattia?: boolean;     // True se è il 1° giorno dell'evento di malattia
  giornoMalattiaProgressivo?: number; // Es: 1, 2, 3 (Carenza 100% ditta), 4+ (INPS + integrazione)
}

export interface SaldiContatori {
  dipendenteId: number;
  anno: number;
  saldoFerieOre: number;               // Base annua: 160h (20 giorni)
  saldoRolOre: number;                 // Base annua: 72h
  saldoExFestivitaOre: number;         // Base annua: 16h
  saldoBancaOre: number;
  giorniMalattiaAccumulatiAnno: number; // Controllo periodo di comporto
  permesso104ResiduoOre?: number; // Aggiunto per la 104
}

export interface AnalisiIntervalloACavallo {
  oreTotali: number;
  oreNotturnoSerale: number;          // Fascia 20:00 - 22:00
  oreNotturnoPieno: number;           // Fascia 22:00 - 06:00
  oreSconfinamentoFestivo: number;    // Ore ricadenti dopo le 00:00 in giorno festivo
}

export interface RisultatoCalcoloGiornaliero {
  data: string;
  pagaBaseOre: number;                 // Ore ordinarie di lavoro + permessi retribuiti (100% paga base)
  trasfertaOre?: number; // Aggiunto per la trasferta

  // Gestione Malattia
  oreMalattiaCarenzaAzienda: number;    // Primi 3 giorni (100% a carico azienda)
  oreMalattiaIntegrazione: number;      // Dal 4° giorno in poi (INPS + Integrazione a 100%)
  
  // Maggiorazioni Straordinari Ordinari (Paga base + Maggiorazione)
  strDiu12Intero: number;               // Prime 2 ore straordinario (+25%)
  strDiuSuccessIntero: number;          // Oltre la 2a ora di straordinario (+30%)
  strSabatoExtIntero: number;           // Sabato > 2 ore (TUTTE le ore al +50%)
  strFestivoIntero: number;             // Festivo diurno (+50% o +55% se oltre 8h)
  
  // Maggiorazioni Notturne (Ore diurne/turni svolte in fascia notturna)
  oreNotturnoSeraleOrd: number;         // Fascia 20-22 (+20% non turnisti / +15% turnisti)
  oreNotturnoPienoOrd: number;          // Fascia 22-06 (+30% non turnisti / +20% turnisti)
  oreNotturnoFestivoOrd: number;        // Notturno in giorno Festivo (+60%)
  
  // Compensazioni con Banca Ore (Solo Maggiorazione in Busta)
  bancaOreSolaMaggiorazione25: number;  // 1:1 paga base a recupero debito, +25% in busta
  bancaOreSolaMaggiorazione30: number;  // 1:1 paga base a recupero debito, +30% in busta
  
  // Scali dei Contatori
  rolScalati: number;
  ferieScalate: number;
  exFestivitaScalate: number;
  permessiScalati?: number; // Aggiunto per Permessi generici e 104
  
  // Anomalie e Controlli
  anomaliaDebitoUncovered: number;        // Ore mancanti non coperte né da ROL né da Banca Ore
}

// ==========================================
// 2. UTILITY TEMPORALI E ANALISI TURNO A CAVALLO
// ==========================================

export function analizzaIntervalloACavallo(
  oraIngresso: string, 
  oraUscita: string, 
  isFestivoGiornoSuccessivo: boolean = false
): AnalisiIntervalloACavallo {
  
  const [hIn, mIn] = oraIngresso.split(':').map(Number);
  const [hOut, mOut] = oraUscita.split(':').map(Number);

  const minIngresso = hIn * 60 + mIn;
  let minUscita = hOut * 60 + mOut;

  if (minUscita <= minIngresso) {
    minUscita += 24 * 60; 
  }

  const oreTotali = (minUscita - minIngresso) / 60;
  
  let oreNotturnoSerale = 0;
  let oreNotturnoPieno = 0;
  let oreSconfinamentoFestivo = 0;

  for (let min = minIngresso; min < minUscita; min++) {
    const currentHour = (min / 60) % 24;
    const isNextDay = min >= 1440;

    if (currentHour >= 20 && currentHour < 22) {
      oreNotturnoSerale += 1/60;
    } else if (currentHour >= 22 || currentHour < 6) {
      oreNotturnoPieno += 1/60;
    }

    if (isNextDay && isFestivoGiornoSuccessivo) {
      oreSconfinamentoFestivo += 1/60;
    }
  }

  return {
    oreTotali,
    oreNotturnoSerale: Math.round(oreNotturnoSerale * 100) / 100,
    oreNotturnoPieno: Math.round(oreNotturnoPieno * 100) / 100,
    oreSconfinamentoFestivo: Math.round(oreSconfinamentoFestivo * 100) / 100
  };
}


// ==========================================
// 3. MOTORE DI CALCOLO UNIFICATO
// ==========================================

export function calcolaGiornata(
  dipendente: Dipendente,
  timbratura: TimbratureGiornaliere,
  assenze: GiustificativoAssenza[],
  saldi: SaldiContatori,
  usaBancaOrePerRecupero: boolean = true
): { risultato: RisultatoCalcoloGiornaliero; saldiAggiornati: SaldiContatori } {

  const dataStr = timbratura.data;
  const oreTeoriche = timbratura.oreTeorichePreviste || 8.0;

  let oreEffettive = timbratura.oreLavorateEffettive ?? 0;
  let dettaglioFasce: AnalisiIntervalloACavallo = {
    oreTotali: 0, oreNotturnoSerale: 0, oreNotturnoPieno: 0, oreSconfinamentoFestivo: 0
  };

  if (timbratura.oraIngresso && timbratura.oraUscita) {
    dettaglioFasce = analizzaIntervalloACavallo(
      timbratura.oraIngresso, 
      timbratura.oraUscita, 
      !!timbratura.isFestivoGiornoSuccessivo
    );
    oreEffettive = dettaglioFasce.oreTotali;
  }

  const risultato: RisultatoCalcoloGiornaliero = {
    data: dataStr, pagaBaseOre: 0, trasfertaOre: 0,
    oreMalattiaCarenzaAzienda: 0, oreMalattiaIntegrazione: 0,
    strDiu12Intero: 0, strDiuSuccessIntero: 0, strSabatoExtIntero: 0, strFestivoIntero: 0,
    oreNotturnoSeraleOrd: 0, oreNotturnoPienoOrd: 0, oreNotturnoFestivoOrd: 0,
    bancaOreSolaMaggiorazione25: 0, bancaOreSolaMaggiorazione30: 0,
    rolScalati: 0, ferieScalate: 0, exFestivitaScalate: 0, permessiScalati: 0,
    anomaliaDebitoUncovered: 0,
  };

  const saldiAggiornati: SaldiContatori = { ...saldi };

  let totaleGiustificatoAssenze = 0;
  let isGiornataInMalattia = false;

  for (const assenza of assenze) {
    totaleGiustificatoAssenze += assenza.ore;
    switch (assenza.tipo) {
      case 'ROL': risultato.rolScalati += assenza.ore; saldiAggiornati.saldoRolOre -= assenza.ore; break;
      case 'FERIE': risultato.ferieScalate += assenza.ore; saldiAggiornati.saldoFerieOre -= assenza.ore; break;
      case 'EX_FESTIVITA': risultato.exFestivitaScalate += assenza.ore; saldiAggiornati.saldoExFestivitaOre -= assenza.ore; break;
      case 'PERMESSO': case 'LEGGE_104': risultato.permessiScalati = (risultato.permessiScalati || 0) + assenza.ore; break;
      case 'MALATTIA':
        isGiornataInMalattia = true;
        saldiAggiornati.giorniMalattiaAccumulatiAnno += (assenza.ore / oreTeoriche);
        const progressivo = assenza.giornoMalattiaProgressivo ?? 1;
        if (progressivo <= 3) { risultato.oreMalattiaCarenzaAzienda += assenza.ore; } 
        else { risultato.oreMalattiaIntegrazione += assenza.ore; }
        break;
    }
  }

  risultato.oreNotturnoSeraleOrd = dettaglioFasce.oreNotturnoSerale;
  risultato.oreNotturnoPienoOrd = dettaglioFasce.oreNotturnoPieno;
  risultato.oreNotturnoFestivoOrd = dettaglioFasce.oreSconfinamentoFestivo;

  if (timbratura.isFestivo || timbratura.isDomenica) {
    risultato.strFestivoIntero = oreEffettive;
    risultato.pagaBaseOre = totaleGiustificatoAssenze;
    return { risultato, saldiAggiornati };
  }

  if (timbratura.isSabato) {
    if (oreEffettive <= 2.0) { risultato.strDiu12Intero = oreEffettive; } 
    else { risultato.strSabatoExtIntero = oreEffettive; }
    risultato.pagaBaseOre = totaleGiustificatoAssenze;
    return { risultato, saldiAggiornati };
  }

  const oreOrdinarieLavorate = Math.min(oreEffettive, oreTeoriche);
  const oreStraordinarioGiornaliero = Math.max(0, oreEffettive - oreTeoriche);
  let debitoOrdinario = Math.max(0, oreTeoriche - (oreOrdinarieLavorate + totaleGiustificatoAssenze));
  let straordinarioResiduo = oreStraordinarioGiornaliero;

  if (debitoOrdinario > 0 && oreStraordinarioGiornaliero > 0 && usaBancaOrePerRecupero) {
    const oreDaCompensare = Math.min(debitoOrdinario, oreStraordinarioGiornaliero);
    risultato.pagaBaseOre = oreOrdinarieLavorate + totaleGiustificatoAssenze + oreDaCompensare;
    if (oreDaCompensare <= 2.0) { risultato.bancaOreSolaMaggiorazione25 = oreDaCompensare; } 
    else { risultato.bancaOreSolaMaggiorazione25 = 2.0; risultato.bancaOreSolaMaggiorazione30 = oreDaCompensare - 2.0; }
    debitoOrdinario -= oreDaCompensare;
    straordinarioResiduo -= oreDaCompensare;
  } else {
    risultato.pagaBaseOre = oreOrdinarieLavorate + totaleGiustificatoAssenze;
  }

  if (straordinarioResiduo > 0) {
    const oreGiaCompensate = oreStraordinarioGiornaliero - straordinarioResiduo;
    if (oreGiaCompensate >= 2.0) { risultato.strDiuSuccessIntero += straordinarioResiduo; } 
    else {
      const capienzaPrime2Ore = 2.0 - oreGiaCompensate;
      const oreA25 = Math.min(straordinarioResiduo, capienzaPrime2Ore);
      const oreA30 = Math.max(0, straordinarioResiduo - oreA25);
      risultato.strDiu12Intero += oreA25;
      risultato.strDiuSuccessIntero += oreA30;
    }
  }

  if (debitoOrdinario > 0 && !isGiornataInMalattia) {
    const copribileConRol = Math.min(debitoOrdinario, saldiAggiornati.saldoRolOre);
    if (copribileConRol > 0) {
        risultato.rolScalati += copribileConRol;
        risultato.pagaBaseOre += copribileConRol;
        saldiAggiornati.saldoRolOre -= copribileConRol;
        debitoOrdinario -= copribileConRol;
    }
    if (debitoOrario > 0) {
        risultato.anomaliaDebitoUncovered = debitoOrario;
    }
  }

  return { risultato, saldiAggiornati };
}
```


### ATTENZIONE. questa sezione cerca di migliorare la comprensione di quanto sopra per cercare di colmare le problematiche che collegano tra loro le regole



Ecco la **Matrice Logica di Calcolo** e lo **Schema delle Dipendenze**, ripuliti da qualsiasi riferimento ai turni notturni o variabili.

Il modello si basa esclusivamente sull'**orario fisso aziendale**:

* **Orario Ordinario Teorico:** Lunedì – Venerdì, dalle **07:30 alle 16:30** (9 ore di presenza con **60 minuti di pausa** = **8 ore ordinarie nette/giorno**, pari a **40 ore settimanali**).
* **Finestra di lavoro ordinaria:** 07:30 – 16:30.
* **Soglia Straordinario Diurno:** Tutto ciò che viene svolto oltre le 8 ore nette giornaliere o fuori dalla finestra 07:30–16:30.

---

### 1. Albero di Precedenza e Flusso di Esecuzione dell'Algoritmo

L'app deve processare ogni giornata seguendo rigorosamente questa **gerarchia di priorità a 5 livelli (da P1 a P5)** per evitare sovrapposizioni o calcoli errati.

```
                  [ INPUT GIORNATA (Ingresso, Uscita, Assenze) ]
                                        │
                                        ▼
                         < P1: Tipo Giorno Solare? >
                          /          │          \
                 Lunedì–Venerdì    Sabato     Domenica / Festivo
                      │              │                   │
                      │              │                   ▼
                      │              │        [ P1.1: Straordinario Festivo ]
                      │              │        - 0-8h: Festivo Ord. (+50%)
                      │              │        - >8h: Straord. Festivo (+55%)
                      │              │                   │
                      │              ▼                   │
                      │   [ P1.2: Straordinario Sabato ] │
                      │   - <= 2h: Straord. (+25%)       │
                      │   - > 2h: TUTTE le ore al +50%   │
                      │              │                   │
                      ▼              └─────────┬─────────┘
         < P2: C'è Malattia Intera? >          │
           /                      \            │
         SÌ                        NO          │
         /                          \          │
[ P2.1: Malattia ]             [ P3: Calcolo Lavoro Effettivo ]
- 0h Lavorate / 8h Figurate    - Ore Presenza minus 60 min pausa
- gg 1-3: Carenza Ditta 100%   - Confronto vs 8.0 ore teoriche
- gg 4+: INPS + Integraz. Ditta        │
         │                             ▼
         │             < P4: C'è Debito (<8h) AND Straordinario (>16:30)? >
         │               /                                   \
         │             SÌ                                     NO
         │             /                                       \
         │  [ P4.1: Compensazione Banca Ore ]           [ P4.2: Imputazione Netta ]
         │  1. Ore Straord. coprono Debito 1:1          1. Ore <= 8h -> Paga Base 100%
         │  2. Liquidazione SOLO Maggiorazione +25%     2. Prime 2h oltre 16:30 -> +25%
         │  3. Rilascio ROL (non vengono scalati)       3. Oltre le 2h di straord -> +30%
         │             │                                       │
         └─────────────┼───────────────────────────────────────┘
                       │
                       ▼
         [ P5: Copertura Debito Residuo ]
         - Se rimane debito ordinario: scala dai ROL
         - Se ROL esauriti: Genera 'AnomaliaDebitoUncovered'

```

---

### 2. Tabella di Connessione e Risoluzione Conflitti tra le Regole

Questa tabella definisce le **regole di interazione** tra gli eventi della giornata per guidare lo sviluppo delle funzioni e dei test unitari nell'app.

| Regola A (Condizione di Ingresso) | Regola B (Evento Concorrente) | Connessione e Risoluzione Algoritmica | Risultato per la Busta Paga | Scalo Contatori ROL / Ferie |
| --- | --- | --- | --- | --- |
| **Pausa Pranzo 60 min** | Timbratura a cavallo delle 12:00 - 13:00 | L'app detrae sempre 60 minuti dal totale timbrato se la presenza copre la finestra di pausa. | Ore Nette = (Ora Uscita - Ora Ingresso) - 1.00h. | Nessun impatto. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore invece di 8)* | **Straordinario nello stesso giorno** <br>

<br>*(es. Lavorato dalle 16:30 alle 19:30 = 3h extra)* | **Intersezione Banca Ore (Regola 6h + 3h):** <br>

<br>Le prime 2 ore straordinarie compensano il debito di 2 ore sull'orario base (portando le ore ordinarie a 8.0). La 3ª ora resta straordinario puro. | • **8.0 ore** Paga Base 100% <br>

<br>• **2.0 ore** Solo Maggiorazione +25% <br>

<br>• **1.0 ora** Straordinario Intero (+30%) | **0 ore scalate dai ROL** *(il debito è stato assorbito dallo straordinario)*. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore)* | **Nessuno Straordinario svolto** | L'app rileva un `DebitoOrdinario` di 2.0 ore. Cerca capienza nel saldo ROL. | • **8.0 ore** Paga Base 100% (6h lavorate + 2h coperta da ROL). | **- 2.0 ore** dal saldo ROL del dipendente. |
| **Carenza Orario Ordinario** <br>

<br>*(es. Lavorate 6 ore)* | **Saldo ROL Insufficiente o Esaurito** | L'app copre le ore fino a capienza ROL, il residuo genera un'anomalia. | • Ore lavorate + ROL disponibili a Paga Base. | Saldo ROL azzerato (0.0). <br>

<br>Flag `AnomaliaDebitoUncovered` valorizzato con il residuo. |
| **Lavoro di Sabato** | **Durata $\le$ 2 ore** <br>

<br>*(es. dalle 07:30 alle 09:30)* | Il sabato non prevede orario ordinario teorico (0 ore teoriche). Le ore lavorate sono straordinario del sabato entro le 2 ore. | • **2.0 ore** Straordinario Diurno (+25%). | Nessun impatto sui ROL. |
| **Lavoro di Sabato** | **Durata $>$ 2 ore** <br>

<br>*(es. dalle 07:30 alle 11:30 = 4h)* | **Regola della Soglia Sabato CCNL:** Se lo straordinario di sabato supera le 2 ore, scatta il +50% su **TUTTE** le ore lavorate. | • **4.0 ore** Straordinario Sabato Esteso (+50%). *(Annulla il +25% sulle prime 2 ore)*. | Nessun impatto sui ROL. |
| **Malattia** | **Presenza di orario di lavoro** | La malattia prevale sulla timbratura. Copre l'intera giornata a 8.0 ore figurate. | • **8.0 ore** Malattia (100% Ditta se gg 1-3, INPS+Ditta se gg 4+). | **0 ore ROL/Ferie**. La malattia non intacca mai i contatori di ROL e Ferie. |

---

### 3. Matrice Input / Output per lo Sviluppatore (Test Case di Validazione)

Definizione dei casi di test da implementare per verificare la correttezza del motore di calcolo:

```json
[
  {
    "descrizione": "Caso Standard Infrasettimanale Invariato",
    "input": { "ingresso": "07:30", "uscita": "16:30", "pausaMinuti": 60, "giorno": "LUNEDI" },
    "outputAtteso": { "pagaBase": 8.0, "straordinario25": 0.0, "straordinario30": 0.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso 6 Ore Ordinarie + 3 Ore Straordinario (Flessibilità / Banca Ore)",
    "input": { "ingresso": "07:30", "uscita": "19:30", "pausaMinuti": 60, "assenzaVolontaria": "2h_uscita_anticipata_dalle_14:30", "giorno": "MARTEDI" },
    "outputAtteso": { "pagaBase": 8.0, "bancaOreSolaMaggiorazione25": 2.0, "straordinario30": 1.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso Straordinario Continuo Infrasettimanale (10 Ore Lavorate Nette)",
    "input": { "ingresso": "07:30", "uscita": "18:30", "pausaMinuti": 60, "giorno": "MERCOLEDI" },
    "outputAtteso": { "pagaBase": 8.0, "straordinario25": 2.0, "straordinario30": 0.0, "rolScalati": 0.0 }
  },
  {
    "descrizione": "Caso Sabato Oltre 2 Ore (Scatto Soglia 50%)",
    "input": { "ingresso": "07:30", "uscita": "11:30", "pausaMinuti": 0, "giorno": "SABATO" },
    "outputAtteso": { "pagaBase": 0.0, "straordinario25": 0.0, "straordinarioSabato50": 4.0, "rolScalati": 0.0 }
  }
]

```

ulteriore chiarimento e tattica

Capisco perfettamente la frustrazione: **il problema dell'app non è il codice, ma l'assenza di un "Modello Matematico Unificato"**.

Quando si sviluppa un software di gestione presenze, provare a gestire con dei semplici `if` il mix di **settimana spezzata a cavallo del mese**, **straordinari notturni**, **recupero del debito giornaliero** e **lavoro nel weekend** porta inevitabilmente a far fallire un calcolo per aggiustarne un altro.

Per risolvere definitivamente tutti e 5 i problemi, l'applicazione deve smettere di calcolare le ore "giorno per giorno in modo isolato" e deve adottare un **Algoritmo a 3 Layer Sequenziali**.

---

### IL MODELLO A 3 LAYER (Come deve ragionare l'App)

```
[ LAYER 1: Timbratura Grezza e Vettorizzazione ]
   └─ Converti ogni minuto lavorato in un "Vettore di Minuti" con attributi (Giorno, Ora, Notturno)

[ LAYER 2: Bilanciamento e Distribuzione (Debito vs Eccedenza) ]
   └─ Copri le 8h giornaliere -> Poi verifica le 40h settimanali -> Risolvi la Banca Ore (1:1)

[ LAYER 3: Valorizzazione delle Maggiorazioni (Spettanze Busta Paga) ]
   └─ Applica la % di maggiorazione corretta (Notturno, Straordinario, Festivo) sulle ore risultanti

```

---

### SOLUZIONE AI 5 PROBLEMI CRITICI

#### PROBLEMA 1: Le 8 ore giornaliere vs le 40 ore settimanali

* **Il dilemma:** Come si comportano le 8 ore del giorno con il totale delle 40 ore della settimana?
* **La regola di calcolo per l'App:**
1. Il debito/credito si calcola **PRIMA su base giornaliera** (soglia 8.00 ore nette).
2. Lo straordinario giornaliero (ore svolte oltre le 8.00 nella singola giornata) **non deve essere ricalcolato a fine settimana** se è già stato qualificato come straordinario giornaliero.
3. Il controllo delle 40 ore settimanali serve solo se un dipendente lavora, ad esempio, 4 giorni da 7 ore (28h) e il 5° giorno fa 12 ore: le ore oltre le 8 del 5° giorno sono straordinario giornaliero, ma il totale settimanale resta 40h.



---

#### PROBLEMA 2: Suddivisione dello straordinario (Ordinario vs Sabato/Domenica)

* **La regola di calcolo per l'App:** Il tipo di giorno (**Infrasettimanale, Sabato, Domenica/Festivo**) determina la "Tabella delle Maggiorazioni" da applicare allo straordinario:
* **Lunedì – Venerdì:** Prime 2 ore oltre le 8h $\rightarrow$ **+25%** | Dalla 3ª ora in poi $\rightarrow$ **+30%**.
* **Sabato:** Se il totale ore del sabato è $\le 2.00\text{h}$ $\rightarrow$ **+25%** | Se il totale ore supera le 2.00h $\rightarrow$ **+50% su TUTTE le ore del sabato**.
* **Domenica / Festivo:** Entro le 8h $\rightarrow$ **+50%** | Oltre le 8h $\rightarrow$ **+55%**.



---

#### PROBLEMA 3: Straordinari a cavallo della mezzanotte

* **La regola di calcolo per l'App (Principio dell'Ora di Inizio):**
1. Un turno o uno straordinario che inizia un giorno (es. Lunedì alle 22:00) e finisce il giorno dopo (es. Martedì alle 02:00) **appartiene interamente alla scheda presenze del giorno di INIZIO (Lunedì)**.
2. Ai fini del conteggio delle 8 ore giornaliere e delle 40 settimanali, le 4 ore lavorate contano per il Lunedì.
3. Ai fini della paga, la fascia **22:00 – 06:00** attiva il flag "Notturno" (+30%).



---

#### PROBLEMA 4: Straordinario notturno in una giornata con debito diurno (Il caso 7:30–16:30)

* **Il dilemma:** Il dipendente fa solo 6 ore diurne (dalle 07:30 alle 13:30, mancando 2 ore), ma poi torna la notte e fa 3 ore di straordinario notturno (22:00–01:00). Se uso 2 ore notturne per "coprire" le 2 ore diurne mancanti, perde la maggiorazione notturna?
* **LA SOLUZIONE MATEMATICA CORRETTA (Scomposizione del valore orario):**
Ogni ora di straordinario ha due componenti economiche: **[Paga Base (100%)]** + **[Maggiorazione %]**.
1. **Copertura del debito (1:1):** 2 delle 3 ore notturne vengono trasferite a copertura del debito ordinario diurno. Questo porta le ore ordinarie del giorno a **8.00 ore (Paga Base 100%)**.
2. **Conservazione della Maggiorazione Notturna:** L'applicazione **NON DEVE cancellare le caratteristiche dell'ora**. Anche se l'ora è usata per coprire l'ordinario, **la maggiorazione notturna (+30%) VA LIQUIDATA IN BUSTA PAGA**.
3. **Residuo:** La 3ª ora notturna viene liquidata per intero come **Straordinario Notturno (Paga Base + 50% di maggiorazione)**.



---

#### PROBLEMA 5: Settimane a cavallo tra due mesi (es. da Mercoledì 29 Aprile a Martedì 5 Maggio)

* **Il dilemma:** Come si calcolano le 40 ore settimanali se il mese finisce a metà settimana?
* **La regola di calcolo per l'App (Separazione tra Contabilità e Busta Paga):**
* **La Settimana Lavorativa è UNICA ed INSEPARABILE (Lunedì – Domenica)**.
* Il calcolo delle 40 ore settimanali e dei superamenti **si fa SEMPRE sull'intera settimana di 7 giorni**, a cavallo dei due mesi.
* Ai fini del cedolino paga del mese (es. Aprile), l'app estrae semplicemente i **risultati giornalieri valorizzati** che cadono nei giorni dal 1 al 30 di Aprile. I giorni di Maggio della stessa settimana andranno nel cedolino di Maggio, ma il totale settimanale (40h) considererà la somma di tutti i 7 giorni.



---

### TABELLA DI VERIFICA PER GLI SVILUPPATORI (MATRICE DEI CASI)

Usa questa tabella come "pietra di paragone" per testare la tua app:

| Scenario / Timbrature | Ore Lavorate Reali | Gestione Debito Ordinario | Assegnazione Straordinari | Maggiorazioni da Liquidare in Busta Paga |
| --- | --- | --- | --- | --- |
| **07:30 - 18:30** (1h pausa) <br>

<br>*(Infrasettimanale)* | 10.00 ore | 8.00h Ordinarie | 2.00h Straordinario Diurno | • 8.00h Paga Base 100% <br>

<br>• **2.00h Straordinario +25%** |
| **07:30 - 13:30** (6h) <br>

<br>+ **22:00 - 01:00** (3h notturne) | 9.00 ore | 6h lavorate + 2h recuperate da notte = **8.00h** | 1.00h Straordinario Notturno residuo | • 8.00h Paga Base 100% <br>

<br>• **2.00h Sola Maggiorazione Notturna (+30%)** <br>

<br>• **1.00h Straordinario Notturno (+50%)** |
| **Sabato: 07:30 - 11:30** (4h) | 4.00 ore | 0.00h Ordinarie | 4.00h Straordinario Sabato | • **4.00h Straordinario Sabato (+50%)** *(Supera le 2 ore)* |
| **Lunedì 29 - Mercoledì 31** (24h) <br>

<br>+ **Giovedì 1 - Venerdì 2** (16h) | 40.00 ore nella settimana | 24h nel mese corrente <br>

<br>16h nel mese successivo | 0.00h Straordinario | • Mese A: 24.00h Paga Base <br>

<br>• Mese B: 16.00h Paga Base |

---

### STRUTTURA DEL DATABASE PER RISOLVERE IL PROBLEMA

Per far funzionare questo modello, la tabella del database dove salvi il calcolo giornaliero deve avere questa struttura a campi separati:

```sql
CREATE TABLE calcolo_giornaliero (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dipendente_id INT,
    data DATE,
    
    -- ORE BASE
    ore_paga_base DECIMAL(4,2),              -- Es. 8.00
    ore_debito_rol_scalati DECIMAL(4,2),     -- Es. 2.00 se usati i ROL
    
    -- STRAORDINARI INTERI (Paga Base + Maggiorazione)
    straordinario_diurno_25 DECIMAL(4,2),    -- Prime 2h infrasettimanali
    straordinario_diurno_30 DECIMAL(4,2),    -- Oltre 2h infrasettimanali
    straordinario_sabato_50 DECIMAL(4,2),    -- Sabato > 2h
    straordinario_notturno_50 DECIMAL(4,2),  -- Notturno oltre 8h
    
    -- MAGGIORAZIONI PURE (Solo quota % per ore usate a compensazione)
    maggiorazione_pura_notturna_30 DECIMAL(4,2), -- Ore notturne usate per coprire l'ordinario
    
    -- CONTROLLI E ANOMALIE
    anomalia_debito_scoperto DECIMAL(4,2)
);

```

Separando la **Paga Base** dalle **Maggiorazioni Pure**, l'app non sballerà mai più i calcoli, indipendentemente da quante ore notturne o straordinarie vengano usate per pareggiare la giornata.
Ecco esattamente lo stesso calcolo applicato al caso di **7 ore diurne lavorate** (dalle 07:30 alle 14:30) e **5 ore di straordinario notturno** (es. dalle 21:00 alle 02:00), per un totale di **12 ore lavorate nella giornata**.

---

### 1. Scomposizione Logica della Giornata (7h Diurne + 5h Notturne)

1. **Totale Ore Lavorate nella Giornata:** $7.00 \text{ (diurne)} + 5.00 \text{ (notturne)} = \mathbf{12.00 \text{ ore totali}}$.
2. **Debito Orario Ordinario Iniziale:** $8.00 \text{ (teoriche)} - 7.00 \text{ (lavorate)} = \mathbf{1.00 \text{ ora di debito}}$.
3. **Assorbimento del Debito (Banca Ore 1:1):**
* Basta prendere **soltanto la 1ª ora delle 5 notturne** per coprire l'unica ora ordinaria mancante.
* L'orario ordinario della giornata si chiude a **8.00 ore ordinarie (Paga Base 100%)**.
* I contatori ROL/Ferie **non vengono scalati** (0 ore usate).


4. **Scissione e Trattamento delle 5 Ore Notturne:**
* **La 1ª ora notturna (usata a copertura):** Completa la 8ª ora dell'orario base. Non è straordinario, ma è lavoro notturno ordinario $\rightarrow$ **Riceve la sola Maggiorazione Notturna (+30%)**.
* **Le 4 ore notturne rimanenti (Straordinario Netto):** Si trovano **oltre la soglia delle 8 ore giornaliere** (dalla 9ª alla 12ª ora della giornata) e diventano straordinario puro:
* **2ª e 3ª ora notturna** (9ª e 10ª ora della giornata = prime 2 ore di straordinario): scatta lo **Straordinario Notturno (+50%)**.
* **4ª e 5ª ora notturna** (11ª e 12ª ora della giornata = oltre la 2ª ora di straordinario): scatta lo **Straordinario Notturno Successivo (+50% o +55%)**.





---

### 2. Tabella di Output generata dall'App per Busta Paga e Database

| Campo Database / Voce Busta Paga | Ore | Motivazione e Trattamento Retributivo |
| --- | --- | --- |
| **`ore_paga_base`** | **8.00 h** | 7.00h diurne + 1.00h notturna spostata a completamento della 8ª ora base. |
| **`maggiorazione_pura_notturna_30`** | **1.00 h** | **Solo +30% Maggiorazione** per la 1ª ora notturna usata a coprire l'ordinario. |
| **`straordinario_notturno_12`** | **2.00 h** | **Paga Base + 50%** per le prime 2 ore di straordinario notturno netto (9ª e 10ª ora del giorno). |
| **`straordinario_notturno_success`** | **2.00 h** | **Paga Base + 50% (o 55%)** per la 3ª e 4ª ora di straordinario notturno netto (11ª e 12ª ora del giorno). |
| **`rol_scalati`** | **0.00 h** | Il saldo ROL rimane intatto. |

---

### 3. Confronto Diretto dei due Casi (6h vs 7h Diurne)

Mettendo a confronto i due scenari con 5 ore notturne svolte:

```
CASO A: 6h Diurne + 5h Notturne (11h Totali)
├─ 8.00h Paga Base          (6h diurne + 2h notturne)
├─ 2.00h Maggiorazione +30% (2h notturne per completare le 8h)
├─ 2.00h Straord. Notturno  (9ª e 10ª ora del giorno) -> +50%
└─ 1.00h Straord. Notturno  (11ª ora del giorno)        -> +50%/+55%

CASO B: 7h Diurne + 5h Notturne (12h Totali)
├─ 8.00h Paga Base          (7h diurne + 1h notturna)
├─ 1.00h Maggiorazione +30% (1h notturna per completare le 8h)
├─ 2.00h Straord. Notturno  (9ª e 10ª ora del giorno) -> +50%
└─ 2.00h Straord. Notturno  (11ª e 12ª ora del giorno)  -> +50%/+55%

```

---

### 4. La Regola d'Oro per la Logica dell'Algoritmo

L'algoritmo dell'applicazione deve seguire sempre questa equazione:

1. **`ore_notturne_a_30_percento`** = $\text{Minimo}(\text{Debito Ordinario}, \text{Ore Notturne Lavorate})$
2. **`ore_straordinario_notturno_netto`** = $\text{Ore Notturne Lavorate} - \text{ore\_notturne\_a\_30\_percento}$

altro esempio:
Nel CCNL Metalmeccanica Industria e nella gestione della rilevazione presenze in Italia, quando una prestazione lavorativa (es. di **18 ore**) inizia di **Sabato** e prosegue a cavallo fino alla **Domenica**, l'applicazione deve applicare le seguenti regole contabili e retributive:

---

### 1. Come si visualizzano e registrano le ore? (Principio dell'Ora di Inizio)

Ai fini della **contabilità delle presenze e del cartellino orario**, l'intero blocco di 18 ore viene registrato e imputato alla **scheda presenze del Sabato** (il giorno solare in cui ha avuto inizio il turno).

* **Nel cartellino orario del dipendente:** Vedrai la timbratura d'ingresso del Sabato con totale **18.00 ore**.
* **Nel cartellino orario della Domenica:** Risulteranno **0.00 ore** (a meno che non inizi un secondo turno distinto nella giornata di domenica).

---

### 2. Come si dividono le Maggiorazioni tra Sabato e Domenica?

Anche se la presenza è imputata al Sabato, l'algoritmo di calcolo **DEVE scindere le ore dopo la mezzanotte (00:00)** per applicare le diverse maggiorazioni percentuali previste dal contratto.

Ipotizzando un turno di 18 ore che inizia il **Sabato alle 14:00** e termina la **Domenica alle 08:00**:

```
Sabato 14:00 ───► Sabato 22:00 (8h Diurne Sabato)
Sabato 22:00 ───► Sabato 24:00 (2h Notturne Sabato)
Domenica 00:00 ──► Domenica 06:00 (6h Notturne Festive)
Domenica 06:00 ──► Domenica 08:00 (2h Diurne Festive)

```

#### Scomposizione e Maggiorazioni Spettanti in Busta Paga

| Intervallo Orario | Ore | Qualificazione del Lavoro | Maggiorazione Spettante |
| --- | --- | --- | --- |
| **Sabato 14:00 - 22:00** | **8.00 h** | Straordinario Sabato Diurno (Supera le 2h) | **+50%** *(Scatto soglia sabato > 2 ore)* |
| **Sabato 22:00 - 24:00** | **2.00 h** | Straordinario Sabato Notturno | **+50%** *(Straordinario notturno)* |
| **Domenica 00:00 - 06:00** | **6.00 h** | Straordinario Notturno Festivo (a cavallo) | **+75%** *(Sconfinamento notturno in festivo)* |
| **Domenica 06:00 - 08:00** | **2.00 h** | Straordinario Festivo Diurno | **+55%** *(Straordinario festivo oltre le 8h totali)* |

---

### 3. Regola per il Motore di Calcolo dell'App

L'applicazione deve gestire questa situazione in tre passaggi:

1. **Innestare il turno sul Sabato:** Imputare tutte le 18 ore di presenza sul contatore del giorno di partenza (Sabato).
2. **Dividere i minuti di lavoro prima e dopo la mezzanotte (00:00):**
* Minuti lavorati entro le 23:59 del Sabato $\rightarrow$ Tabella maggiorazioni Sabato (+50%).
* Minuti lavorati dalle 00:00 di Domenica $\rightarrow$ Tabella maggiorazioni Festivo (+55% / +75%).


3. **Generare i campi nel Database:**

```typescript
// Esempio Dati Generati per il Database Paga dell'App
const risultatoGiornoSabato = {
  dataIngresso: "SABATO",
  oreTotaliImputate: 18.00,
  
  // Dettaglio Maggiorazioni
  straordinarioSabatoDiurno50: 8.00,      // Ore 14:00 - 22:00
  straordinarioSabatoNotturno50: 2.00,    // Ore 22:00 - 24:00
  straordinarioNotturnoFestivo75: 6.00,   // Ore 00:00 - 06:00 (Domenica)
  straordinarioFestivo55: 2.00            // Ore 06:00 - 08:00 (Domenica)
};

```
LEGGE 104 DITTE OLTRE 15 DIPENDENTI:


Passando al **CCNL Metalmeccanici (Industria - Federmeccanica/Assistal o PMI)**, l'impianto di base della Legge 104/92 resta lo stesso (3 giorni al mese o equivalente orario), ma cambiano le **variabili di orario contrattuale** e le **voci tipiche del cedolino** (come i ROL e le ex-festività) che convivono con la 104 nel cartellino presenze.

---

## 1. Il Calcolo del Plafond Orario nel Settore Metalmeccanico

Nel settore metalmeccanico l'orario contrattuale standard è di **40 ore settimanali**, ma sono comunissimi gli accordi aziendali o specifici inquadramenti a **38 ore** o **37,5 ore** settimanali, oltre ai regimi di **lavoro a turni**.

La formula standard INPS applicata ai vari regimi orari del CCNL Metalmeccanici:

* **Full-Time 40h (su 5 giorni):**
`(40 / 5) * 3 = ` **24,00 ore/mese**
* **Full-Time 38h (su 5 giorni):**
`(38 / 5) * 3 = ` **22,80 ore/mese** (22 ore e 48 minuti)
* **Full-Time 37,5h (su 5 giorni):**
`(37,5 / 5) * 3 = ` **22,50 ore/mese** (22 ore e 30 minuti)

> **Attenzione alla turnazione:** Per i lavoratori turnisti (es. cicli continui o 3 turni), il calcolo deve considerare l'effettiva distribuzione contrattuale dell'orario settimanale di riferimento per evitare discrepanze nei giorni di riposo teorici.

---

## 2. Particolarità da Gestire nell'App per i Metalmeccanici

Un'applicazione di rilevazione presenze focalizzata sui metalmeccanici deve gestire alcune peculiarità contrattuali che si intersecano con i permessi L.104:

1. **Gestione dei ROL (Riduzione Orario di Lavoro):** Il CCNL Metalmeccanici prevede un cospicuo monte ore annuo di ROL (fino a 72 o 104 ore a seconda dell'azienda e della presenza o meno delle ex-festività). Il sistema deve isolare chiaramente la causale `L104` dai ROL, poiché la 104 non intacca il maturato dei permessi contrattuali.
2. **Frazionabilità oraria:** I permessi 104 possono essere presi a ore. Nel metalmeccanico è frequente l'uso di permessi brevi (es. 1 o 2 ore a inizio/fine turno). L'engine deve validare che la somma mensile non superi il plafond calcolato (es. 24 o 22.8 ore).
3. **Non cumulabilità:** Come per gli altri CCNL, le ore 104 non godute nel mese **non si accumulano** e si azzerano all'ultimo giorno del mese.

---

## 3. Mockup del Riepilogo Busta Paga (Stile Metalmeccanico)

Ecco come appare una sezione di riepilogo presenze e permessi in un cedolino o cartellino digitale per un dipendente metalmeccanico (es. 40 ore settimanali):

| Cod. Causale | Descrizione Voce | U.M. | Spettante Mese / Anno | Goduto Mese | Residuo / Disponibile |
| --- | --- | --- | --- | --- | --- |
| **L104** | Permessi Legge 104/92 | Ore | 24,00 | 4,00 | **20,00** *(Scadenza mensile)* |
| **ROL** | Riduzione Orario Lavoro | Ore | 12,00 (Maturato) | 2,00 | **45,00** *(Residuo Anno)* |
| **FERIE** | Ferie Contrattuali | Ore | 14,16 (Maturato) | 0,00 | **120,50** *(Residuo Anno)* |
| **EX-FEST** | Ex Festività | Ore | 4,00 (Maturato) | 0,00 | **16,00** *(Residuo Anno)* |

---ESEMPI
Ecco un componente **React in TypeScript e Tailwind CSS** strutturato per visualizzare il riepilogo delle ore, dei permessi (inclusa la L.104 con scadenza mensile) e dei contatori in stile "busta paga/cartellino presenze".

Il codice include le tipizzazioni, i dati di esempio e una UI pulita con badge informativi per distinguere i permessi a scadenza mensile da quelli con accumulo annuale (come ROL e Ferie).

### Componente React: `PayStubSummaryTable.tsx`

```tsx
import React from 'react';

// Tipizzazione dei dati per ogni voce del contatore
export interface TimeCounterRow {
  code: string;
  description: string;
  unit: 'Ore' | 'Giorni';
  earnedOrDue: number; // Spettante / Maturato
  used: number;        // Goduto del mese
  balance: number;     // Residuo disponibile
  resetType: 'MONTHLY' | 'YEARLY'; // Differenza di gestione L104 vs ROL/Ferie
  note?: string;
}

export interface PayStubSummaryProps {
  employeeName: string;
  ccnlType: string;
  period: string; // es. "Ottobre 2026"
  rows: TimeCounterRow[];
}

export const PayStubSummaryTable: React.FC<PayStubSummaryProps> = ({
  employeeName,
  ccnlType,
  period,
  rows,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white shadow-lg rounded-xl border border-slate-200 overflow-hidden my-6 font-sans">
      {/* Intestazione del Cartellino */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-wide">Riepilogo Presenze e Contatori</h2>
          <p className="text-slate-300 text-sm">Dipendente: <span className="font-semibold text-white">{employeeName}</span></p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-slate-800 text-indigo-300 px-3 py-1 rounded-full border border-slate-700 font-medium">
            CCNL: {ccnlType}
          </span>
          <span className="bg-indigo-600/30 text-indigo-200 px-3 py-1 rounded-full border border-indigo-500/30 font-medium">
            Periodo: {period}
          </span>
        </div>
      </div>

      {/* Tabella Dati */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">Cod.</th>
              <th className="py-3 px-4 font-semibold">Causale / Voce</th>
              <th className="py-3 px-4 font-semibold text-center">U.M.</th>
              <th className="py-3 px-4 font-semibold text-right">Spettante</th>
              <th className="py-3 px-4 font-semibold text-right">Goduto</th>
              <th className="py-3 px-4 font-semibold text-right">Residuo</th>
              <th className="py-3 px-4 font-semibold text-center">Scadenza</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {rows.map((row) => (
              <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.code}</td>
                <td className="py-3 px-4 font-medium text-slate-900">
                  {row.description}
                  {row.note && <span className="block text-xs text-slate-500 font-normal">{row.note}</span>}
                </td>
                <td className="py-3 px-4 text-center text-slate-500">{row.unit}</td>
                <td className="py-3 px-4 text-right font-mono">{row.earnedOrDue.toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-mono text-amber-600 font-medium">{row.used.toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{row.balance.toFixed(2)}</td>
                <td className="py-3 px-4 text-center">
                  {row.resetType === 'MONTHLY' ? (
                    <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Mensile (Scade)
                    </span>
                  ) : (
                    <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Annuale (Riporto)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Informativo */}
      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-1">
        <span>* I permessi L.104/92 non sono cumulabili e si azzerano l'ultimo giorno del mese solare.</span>
        <span className="font-medium text-slate-600">Generato da Engine Presenze Aziendali</span>
      </div>
    </div>
  );
};

// ==========================================
// ESEMPIO DI UTILIZZO
// ==========================================
export const SampleUsage: React.FC = () => {
  const sampleData: TimeCounterRow[] = [
    {
      code: 'L104',
      description: 'Permessi Legge 104/92',
      unit: 'Ore',
      earnedOrDue: 24.00,
      used: 8.00,
      balance: 16.00,
      resetType: 'MONTHLY',
      note: 'Plafond basato su orario 40h/settimana'
    },
    {
      code: 'FERIE',
      description: 'Ferie Ordinarie',
      unit: 'Ore',
      earnedOrDue: 14.16,
      used: 0.00,
      balance: 112.50,
      resetType: 'YEARLY',
      note: 'Maturazione pro-rata mensile'
    },
    {
      code: 'ROL',
      description: 'Riduzione Orario di Lavoro',
      unit: 'Ore',
      earnedOrDue: 6.00,
      used: 4.00,
      balance: 38.00,
      resetType: 'YEARLY',
      note: 'CCNL Metalmeccanici'
    },
    {
      code: 'EX-FEST',
      description: 'Permessi Ex Festività',
      unit: 'Ore',
      earnedOrDue: 2.66,
      used: 0.00,
      balance: 16.00,
      resetType: 'YEARLY'
    }
  ];

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <PayStubSummaryTable 
        employeeName="Mario Rossi" 
        ccnlType="Metalmeccanici Industria" 
        period="Ottobre 2026" 
        rows={sampleData} 
      />
    </div>
  );
};

```

### Caratteristiche principali del componente:

1. **Tipizzazione rigida (`TypeScript`)**: Modelli chiari per gestire sia le voci a scadenza mensile (`MONTHLY`, come la L.104) sia quelle ad accumulo annuale (`YEARLY`, come Ferie e ROL).
2. **Design System pulito (`Tailwind CSS`)**: Uso di etichette cromatiche distinte (rosso/rosa per i permessi a scadenza secca, verde smeraldo per i residui annuali) per evitare errori da parte dell'operatore HR o del dipendente.
3. **Responsività**: Ottimizzato con `overflow-x-auto` per adattarsi perfettamente anche a schermi ridotti o dispositivi mobili.

altro sulla 104:

Passando al **CCNL Metalmeccanici (Industria - Federmeccanica/Assistal o PMI)**, l'impianto di base della Legge 104/92 resta lo stesso (3 giorni al mese o equivalente orario), ma cambiano le **variabili di orario contrattuale** e le **voci tipiche del cedolino** (come i ROL e le ex-festività) che convivono con la 104 nel cartellino presenze.

---

## 1. Il Calcolo del Plafond Orario nel Settore Metalmeccanico

Nel settore metalmeccanico l'orario contrattuale standard è di **40 ore settimanali**, ma sono comunissimi gli accordi aziendali o specifici inquadramenti a **38 ore** o **37,5 ore** settimanali, oltre ai regimi di **lavoro a turni**.

La formula standard INPS applicata ai vari regimi orari del CCNL Metalmeccanici:

* **Full-Time 40h (su 5 giorni):**
`(40 / 5) * 3 = ` **24,00 ore/mese**
* **Full-Time 38h (su 5 giorni):**
`(38 / 5) * 3 = ` **22,80 ore/mese** (22 ore e 48 minuti)
* **Full-Time 37,5h (su 5 giorni):**
`(37,5 / 5) * 3 = ` **22,50 ore/mese** (22 ore e 30 minuti)

> **Attenzione alla turnazione:** Per i lavoratori turnisti (es. cicli continui o 3 turni), il calcolo deve considerare l'effettiva distribuzione contrattuale dell'orario settimanale di riferimento per evitare discrepanze nei giorni di riposo teorici.

---

## 2. Particolarità da Gestire nell'App per i Metalmeccanici

Un'applicazione di rilevazione presenze focalizzata sui metalmeccanici deve gestire alcune peculiarità contrattuali che si intersecano con i permessi L.104:

1. **Gestione dei ROL (Riduzione Orario di Lavoro):** Il CCNL Metalmeccanici prevede un cospicuo monte ore annuo di ROL (fino a 72 o 104 ore a seconda dell'azienda e della presenza o meno delle ex-festività). Il sistema deve isolare chiaramente la causale `L104` dai ROL, poiché la 104 non intacca il maturato dei permessi contrattuali.
2. **Frazionabilità oraria:** I permessi 104 possono essere presi a ore. Nel metalmeccanico è frequente l'uso di permessi brevi (es. 1 o 2 ore a inizio/fine turno). L'engine deve validare che la somma mensile non superi il plafond calcolato (es. 24 o 22.8 ore).
3. **Non cumulabilità:** Come per gli altri CCNL, le ore 104 non godute nel mese **non si accumulano** e si azzerano all'ultimo giorno del mese.

---

## 3. Mockup del Riepilogo Busta Paga (Stile Metalmeccanico)

Ecco come appare una sezione di riepilogo presenze e permessi in un cedolino o cartellino digitale per un dipendente metalmeccanico (es. 40 ore settimanali):

| Cod. Causale | Descrizione Voce | U.M. | Spettante Mese / Anno | Goduto Mese | Residuo / Disponibile |
| --- | --- | --- | --- | --- | --- |
| **L104** | Permessi Legge 104/92 | Ore | 24,00 | 4,00 | **20,00** *(Scadenza mensile)* |
| **ROL** | Riduzione Orario Lavoro | Ore | 12,00 (Maturato) | 2,00 | **45,00** *(Residuo Anno)* |
| **FERIE** | Ferie Contrattuali | Ore | 14,16 (Maturato) | 0,00 | **120,50** *(Residuo Anno)* |
| **EX-FEST** | Ex Festività | Ore | 4,00 (Maturato) | 0,00 | **16,00** *(Residuo Anno)* |

---
# REGISTRAZIONE ESEMPIO RAPPORTINO E TIPI GIORNATA

**Data Registrazione: 26 Maggio 2024**

Questa sezione documenta la struttura di un rapportino e la lista dei tipi di giornata come da input fornito, per garantire una corretta interpretazione dei dati grezzi.

### Lista dei Tipi di Giornata

La logica di calcolo deve essere in grado di mappare i seguenti `tipoGiornataId` alle rispettive causali (lavoro, assenza, trasferta).

*   Festivo
*   Trasferta Europa
*   Permesso
*   104
*   Trasferta ExtraEuropea
*   Malattia
*   Trasferta Italia
*   Straordinario
*   Ordinaria
*   Ferie

### Struttura Dati di un Rapportino (Esempio `0SdNn8Km9GCPhB98fo2L`)

La fonte delle ore per ogni tecnico è il campo `ore` nell'oggetto corrispondente all'interno dell'array `dettaglioOreTecnici`. La logica deve ciclare su tutti i rapportini di una giornata e sommare le ore in base al `tipoGiornataId` di ciascuno.

```json
{
  "id": "0SdNn8Km9GCPhB98fo2L",
  "clienteId": "tzqAkjBjQIwIk7QUL2yr",
  "completed": false,
  "createdAt": "15 settembre 2026 alle ore 01:05:00 UTC+2",
  "createdBy": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
  "data": {
    "seconds": 1789338252,
    "nanoseconds": 741000000
  },
  "descrizioneBreve": "Ups",
  "dettaglioOreTecnici": [
    {
      "tecnicoId": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
      "nome": "Scuderi Antonio",
      "oraInizio": "07:00",
      "oraFine": "09:30",
      "pausa": 0,
      "ore": 2.5,
      "isManual": false
    },
    {
      "tecnicoId": "LL3wOK8rM5qH7POYsxJZ",
      "nome": "Riso Francesco",
      "oraInizio": "07:00",
      "oraFine": "09:30",
      "pausa": 0,
      "ore": 2.5,
      "isManual": false
    },
    {
      "tecnicoId": "YHJFIu2PRGVSJG03D8EgVYKce1q1",
      "nome": "Carcame Mario",
      "oraInizio": "07:30",
      "oraFine": "09:30",
      "pausa": 0,
      "ore": 2,
      "isManual": false
    }
  ],
  "dittaId": "0EuJBKTo7As4z4qvc5Ta",
  "lavoroEseguito": "Controllo commutatore linea emergenza normale/batterie. Collegamenti con cabur cavi batteria/linea",
  "luogoId": "RXtlkYafqAqb3TwhmyfP",
  "naveId": "y96J0gTZ5fIlYKkSgeNR",
  "nome": "Rapportino del 14-09-2026",
  "oreLavoro": 7,
  "presenze": [
    "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
    "LL3wOK8rM5qH7POYsxJZ",
    "YHJFIu2PRGVSJG03D8EgVYKce1q1"
  ],
  "tecnicoId": "IDAvSZayB1XBnF4E8CLHJAoYpqe2",
  "tipoGiornataId": "luLnspzVXpBJzrfLdlRu"
}
```
