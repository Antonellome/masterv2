
import { useEffect, useMemo } from 'react';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { Timestamp } from 'firebase/firestore';

import { useCheckinStore } from '@/store/useCheckinStore';
import { useGlobalStore } from '@/stores/globalStore';
import PresenzeList from '@/components/Presenze/PresenzeList';

const PresenzePage = () => {
    const { checkins, loading: checkinsLoading, error, subscribeToCheckins } = useCheckinStore();
    const { navi, luoghi, loading: anagraficheLoading } = useGlobalStore();

    useEffect(() => {
        const unsubscribe = subscribeToCheckins();
        return () => unsubscribe();
    }, [subscribeToCheckins]);

    const naviMap = useMemo(() => new Map(navi.map(n => [n.id, n])), [navi]);
    const luoghiMap = useMemo(() => new Map(luoghi.map(l => [l.id, l])), [luoghi]);

    const rows = useMemo(() => {
        return checkins.map(evento => {
            // Funzione helper per la conversione sicura dei timestamp
            const toDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : ts;

            return {
                id: evento.id,
                tecnicoName: evento.tecnicoName || 'N/D',
                tipo: evento.tipo,
                luogo: evento.naveId 
                    ? naviMap.get(evento.naveId)?.nome 
                    : (evento.luogoId ? luoghiMap.get(evento.luogoId)?.nome : '--'),
                // Aggiungo ENTRAMBI i timestamp al set di dati per la riga
                timestampReale: toDate(evento.timestampReale),
                timestampImpostato: toDate(evento.timestampImpostato),
            };
        });
    }, [checkins, naviMap, luoghiMap]);

    const isLoading = checkinsLoading || anagraficheLoading;

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
                Registro Presenze Tecnici
            </Typography>
            <PresenzeList rows={rows} loading={isLoading} />
        </Box>
    );
};

export default PresenzePage;
