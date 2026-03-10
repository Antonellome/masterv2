import { useMemo } from 'react';
import { useData } from '@/hooks/useData';
import type { Nave } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';
import { Box, CircularProgress } from '@mui/material';

const GestioneNavi: React.FC = () => {
    const { clienti, loading: dataLoading } = useData();

    const clientiMap = useMemo(() => {
        const map = new Map<string, string>();
        clienti.forEach(c => map.set(c.id, c.nome));
        return map;
    }, [clienti]);

    if (dataLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    const naviFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12, md: 6 } },
        { name: 'matricola', label: 'Matricola', type: 'text', gridProps: { xs: 12, md: 6 } },
        {
            name: 'clienteId',
            label: 'Cliente',
            type: 'select',
            required: true,
            options: clienti.map(c => ({ value: c.id, label: c.nome })),
            gridProps: { xs: 12 }
        },
    ];

    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'matricola', headerName: 'Matricola', flex: 1, editable: true },
        {
            field: 'clienteId',
            headerName: 'Cliente',
            flex: 1,
            editable: true,
            type: 'singleSelect',
            valueOptions: clienti.map(c => ({ value: c.id, label: c.nome })),
            valueFormatter: (value: string) => clientiMap.get(value) || value,
        },
    ];

    return (
        <GestioneAnagrafica<Nave>
            collectionName="navi"
            title="Navi"
            anagraficaType="nave"
            fields={naviFields}
            columns={columns}
            lookupMaps={{ clienteId: clientiMap }}
            initialSortModel={[{ field: 'nome', sort: 'asc' }]}
        />
    );
};

export default GestioneNavi;
