import { useState, useEffect, useRef } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, DocumentData } from 'firebase/firestore';
import { type FirebaseError } from 'firebase/app';

/**
 * Stato restituito dall'hook useFirestoreData.
 * @template T Il tipo di dati dei documenti.
 */
interface FirestoreDataState<T> {
  data: T[] | null;
  loading: boolean;
  error: FirebaseError | null;
}

/**
 * Hook custom per recuperare dati da una collection Firestore in modo controllato e sicuro.
 * Gestisce in modo esplicito gli stati di caricamento e gli errori, evitando loop infiniti.
 * Questo è il "Filone Unico" per l'accesso ai dati in lettura nell'applicazione.
 *
 * @template T Il tipo di dati atteso per i documenti.
 * @param {Query} query L'oggetto query di Firestore per specificare la collection e i filtri.
 * @returns {FirestoreDataState<T>} Un oggetto contenente i dati, lo stato di caricamento e l'eventuale errore.
 */
export const useFirestoreData = <T extends { id: string }>(query: Query): FirestoreDataState<T> => {
  const [state, setState] = useState<FirestoreDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Usiamo useRef per mantenere una referenza stabile alla query e evitare re-render non necessari
  const queryRef = useRef(query);

  useEffect(() => {
    // Funzione per mappare i dati del documento
    const mapDoc = (doc: DocumentData): T => ({
      ...doc.data(),
      id: doc.id,
    } as T);

    setState(prevState => ({ ...prevState, loading: true, error: null }));

    // Iscrizione agli aggiornamenti in tempo reale
    const unsubscribe = onSnapshot(queryRef.current, (querySnapshot) => {
      const data = querySnapshot.docs.map(mapDoc);
      setState({ data, loading: false, error: null });
    }, (err) => {
      const error = err as FirebaseError;
      console.error(`[useFirestoreData] Errore durante il fetch dei dati in tempo reale:`, error);
      setState({ data: null, loading: false, error });
    });

    // Pulizia dell'iscrizione quando il componente viene smontato o la query cambia
    return () => unsubscribe();

  }, [query]); // L'hook si ri-esegue solo se l'oggetto query cambia

  return state;
};
