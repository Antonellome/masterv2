
import { z } from 'zod';

// Schema per un singolo oggetto nell'array dettaglioOreTecnici.
// Corrisponde ESATTAMENTE alla specifica per l'App Tecnici.
export const dettaglioOreTecnicoSchema = z.object({
  tecnicoId: z.string(),
  nome: z.string(),
  ore: z.number(),
  oraInizio: z.string().nullable(),
  oraFine: z.string().nullable(),
  pausa: z.number(),
  isManual: z.boolean(),
});

// Schema principale del Rapportino.
// Questa è la "single source of truth" e rispecchia ESATTAMENTE
// le specifiche JSON fornite. NON contiene campi legacy o opzionali extra.
export const rapportinoSchema = z.object({
  id: z.string(),
  data: z.any(), // Per Timestamp
  tecnicoId: z.string(),
  tipoGiornataId: z.string(),
  naveId: z.string().nullable(),
  luogoId: z.string().nullable(),
  descrizioneBreve: z.string(),
  note: z.string(),
  isFirmaClienteRichiesta: z.boolean(),
  nomeCliente: z.string(),
  emailCliente: z.string(),
  firmaVettoriale: z.string().nullable(),
  presenze: z.array(z.string()),
  dettaglioOreTecnici: z.array(dettaglioOreTecnicoSchema),
});

// Tipo TypeScript derivato
export type RapportinoSchema = z.infer<typeof rapportinoSchema>;

// Funzione mantenuta per retrocompatibilità ma ora ritorna lo schema statico.
export const createRapportinoSchema = () => {
  return rapportinoSchema;
};
