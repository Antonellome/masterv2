
import { Rapportino } from "@/models/definitions";

/**
 * Converte in modo sicuro una stringa o un numero in un numero, restituendo 0 se non valido.
 * @param value il valore da convertire
 * @returns il valore come numero o 0
 */
const safeParseFloat = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Esegue il parsing dei campi numerici di un rapportino per garantire che siano numeri.
 * Questo previene errori di calcolo se i dati da Firestore/Dexie sono stringhe.
 * @param rapportino L'oggetto rapportino da "sanificare"
 * @returns L'oggetto rapportino con i campi numerici garantiti
 */
export const parseRapportinoNumerics = (rapportino: any): Rapportino => {
    return {
        ...rapportino,
        oreLavoro: safeParseFloat(rapportino.oreLavoro),
        dettaglioOreTecnici: Array.isArray(rapportino.dettaglioOreTecnici)
            ? rapportino.dettaglioOreTecnici.map((dettaglio: any) => ({
                ...dettaglio,
                ore: safeParseFloat(dettaglio.ore),
                pausa: safeParseFloat(dettaglio.pausa),
            }))
            : [],
    };
};
