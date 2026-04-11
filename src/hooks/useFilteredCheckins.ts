
import { useState, useMemo } from 'react';
import { CheckinData, FiltriCheckin } from '@/models/definitions';

export const useFilteredCheckins = (checkins: CheckinData[] | null) => {
    const [filtri, setFiltri] = useState<FiltriCheckin>({ 
        ricercaTecnico: '', 
        luoghiSelezionati: [], 
        naviSelezionate: [] 
    });

    const checkinsFiltrati = useMemo(() => {
        if (!checkins) return [];

        const { luoghiSelezionati, naviSelezionate, ricercaTecnico } = filtri;

        let datiFiltrati = checkins;

        // 1. Filtra per ricerca testuale sul nome del tecnico
        if (ricercaTecnico.trim() !== '') {
            const lowerCaseRicerca = ricercaTecnico.toLowerCase();
            datiFiltrati = datiFiltrati.filter(checkin =>
                checkin.tecnico?.nome.toLowerCase().includes(lowerCaseRicerca)
            );
        }

        // 2. Filtra per luoghi e navi selezionate
        const hasLuoghiFilter = luoghiSelezionati.length > 0;
        const hasNaviFilter = naviSelezionate.length > 0;

        if (hasLuoghiFilter || hasNaviFilter) {
            datiFiltrati = datiFiltrati.filter(checkin => {
                const anagraficaId = checkin.anagrafica?.id;
                if (!anagraficaId) return false;

                const isNave = checkin.anagrafica?.tipo === 'nave';
                const isLuogo = checkin.anagrafica?.tipo === 'luogo';

                if (hasLuoghiFilter && hasNaviFilter) {
                    return (isLuogo && luoghiSelezionati.includes(anagraficaId)) || 
                           (isNave && naviSelezionate.includes(anagraficaId));
                }
                if (hasLuoghiFilter) {
                    return isLuogo && luoghiSelezionati.includes(anagraficaId);
                }
                if (hasNaviFilter) {
                    return isNave && naviSelezionate.includes(anagraficaId);
                }

                return false;
            });
        }

        return datiFiltrati;

    }, [checkins, filtri]);

    return { filtri, setFiltri, checkinsFiltrati };
};
