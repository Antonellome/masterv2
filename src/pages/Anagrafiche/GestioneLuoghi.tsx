import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { useMemo } from 'react';
import { Box, CircularProgress } from '@mui/material';

const GestioneLuoghi = () => {
    const { clienti, loading: loadingClienti } = useData();

    const clientiMap = useMemo(() => {
        if (!clienti) return new Map();
        return new Map(clienti.map(c => [c.id, c.nome]));
    }, [clienti]);

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12 } },
        {
            name: 'clienteId',
            label: 'Cliente',
            type: 'select',
            gridProps: { xs: 12 },
            options: {
                collectionName: 'clienti',
                labelField: 'nome',
                valueField: 'id'
            }
        },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'clienteId',
            headerName: 'Cliente',
            flex: 1,
            minWidth: 150,
            editable: true,
        },
    ];

    if (loadingClienti) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    return (
        <GestioneAnagrafica
            collectionName="luoghi"
            title="Gestione Luoghi"
            fields={fields}
            columns={columns}
            anagraficaType="luogo"
            lookupMaps={{ clienteId: clientiMap }}
        />
    );
};

export default GestioneLuoghi;
