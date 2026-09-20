import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';

interface CollectionDataOptions {
  idField?: string;
}

export function useFirestoreCollectionData<T>(query: Query, options?: CollectionDataOptions) {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const result: T[] = snapshot.docs.map((doc) => {
          const docData = doc.data() as T;
          if (options?.idField) {
            return { ...docData, [options.idField]: doc.id };
          }
          return docData;
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
    // Using JSON.stringify for query object is a simplified approach for dependency tracking.
    // For complex scenarios, a more robust serialization or memoization strategy might be needed.
  }, [JSON.stringify(query)]); 

  return [data, loading, error] as const;
}
