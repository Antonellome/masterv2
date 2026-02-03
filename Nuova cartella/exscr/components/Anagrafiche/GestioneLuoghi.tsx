import { useMemo } from 'react';
import { useData } from '@/hooks/useData';
import type { Luogo } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';
import { Box, CircularProgress } from '@mui/material';

const GestioneLuoghi: React.FC = () => {
    const { clienti, loading: dataLoading } = useData();

    // Mostra un caricamento se i dati globali (specialmente i clienti) non sono ancora pronti.
    if (dataLoading || clienti.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    const clientiMap = useMemo(() => {
        const map = new Map<string, string>();
        clienti.forEach(c => map.set(c.id, c.nome));
        return map;
    }, [clienti]);

    const luoghiFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
        {
            name: 'clienteId',
            label: 'Cliente',
            type: 'select',
            options: clienti.map(c => ({ value: c.id, label: c.nome }))
        }
    ];

    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'indirizzo', headerName: 'Indirizzo', flex: 1, editable: true },
        {
            field: 'clienteId',
            headerName: 'Cliente',
            flex: 1,
            editable: true,
        },
    ];

    return (
        <GestioneAnagrafica<Luogo>
            collectionName="luoghi"
            title="Luoghi"
            anagraficaType="luogo"
            fields={luoghiFields}
            columns={columns}
            lookupMaps={{ clienteId: clientiMap }}
        />
    );
};

export default GestioneLuoghi;
