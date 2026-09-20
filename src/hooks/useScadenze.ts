
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useGlobalStore } from '@/stores/globalStore';
import { Timestamp } from 'firebase/firestore';

// Definiamo un tipo per i nostri documenti/scadenze, se non già presente
interface Documento {
  id: string;
  scadenza?: Timestamp | Date;
  [key: string]: any;
}

export const useScadenze = () => {
  // 1. Leggiamo i dati delle scadenze (documenti) direttamente da Dexie in tempo reale.
  const scadenze = useLiveQuery<Documento[]>(() => db.documenti.toArray(), []);

  // 2. Leggiamo lo stato delle scadenze silenziate e l'azione per modificarlo dal globalStore.
  const { silencedScadenze, toggleScadenzaSilence } = useGlobalStore(state => ({
    silencedScadenze: state.silencedScadenze,
    toggleScadenzaSilence: state.toggleScadenzaSilence,
  }));

  // Funzione per verificare se una scadenza è stata silenziata.
  const isScadenzaSilenced = (id: string) => silencedScadenze?.includes(id) ?? false;

  // 3. Calcoliamo le scadenze rilevanti (scadute o in scadenza)
  const scadenzeRilevanti = useMemo(() => {
    if (!scadenze) {
      return [];
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return scadenze
      .map(doc => {
        // Assicuriamoci che la data di scadenza sia un oggetto Date
        if (doc.scadenza && doc.scadenza instanceof Timestamp) {
          return { ...doc, scadenza: doc.scadenza.toDate() };
        }
        if (typeof doc.scadenza === 'string') {
            return { ...doc, scadenza: new Date(doc.scadenza) };
        }
        return doc;
      })
      .filter(doc => {
        // Filtra solo documenti con una data di scadenza valida
        return doc.scadenza instanceof Date && !isNaN(doc.scadenza.getTime());
      })
      .filter(doc => {
        const scadenzaDate = doc.scadenza as Date;
        // Filtra le scadenze che sono già passate o che scadranno entro 30 giorni.
        return scadenzaDate < thirtyDaysFromNow;
      });
  }, [scadenze]);

  // 4. Filtriamo ulteriormente le scadenze per escludere quelle silenziate.
  const scadenzeAttive = useMemo(() => {
    return scadenzeRilevanti.filter(scadenza => !isScadenzaSilenced(scadenza.id));
  }, [scadenzeRilevanti, silencedScadenze]);

  // Restituiamo i dati e le funzioni necessarie alla UI.
  return {
    scadenzeOriginali: scadenze || [],
    scadenzeRilevanti,
    scadenzeAttive,
    isScadenzaSilenced,
    toggleScadenzaSilence,
    isLoading: scadenze === undefined, // Lo stato di caricamento è quando i dati sono `undefined`
  };
};
