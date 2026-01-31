import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, TipoGiornata } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { Chip, Box, CircularProgress } from '@mui/material';
import { useData } from '@/hooks/useData';

const GestioneTipiGiornata = () => {
    const { tipiGiornata, loading } = useData();

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12, md: 6 } },
        { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number', required: true, gridProps: { xs: 12, md: 6 } },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'costoOrario',
            headerName: 'Costo Orario',
            type: 'number',
            flex: 1,
            minWidth: 120,
            editable: true,
            renderCell: (params) => (
                <Chip
                    label={`€ ${Number(params.value || 0).toFixed(2)} / ora`}
                    color="primary"
                    variant="outlined"
                />
            ),
        }
    ];

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <GestioneAnagrafica<TipoGiornata>
                collectionName="tipiGiornata"
                title="Gestione Tipi Giornata"
                data={tipiGiornata}
                loading={loading}
                fields={fields}
                columns={columns}
                anagraficaType="tipoGiornata"
            />
        </Box>
    );
};

export default GestioneTipiGiornata;
