
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    tecnicoConverter,
    veicoloConverter,
    naveConverter,
    luogoConverter,
    tipoGiornataConverter
} from '@/utils/converters';
import type { Tecnico, Veicolo, Nave, Luogo, TipoGiornata } from '@/models/definitions';

export interface MasterData {
    tecnici: Tecnico[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
}

export const useRapportinoMasterData = () => {
    const [masterData, setMasterData] = useState<MasterData>({
        tecnici: [],
        veicoli: [],
        navi: [],
        luoghi: [],
        tipiGiornata: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Filtra e ordina dove necessario
                const qTecnici = query(collection(db, 'tecnici'), where('attivo', '==', true), orderBy('cognome'), orderBy('nome'));
                const qVeicoli = query(collection(db, 'veicoli'), orderBy('targa'));
                const qNavi = query(collection(db, 'navi'), orderBy('nome'));
                const qLuoghi = query(collection(db, 'luoghi'), orderBy('nome'));
                const qTipiGiornata = query(collection(db, 'tipiGiornata'), orderBy('ordine'));

                const [
                    tecniciSnap,
                    veicoliSnap,
                    naviSnap,
                    luoghiSnap,
                    tipiGiornataSnap
                ] = await Promise.all([
                    getDocs(qTecnici.withConverter(tecnicoConverter)),
                    getDocs(qVeicoli.withConverter(veicoloConverter)),
                    getDocs(qNavi.withConverter(naveConverter)),
                    getDocs(qLuoghi.withConverter(luogoConverter)),
                    getDocs(qTipiGiornata.withConverter(tipoGiornataConverter)),
                ]);

                const data: MasterData = {
                    tecnici: tecniciSnap.docs.map(doc => doc.data()),
                    veicoli: veicoliSnap.docs.map(doc => doc.data()),
                    navi: naviSnap.docs.map(doc => doc.data()),
                    luoghi: luoghiSnap.docs.map(doc => doc.data()),
                    tipiGiornata: tipiGiornataSnap.docs.map(doc => doc.data()),
                };

                setMasterData(data);
                setError(null);
            } catch (err: unknown) {
                console.error("Errore durante il caricamento dei dati master:", err);
                const errorMessage = err instanceof Error ? err : new Error('Errore sconosciuto');
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { masterData, loading, error };
};
