import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where, orderBy, limit, Query } from 'firebase/firestore';
import type { DocumentData, QueryConstraint } from 'firebase/firestore';
import { db } from '@/firebase'; // Assicurati che il percorso sia corretto

// Funzione helper per serializzare la query in una stringa stabile
const getQueryPath = (q: Query): string => {
    // La proprietà _query è interna ma stabile per questo scopo.
    // Contiene il path e i filtri.
    const internalQuery = q as any;
    if (!internalQuery._query) return 'invalid-query';

    const path = internalQuery._query.path.segments.join('/');
    
    const filters = (internalQuery._query.filters || []).map((f: any) => 
        `${f.field.segments.join('.')}${f.op}${f.value}`
    ).join(',');

    const orders = (internalQuery._query.orderBy || []).map((o: any) => 
        `${o.field.segments.join('.')}(${o.dir})`
    ).join(',');

    return `${path}|${filters}|${orders}`;
};


interface FirestoreDataState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export const useFirestoreData = <T extends { id: string }>(query: Query | null): FirestoreDataState<T> => {
  const [state, setState] = useState<FirestoreDataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Genera una chiave stabile che rappresenta la query.
  // L'effetto si riattiverà solo se questa chiave cambia.
  const queryKey = query ? getQueryPath(query) : 'no-query';

  useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    setState(prevState => ({ ...prevState, loading: true, error: null }));

    const unsubscribe = onSnapshot(query, 
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as T));
        setState({ data, loading: false, error: null });
      }, 
      (err) => {
        console.error(`[useFirestoreData] Errore sulla query: ${queryKey}`, err);
        setState({ data: null, loading: false, error: err });
      }
    );

    // La funzione di pulizia che viene eseguita quando il componente si smonta
    // o quando la `queryKey` cambia.
    return () => unsubscribe();

  }, [queryKey]); // L'hook dipende dalla chiave stabile, non dall'oggetto query.

  return state;
};
