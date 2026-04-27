
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Luogo, Nave, Cliente } from '@/models/definitions';

export const useData = () => {
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [luoghi, setLuoghi] = useState<Luogo[]>([]);
  const [navi, setNavi] = useState<Nave[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const collections = ['tecnici', 'luoghi', 'navi', 'clienti'];
    const initialLoads = new Set(collections);
    let initialLoadCompleted = false;

    const handleInitialLoad = (name: string) => {
        initialLoads.delete(name);
        if (initialLoads.size === 0 && !initialLoadCompleted) {
            setLoading(false);
            initialLoadCompleted = true;
        }
    };

    const unsubscribers = [
      onSnapshot(collection(db, 'tecnici'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
        setTecnici(data);
        handleInitialLoad('tecnici');
      }, (err) => {
        console.error("Errore nel caricamento tecnici:", err);
        setError(err);
        handleInitialLoad('tecnici'); 
      }),

      onSnapshot(collection(db, 'luoghi'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Luogo));
        setLuoghi(data);
        handleInitialLoad('luoghi');
      }, (err) => {
        console.error("Errore nel caricamento luoghi:", err);
        setError(err);
        handleInitialLoad('luoghi');
      }),

      onSnapshot(collection(db, 'navi'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nave));
        setNavi(data);
        handleInitialLoad('navi');
      }, (err) => {
        console.error("Errore nel caricamento navi:", err);
        setError(err);
        handleInitialLoad('navi');
      }),

      onSnapshot(collection(db, 'clienti'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
        setClienti(data);
        handleInitialLoad('clienti');
      }, (err) => {
        console.error("Errore nel caricamento clienti:", err);
        setError(err);
        handleInitialLoad('clienti');
      }),
    ];

    // Funzione di pulizia per disiscriversi quando il componente viene smontato
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };

  }, []);

  return { tecnici, luoghi, navi, clienti, loading, error };
};
