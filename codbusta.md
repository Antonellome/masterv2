/**
 * CALCOLATORE BUSTA PAGA E GESTIONE ASSENZE
 * CCNL Metalmeccanici CONFAPI (Unionmeccanica) - 40 Ore Settimanali
 */

// 1. TABELLA LIVELLI (Inquadramento standard)
const TABELLA_LIVELLI_CONFAPI = {
  "1": 1520.00,
  "2": 1680.00,
  "3": 1830.00,
  "4": 1910.00,
  "5": 2050.00,
  "5S": 2190.00
};

const DIVISORE_ORARIO = 173; // Divisore contrattuale standard per paga oraria
const MATURAZIONE_FERIE_MESE = 13.33; // 160 ore annue / 12 mesi
const MATURAZIONE_PAR_MESE = 7.33;    // 88 ore annue (72 PAR + 16 Ex-Fest) / 12 mesi

/**
 * FUNZIONE PRINCIPALE DI CALCOLO MENSILIZZATO
 * @param {Object} profiloProfilo - Dati contrattuali e saldi iniziali
 * @param {Array} oreGiornaliere - Registro giornaliero delle ore del mese
 */
function calcolaBustaPagaMensile(profilo, oreGiornaliere) {
  // A. DETERMINAZIONE PAGA BASE
  let pagaBaseMensile = profilo.pagaBaseCustom;
  if (!pagaBaseMensile && profilo.livello) {
    pagaBaseMensile = TABELLA_LIVELLI_CONFAPI[profilo.livello] || 0;
  }
  
  const superminimo = profilo.superminimo || 0;
  const retribuzioneFissaLorda = pagaBaseMensile + superminimo;
  const pagaOrariaBase = retribuzioneFissaLorda / DIVISORE_ORARIO;

  // B. CONTEGGIO ORE E MAGGIORAZIONI
  let totaleStraordinarioImporto = 0;
  let oreFerieGodeute = 0;
  let oreParGodeute = 0;
  let giorniMalattiaMese = 0;
  let giorniLavoratiEAssenzeValide = 0;

  oreGiornaliere.forEach(giorno => {
    // Calcolo Maggiorazioni
    const ot125 = (giorno.straordinarioDiurno || 0) * (pagaOrariaBase * 1.25);
    const ot150 = (giorno.straordinarioFestivo || 0) * (pagaOrariaBase * 1.50);
    const ot120 = (giorno.notturnoOrdinario || 0) * (pagaOrariaBase * 1.20);
    const ot130 = (giorno.notturnoStraordinario || 0) * (pagaOrariaBase * 1.30);

    totaleStraordinarioImporto += (ot125 + ot150 + ot120 + ot130);

    // Gestione Assenze
    if (giorno.ferie) oreFerieGodeute += giorno.ferie;
    if (giorno.par) oreParGodeute += giorno.par;
    if (giorno.malattia) giorniMalattiaMese += 1;

    // Presenze per maturazione rateo (servono almeno 15 giorni lavorati o giustificati)
    if (giorno.oreOrdinarie > 0 || giorno.ferie > 0 || giorno.par > 0 || giorno.malattia) {
      giorniLavoratiEAssenzeValide += 1;
    }
  });

  // C. CALCOLO MALATTIA (Trattenute se la copertura scende al 50%)
  let decurtazioneMalattia = 0;
  const giorniMalattiaTotaliAnno = (profilo.giorniMalattiaPregressiAnno || 0) + giorniMalattiaMese;
  
  // Limiti di comporto al 100% in base all'anzianità
  let limiteGiorniAl100 = 60; // Fino a 3 anni di anzianità
  if (profilo.anniAnzianita > 3 && profilo.anniAnzianita <= 6) limiteGiorniAl100 = 90;
  if (profilo.anniAnzianita > 6) limiteGiorniAl100 = 120;

  if (giorniMalattiaTotaliAnno > limiteGiorniAl100) {
    const giorniInEccesso = Math.min(giorniMalattiaMese, giorniMalattiaTotaliAnno - limiteGiorniAl100);
    const pagaGiornaliera = retribuzioneFissaLorda / 26; // Divisore giornaliero standard
    decurtazioneMalattia = giorniInEccesso * (pagaGiornaliera * 0.50); // Taglio del 50%
  }

  // D. TOTALE LORDO
  const totaleLordoMensile = retribuzioneFissaLorda + totaleStraordinarioImporto - decurtazioneMalattia;

  // E. CALCOLO NETTO (Tassazione IRPEF + INPS)
  const aliquotaINPS = 0.0919; // 9,19% a carico dipendente
  const contributiINPS = totaleLordoMensile * aliquotaINPS;
  const imponibileIRPEF = totaleLordoMensile - contributiINPS;

  // Aliquote IRPEF mensilizzate
  let irpefLorda = 0;
  if (imponibileIRPEF <= 2333.33) { // fino a 28.000€ annui
    irpefLorda = imponibileIRPEF * 0.23;
  } else if (imponibileIRPEF <= 4166.67) { // da 28.000€ a 50.000€
    irpefLorda = (2333.33 * 0.23) + ((imponibileIRPEF - 2333.33) * 0.35);
  } else {
    irpefLorda = (2333.33 * 0.23) + ((4166.67 - 2333.33) * 0.35) + ((imponibileIRPEF - 4166.67) * 0.43);
  }

  // Detrazione da Lavoro Dipendente mensilizzata (stima base)
  const detrazioneLavoroDipendente = 1955 / 12; 
  const irpefNetta = Math.max(0, irpefLorda - detrazioneLavoroDipendente);

  // Stima Addizionali Regionali/Comunali (~2%)
  const addizionaliStimate = imponibileIRPEF * 0.02;

  const totaleNettoMensile = imponibileIRPEF - irpefNetta - addizionaliStimate;

  // F. CALCOLO NUOVI SALDI FERIE E PAR (Residui / Debiti)
  const haDirittoAlRateo = giorniLavoratiEAssenzeValide >= 15;
  const maturatiFerieMese = haDirittoAlRateo ? MATURAZIONE_FERIE_MESE : 0;
  const maturatiParMese = haDirittoAlRateo ? MATURAZIONE_PAR_MESE : 0;

  const nuovoSaldoFerie = (profilo.saldoInizialeFerie || 0) + maturatiFerieMese - oreFerieGodeute;
  const nuovoSaldoPar = (profilo.saldoInizialePar || 0) + maturatiParMese - oreParGodeute;

  // RETURN RISULTATO COMPLETO PER L'APP
  return {
    competenze: {
      pagaBase: pagaBaseMensile,
      superminimo: superminimo,
      pagaOrariaBase: Number(pagaOrariaBase.toFixed(2)),
      straordinariTotali: Number(totaleStraordinarioImporto.toFixed(2)),
      decurtazioneMalattia: Number(decurtazioneMalattia.toFixed(2)),
      totaleLordo: Number(totaleLordoMensile.toFixed(2))
    },
    trattenute: {
      inps: Number(contributiINPS.toFixed(2)),
      imponibileIrpef: Number(imponibileIRPEF.toFixed(2)),
      irpefNetta: Number(irpefNetta.toFixed(2)),
      addizionali: Number(addizionaliStimate.toFixed(2)),
      totaleTrattenute: Number((contributiINPS + irpefNetta + addizionaliStimate).toFixed(2))
    },
    nettoInBusta: Number(totaleNettoMensile.toFixed(2)),
    saldiContatori: {
      ferie: {
        iniziale: profilo.saldoInizialeFerie || 0,
        maturate: Number(maturatiFerieMese.toFixed(2)),
        godute: oreFerieGodeute,
        finale: Number(nuovoSaldoFerie.toFixed(2)) // Se negativo è in debito
      },
      par: {
        iniziale: profilo.saldoInizialePar || 0,
        maturate: Number(maturatiParMese.toFixed(2)),
        godute: oreParGodeute,
        finale: Number(nuovoSaldoPar.toFixed(2))   // Se negativo è in debito
      }
    }
  };
}

// ==========================================
// ESEMPIO PRATICO DI UTILIZZO NELL'APP
// ==========================================

// 1. Profilo configurato dal dipendente
const profiloDipendente = {
  livello: "5",                  // 5° Livello Confapi (oppure usa pagaBaseCustom: 2050)
  pagaBaseCustom: null,          // Se inserito sovrascrive il livello
  superminimo: 50,               // 50€/mese ad personam
  anniAnzianita: 2,              // Servono per calcolare lo scaglione malattia
  saldoInizialeFerie: 10,        // Credito precedente (se in debito mettere es. -5)
  saldoInizialePar: -4,          // In debito di 4 ore di PAR
  giorniMalattiaPregressiAnno: 0 // Malattie già fatte nell'anno
};

// 2. Registro ore inserito giorno per giorno dall'utente (es. Mese di 5 giorni lavorativi)
const registroOreMese = [
  { oreOrdinarie: 8, straordinarioDiurno: 2, ferie: 0, par: 0, malattia: false },
  { oreOrdinarie: 8, straordinarioDiurno: 0, ferie: 0, par: 0, malattia: false },
  { oreOrdinarie: 0, straordinarioDiurno: 0, ferie: 8, par: 0, malattia: false }, // Giorno di Ferie
  { oreOrdinarie: 0, straordinarioDiurno: 0, ferie: 0, par: 4, malattia: false }, // Mezza giornata PAR
  { oreOrdinarie: 8, straordinarioDiurno: 0, ferie: 0, par: 0, malattia: false }
];

// 3. Esecuzione del calcolo
const calcoloBusta = calcolaBustaPagaMensile(profiloDipendente, registroOreMese);
console.log(JSON.stringify(calcoloBusta, null, 2));