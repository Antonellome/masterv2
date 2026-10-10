export type LivelloInquadramento = 'D1' | 'D2' | 'C1' | 'C2' | 'C3' | 'B1' | 'B2' | 'B3' | 'A1';

export enum TipoAssenza {
    FERIE = 'FERIE',
    ROL = 'ROL',
    EX_FESTIVITA = 'EX_FESTIVITA',
    MALATTIA = 'MALATTIA',
    BANCA_ORE = 'BANCA_ORE',
    PERMESSO = 'PERMESSO',
    LEGGE_104 = 'LEGGE_104',
    ORDINARIA = 'ORDINARIA' // Anche se non è un'assenza, serve per il mapping
}

export interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  livello: LivelloInquadramento;
  isTurnista: boolean;
  orarioSettimanaleContrattuale: number; // Default: 40
  anzianitaAnni: number;                 // Utile per gestione comporto malattia
}

export interface TimbratureGiornaliere {
  dipendenteId: string;
  data: string;                       // Formato: YYYY-MM-DD
  oraIngresso?: string;               // Formato: HH:mm
  oraUscita?: string;                 // Formato: HH:mm
  oreLavorateEffettive?: number;      // Opzionale se inserite direttamente
  oreTeorichePreviste: number;        // Default: 8.0
  pausa?: number;                     // Pausa in minuti
  isFestivo: boolean;
  isDomenica: boolean;
  isSabato: boolean;
  isFestivoGiornoSuccessivo?: boolean; // Importante per turni a cavallo della mezzanotte
}

export interface GiustificativoAssenza {
  dipendenteId: string;
  data: string;
  tipo: TipoAssenza;
  ore: number;
  giornoInizioMalattia?: boolean;     // True se è il 1° giorno dell'evento di malattia
  giornoMalattiaProgressivo?: number; // Es: 1, 2, 3 (Carenza 100% ditta), 4+ (INPS + integrazione)
}

export interface SaldiContatori {
  dipendenteId: string;
  anno: number;
  saldoFerieOre: number;               // Base annua: 160h (20 giorni)
  saldoRolOre: number;                 // Base annua: 72h
  saldoExFestivitaOre: number;         // Base annua: 16h
  saldoBancaOre: number;
  giorniMalattiaAccumulatiAnno: number; // Controllo periodo di comporto
  permesso104ResiduoOre: number; 
}

export interface AnalisiIntervalloACavallo {
  oreTotali: number;
  oreNotturnoSerale: number;          // Fascia 20:00 - 22:00
  oreNotturnoPieno: number;           // Fascia 22:00 - 06:00
  oreSconfinamentoFestivo: number;    // Ore ricadenti dopo le 00:00 in giorno festivo
}

export interface RisultatoGiornoCCNL {
  data: string;
  pagaBaseOre: number;
  trasfertaOre?: number;

  // Gestione Malattia
  oreMalattiaCarenzaAzienda: number;
  oreMalattiaIntegrazione: number;
  
  // Maggiorazioni Straordinari Ordinari
  strDiu12Intero: number;
  strDiuSuccessIntero: number;
  straordinarioSabatoDiurno50: number;
  straordinarioFestivo55: number;
  
  // Maggiorazioni Notturne
  oreNotturnoSeraleOrd: number;
  oreNotturnoPienoOrd: number;
  straordinarioNotturnoFestivo75: number;
  
  // Banca Ore
  bancaOreSolaMaggiorazione25: number;
  bancaOreSolaMaggiorazione30: number;
  
  // Scali dei Contatori
  rolScalati: number;
  ferieScalate: number;
  exFestivitaScalate: number;
  permessiScalati?: number;
  legge104Scalate?: number;
  
  // Anomalie
  anomaliaDebitoUncovered: number; 
}
