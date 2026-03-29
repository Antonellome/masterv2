export interface Orari {
  inizio: string;      // e.g., "07:30"
  fine: string;        // e.g., "16:30"
  pausa: number;       // e.g., 60, 30, 0 (in minuti)
}

export interface Scadenza {
  id: string;
  descrizione: string; // e.g., "Assicurazione RCA", "Patente"
  riferimento: string; // e.g., Targa, Nome Persona, Nome Documento
  data: string; // ISO 8601 format
  tipo: "personali" | "veicoli" | "documenti";
  status: "valido" | "imminente" | "scaduto";
  silenced: boolean;
}
