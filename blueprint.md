# Blueprint: Correzione e Finalizzazione Report Mensili (App Master)

## Lingua e Comunicazione

**Questa applicazione è sviluppata e pensata per un'utenza italiana. Tutta l'interfaccia, la documentazione e le comunicazioni relative al progetto devono essere in lingua italiana.**

## 1. Scopo dell'Intervento

Questo documento definisce il piano d'azione definitivo per correggere la logica di calcolo dei report mensili all'interno dell'**App Master**. L'obiettivo è allineare l'applicazione all'architettura dati corretta, visualizzare dati accurati e introdurre la funzionalità di esportazione PDF.

L'intervento si basa sull'adattamento dei principi di calcolo definiti in `calcoli.md` al contesto dell'App Master, dove l'utente (il Master) analizza i dati di un tecnico specifico (`selectedTecnico`).

**Fonte di Verità per le Tariffe:** La tariffa (costo e unità di misura) per ogni tipo di lavoro **deve** essere letta direttamente dal documento corrispondente nella collezione `tipiGiornata`. Qualsiasi altro approccio, come l'uso di campi costo hard-coded nell'oggetto `tecnico`, è errato e verrà rimosso.

## 2. Stato Attuale e Problema Analizzato

- **Logica Errata:** La logica di calcolo iniziale era inefficiente, illeggibile e basata su presupposti errati.
- **Fonte Dati Sbagliata:** I costi venivano letti da campi statici nell'oggetto `tecnico`, ignorando le tariffe dinamiche definite in `tipiGiornata`.
- **Bug di Visualizzazione:** Le ore di tipo "Straordinario" venivano erroneamente visualizzate nella colonna "Ordinarie" nella tabella dei report.

## 3. Piano di Implementazione Definitivo

### Fase 1: Creazione del Servizio di Calcolo Adattato (`reportService.ts`)

**Obiettivo:** Isolare la logica di calcolo in un servizio dedicato, robusto e corretto.

- **Azione:** Creare il file `src/services/reportService.ts`.
- **Logica Interna:** La funzione `calculateMonthlyReportData` è stata sviluppata per:
    1. Filtrare e arricchire i rapportini del tecnico e del mese selezionati.
    2. Raggruppare i rapportini per giorno.
    3. Suddividere correttamente le ore in "Ordinarie" e "Straordinarie" basandosi sulla **categoria** del `tipoGiornata`.
    4. Calcolare i costi applicando le tariffe corrette lette da `tipiGiornata`.

### Fase 2: Riprogettazione del Componente `ReportMensili.tsx`

**Obiettivo:** Utilizzare il nuovo servizio per visualizzare dati accurati.

- **Azione:** Il componente `src/pages/ReportMensili.tsx` è stato modificato per:
    - Importare e usare `calculateMonthlyReportData`.
    - Popolare l'interfaccia utente (tabella e riepilogo) con i dati corretti restituiti dal servizio.

### Fase 3: Implementazione e Verifica Esportazione PDF

**Obiettivo:** Generare un PDF professionale con anteprima e opzione di condivisione.

- **Azione:** È stato creato il servizio `src/services/pdfMonthlyReportService.ts` e il componente `PdfPreviewDialog.tsx`.
- **Funzionalità Verificate:**
    - **Anteprima PDF:** Viene generata un'anteprima del report in un modale prima del download.
    - **Condivisione:** Il modale include un pulsante per condividere il file PDF tramite le funzionalità native del dispositivo (`navigator.share`).

## 4. Correzione Bug e Finalizzazione (24/07/2024)

- **Problema Riscontrato:** Le ore registrate come "Straordinario" venivano erroneamente sommate e visualizzate nella colonna "Ordinarie" della tabella riepilogativa.
- **Causa:** L'analisi ha rivelato che la logica in `reportService.ts` utilizzava ID fissi (es. `t_straordinaria`) per identificare il tipo di ore, invece di usare il campo `categoria` (`ordinaria`, `straordinaria`, etc.) del `tipoGiornata`. Questo approccio era fragile e causava l'errore.
- **Soluzione Implementata:** Il file `src/services/reportService.ts` è stato aggiornato. La logica di assegnazione delle ore ora si basa correttamente sul valore del campo `tipoGiornata.categoria`. Questo garantisce che le ore vengano attribuite alla colonna corretta (`oreOrdinarie` o `oreStraordinarie`) indipendentemente dall'ID specifico del `tipoGiornata`.
- **Stato:** Il bug è stato **risolto**. La funzionalità PDF è stata contestualmente **verificata** e risulta conforme ai requisiti.
