import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Cliente, Tecnico, TipoGiornata, Nave, Luogo, Veicolo } from '@/models/definitions';

export interface DataBundle {
  clienti: Cliente[];
  tecnici: Tecnico[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
}

const collectionsToLoad: { key: keyof DataBundle; name: string }[] = [
  { key: 'clienti', name: 'clienti' },
  { key: 'tecnici', name: 'tecnici' },
  { key: 'tipiGiornata', name: 'tipiGiornata' },
  { key: 'navi', name: 'navi' },
  { key: 'luoghi', name: 'luoghi' },
  { key: 'veicoli', name: 'veicoli' },
];

export const useData = () => {
  const [data, setData] = useState<DataBundle>({
    clienti: [],
    tecnici: [],
    tipiGiornata: [],
    navi: [],
    luoghi: [],
    veicoli: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus: Partial<Record<keyof DataBundle, boolean>> = {};

    const unsubscribers = collectionsToLoad.map(({ key, name }) => {
      return onSnapshot(
        collection(db, name),
        (snapshot) => {
          const collectionData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any;
          setData((prevData) => ({ ...prevData, [key]: collectionData }));

          if (!loadStatus[key]) {
            loadStatus[key] = true;
            if (Object.keys(loadStatus).length === collectionsToLoad.length) {
              setLoading(false);
            }
          }
        },
        (err) => {
          console.error(`Errore caricamento ${name}:`, err);
          setError(`Fallito il caricamento di ${name}.`);
          
          if (!loadStatus[key]) {
            loadStatus[key] = true;
            if (Object.keys(loadStatus).length === collectionsToLoad.length) {
              setLoading(false);
            }
          }
        }
      );
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return { ...data, loading, error };
};
