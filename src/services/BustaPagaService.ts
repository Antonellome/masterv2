import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Dipendente, SaldiContatori, GiustificativoAssenza, RisultatoGiornoCCNL, AnalisiIntervalloACavallo, TipoAssenza, Rapportino } from "@/models/definitions";

dayjs.extend(isSameOrBefore);

const tipiAssenzaMap: { [key: string]: TipoAssenza } = {
    'Ferie': 'FERIE',
    'Malattia': 'MALATTIA',
    'Permesso': 'PERMESSO',
    'Legge 104': 'LEGGE_104',
    'ROL': 'ROL'
};

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
    const currentHour = Math.floor(min / 60) % 24;
    const isNextDay = min >= 1440;

    if (isNextDay && isFestivoGiornoSuccessivo) {
        oreSconfinamentoFestivo += 1/60;
    } else if (currentHour >= 22 || currentHour < 6) {
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

export function calcolaGiornata(
    datiGiorno: {
        data: string;
        oreDiurne: number;
        oreNotturnoSerale: number;
        oreNotturnoPieno: number;
        oreSconfinamentoFestivo: number;
        isSabato: boolean;
        isDomenica: boolean;
        isFestivo: boolean;
        oreTeorichePreviste: number;
    },
    assenze: GiustificativoAssenza[],
    saldi: SaldiContatori
  ): { risultato: RisultatoGiornoCCNL; saldiAggiornati: SaldiContatori } {
  
    const { data, oreDiurne, oreNotturnoSerale, oreNotturnoPieno, oreSconfinamentoFestivo, isSabato, isDomenica, isFestivo, oreTeorichePreviste } = datiGiorno;
  
    const risultato: RisultatoGiornoCCNL = {
        data, pagaBaseOre: 0, trasfertaOre: 0,
        oreMalattiaCarenzaAzienda: 0, oreMalattiaIntegrazione: 0,
        strDiu12Intero: 0, strDiuSuccessIntero: 0, straordinarioSabatoDiurno50: 0, straordinarioFestivo55: 0,
        oreNotturnoSeraleOrd: 0, oreNotturnoPienoOrd: 0, straordinarioNotturno50: 0, straordinarioNotturnoFestivo75: 0,
        bancaOreSolaMaggiorazione25: 0, bancaOreSolaMaggiorazione30: 0,
        rolScalati: 0, ferieScalate: 0, exFestivitaScalate: 0, permessiScalati: 0, legge104Scalate: 0,
        anomaliaDebitoUncovered: 0,
    };
  
    const saldiAggiornati = { ...saldi };
    let totaleOreAssenza = 0;

    for (const assenza of assenze) {
        totaleOreAssenza += assenza.ore;
        switch(assenza.tipo) {
            case 'FERIE': risultato.ferieScalate += assenza.ore; break;
            case 'ROL': risultato.rolScalati += assenza.ore; break;
        }
    }
    
    if (assenze.length > 0 && assenze.some(a => a.ore >= oreTeorichePreviste)) {
      return { risultato, saldiAggiornati };
    }

    const oreLavorateTotali = oreDiurne + oreNotturnoSerale + oreNotturnoPieno + oreSconfinamentoFestivo;
    
    if (oreLavorateTotali <= 0 && totaleOreAssenza <= 0) {
      if (oreTeorichePreviste > 0) {
        const debitoIniziale = oreTeorichePreviste - totaleOreAssenza;
        const rolDaUsare = Math.min(debitoIniziale, saldiAggiornati.saldoRolOre);
        risultato.rolScalati = rolDaUsare;
        saldiAggiornati.saldoRolOre -= rolDaUsare;
        risultato.anomaliaDebitoUncovered = debitoIniziale - rolDaUsare;
      }
      return { risultato, saldiAggiornati };
    }

    risultato.straordinarioNotturnoFestivo75 = oreSconfinamentoFestivo;

    if (isFestivo || isDomenica) {
        risultato.straordinarioFestivo55 = oreDiurne;
        risultato.straordinarioNotturnoFestivo75 += oreNotturnoSerale + oreNotturnoPieno;
        return { risultato, saldiAggiornati };
    }
    
    if (isSabato) {
        const totaleOreSabato = oreDiurne + oreNotturnoSerale + oreNotturnoPieno;
        risultato.straordinarioSabatoDiurno50 = oreDiurne;
        risultato.straordinarioNotturno50 = oreNotturnoSerale + oreNotturnoPieno;
        return { risultato, saldiAggiornati };
    }

    const oreOrdinarieDaCoprire = Math.max(0, oreTeorichePreviste - totaleOreAssenza);

    const ordDiurne = Math.min(oreDiurne, oreOrdinarieDaCoprire);
    const strDiurne = oreDiurne - ordDiurne;
    
    const ordNottSerale = Math.min(oreNotturnoSerale, Math.max(0, oreOrdinarieDaCoprire - ordDiurne));
    const strNottSerale = oreNotturnoSerale - ordNottSerale;
    
    const ordNottPieno = Math.min(oreNotturnoPieno, Math.max(0, oreOrdinarieDaCoprire - ordDiurne - ordNottSerale));
    const strNottPieno = oreNotturnoPieno - ordNottPieno;

    risultato.pagaBaseOre = ordDiurne;
    risultato.oreNotturnoSeraleOrd = ordNottSerale;
    risultato.oreNotturnoPienoOrd = ordNottPieno;

    const totaleStraordinarioFerialeDiurno = strDiurne + strNottSerale;
    if (totaleStraordinarioFerialeDiurno > 0) {
        const oreA25 = Math.min(totaleStraordinarioFerialeDiurno, 2.0);
        const oreA30 = totaleStraordinarioFerialeDiurno - oreA25;
        risultato.strDiu12Intero += oreA25;
        risultato.strDiuSuccessIntero += oreA30;
    }

    if (strNottPieno > 0) {
        risultato.straordinarioNotturno50 += strNottPieno;
    }

    let debitoOrario = Math.max(0, oreOrdinarieDaCoprire - (ordDiurne + ordNottSerale + ordNottPieno));
    if (debitoOrario > 0) {
        const copribileConRol = Math.min(debitoOrario, saldiAggiornati.saldoRolOre);
        if (copribileConRol > 0) {
            risultato.rolScalati += copribileConRol;
            saldiAggiornati.saldoRolOre -= copribileConRol;
            debitoOrario -= copribileConRol;
        }
    }

    if (debitoOrario > 0) { 
        risultato.anomaliaDebitoUncovered = debitoOrario; 
    }

    return { risultato, saldiAggiornati };
}

export function processaMese(
    dipendente: Dipendente,
    rapportini: Rapportino[],
    tipiGiornataMap: Map<string, string>,
    saldiIniziali: SaldiContatori,
    intervallo: { start: Date, end: Date },
    meseContabile: number
): RisultatoGiornoCCNL[] {
    const risultatiFinali: RisultatoGiornoCCNL[] = [];
    let saldiCorrenti = { ...saldiIniziali };

    for (let d = dayjs(intervallo.start); d.isSameOrBefore(intervallo.end, 'day'); d = d.add(1, 'day')) {
        const dataCorrenteString = d.format('YYYY-MM-DD');
        
        const rapportiniDelGiorno = rapportini.filter(r => {
            if (!r.data) return false;
            const rapportinoDate = (r.data as any).toDate ? (r.data as any).toDate() : r.data;
            return dayjs(rapportinoDate).format('YYYY-MM-DD') === dataCorrenteString;
        });

        if (d.month() !== meseContabile && rapportiniDelGiorno.length === 0) {
            continue;
        }
        
        let oreDiurneNetTot = 0;
        let oreNotturnoSeraleTot = 0;
        let oreNotturnoPienoTot = 0;
        let oreSconfinamentoFestivoTot = 0;
        let pausaTotaleOre = 0;
        const assenzeGiorno: GiustificativoAssenza[] = [];

        let fasceLordeGiorno = {
            oreTotali: 0,
            oreNotturnoSerale: 0,
            oreNotturnoPieno: 0,
            oreSconfinamentoFestivo: 0
        };

        const tipoAssenzaRapp = rapportiniDelGiorno.length > 0 ? tipiGiornataMap.get(rapportiniDelGiorno[0].tipoGiornataId) : undefined;
        const tipoAssenza = tipoAssenzaRapp ? tipiAssenzaMap[tipoAssenzaRapp] : undefined;

        if (tipoAssenza) {
            assenzeGiorno.push({ dipendenteId: dipendente.id, data: dataCorrenteString, tipo: tipoAssenza, ore: 8 });
        } else {
            for (const rapportino of rapportiniDelGiorno) {
                 const dettaglioTecnico = rapportino.dettaglioOreTecnici?.find(det => det.tecnicoId === dipendente.id);
                if (!dettaglioTecnico) continue;

                pausaTotaleOre += (dettaglioTecnico.pausa || 0) / 60;

                if (dettaglioTecnico.isManual && dettaglioTecnico.ore) {
                    fasceLordeGiorno.oreTotali += dettaglioTecnico.ore;
                } else if (dettaglioTecnico.oraInizio && dettaglioTecnico.oraFine) {
                    const fasceSegmento = analizzaIntervalloACavallo(dettaglioTecnico.oraInizio, dettaglioTecnico.oraFine, false);
                    fasceLordeGiorno.oreTotali += fasceSegmento.oreTotali;
                    fasceLordeGiorno.oreNotturnoSerale += fasceSegmento.oreNotturnoSerale;
                    fasceLordeGiorno.oreNotturnoPieno += fasceSegmento.oreNotturnoPieno;
                    fasceLordeGiorno.oreSconfinamentoFestivo += fasceSegmento.oreSconfinamentoFestivo; 
                }
            }
        }
        
        let oreLordeDiurne = fasceLordeGiorno.oreTotali - fasceLordeGiorno.oreNotturnoSerale - fasceLordeGiorno.oreNotturnoPieno - fasceLordeGiorno.oreSconfinamentoFestivo;
        
        let pausaResidua = pausaTotaleOre;

        const diurneNette = Math.max(0, oreLordeDiurne - pausaResidua);
        pausaResidua = Math.max(0, pausaResidua - oreLordeDiurne);

        const notturneSeraleNette = Math.max(0, fasceLordeGiorno.oreNotturnoSerale - pausaResidua);
        pausaResidua = Math.max(0, pausaResidua - fasceLordeGiorno.oreNotturnoSerale);

        const notturnePieneNette = Math.max(0, fasceLordeGiorno.oreNotturnoPieno - pausaResidua);
        
        oreDiurneNetTot = diurneNette;
        oreNotturnoSeraleTot = notturneSeraleNette;
        oreNotturnoPienoTot = notturnePieneNette;
        oreSconfinamentoFestivoTot = fasceLordeGiorno.oreSconfinamentoFestivo; // Pausa non tocca lo sconfinamento

        const oreTeoriche = (d.day() >= 1 && d.day() <= 5) ? 8 : 0;
        
        const { risultato, saldiAggiornati } = calcolaGiornata(
            {
                data: dataCorrenteString,
                oreDiurne: Math.round(oreDiurneNetTot * 100) / 100,
                oreNotturnoSerale: Math.round(oreNotturnoSeraleTot * 100) / 100,
                oreNotturnoPieno: Math.round(oreNotturnoPienoTot * 100) / 100,
                oreSconfinamentoFestivo: Math.round(oreSconfinamentoFestivoTot*100)/100,
                isSabato: d.day() === 6,
                isDomenica: d.day() === 0,
                isFestivo: false, // Logica festività da implementare
                oreTeorichePreviste: oreTeoriche
            },
            assenzeGiorno,
            saldiCorrenti
        );

        saldiCorrenti = saldiAggiornati;
        
        if (d.month() === meseContabile) {
             risultatiFinali.push(risultato);
        }
    }
    
    return risultatiFinali;
}
