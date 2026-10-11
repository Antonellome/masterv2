import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Dipendente, SaldiContatori, GiustificativoAssenza, RisultatoGiornoCCNL, AnalisiIntervalloACavallo, TipoAssenza, Rapportino } from "@/models/definitions";

dayjs.extend(isSameOrBefore);

const tipiAssenzaMap: { [key: string]: TipoAssenza } = {
    'ferie': 'FERIE',
    'malattia': 'MALATTIA',
    'permesso': 'PERMESSO',
    '104': 'LEGGE_104',
    'legge 104': 'LEGGE_104',
    'rol': 'ROL',
    'ex festività': 'EX_FESTIVITA'
};

function createEmptyDayResult(data: string): RisultatoGiornoCCNL {
    return {
        data,
        pagaBaseOre: 0,
        trasfertaOre: 0,
        oreMalattiaCarenzaAzienda: 0,
        oreMalattiaIntegrazione: 0,
        strDiu12Intero: 0,
        strDiuSuccessIntero: 0,
        straordinarioSabatoDiurno50: 0,
        straordinarioFestivo55: 0,
        oreNotturnoSeraleOrd: 0,
        oreNotturnoPienoOrd: 0,
        straordinarioNotturno50: 0,
        straordinarioNotturnoFestivo75: 0,
        bancaOreSolaMaggiorazione25: 0,
        bancaOreSolaMaggiorazione30: 0,
        rolScalati: 0,
        ferieScalate: 0,
        exFestivitaScalate: 0,
        permessiScalati: 0,
        legge104Scalate: 0,
        anomaliaDebitoUncovered: 0,
    };
}


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
  
    const risultato = createEmptyDayResult(data);
    const saldiAggiornati = { ...saldi };
    let totaleOreAssenza = 0;

    for (const assenza of assenze) {
        totaleOreAssenza += assenza.ore;
        switch(assenza.tipo) {
            case 'FERIE': 
                risultato.ferieScalate += assenza.ore; 
                saldiAggiornati.saldoFerieOre -= assenza.ore;
                break;
            case 'ROL': 
                risultato.rolScalati += assenza.ore; 
                saldiAggiornati.saldoRolOre -= assenza.ore;
                break;
            case 'EX_FESTIVITA':
                risultato.exFestivitaScalate += assenza.ore;
                saldiAggiornati.saldoExFestivitaOre -= assenza.ore;
                break;
            case 'LEGGE_104':
                risultato.legge104Scalate += assenza.ore;
                break;
            case 'PERMESSO':
                risultato.permessiScalati += assenza.ore;
                break;
            case 'MALATTIA':
                risultato.oreMalattiaCarenzaAzienda += assenza.ore;
                break;
        }
    }

    const oreLavorateTotali = oreDiurne + oreNotturnoSerale + oreNotturnoPieno + oreSconfinamentoFestivo;
    
    if (oreLavorateTotali <= 0 && totaleOreAssenza <= 0) {
      if (oreTeorichePreviste > 0) {
        let debito = oreTeorichePreviste;
        const rolDaUsare = Math.min(debito, saldiAggiornati.saldoRolOre);
        if (rolDaUsare > 0) {
            risultato.rolScalati += rolDaUsare; 
            saldiAggiornati.saldoRolOre -= rolDaUsare;
            debito -= rolDaUsare;
        }
        risultato.anomaliaDebitoUncovered = debito;
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
        risultato.straordinarioSabatoDiurno50 = oreDiurne;
        risultato.straordinarioNotturno50 = oreNotturnoSerale + oreNotturnoPieno;
        return { risultato, saldiAggiornati };
    }

    const oreOrdinarieDaCoprire = Math.max(0, oreTeorichePreviste - totaleOreAssenza);

    const ordDiurne = Math.min(oreDiurne, oreOrdinarieDaCoprire);
    risultato.pagaBaseOre += ordDiurne;
    
    const ordNottSerale = Math.min(oreNotturnoSerale, Math.max(0, oreOrdinarieDaCoprire - ordDiurne));
    risultato.oreNotturnoSeraleOrd = ordNottSerale;
    
    const ordNottPieno = Math.min(oreNotturnoPieno, Math.max(0, oreOrdinarieDaCoprire - ordDiurne - ordNottSerale));
    risultato.oreNotturnoPienoOrd = ordNottPieno;

    const strDiurne = oreDiurne - ordDiurne;
    const strNottSerale = oreNotturnoSerale - ordNottSerale;
    const strNottPieno = oreNotturnoPieno - ordNottPieno;

    const totaleStraordinarioFeriale = strDiurne + strNottSerale;
    risultato.strDiu12Intero = Math.min(totaleStraordinarioFeriale, 2);
    risultato.strDiuSuccessIntero = Math.max(0, totaleStraordinarioFeriale - 2);
    risultato.straordinarioNotturno50 = strNottPieno;

    let debitoOrario = Math.max(0, oreOrdinarieDaCoprire - (ordDiurne + ordNottSerale + ordNottPieno));
    if (debitoOrario > 0) {
        const copribileConRol = Math.min(debitoOrario, saldiAggiornati.saldoRolOre);
        if (copribileConRol > 0) {
            risultato.rolScalati += copribileConRol;
            saldiAggiornati.saldoRolOre -= copribileConRol;
            debitoOrario -= copribileConRol;
        }
    }
    risultato.anomaliaDebitoUncovered = debitoOrario;

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
        
        let oreDiurneLorde = 0;
        let oreNotturnoSeraleLorde = 0;
        let oreNotturnoPienoLorde = 0;
        let oreSconfinamentoFestivoLorde = 0;
        let pausaTotaleOre = 0;
        const assenzeGiorno: GiustificativoAssenza[] = [];

        for (const rapportino of rapportiniDelGiorno) {
            const dettaglioTecnico = rapportino.dettaglioOreTecnici?.find(det => det.tecnicoId === dipendente.id);
            if (!dettaglioTecnico || !dettaglioTecnico.ore || dettaglioTecnico.ore <= 0) {
                continue;
            }

            const oreRapportino = dettaglioTecnico.ore;
            const nomeTipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId)?.toLowerCase().trim();
            const tipoAssenza = nomeTipoGiornata ? tipiAssenzaMap[nomeTipoGiornata] : undefined;

            if (tipoAssenza) {
                assenzeGiorno.push({ 
                    dipendenteId: dipendente.id, 
                    data: dataCorrenteString, 
                    tipo: tipoAssenza, 
                    ore: oreRapportino 
                });
            } else {
                pausaTotaleOre += (dettaglioTecnico.pausa || 0) / 60;

                if (dettaglioTecnico.isManual || !dettaglioTecnico.oraInizio || !dettaglioTecnico.oraFine) {
                    oreDiurneLorde += oreRapportino;
                } else {
                    const fasceSegmento = analizzaIntervalloACavallo(dettaglioTecnico.oraInizio, dettaglioTecnico.oraFine, false);
                    
                    const diurneSegmento = fasceSegmento.oreTotali - fasceSegmento.oreNotturnoSerale - fasceSegmento.oreNotturnoPieno - fasceSegmento.oreSconfinamentoFestivo;

                    oreDiurneLorde += diurneSegmento;
                    oreNotturnoSeraleLorde += fasceSegmento.oreNotturnoSerale;
                    oreNotturnoPienoLorde += fasceSegmento.oreNotturnoPieno;
                    oreSconfinamentoFestivoLorde += fasceSegmento.oreSconfinamentoFestivo;
                }
            }
        }
        
        let pausaResidua = pausaTotaleOre;
        const oreDiurneNet = Math.max(0, oreDiurneLorde - pausaResidua);
        pausaResidua = Math.max(0, pausaResidua - oreDiurneLorde);

        const oreNotturnoSeraleNet = Math.max(0, oreNotturnoSeraleLorde - pausaResidua);
        pausaResidua = Math.max(0, pausaResidua - oreNotturnoSeraleLorde);

        const oreNotturnoPienoNet = Math.max(0, oreNotturnoPienoLorde - pausaResidua);
        
        const oreSconfinamentoFestivoNet = oreSconfinamentoFestivoLorde;

        const oreTeoriche = (d.day() >= 1 && d.day() <= 5) ? 8 : 0;
        
        const { risultato, saldiAggiornati } = calcolaGiornata(
            {
                data: dataCorrenteString,
                oreDiurne: Math.round(oreDiurneNet * 100) / 100,
                oreNotturnoSerale: Math.round(oreNotturnoSeraleNet * 100) / 100,
                oreNotturnoPieno: Math.round(oreNotturnoPienoNet * 100) / 100,
                oreSconfinamentoFestivo: Math.round(oreSconfinamentoFestivoNet * 100) / 100,
                isSabato: d.day() === 6,
                isDomenica: d.day() === 0,
                isFestivo: false, 
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
