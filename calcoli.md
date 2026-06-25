# Logica di Calcolo per il Riepilogo Mensile (App Tecnici)

Questo documento descrive la logica di calcolo utilizzata per generare il riepilogo mensile nell'applicazione dei tecnici. L'obiettivo è fornire una guida chiara per replicare questi calcoli in sistemi esterni, come l'App Master.

## 1. Dati di Input

La funzione di calcolo principale, `calculateMonthlyReportData`, richiede tre input fondamentali:

1.  `rapportini`: Un array di oggetti `Rapportino` per il mese selezionato, relativi al tecnico specifico.
2.  `masterData`: Un oggetto contenente tutte le anagrafiche necessarie, tra cui:
    *   `tipiGiornata`: La lista di tutti i possibili tipi di giornata (ordinaria, straordinaria, ferie, trasferte, ecc.).
    *   `impostazioni`: Le impostazioni definite dall'utente, che includono le `tariffe` (costo orario o giornaliero per ogni `tipoGiornata`).
3.  `userProfile`: Il profilo del tecnico per cui si sta generando il report, necessario per identificare le ore corrette nei rapportini condivisi.

## 2. Processo di Calcolo in 3 Fasi

La logica è suddivisa in tre fasi principali per garantire chiarezza e manutenibilità.

### Fase 1: Arricchimento e Normalizzazione dei Dati

In questa fase, i dati grezzi dei `rapportini` vengono trasformati e standardizzati per facilitare i calcoli successivi.

1.  **Arricchimento**: Ogni rapportino viene "arricchito" con informazioni derivate, creando un `EnrichedRapportino`.
    *   `oreGiorno`: Le ore effettive lavorate dal tecnico vengono estratte, gestendo sia i report singoli (`oreLavoro`) che quelli con più tecnici (`dettaglioOreTecnici`).
    *   `data`: La data del report viene convertita in un oggetto `Date` di JavaScript.
2.  **Normalizzazione per Retrocompatibilità**: La logica gestisce i vecchi report in cui la trasferta era un `tipoGiornata` a sé stante.
    *   Se un report ha un `tipoGiornata` la cui categoria è `'trasferta'` (es. "Trasferta Italia"), il sistema lo normalizza:
        *   Il `tipoGiornataId` viene forzato a `'t_ordinaria'` per il calcolo delle ore.
        *   L'ID della vecchia trasferta viene spostato nel nuovo campo `trasfertaId`.
    *   Questo assicura che le ore dei vecchi report di trasferta vengano conteggiate come ore ordinarie, e il costo della trasferta venga aggiunto separatamente.
3.  **Filtraggio**: Vengono mantenuti solo i rapportini che hanno effettivamente ore lavorate (`oreGiorno > 0`) o che rappresentano una giornata di trasferta (hanno un `trasfertaId`).

### Fase 2: Aggregazione dei Dati

I rapportini arricchiti vengono raggruppati per giorno e aggregati per calcolare i totali parziali.

1.  **Inizializzazione Riepilogo**: Viene creato un oggetto `riepilogo` vuoto. La sua struttura `dettaglio` è una mappa che viene pre-popolata con una voce per ogni `tipoGiornata` esistente, con totali a zero.
2.  **Raggruppamento per Giorno**: I rapportini vengono raggruppati in un oggetto dove ogni chiave è un giorno del mese (es. `'2024-07-31'`).
3.  **Ciclo di Aggregazione Giornaliero**: Il sistema itera su ogni giorno per cui esistono report.
    *   **Calcolo Ore da Splittare**: Le ore di tipo `'t_ordinaria'` vengono sommate in una variabile temporanea (`oreDaSplittareDelGiorno`). Tutte le altre ore (straordinari, festivi, ecc.) vengono sommate direttamente nella loro voce di riepilogo.
    *   **Gestione Trasferte**: Per ogni giorno, si assicura che il costo di trasferta venga conteggiato una sola volta, anche se ci sono più report con lo stesso `trasfertaId` in quel giorno.
    *   **Split Ore Ordinarie/Straordinarie**: Al termine del ciclo sui report di un giorno, le `oreDaSplittareDelGiorno` vengono suddivise: le prime 8 ore vengono assegnate a "Ordinaria", le eccedenti a "Straordinaria".

### Fase 3: Calcolo Finale di Costi e Totali

Nell'ultima fase, vengono calcolati i costi finali e i totali aggregati.

1.  **Calcolo Totali Semplici**:
    *   `oreTotali`: Somma di tutte le `oreGiorno` dei rapportini arricchiti.
    *   `giorniTotaliLavorati`: Conteggio dei giorni unici in cui è stato registrato un report.
    *   `giorniTrasferta`: Conteggio dei giorni unici in cui è presente un `trasfertaId`.
2.  **Calcolo dei Costi per Voce**: Il sistema itera su ogni voce nel `riepilogo.dettaglio`.
    *   `giorni`: Viene calcolato il numero di giorni unici per quella voce.
    *   `costo`: Il costo viene calcolato in base all'unità di misura (`unita`) definita nelle tariffe:
        *   Se `unita === 'g'` (giornaliera): `costo = giorni * tariffa`
        *   Se `unita === 'h'` (oraria): `costo = oreTotali * tariffa`
3.  **Costo Totale Finale**: Tutti i costi delle singole voci vengono sommati per ottenere il `costoTotale` del mese.

---

## 3. Codice Sorgente Completo

Di seguito è riportato il codice TypeScript completo della funzione `calculateMonthlyReportData`, che implementa la logica descritta.

```typescript
import { EnrichedRapportino, RiepilogoMese, MasterData, UserProfile, Rapportino, Impostazioni } from '@/models/definitions';
import { format } from 'date-fns';

export function calculateMonthlyReportData(
    rapportini: Rapportino[] = [], 
    masterData: MasterData, 
    userProfile: UserProfile
) {
    const tipiGiornataMap = new Map(masterData.tipiGiornata.map(t => [t.id, t]));
    const tariffeMap = new Map((masterData.impostazioni as Impostazioni).tariffe.map(t => [t.tipoGiornataId, t]));

    // 1. FASE DI ARRICCHIMENTO E NORMALIZZAZIONE
    const enrichedRapportini: EnrichedRapportino[] = rapportini.map(r => {
        const tipoGiornata = tipiGiornataMap.get(r.tipoGiornataId);
        let oreEffettive = 0;

        const dettaglioTecnico = r.dettaglioOreTecnici?.find(d => d.tecnicoId === userProfile.tecnicoId);
        if (dettaglioTecnico) {
            oreEffettive = dettaglioTecnico.ore || 0;
        } else if (r.tecnicoId === userProfile.tecnicoId) {
            oreEffettive = r.oreLavoro || 0;
        }

        const isVecchioReportTrasferta = tipoGiornata?.categoria === 'trasferta';
        const tipoGiornataDaUsareId = isVecchioReportTrasferta ? 't_ordinaria' : r.tipoGiornataId;
        const trasfertaId = isVecchioReportTrasferta ? r.tipoGiornataId : r.trasfertaId;

        return { 
            ...r, 
            data: new Date(r.data), 
            tipoGiornata: tipiGiornataMap.get(tipoGiornataDaUsareId),
            oreGiorno: oreEffettive,
            trasfertaId,
            tipoGiornataId: tipoGiornataDaUsareId,
            isEditable: r.tecnicoId === userProfile.tecnicoId,
        };
    }).filter(r => r.oreGiorno > 0 || r.trasfertaId);

    // --- Inizializzazione Riepilogo ---
    const riepilogo: RiepilogoMese = {
        dettaglio: new Map(),
        oreTotali: 0,
        giorniTotaliLavorati: 0,
        giorniTrasferta: 0,
        costoTotale: 0,
        oreOrdinarie: 0,
        oreStraordinarie: 0,
    };

    masterData.tipiGiornata.forEach(tipo => {
        const tariffa = tariffeMap.get(tipo.id);
        riepilogo.dettaglio.set(tipo.id, { 
            id: tipo.id, 
            nome: tipo.nome, 
            colore: tipo.colore, 
            unita: tariffa?.unita || 'h',
            oreTotali: 0, 
            giorni: 0, 
            costo: 0, 
            giorniSet: new Set() 
        });
    });

    // 2. FASE DI AGGREGAZIONE
    const groupedByDay = enrichedRapportini.reduce((acc, r) => {
        const dayKey = format(r.data, 'yyyy-MM-dd');
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(r);
        return acc;
    }, {} as Record<string, EnrichedRapportino[]>);

    const voceOrdinaria = riepilogo.dettaglio.get('t_ordinaria');
    const voceStraordinaria = riepilogo.dettaglio.get('t_straordinaria');

    for (const dayKey in groupedByDay) {
        const reports = groupedByDay[dayKey];
        let oreDaSplittareDelGiorno = 0;
        let trasfertaProcessedForDay = false;
        
        reports.forEach(report => {
            if (report.tipoGiornataId === 't_ordinaria') {
                oreDaSplittareDelGiorno += report.oreGiorno;
            } else {
                const voceRiepilogo = riepilogo.dettaglio.get(report.tipoGiornataId);
                if (voceRiepilogo) {
                    voceRiepilogo.oreTotali += report.oreGiorno;
                    voceRiepilogo.giorniSet?.add(dayKey);
                }
            }

            if (report.trasfertaId && !trasfertaProcessedForDay) {
                const voceTrasferta = riepilogo.dettaglio.get(report.trasfertaId);
                if (voceTrasferta) {
                    voceTrasferta.giorniSet?.add(dayKey);
                    trasfertaProcessedForDay = true;
                }
            }
        });
        
        if(oreDaSplittareDelGiorno > 0 && voceOrdinaria) {
            voceOrdinaria.giorniSet?.add(dayKey);
        }

        const dailyOrdinarie = Math.min(oreDaSplittareDelGiorno, 8);
        const dailyStraordinarie = Math.max(0, oreDaSplittareDelGiorno - 8);

        if (voceOrdinaria) voceOrdinaria.oreTotali += dailyOrdinarie;
        if (voceStraordinaria) {
            voceStraordinaria.oreTotali += dailyStraordinarie;
            if(dailyStraordinarie > 0) voceStraordinaria.giorniSet?.add(dayKey);
        }
    }

    // 3. FASE FINALE: CALCOLO COSTI E TOTALI
    riepilogo.oreTotali = enrichedRapportini.reduce((sum, r) => sum + r.oreGiorno, 0);

    // Calcolo giorni trasferta in modo diretto e robusto
    const giorniTrasfertaUnici = new Set(
        enrichedRapportini.filter(r => r.trasfertaId).map(r => format(r.data, 'yyyy-MM-dd'))
    );
    riepilogo.giorniTrasferta = giorniTrasfertaUnici.size;

    let costoTotaleFinale = 0;

    for (const voce of riepilogo.dettaglio.values()) {
        voce.giorni = voce.giorniSet?.size || 0;
        delete voce.giorniSet;

        const tariffa = tariffeMap.get(voce.id);
        if (tariffa && tariffa.costo > 0) {
            voce.costo = (tariffa.unita === 'g') ? (voce.giorni * tariffa.costo) : (voce.oreTotali * tariffa.costo);
            costoTotaleFinale += voce.costo;
        }
    }

    riepilogo.costoTotale = costoTotaleFinale;
    riepilogo.giorniTotaliLavorati = Object.keys(groupedByDay).length;
    if(voceOrdinaria) riepilogo.oreOrdinarie = voceOrdinaria.oreTotali;
    if(voceStraordinaria) riepilogo.oreStraordinarie = voceStraordinaria.oreTotali;

    return { rapportiniArricchiti: enrichedRapportini, riepilogoMese: riepilogo };
}
```
