export interface Scadenza {
  id: string;
  descrizione: string; // e.g., "Assicurazione RCA", "Patente"
  riferimento: string; // e.g., Targa, Nome Persona, Nome Documento
  data: string; // ISO 8601 format
  tipo: "personali" | "veicoli" | "documenti";
  status: "valido" | "imminente" | "scaduto";
  silenced: boolean;
}
