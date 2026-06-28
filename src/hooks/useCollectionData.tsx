import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// Funzione helper per creare una chiave stabile dalla query, come trovato in useFirestoreData
const getQueryKey = (q: Query): string => {
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


export const useCollectionData = <T extends DocumentData>(q: Query<DocumentData> | null) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Usa la chiave stabile della query come dipendenza dell'effetto
  const queryKey = q ? getQueryKey(q) : 'no-query';

  useEffect(() => {
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot) => {
          result.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(result);
        setLoading(false);
      },
      (err) => {
        console.error(`[useCollectionData] Errore sulla query: ${queryKey}`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryKey]); // CORRETTO: La dipendenza è ora sulla chiave stabile, non sull'oggetto query

  return { data, loading, error };
};