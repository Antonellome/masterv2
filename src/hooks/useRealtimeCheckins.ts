
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { CheckinData, Anagrafica } from '@/models/definitions';
import { useData } from './useData';
import { Dayjs } from 'dayjs';

// Definiamo un'interfaccia interna che estende Anagrafica con il campo 'tipo'
interface AnagraficaConTipo extends Anagrafica {
  tipo: 'nave' | 'luogo';
}

export const useRealtimeCheckins = (date: Dayjs | null) => {
    const [checkins, setCheckins] = useState<CheckinData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { tecnici, luoghi, navi, loading: anagraficheLoading } = useData();

    useEffect(() => {
        if (!date || anagraficheLoading) {
            setLoading(true);
            setCheckins([]);
            return;
        }

        setLoading(true);

        const startOfDay = date.startOf('day').toDate();
        const endOfDay = date.endOf('day').toDate();

        const q = query(
            collection(db, 'checkin_giornalieri'),
            where('data', '>=', Timestamp.fromDate(startOfDay)),
            where('data', '<=', Timestamp.fromDate(endOfDay))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Creiamo una mappa unificata per navi e luoghi, iniettando il campo 'tipo'
            const anagraficheMap = new Map<string, AnagraficaConTipo>();
            luoghi.forEach(l => anagraficheMap.set(l.id, { ...l, tipo: 'luogo' }));
            navi.forEach(n => anagraficheMap.set(n.id, { ...n, tipo: 'nave' }));

            const tecniciMap = new Map(tecnici.map(t => [t.id, t]));

            const checkinsData = snapshot.docs.map(doc => {
                const data = doc.data();
                const anagrafica = anagraficheMap.get(data.anagraficaId);

                // Se l'anagrafica non esiste nella mappa, il check-in viene scartato
                if (!anagrafica) {
                    return null;
                }

                return {
                    id: doc.id,
                    ...data,
                    data: data.data as Timestamp,
                    tecnico: tecniciMap.get(data.tecnicoId),
                    // L'oggetto anagrafica ora contiene il campo 'tipo'
                    anagrafica: anagrafica,
                } as CheckinData;
            }).filter((c): c is CheckinData => c !== null); // Filtra i risultati nulli

            setCheckins(checkinsData);
            setLoading(false);
        }, (err) => {
            console.error("Errore nel caricamento dei check-in in tempo reale: ", err);
            setError("Impossibile caricare i dati dei check-in.");
            setLoading(false);
        });

        // Cleanup listener on component unmount or date change
        return () => unsubscribe();

    }, [date, tecnici, luoghi, navi, anagraficheLoading]);

    return { checkins, loading, error };
};
