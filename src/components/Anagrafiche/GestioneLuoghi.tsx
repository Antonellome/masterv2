import { useMemo } from 'react';
import { useData } from '@/hooks/useData';
import type { Luogo } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';
import { Box, CircularProgress } from '@mui/material';

const GestioneLuoghi: React.FC = () => {
    // 1. Chiamata agli Hook: Tutti gli hook vengono eseguiti per primi.
    const { clienti, loading: dataLoading } = useData();

    // L'hook useMemo ora è chiamato incondizionatamente al livello superiore.
    const clientiMap = useMemo(() => {
        const map = new Map<string, string>();
        clienti.forEach(c => map.set(c.id, c.nome));
        return map;
    }, [clienti]);

    // 2. Gestione dello stato di caricamento: Avviene dopo le chiamate agli hook.
    if (dataLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress />
        </Box>;
    }

    // 3. Render del componente: Le definizioni avvengono dopo il caricamento.
    const luoghiFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
        {
            name: 'clienteId', 
            label: 'Cliente', 
            type: 'select',
            // Passiamo le opzioni direttamente al FormDialog, usando i dati già caricati.
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
            // Bonus: Utilizziamo un valueFormatter per mostrare il nome del cliente invece dell'ID.
            valueFormatter: (value: string) => clientiMap.get(value) || value,
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
