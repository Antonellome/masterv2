import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { Chip, Box } from '@mui/material';

const GestioneTipiGiornata = () => {

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12, md: 6 } },
        { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number', required: true, gridProps: { xs: 12, md: 6 } },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
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

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <GestioneAnagrafica
                collectionName="tipiGiornata"
                title="Gestione Tipi Giornata"
                fields={fields}
                columns={columns}
                anagraficaType="tipoGiornata"
            />
        </Box>
    );
};

export default GestioneTipiGiornata;
