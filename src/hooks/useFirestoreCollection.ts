import { useState, useEffect } from 'react';
import { onSnapshot, Query } from 'firebase/firestore';

export function useFirestoreCollection(query: Query) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(query, 
      (snapshot) => {
        setSnapshot(snapshot);
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [query]);

  return [snapshot, loading, error];
}