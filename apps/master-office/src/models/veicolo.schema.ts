import { z } from 'zod';

// Corrisponde all'interfaccia Veicolo in definitions.ts
export const veicoloSchema = z.object({
  id: z.string().optional(), // L'ID è opzionale, gestito da Firestore
  targa: z.string().min(1, 'La targa è obbligatoria'),
  marca: z.string().min(1, 'La marca è obbligatoria'),
  modello: z.string().min(1, 'Il modello è obbligatorio'),
  tipo: z.string().optional(),
  anno: z.number().int().positive().optional().nullable(),
  proprieta: z.string().optional(),
  scadenzaAssicurazione: z.string().nullable().optional(),
  scadenzaBollo: z.string().nullable().optional(),
  scadenzaRevisione: z.string().nullable().optional(),
  scadenzaTachigrafo: z.string().nullable().optional(), // Corretto da Tachimetro a Tachigrafo
  scadenzaTagliando: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
