
import type { Rapportino, DettaglioOre } from '@/models/definitions';
import dayjs from 'dayjs';

// Impostiamo il locale una sola volta
dayjs.locale('it');

/**
 * Estrae le ore da un singolo dettaglio.
 * Questa funzione si fida del campo 'ore' presente nel documento, poiché il calcolo
 * complesso (inizio-fine-pausa) viene fatto dall'app che genera il dato (app tecnici).
 * @param dettaglio Il dettaglio ore da cui estrarre le ore.
 * @returns Il numero di ore lavorate.
 */
const getOreFromDettaglio = (dettaglio: Partial<DettaglioOre>): number => {
    return dettaglio.ore || 0;
};

/**
 * L'unica, sacra fonte di verità per il calcolo delle ore di un rapportino.
 * Questa funzione analizza un rapportino (anche parziale o legacy) e restituisce le ore totali.
 * È progettata per essere compatibile sia con la nuova struttura dati che con quella vecchia.
 *
 * @param rapportino L'oggetto Rapportino, che può provenire da Firestore o essere in costruzione nel form.
 * @returns Il numero di ore totali lavorate nel rapportino.
 */
export const calculateTotalHours = (rapportino: Partial<Rapportino>): number => {
    // Caso 1: Nuovo sistema con dettaglioOre. Questo è il caso primario.
    if (rapportino.dettaglioOre && rapportino.dettaglioOre.length > 0) {
        return rapportino.dettaglioOre.reduce((total, dettaglio) => {
            return total + getOreFromDettaglio(dettaglio);
        }, 0);
    }

    // Caso 2: Vecchio sistema con dettaglioOreTecnici. Mantenuto per retrocompatibilità.
    // @ts-ignore - Accesso a campo legacy per la transizione
    if (rapportino.dettaglioOreTecnici && rapportino.dettaglioOreTecnici.length > 0) {
        // @ts-ignore - Accesso a campo legacy
        return rapportino.dettaglioOreTecnici.reduce((total: number, dettaglio: any) => {
            return total + (dettaglio.ore || 0);
        }, 0);
    }

    // Caso 3: Vecchissimo sistema solo con il campo oreLavoro.
    if (rapportino.oreLavoro) {
        return rapportino.oreLavoro ?? 0;
    }

    // Se non ci sono dati validi per calcolare le ore, ritorna zero.
    return 0;
};
