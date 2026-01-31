import { z } from 'zod';
import type { TipoGiornata } from '@/models/definitions'; // Importa il tipo aggiornato

// La funzione che crea lo schema di validazione dinamicamente
export const createRapportinoSchema = (tipiGiornata: TipoGiornata[]) => {

  return z.object({
    // --- SEZIONE TECNICI ---
    tecnicoScriventeId: z.string({ required_error: 'Il tecnico scrivente è obbligatorio.' }),
    tecniciAggiuntiIds: z.array(z.string()).optional(),

    // --- SEZIONE TEMPO ---
    inserimentoManualeOre: z.boolean().default(false),
    data: z.coerce.date({ required_error: 'La data è obbligatoria.', invalid_type_error: "Formato data non valido" }),
    oraInizio: z.coerce.date().nullable().optional(),
    oraFine: z.coerce.date().nullable().optional(),
    pausa: z.number().min(0, "La pausa non può essere negativa.").optional(),
    oreLavorate: z.number().min(0, 'Le ore non possono essere negative.').optional(),

    // --- SEZIONE DETTAGLI INTERVENTO ---
    breveDescrizione: z.string().optional(),
    lavoroEseguito: z.string().optional(),
    materialiImpiegati: z.string().optional(),
    
    // --- SEZIONE RIFERIMENTI ---
    naveId: z.string().nullable().optional(),
    luogoId: z.string().nullable().optional(),
    giornataId: z.string({ required_error: 'Il tipo di giornata è obbligatorio.' }),
    veicoloId: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Trova il tipo di giornata selezionato
    const tipoGiornataSelezionato = tipiGiornata.find(t => t.id === data.giornataId);

    // Se la giornata è di tipo "lavorativa", applica le validazioni obbligatorie
    if (tipoGiornataSelezionato && tipoGiornataSelezionato.lavorativa) {

      // 1. Nave o Luogo devono essere presenti
      if (!data.naveId && !data.luogoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['naveId'], // Associa l'errore a uno dei campi
          message: 'Per le giornate lavorative, specificare almeno una Nave o un Luogo.',
        });
         ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['luogoId'], // E anche all'altro
          message: 'Per le giornate lavorative, specificare almeno una Nave o un Luogo.',
        });
      }

      // 2. Descrizione e Lavoro Eseguito sono obbligatori
      if (!data.breveDescrizione || data.breveDescrizione.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['breveDescrizione'],
          message: 'La descrizione è obbligatoria per le giornate lavorative.',
        });
      }
      if (!data.lavoroEseguito || data.lavoroEseguito.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lavoroEseguito'],
          message: 'Il campo Lavori Eseguiti è obbligatorio per le giornate lavorative.',
        });
      }

      // 3. Logica delle ore (uguale a prima, ma dentro il blocco condizionale)
      if (data.inserimentoManualeOre) {
        if (!data.oreLavorate || data.oreLavorate <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oreLavorate'], message: 'Inserire un valore maggiore di zero.' });
        }
      } else {
        if (!data.oraInizio) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oraInizio'], message: 'Obbligatorio per il calcolo automatico.' });
        }
        if (!data.oraFine) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['oraFine'], message: 'Obbligatorio per il calcolo automatico.' });
        }
      }
    } // Fine del blocco if (giornata lavorativa)

  });
};

// Esporta il tipo basato su uno schema generico (non dinamico)
// per mantenere la coerenza dei tipi nell'applicazione.
const staticSchema = createRapportinoSchema([]);
export type RapportinoSchema = z.infer<typeof staticSchema>;
