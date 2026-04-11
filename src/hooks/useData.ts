
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Cliente, Tecnico, Rapportino, TipoGiornata, Nave, Luogo, Veicolo } from '@/models/definitions';

// Definizione di un tipo per l'oggetto restituito dall'hook
export interface UseDataReturn {
  clienti: Cliente[];
  tecnici: Tecnico[];
  // Rimosso: rapportini: Rapportino[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  loading: boolean;
  error: string | null;
}

// Collezione di anagrafiche da caricare
const collectionsToLoad: { key: keyof Omit<UseDataReturn, 'loading' | 'error' | 'rapportini'>, name: string }[] = [
  { key: 'clienti', name: 'clienti' },
  { key: 'tecnici', name: 'tecnici' },
  // Rimosso: { key: 'rapportini', name: 'rapportini' },
  { key: 'tipiGiornata', name: 'tipiGiornata' },
  { key: 'navi', name: 'navi' },
  { key: 'luoghi', name: 'luoghi' },
  { key: 'veicoli', name: 'veicoli' },
];

export const useData = (): UseDataReturn => {
  const [data, setData] = useState<Omit<UseDataReturn, 'loading' | 'error'>>({
    clienti: [],
    tecnici: [],
    rapportini: [], // Mantenuto per compatibilità strutturale, ma non più caricato qui
    tipiGiornata: [],
    navi: [],
    luoghi: [],
    veicoli: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialLoadStatus = useRef(
    Object.fromEntries(collectionsToLoad.map(c => [c.key, false]))
  );

  useEffect(() => {
    const unsubs = collectionsToLoad.map(({ key, name }) => {
      return onSnapshot(collection(db, name), snapshot => {
        const collectionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setData(prevData => ({
          ...prevData,
          [key]: collectionData as any,
        }));
        
        if (!initialLoadStatus.current[key]) {
          initialLoadStatus.current[key] = true;
          const allLoaded = Object.values(initialLoadStatus.current).every(Boolean);
          if (allLoaded) {
            setLoading(false);
          }
        }

      }, err => {
        console.error(`Errore caricamento ${name}:`, err);
        setError(`Errore nel caricamento di ${name}.`);
        if (!initialLoadStatus.current[key]) {
            initialLoadStatus.current[key] = true;
            const allLoaded = Object.values(initialLoadStatus.current).every(Boolean);
            if (allLoaded) {
                setLoading(false);
            }
        }
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  return useMemo(() => ({
    ...(data as Omit<UseDataReturn, 'loading' | 'error'>),
    loading,
    error,
  }), [data, loading, error]);
};
