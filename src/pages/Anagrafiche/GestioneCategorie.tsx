import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Categoria } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { Box, CircularProgress } from '@mui/material';

const GestioneCategorie = () => {
    const { categorie, loading } = useData();

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
            <GestioneAnagrafica<Categoria>
                collectionName="categorie"
                title="Gestione Categorie"
                data={categorie}
                loading={loading}
                fields={fields}
                columns={columns}
                anagraficaType="categoria"
            />
        </Box>
    );
};

export default GestioneCategorie;
