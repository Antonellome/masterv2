import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Ditta } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { Box, CircularProgress } from '@mui/material';

const GestioneDitte = () => {
    const { ditte, loading } = useData();

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12 } },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
    ];

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <GestioneAnagrafica<Ditta>
                collectionName="ditte"
                title="Gestione Ditte"
                data={ditte}
                loading={loading}
                fields={fields}
                columns={columns}
                anagraficaType="ditta"
            />
        </Box>
    );
};

export default GestioneDitte;
