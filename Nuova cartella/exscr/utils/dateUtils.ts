import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';

/**
 * Normalizza in modo sicuro un valore di data (stringa, Timestamp di Firebase, oggetto Date, o Dayjs)
 * in un oggetto Dayjs valido. Se il valore è nullo, non valido o assente, restituisce null.
 *
 * @param date - Il valore di data da normalizzare.
 * @returns Un oggetto dayjs valido o null.
 */
export const safeGetDayjs = (date: unknown): dayjs.Dayjs | null => {
  if (!date) {
    return null;
  }

  // Se è già un oggetto Dayjs, restituiscilo
  if (dayjs.isDayjs(date)) {
    return date;
  }

  // Se è un Timestamp di Firebase, convertilo in Date
  if (date instanceof Timestamp) {
    return dayjs(date.toDate());
  }

  // Prova a creare un oggetto Dayjs dal valore (es. stringa o oggetto Date)
  const d = dayjs(date as dayjs.ConfigType);

  // Restituisci l'oggetto solo se è valido
  return d.isValid() ? d : null;
};
