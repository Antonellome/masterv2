import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import type { Query, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export const useCollectionData = <T extends DocumentData>(q: Query<DocumentData> | null) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setData([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot) => {
          // Rimosso: La conversione dei Timestamp causava errori nei componenti.
          // I componenti si aspettano un Timestamp di Firestore, non un oggetto Date.
          result.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(result);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return { data, loading, error };
};