
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: 'admin' | 'user' | 'viewer';
}

export interface Tecnico {
    id: string;
    nome: string;
    cognome: string;
    email?: string;
    userId?: string;
}

export interface Cliente {
    id: string;
    nome: string;
    piva?: string;
    indirizzo?: string;
}

export interface Nave {
    id: string;
    nome: string;
    clienteId: string;
    cliente?: Cliente; // Popolato
}

export interface Luogo {
    id: string;
    nome: string;
}

export interface Veicolo {
    id: string;
    nome: string;
    targa: string;
}

export interface TipoGiornata {
    id: string;
    nome: string;
    isLavorativa: boolean;
}

export interface DettaglioOreTecnico {
    tecnicoId: string;
    nome?: string; // Denormalizzato per comodità
    isManual?: boolean;
    oraInizio?: string | null;
    oraFine?: string | null;
    pausa?: number | null;
    ore: number;
}

export interface Rapportino {
    id?: string; // opzionale perché non c'è in creazione
    data: Timestamp;
    tecnicoId: string;
    tipoGiornataId: string;

    // Campi legacy o denormalizzati (da gestire con attenzione)
    giornataId?: string; // vecchio nome di tipoGiornataId
    nome?: string; // descrizione, e.g., 'Rapportino giornaliero'
    
    // Core Fields
    isTrasferta?: boolean;
    presenze?: string[];
    dettaglioOreTecnici?: DettaglioOreTecnico[];
    oreLavoro?: number; // Totale ore, dovrebbe essere la somma di dettaglioOreTecnici

    // Campi ore (potrebbero essere legacy se isTrasferta è true)
    oraInizio?: string | null;
    oraFine?: string | null;
    pausa?: number | null;
    
    // Foreign Keys
    clienteId?: string | null;
    naveId?: string | null;
    luogoId?: string | null;
    veicoloId?: string | null;

    // Campi descrittivi
    descrizioneBreve?: string;
    lavoroEseguito?: string;
    materialiImpiegati?: string;

    // Dati firme (struttura da definire)
    firmaFirmatarioNome?: string;
    firmaFirmatarioSocieta?: string;
    firmaVettoriale?: string; // e.g., base64 string

    // Timestamps e autore
    createdBy?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;

    // Campi popolati (non in Firestore, ma aggiunti nell'applicazione)
    tecnico?: Tecnico;
    cliente?: Cliente;
    nave?: Nave;
    luogo?: Luogo;
    veicolo?: Veicolo;
    tipoGiornata?: TipoGiornata;
}
