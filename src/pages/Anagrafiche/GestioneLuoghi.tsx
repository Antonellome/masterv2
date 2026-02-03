import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Luogo } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { useMemo } from 'react';

const GestioneLuoghi = () => {
    const { clienti } = useData();

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
            type: 'singleSelect',
            valueOptions: Array.from(clientiMap.entries()).map(([value, label]) => ({ value, label }))
        },
    ];

    return (
        <GestioneAnagrafica<Luogo>
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
