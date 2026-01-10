import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"; 
import { db } from '@/firebase';
import type { Anagrafica } from '@/models/definitions';

export const useAnagrafiche = () => {
    const [anagrafiche, setAnagrafiche] = useState<Anagrafica[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const anagraficheCollectionRef = collection(db, "anagrafiche");

    const fetchAnagrafiche = async () => {
        try {
            setLoading(true);
            const data = await getDocs(anagraficheCollectionRef);
            const anagraficheData = data.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
            })) as Anagrafica[];
            setAnagrafiche(anagraficheData);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const addAnagrafica = async (anagrafica: Omit<Anagrafica, 'id'>) => {
        try {
            await addDoc(anagraficheCollectionRef, anagrafica);
            fetchAnagrafiche(); // Refresh data
        } catch (err) {
            setError(err as Error);
        }
    };

    const updateAnagrafica = async (id: string, anagrafica: Partial<Anagrafica>) => {
        try {
            const anagraficaDoc = doc(db, "anagrafiche", id);
            await updateDoc(anagraficaDoc, anagrafica);
            fetchAnagrafiche(); // Refresh data
        } catch (err) {
            setError(err as Error);
        }
    };

    useEffect(() => {
        fetchAnagrafiche();
    }, []);

    return { anagrafiche, loading, error, addAnagrafica, updateAnagrafica };
};
