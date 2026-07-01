import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, getDocs, Query, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

interface UseCollectionDataOptions {
  listen?: boolean;
}

export function useCollectionData<T extends DocumentData>(
  query: Query<DocumentData> | null,
  options: UseCollectionDataOptions = { listen: true }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const snapshot = await getDocs(query);
      const result = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const docData = doc.data() as T;
        return { ...docData, id: doc.id };
      });
      setData(result);
      setError(null);
    } catch (err) {
      console.error("[useCollectionData] Error fetching collection once: ", err);
      setError(err as Error);
    }

    setLoading(false);
  }, [query]);

  useEffect(() => {
    if (!query) {
        setData([]);
        setLoading(false);
        return;
    }

    if (options.listen) {
      setLoading(true);
      const unsubscribe = onSnapshot(
        query,
        (snapshot) => {
          const result = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const docData = doc.data() as T;
            return { ...docData, id: doc.id };
          });
          setData(result);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("[useCollectionData] Error listening to collection: ", err);
          setError(err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      fetchData();
    }
  }, [query, options.listen, fetchData]);

  const refresh = options.listen ? undefined : fetchData;

  return { data, loading, error, refresh };
}
