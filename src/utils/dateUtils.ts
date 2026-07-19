
import dayjs, { Dayjs } from 'dayjs';

/**
 * Tenta di analizzare un valore di tipo sconosciuto e di convertirlo in un oggetto Dayjs.
 * Questa funzione è il CUORE della soluzione: gestisce Timestamp, oggetti, stringhe e JSON.
 * Se fallisce, restituisce null in modo sicuro, senza mai generare errori.
 *
 * @param value Il valore (di qualsiasi tipo) da cui estrarre una data.
 * @returns Un oggetto Dayjs valido o null.
 */
export const parseToDayjs = (value: any): Dayjs | null => {
  if (!value) {
    return null;
  }

  // 1. È un oggetto con il metodo .toDate() (es. Timestamp di Firestore)?
  if (typeof value.toDate === 'function') {
    return dayjs(value.toDate());
  }

  // 2. È un oggetto con la proprietà `seconds` (es. un oggetto-simil-timestamp)?
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return dayjs(value.seconds * 1000);
  }
  
  // 3. È una stringa che sembra un oggetto JSON?
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try {
      const parsedJson = JSON.parse(value);
      // Riprova a parsare l'oggetto JSON appena creato
      if (parsedJson && typeof parsedJson.seconds === 'number') {
        return dayjs(parsedJson.seconds * 1000);
      }
    } catch (e) {
      // Il parsing JSON è fallito, procedi ai tentativi successivi.
    }
  }

  // 4. Tentativo finale: lascialo gestire a dayjs (per stringhe ISO, oggetti Date, ecc.)
  const date = dayjs(value);
  if (date.isValid()) {
    return date;
  }

  return null; // Se tutti i tentativi falliscono, arrenditi in modo sicuro.
};

/**
 * Formatta una data per la visualizzazione (dd/MM/yyyy).
 * Utilizza la funzione `parseToDayjs` per garantire la massima compatibilità.
 *
 * @param value Il valore di data da formattare.
 * @returns La stringa di data formattata o "Data Invalida".
 */
export const formatDateForDisplay = (value: any): string => {
    const parsedDate = parseToDayjs(value);
    return parsedDate ? parsedDate.format('DD/MM/YYYY') : 'Data Invalida';
};
