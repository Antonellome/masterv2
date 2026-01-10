import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Cliente, Tecnico, Rapportino } from '@/models/definitions';

export const useData = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usiamo i ref per tenere traccia se ogni collezione ha completato il primo caricamento
  const initialLoadStatus = useRef({
    clienti: false,
    tecnici: false,
    rapportini: false,
  });

  useEffect(() => {
    const collections = [
      { name: 'clienti', setter: setClienti, type: 'clienti' as const },
      { name: 'tecnici', setter: setTecnici, type: 'tecnici' as const },
      { name: 'rapportini', setter: setRapportini, type: 'rapportini' as const },
    ];

    const unsubs = collections.map(({ name, setter, type }) => {
      return onSnapshot(collection(db, name), snapshot => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any);
        
        // Se non è ancora stato segnato come caricato, fallo ora e controlla se tutti gli altri lo sono.
        if (!initialLoadStatus.current[type]) {
          initialLoadStatus.current[type] = true;
          const allLoaded = Object.values(initialLoadStatus.current).every(Boolean);
          if (allLoaded) {
            setLoading(false);
          }
        }

      }, err => {
        console.error(`Errore caricamento ${name}:`, err);
        setError(`Errore nel caricamento di ${name}.`);
        // Anche in caso di errore su una collezione, sblocchiamo il caricamento per non bloccare l'app
        if (!initialLoadStatus.current[type]) {
            initialLoadStatus.current[type] = true;
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

  return { clienti, tecnici, rapportini, loading, error };
};
