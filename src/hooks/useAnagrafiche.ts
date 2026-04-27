
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Anagrafica } from '@/models/definitions';

interface AnagraficheData {
    tecnici: Tecnico[];
    luoghi: Anagrafica[];
    navi: Anagrafica[];
    loading: boolean;
    error: Error | null;
}

export const useAnagrafiche = (): AnagraficheData => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [luoghi, setLuoghi] = useState<Anagrafica[]>([]);
    const [navi, setNavi] = useState<Anagrafica[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchAnagrafiche = async () => {
            setLoading(true);
            try {
                const [tecniciSnap, luoghiSnap, naviSnap] = await Promise.all([
                    getDocs(query(collection(db, 'tecnici'), orderBy('nome'))),
                    getDocs(query(collection(db, 'luoghi'), orderBy('nome'))),
                    getDocs(query(collection(db, 'navi'), orderBy('nome')))
                ]);

                const tecniciData = tecniciSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
                const luoghiData = luoghiSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'luogo' as const } as Anagrafica));
                const naviData = naviSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: 'nave' as const } as Anagrafica));

                setTecnici(tecniciData);
                setLuoghi(luoghiData);
                setNavi(naviData);

            } catch (e: any) {
                console.error("Errore durante il caricamento delle anagrafiche:", e);
                setError(e);
            } finally {
                setLoading(false);
            }
        };

        fetchAnagrafiche();
    }, []);

    return { tecnici, luoghi, navi, loading, error };
};
