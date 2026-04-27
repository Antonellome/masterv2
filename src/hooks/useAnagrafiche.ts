
// src/hooks/useAnagrafiche.ts
import { useFirestoreData } from './useFirestoreData';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import type { Tecnico, Nave, Luogo } from '../models/definitions';
import { useMemo } from 'react';

export const useAnagrafiche = () => {
    const { data: tecnici, loading: lTecnici, error: eTecnici } = useFirestoreData<Tecnico>(collection(db, 'tecnici'));
    const { data: navi, loading: lNavi, error: eNavi } = useFirestoreData<Nave>(collection(db, 'navi'));
    const { data: luoghi, loading: lLuoghi, error: eLuoghi } = useFirestoreData<Luogo>(collection(db, 'luoghi'));

    const loading = lTecnici || lNavi || lLuoghi;
    const error = eTecnici || eNavi || eLuoghi;

    const anagrafiche = useMemo(() => ({
        tecnici,
        navi,
        luoghi
    }), [tecnici, navi, luoghi]);

    return { ...anagrafiche, loading, error };
};
