import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { Dipendente, SaldiContatori, GiustificativoAssenza, TimbratureGiornaliere, RisultatoGiornoCCNL, AnalisiIntervalloACavallo, TipoAssenza } from "@/models/definitions";

// Definiamo qui una interfaccia per il Rapportino basandoci sulla struttura di Firestore
interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
}

interface DettaglioOreTecnico {
    isManual: boolean;
    nome: string;
    oraFine: string;
    oraInizio: string;
    ore: number;
    pausa: number;
    tecnicoId: string; 
}

export interface Rapportino {
    id: string;
    data: FirestoreTimestamp | Date; // Può essere un oggetto o una data
    dettaglioOreTecnici?: DettaglioOreTecnico[];
    tipoGiornataId: string;
}

dayjs.extend(duration);

// ==========================================
// UTILITY TEMPORALI E ANALISI TURNO A CAVALLO
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

  // Itera minuto per minuto per analizzare le fasce
  for (let min = minIngresso; min < minUscita; min++) {
    const currentHour = (min / 60) % 24;
    const isNextDay = min >= 1440;

    if (isNextDay && isFestivoGiornoSuccessivo) {
        oreSconfinamentoFestivo += 1/60;
    }
    else if (currentHour >= 22 || currentHour < 6) {
      oreNotturnoPieno += 1/60;
    } else if (currentHour >= 20 && currentHour < 22) {
      oreNotturnoSerale += 1/60;
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
// MOTORE DI CALCOLO UNIFICATO
// ==========================================

export function calcolaGiornata(
    dipendente: Dipendente,
    timbratura: TimbratureGiornaliere,
    assenze: GiustificativoAssenza[],
    saldi: SaldiContatori
  ): { risultato: RisultatoGiornoCCNL; saldiAggiornati: SaldiContatori } {
  
    const dataStr = timbratura.data;
    const oreTeoriche = timbratura.oreTeorichePreviste || 8.0;
  
    let oreLavorateEffettive = timbratura.oreLavorateEffettive ?? 0;
    let dettaglioFasce: AnalisiIntervalloACavallo = { oreTotali: 0, oreNotturnoSerale: 0, oreNotturnoPieno: 0, oreSconfinamentoFestivo: 0 };
  
    if (oreLavorateEffettive === 0 && timbratura.oraIngresso && timbratura.oraUscita) {
        const [hIn, mIn] = timbratura.oraIngresso.split(':').map(Number);
        const [hOut, mOut] = timbratura.oraUscita.split(':').map(Number);
        const minIngresso = hIn * 60 + mIn;
        let minUscita = hOut * 60 + mOut;
        if (minUscita <= minIngresso) { minUscita += 24 * 60; }

        const durataLordaMinuti = minUscita - minIngresso;
        const pausaMinuti = timbratura.pausa ?? 0;
        oreLavorateEffettive = (durataLordaMinuti - pausaMinuti) / 60;

        dettaglioFasce = analizzaIntervalloACavallo(timbratura.oraIngresso, timbratura.oraUscita, !!timbratura.isFestivoGiornoSuccessivo);
    }
  
    const risultato: RisultatoGiornoCCNL = {
        data: dataStr, pagaBaseOre: 0, trasfertaOre: 0,
        oreMalattiaCarenzaAzienda: 0, oreMalattiaIntegrazione: 0,
        strDiu12Intero: 0, strDiuSuccessIntero: 0, straordinarioSabatoDiurno50: 0, straordinarioFestivo55: 0,
        oreNotturnoSeraleOrd: 0, oreNotturnoPienoOrd: 0, straordinarioNotturnoFestivo75: 0,
        bancaOreSolaMaggiorazione25: 0, bancaOreSolaMaggiorazione30: 0,
        rolScalati: 0, ferieScalate: 0, exFestivitaScalate: 0, permessiScalati: 0, legge104Scalate: 0,
        anomaliaDebitoUncovered: 0,
    };
  
    const saldiAggiornati: SaldiContatori = JSON.parse(JSON.stringify(saldi));
    let totaleOreAssenza = 0;

    for (const assenza of assenze) {
        totaleOreAssenza += assenza.ore;
        // ... logica assenze ...
    }

    risultato.pagaBaseOre += totaleOreAssenza;
    risultato.oreNotturnoPienoOrd = dettaglioFasce.oreNotturnoPieno;
    risultato.oreNotturnoSeraleOrd = dettaglioFasce.oreNotturnoSerale;
    risultato.straordinarioNotturnoFestivo75 = dettaglioFasce.oreSconfinamentoFestivo;

    if (timbratura.isFestivo || timbratura.isDomenica) {
        risultato.straordinarioFestivo55 = oreLavorateEffettive;
        return { risultato, saldiAggiornati };
    }
    if (timbratura.isSabato) {
        if (oreLavorateEffettive > 2.0) { risultato.straordinarioSabatoDiurno50 = oreLavorateEffettive; } 
        else { risultato.strDiu12Intero = oreLavorateEffettive; }
        return { risultato, saldiAggiornati };
    }

    const oreOrdinarieLavorabili = oreTeoriche - totaleOreAssenza;
    const oreLavorateOrdinarie = Math.min(oreLavorateEffettive, oreOrdinarieLavorabili);
    risultato.pagaBaseOre += oreLavorateOrdinarie;
    
    let oreStraordinario = Math.max(0, oreLavorateEffettive - oreLavorateOrdinarie);
    let debitoOrario = Math.max(0, oreOrdinarieLavorabili - oreLavorateOrdinarie);

    if (debitoOrario > 0 && oreStraordinario > 0) {
        const oreDaCompensare = Math.min(debitoOrario, oreStraordinario);
        risultato.pagaBaseOre += oreDaCompensare;
        const oreCompensatePrime2 = Math.min(oreDaCompensare, 2);
        risultato.bancaOreSolaMaggiorazione25 = oreCompensatePrime2;
        const oreCompensateOltre2 = oreDaCompensare - oreCompensatePrime2;
        if (oreCompensateOltre2 > 0) { risultato.bancaOreSolaMaggiorazione30 = oreCompensateOltre2; }
        oreStraordinario -= oreDaCompensare;
        debitoOrario -= oreDaCompensare;
    }

    if (oreStraordinario > 0) {
        const oreStraordinarioPrime2 = Math.min(oreStraordinario, 2);
        risultato.strDiu12Intero = oreStraordinarioPrime2;
        const oreStraordinarioOltre2 = oreStraordinario - oreStraordinarioPrime2;
        if (oreStraordinarioOltre2 > 0) { risultato.strDiuSuccessIntero = oreStraordinarioOltre2; }
    }

    if (debitoOrario > 0) {
        const copribileConRol = Math.min(debitoOrario, saldiAggiornati.saldoRolOre);
        if (copribileConRol > 0) {
            risultato.rolScalati += copribileConRol;
            risultato.pagaBaseOre += copribileConRol;
            saldiAggiornati.saldoRolOre -= copribileConRol;
            debitoOrario -= copribileConRol;
        }
    }

    if (debitoOrario > 0) { risultato.anomaliaDebitoUncovered = debitoOrario; }

    return { risultato, saldiAggiornati };
}

// Funzione principale che orchestra il processo
export function processaMese(
    dipendente: Dipendente,
    rapportini: Rapportino[],
    tipiGiornataMap: Map<string, string>,
    saldiIniziali: SaldiContatori,
    intervallo: { start: Date, end: Date },
): RisultatoGiornoCCNL[] {
    
    let saldiCorrenti = { ...saldiIniziali };
    const risultatiFinali: RisultatoGiornoCCNL[] = [];

    for (let day = dayjs(intervallo.start); day.isBefore(dayjs(intervallo.end).add(1, 'day')); day = day.add(1, 'day')) {
        const giornoStr = day.format('YYYY-MM-DD');
        
        const rapportinoDelGiorno = rapportini.find(r => {
            if (!r.data) return false;
            const rapportinoDay = (r.data as any).seconds 
                ? dayjs.unix((r.data as any).seconds) 
                : dayjs(r.data as Date);
            return rapportinoDay.isSame(day, 'day');
        });

        let timbratura: TimbratureGiornaliere;
        const assenze: GiustificativoAssenza[] = [];
        const isFestivo = false; // Logica festività da implementare

        if (rapportinoDelGiorno) {
            const tipoGiornataNome = tipiGiornataMap.get(rapportinoDelGiorno.tipoGiornataId) || 'ORDINARIA';
            const dettaglioTecnico = rapportinoDelGiorno.dettaglioOreTecnici?.find(d => d.tecnicoId === dipendente.id);
            
            // ... gestione assenze ...

            if (dettaglioTecnico) {
                timbratura = {
                    dipendenteId: dipendente.id, data: giornoStr,
                    oraIngresso: dettaglioTecnico.isManual ? undefined : dettaglioTecnico.oraInizio,
                    oraUscita: dettaglioTecnico.isManual ? undefined : dettaglioTecnico.oraFine,
                    oreLavorateEffettive: dettaglioTecnico.isManual ? dettaglioTecnico.ore : 0,
                    pausa: dettaglioTecnico.pausa,
                    oreTeorichePreviste: 8,
                    isFestivo: isFestivo, isDomenica: day.day() === 0, isSabato: day.day() === 6
                };
            } else {
                 timbratura = { dipendenteId: dipendente.id, data: giornoStr, oreTeorichePreviste: 8, isFestivo, isDomenica: day.day() === 0, isSabato: day.day() === 6, oreLavorateEffettive: 0 };
            }
        } else {
            timbratura = { dipendenteId: dipendente.id, data: giornoStr, oreTeorichePreviste: 8, isFestivo, isDomenica: day.day() === 0, isSabato: day.day() === 6, oreLavorateEffettive: 0 };
        }

        const { risultato, saldiAggiornati } = calcolaGiornata(dipendente, timbratura, assenze, saldiCorrenti);
        saldiCorrenti = saldiAggiornati;
        risultatiFinali.push(risultato);
    }

    return risultatiFinali;
}
