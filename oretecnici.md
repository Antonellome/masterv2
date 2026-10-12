# Analisi Completa e Ricostruzione della Pagina Riepilogo Ore

Questo documento fornisce un'analisi esaustiva della pagina `OreTecniciPage.tsx` e della logica di calcolo sottostante (`BustaPagaService.ts`). L'obiettivo è fornire tutte le informazioni necessarie per replicare fedelmente la funzionalità nell'app dei tecnici.

## 1. Struttura dell'Interfaccia (`OreTecniciPage.tsx`)

La pagina è composta da quattro sezioni principali di visualizzazione dei dati:

1.  **Tabelle Settimanali**: Per ogni settimana del mese selezionato, viene mostrata una tabella dettagliata.
2.  **Tabella Totali Mensili**: Un riepilogo che somma i valori di tutte le settimane per ogni categoria di ora.
3.  **Tabella Riepilogo Finali**: Mostra i totali aggregati di ore lavorate, ore di assenza e ore retribuite.
4.  **Tabella Saldi Contatori**: Mostra i saldi iniziali, le ore utilizzate nel mese e i saldi finali per Ferie, ROL, etc.

### 1.1 Dettaglio Voci delle Tabelle Settimanali e Mensili

Le tabelle settimanali e la tabella dei totali mensili sono costruite dinamicamente a partire da una struttura dati (`sezioni`) che definisce le categorie e le singole voci. Ecco l'elenco completo e la loro mappatura.

| Sezione (Titolo Tabella) | Voce (Riga Tabella)                        | ID Campo Corrispondente           |
| :----------------------- | :----------------------------------------- | :-------------------------------- |
| **Lavoro Ordinario**     | Ordinarie Diurne                           | `pagaBaseOre`                     |
|                          | Trasferta                                  | `trasfertaOre`                    |
|                          | Lavoro Notturno Ordinario (20-22) (+15%)   | `oreNotturnoSeraleOrd`            |
|                          | Lavoro Notturno Ordinario (22-06) (+30%)   | `oreNotturnoPienoOrd`             |
| **Lavoro Straordinario** | Straordinario Feriale (Prime 2h) (+25%)    | `strDiu12Intero`                  |
|                          | Straordinario Feriale (Oltre 2h) (+30%)    | `strDiuSuccessIntero`             |
|                          | Straordinario Sabato Diurno (+50%)         | `straordinarioSabatoDiurno50`     |
|                          | Straordinario Notturno Feriale/Sabato (+50%)| `straordinarioNotturno50`         |
|                          | Straordinario Festivo/Domenicale Diurno (+55%)| `straordinarioFestivo55`          |
|                          | Straordinario Notturno Festivo (+75%)      | `straordinarioNotturnoFestivo75`  |
| **Assenze Retribuite**   | Ferie                                      | `ferieScalate`                    |
|                          | ROL                                        | `rolScalati`                      |
|                          | Ex Festività                               | `exFestivitaScalate`              |
|                          | Permessi Retribuiti                        | `permessiScalati`                 |
|                          | Permessi L. 104                            | `legge104Scalate`                 |
| **Malattia**             | Malattia (Carenza)                         | `oreMalattiaCarenzaAzienda`       |
|                          | Malattia (Integrazione INPS)               | `oreMalattiaIntegrazione`         |
| **Anomalie e Debiti**    | Debito Orario Residuo                      | `anomaliaDebitoUncovered`         |

### 1.2 Dettaglio Voci Saldi Contatori

| Contatore       | Saldo Iniziale (ID)       | Utilizzato nel Mese (ID) | Saldo Finale (Calcolato)  |
| :-------------- | :------------------------ | :----------------------- | :------------------------ |
| Ferie           | `saldoFerieOre`           | `ferieScalate`           | `saldoFerieOre` - `ferieScalate` |
| ROL             | `saldoRolOre`             | `rolScalati`             | `saldoRolOre` - `rolScalati`     |
| Ex Festività    | `saldoExFestivitaOre`     | `exFestivitaScalate`     | `saldoExFestivitaOre` - `exFestivitaScalate` |
| Permessi L. 104 | `permesso104ResiduoOre`   | `legge104Scalate`        | `permesso104ResiduoOre` - `legge104Scalate` |

## 2. Architettura e Logica di Calcolo (`BustaPagaService.ts`)

Il calcolo avviene in tre fasi principali, orchestrate dalla funzione `processaMese`.

1.  **`processaMese` (Orchestratore)**:
    *   Itera su ogni giorno dell'intervallo richiesto (che comprende il mese contabile e le settimane a cavallo).
    *   Per ogni giorno, raccoglie tutti i rapportini pertinenti per il tecnico.
    *   Aggrega le ore lorde di lavoro e le ore di assenza dai rapportini del giorno.
    *   Utilizza `analizzaIntervalloACavallo` per suddividere le ore lavorate in fasce orarie (diurno, notturno serale, notturno pieno).
    *   Sottrae le pause dalle ore lavorate, partendo dalle diurne.
    *   Invoca `calcolaGiornata` passando i dati aggregati e puliti del giorno.
    *   Colleziona il risultato giornaliero e aggiorna i saldi correnti (Ferie, ROL, etc.) per il giorno successivo.

2.  **`analizzaIntervalloACavallo` (Analizzatore Fasce Orarie)**:
    *   Riceve un'ora di inizio e un'ora di fine.
    *   Scorre minuto per minuto l'intervallo.
    *   Per ogni minuto, determina se appartiene alla fascia "notturno serale" (20:00-21:59), "notturno pieno" (22:00-05:59) o diurno (tutto il resto).
    *   Restituisce il totale di ore per ciascuna di queste fasce.

3.  **`calcolaGiornata` (Motore di Calcolo CCNL)**:
    *   Questa è la funzione centrale che applica le regole del CCNL.
    *   Riceve le ore lavorate già suddivise per fasce e le ore di assenza.
    *   Gestisce le priorità: prima classifica le assenze, poi le ore lavorate in base al giorno della settimana (feriale, sabato, domenica/festivo).

## 3. Dizionario dei Calcoli: Spiegazione Voce per Voce

Questa sezione dettaglio come viene calcolato **esattamente** ogni campo all'interno della funzione `calcolaGiornata`.

--- 

### **CONTESTO INIZIALE**
Per ogni giorno, la funzione `calcolaGiornata` riceve:
- `oreDiurne`, `oreNotturnoSerale`, `oreNotturnoPieno`: ore lavorate già nette (dopo la pausa) e suddivise per fascia.
- `isSabato`, `isDomenica`, `isFestivo`: flag booleani.
- `oreTeorichePreviste`: 8 ore per i giorni feriali (lunedì-venerdì), 0 altrimenti.
- `assenze`: un array di oggetti per le assenze del giorno (es. `{tipo: 'FERIE', ore: 8}`).

--- 

#### **Gestione Assenze**

Il sistema prima processa tutte le assenze.

- **`ferieScalate`, `rolScalati`, `exFestivitaScalate`, `permessiScalati`, `legge104Scalate`, `oreMalattiaCarenzaAzienda`**
  - **Logica**: Per ogni giustificativo di assenza presente per il giorno, le ore corrispondenti vengono sommate al rispettivo campo (`ferieScalate` se il tipo è `FERIE`, etc.).
  - Contestualmente, i saldi di `Ferie`, `ROL` e `Ex Festività` vengono decrementati.

--- 

#### **Gestione Giorni Non Lavorati (Sabato, Domenica, Festivi)**

Se `isFestivo || isDomenica` è `true`:
- **`straordinarioFestivo55`** (+55%)
  - **Logica**: Assume **tutte** le `oreDiurne` lavorate in quel giorno.
  - **Formula**: `risultato.straordinarioFestivo55 = oreDiurne`
- **`straordinarioNotturnoFestivo75`** (+75%)
  - **Logica**: Assume **tutte** le ore notturne lavorate in quel giorno.
  - **Formula**: `risultato.straordinarioNotturnoFestivo75 = oreNotturnoSerale + oreNotturnoPieno`

Se `isSabato` è `true` (e non è festivo):
- **`straordinarioSabatoDiurno50`** (+50%)
  - **Logica**: Assume **tutte** le `oreDiurne` lavorate di sabato.
  - **Formula**: `risultato.straordinarioSabatoDiurno50 = oreDiurne`
- **`straordinarioNotturno50`** (+50%)
  - **Logica**: Assume **tutte** le ore notturne lavorate di sabato.
  - **Formula**: `risultato.straordinarioNotturno50 = oreNotturnoSerale + oreNotturnoPieno`

--- 

#### **Gestione Giorni Feriali (Lunedì-Venerdì)**

Questa è la logica più complessa, che segue un principio di "riempimento del debito orario".

1.  **Calcolo Ore Ordinarie da Coprire**: Si determina quante ore di lavoro ordinario mancano per raggiungere l'orario teorico, dopo aver contato le assenze.
    - **Formula**: `oreOrdinarieDaCoprire = oreTeorichePreviste - totaleOreAssenza`

2.  **Riempimento con Ore Lavorate** (in ordine di priorità):
    - **`pagaBaseOre`** (Ordinarie Diurne)
      - **Logica**: Usa le `oreDiurne` disponibili per coprire il debito. Non può superare le `oreDiurne` effettivamente lavorate né le `oreOrdinarieDaCoprire`.
      - **Formula**: `ordDiurne = Math.min(oreDiurne, oreOrdinarieDaCoprire)`
    - **`oreNotturnoSeraleOrd`** (Ordinario Notturno 20-22, +15%)
      - **Logica**: Se le ore diurne non sono bastate, usa le `oreNotturnoSerale` disponibili.
      - **Formula**: `ordNottSerale = Math.min(oreNotturnoSerale, oreOrdinarieDaCoprire - ordDiurne)`
    - **`oreNotturnoPienoOrd`** (Ordinario Notturno 22-06, +30%)
      - **Logica**: Se ancora mancano ore, usa le `oreNotturnoPieno` disponibili.
      - **Formula**: `ordNottPieno = Math.min(oreNotturnoPieno, oreOrdinarieDaCoprire - ordDiurne - ordNottSerale)`

3.  **Calcolo Straordinari**: Le ore lavorate che *eccedono* quelle usate per coprire l'orario ordinario diventano straordinari.
    - **`strDiu12Intero`** (Straordinario Feriale, prime 2h, +25%)
      - **Logica**: Somma le ore diurne e notturne-serali non usate come ordinarie. Di questo totale, le prime 2 ore vanno in questa categoria.
      - **Formula**: `totaleStraordinarioFeriale = (oreDiurne - ordDiurne) + (oreNotturnoSerale - ordNottSerale)`. `risultato.strDiu12Intero = Math.min(totaleStraordinarioFeriale, 2)`
    - **`strDiuSuccessIntero`** (Straordinario Feriale, oltre 2h, +30%)
      - **Logica**: Le ore di `totaleStraordinarioFeriale` che eccedono le prime 2.
      - **Formula**: `risultato.strDiuSuccessIntero = Math.max(0, totaleStraordinarioFeriale - 2)`
    - **`straordinarioNotturno50`** (Straordinario Notturno Feriale, +50%)
      - **Logica**: Tutte le `oreNotturnoPieno` che non sono state usate come ordinarie.
      - **Formula**: `risultato.straordinarioNotturno50 = oreNotturnoPieno - ordNottPieno`

4.  **Gestione Debito Orario Residuo**:
    - **`anomaliaDebitoUncovered`**
      - **Logica**: Se, dopo aver usato tutte le ore lavorate, mancano ancora ore per coprire le `oreTeorichePreviste`, si crea un debito. Il sistema tenta di coprirlo automaticamente usando i ROL disponibili dal saldo.
      - **Formula (Debito Iniziale)**: `debitoOrario = oreOrdinarieDaCoprire - (ordDiurne + ordNottSerale + ordNottPieno)`
      - **Logica di Copertura**: Il sistema calcola `copribileConRol = Math.min(debitoOrario, saldoRolOre)`. Queste ore vengono aggiunte a `rolScalati`, sottratte dal saldo ROL e dal `debitoOrario`.
      - **Valore Finale**: `risultato.anomaliaDebitoUncovered` è il valore di `debitoOrario` che rimane **dopo** aver tentato la copertura con i ROL.

--- 

## 4. Calcolo dei Totali Finali

Nella pagina `OreTecniciPage.tsx`, i totali finali sono calcolati usando `useMemo` a partire dai dati giornalieri processati (`processedMonthData`).

- **`totaliMensili`**: È un oggetto. Per ogni ID campo (es. `pagaBaseOre`), il valore è la somma di quel campo su tutti i giorni del `processedMonthData`.
  - **Formula Esempio**: `totaliMensili.pagaBaseOre = processedMonthData.reduce((sum, day) => sum + day.pagaBaseOre, 0)`

- **`totaleOreLavorate`**: Somma dei totali di tutte le voci che appartengono alle sezioni "Lavoro Ordinario" e "Lavoro Straordinario".

- **`totaleOreAssenza`**: Somma dei totali di tutte le voci che appartengono alle sezioni "Assenze Retribuite" e "Malattia".

- **`totaleOreRetribuite`**: La somma di `totaleOreLavorate` e `totaleOreAssenza`.

## 5. Guida alla Ricostruzione (App Tecnici)

Per replicare questa funzionalità, è necessario:

1.  **Copiare la logica di calcolo**: Trasferire le funzioni `calcolaGiornata` e `analizzaIntervalloACavallo` da `BustaPagaService.ts` a un nuovo servizio nell'app dei tecnici (es. `calcoloOreService.ts`).

2.  **Creare la pagina React**: Creare un componente/pagina che:
    *   Usa `dayjs` per la navigazione mensile.
    *   Recupera i dati necessari per l'utente loggato (rapportini, anagrafica, saldi) da DexieDB (`useLiveQuery`).
    *   Invoca la funzione di calcolo per ottenere i dati processati per il mese.
    *   Usa la stessa struttura `sezioni` per definire le tabelle.
    *   Renderizza le tabelle settimanali, la tabella dei totali e la tabella dei saldi, popolandole con i dati calcolati.
    *   Usa `useMemo` per calcolare i totali in modo efficiente.

3.  **Adattare il contesto**: Poiché l'app è per il singolo tecnico, non serve il selettore del dipendente. I dati vanno sempre filtrati per l'ID dell'utente attualmente loggato.

Questa analisi completa dovrebbe fornire ogni dettaglio necessario per una ricostruzione accurata e funzionale. 