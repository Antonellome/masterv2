
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, documentId, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Checkin, CheckinData, Tecnico, Anagrafica, FiltriCheckin } from '@/models/definitions';

interface RawCheckinDocument {
    id: string;
    tecnicoId?: string;
    luogoId?: string;
    naveId?: string;
    timestamp: Timestamp;
}

const initialState: FiltriCheckin = {
    ricercaTecnico: '',
    luoghiSelezionati: [],
    naviSelezionate: [],
};

export const useCheckinData = (formattedDate: string) => {
    const [allCheckins, setAllCheckins] = useState<CheckinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [filtri, setFiltri] = useState<FiltriCheckin>(initialState);

    useEffect(() => {
        setAllCheckins([]);
        setFiltri(initialState);
        
        if (!formattedDate) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const startId = formattedDate;
        const endId = formattedDate + '\uf8ff';

        const q = query(
            collection(db, 'checkin_giornalieri'),
            where(documentId(), '>=', startId),
            where(documentId(), '<=', endId)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;
            setLoading(true);
            try {
                if (snapshot.empty) {
                    setAllCheckins([]);
                    setLoading(false);
                    return;
                }

                const rawCheckins = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<RawCheckinDocument, 'id'>) }));

                const tecnicoIdSet = new Set<string>();
                const anagraficaIdSet = new Set<string>();

                for (const checkin of rawCheckins) {
                    if (typeof checkin.tecnicoId === 'string' && checkin.tecnicoId.trim() !== '') {
                        tecnicoIdSet.add(checkin.tecnicoId);
                    }
                    if (typeof checkin.luogoId === 'string' && checkin.luogoId.trim() !== '') {
                        anagraficaIdSet.add(checkin.luogoId);
                    }
                    if (typeof checkin.naveId === 'string' && checkin.naveId.trim() !== '') {
                        anagraficaIdSet.add(checkin.naveId);
                    }
                }

                const tecnicoIds = Array.from(tecnicoIdSet);
                const anagraficaIds = Array.from(anagraficaIdSet);

                const [tecniciSnap, luoghiSnap, naviSnap] = await Promise.all([
                    tecnicoIds.length > 0 ? getDocs(query(collection(db, 'tecnici'), where(documentId(), 'in', tecnicoIds))) : Promise.resolve({ docs: [] }),
                    anagraficaIds.length > 0 ? getDocs(query(collection(db, 'luoghi'), where(documentId(), 'in', anagraficaIds))) : Promise.resolve({ docs: [] }),
                    anagraficaIds.length > 0 ? getDocs(query(collection(db, 'navi'), where(documentId(), 'in', anagraficaIds))) : Promise.resolve({ docs: [] }),
                ]);

                const tecniciMap = new Map(tecniciSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Tecnico]));
                const luoghiMap = new Map(luoghiSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data(), tipo: 'luogo' as const } as Anagrafica]));
                const naviMap = new Map(naviSnap.docs.map(doc => [doc.id, { id: doc.id, ...doc.data(), tipo: 'nave' as const } as Anagrafica]));

                // **Logica di business finale: Un documento grezzo può generare più eventi.**
                const finalCheckins: CheckinData[] = [];

                for (const raw of rawCheckins) {
                    const tecnico = tecniciMap.get(raw.tecnicoId);
                    if (!tecnico) continue; // Un evento senza tecnico non è valido

                    // Controlla l'evento LUOGO
                    if (raw.luogoId) {
                        const luogo = luoghiMap.get(raw.luogoId);
                        if (luogo) {
                            finalCheckins.push({
                                id: `${raw.id}_luogo`,
                                data: raw.timestamp,
                                tecnicoId: raw.tecnicoId,
                                anagraficaId: luogo.id,
                                tecnico: tecnico,
                                anagrafica: luogo
                            });
                        }
                    }

                    // Controlla l'evento NAVE
                    if (raw.naveId) {
                        const nave = naviMap.get(raw.naveId);
                        if (nave) {
                            finalCheckins.push({
                                id: `${raw.id}_nave`,
                                data: raw.timestamp,
                                tecnicoId: raw.tecnicoId,
                                anagraficaId: nave.id,
                                tecnico: tecnico,
                                anagrafica: nave
                            });
                        }
                    }
                }

                setAllCheckins(finalCheckins);

            } catch (e: any) {
                console.error("Errore in useCheckinData > onSnapshot:", e);
                setError(e);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            console.error("Errore critico in useCheckinData > onSnapshot:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [formattedDate]);

    const filteredCheckins = useMemo(() => {
         const { ricercaTecnico, luoghiSelezionati, naviSelezionate } = filtri;
        if (!ricercaTecnico && luoghiSelezionati.length === 0 && naviSelezionate.length === 0) {
            return allCheckins;
        }

        return allCheckins.filter(checkin => {
            const tecnicoMatch = !ricercaTecnico || (checkin.tecnico && checkin.tecnico.id === ricercaTecnico);
            
            const anagrafica = checkin.anagrafica;
            if (!anagrafica) return false; // Se non c'è anagrafica, non può matchare i filtri

            const noAnagraficaFilters = luoghiSelezionati.length === 0 && naviSelezionate.length === 0;

            if (ricercaTecnico && noAnagraficaFilters) return tecnicoMatch;

            let anagraficaMatch = false;
            if (!noAnagraficaFilters) {
                 const isLuogoMatch = anagrafica.tipo === 'luogo' && luoghiSelezionati.includes(anagrafica.id);
                 const isNaveMatch = anagrafica.tipo === 'nave' && naviSelezionate.includes(anagrafica.id);
                 anagraficaMatch = isLuogoMatch || isNaveMatch;
            }

            if (ricercaTecnico && !noAnagraficaFilters) {
                return tecnicoMatch && anagraficaMatch;
            }
            
            return anagraficaMatch;
        });
    }, [allCheckins, filtri]);

    return { filteredCheckins, loading, error, filtri, setFiltri };
};
