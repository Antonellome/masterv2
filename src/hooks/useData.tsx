
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Rapportino, Checkin, Anagrafica } from '@/models/definitions';

export const useData = () => {
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [anagrafiche, setAnagrafiche] = useState<Anagrafica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubscribers = [
      onSnapshot(collection(db, 'tecnici'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
        setTecnici(data);
      }, (err) => {
        console.error("Errore nel caricamento tecnici:", err);
        setError(err);
      }),

      onSnapshot(collection(db, 'rapportini'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
        setRapportini(data);
      }, (err) => {
        console.error("Errore nel caricamento rapportini:", err);
        setError(err);
      }),

      onSnapshot(collection(db, 'checkin_giornalieri'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checkin));
        setCheckins(data);
      }, (err) => {
        console.error("Errore nel caricamento check-in:", err);
        setError(err);
      }),

      onSnapshot(collection(db, 'anagrafiche'), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anagrafica));
        setAnagrafiche(data);
      }, (err) => {
        console.error("Errore nel caricamento anagrafiche:", err);
        setError(err);
      }),
    ];

    // Una volta che tutti gli snapshot iniziali sono stati caricati
    Promise.all(unsubscribers).then(() => {
        setLoading(false);
    }).catch(err => {
        console.error("Errore durante l'iscrizione agli snapshot:", err);
        setError(err);
        setLoading(false);
    });

    // Funzione di pulizia per disiscriversi quando il componente viene smontato
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };

  }, []);

  return { tecnici, rapportini, checkins, anagrafiche, loading, error };
};
