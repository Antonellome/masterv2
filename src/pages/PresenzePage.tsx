
import { useMemo } from 'react';
import { Typography, Box, CircularProgress } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useAnagraficaData } from '@/contexts/DataContext';
import { Timestamp } from 'firebase/firestore';
import PresenzeList from '@/components/Presenze/PresenzeList'; // <-- IMPORTA IL NUOVO COMPONENTE

const PresenzePage = () => {
    // Caricamento dei dati dalle anagrafiche e dagli eventi
    const { naviMap, luoghiMap, loading: anagraficheLoading } = useAnagraficaData();
    const eventi = useLiveQuery(() => db.checkin_giornalieri.toArray(), []);

    const loading = anagraficheLoading || !eventi;

    // Memoizzazione delle righe per ottimizzare le performance
    const rows = useMemo(() => {
        if (!eventi) return [];
        return eventi.map(evento => ({
            id: evento.id,
            tecnicoName: evento.tecnicoName || 'Non specificato',
            tipo: evento.tipo,
            luogo: evento.naveId ? naviMap.get(evento.naveId)?.nome : (evento.luogoId ? luoghiMap.get(evento.luogoId)?.nome : '--'),
            timestampReale: evento.timestampReale,
        }));
    }, [eventi, naviMap, luoghiMap]);

    // Se i dati non sono ancora pronti, mostra un caricamento
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
                Registro Presenze Tecnici
            </Typography>
            {/* Renderizza il componente di presentazione passando i dati */}
            <PresenzeList rows={rows} loading={loading} />
        </Box>
    );
};

export default PresenzePage;
