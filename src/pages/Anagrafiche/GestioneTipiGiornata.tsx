import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, TipoGiornata } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { Chip } from '@mui/material';

const fields: FormField[] = [
    { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { size: { xs: 12, md: 6 } } },
    { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number', required: true, gridProps: { size: { xs: 12, md: 6 } } },
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

const GestioneTipiGiornata = () => {

    return (
        <GestioneAnagrafica<TipoGiornata>
            collectionName="tipiGiornata"
            title="Gestione Tipi Giornata"
            fields={fields}
            columns={columns}
            anagraficaType="tipoGiornata"
        />
    );
};

export default GestioneTipiGiornata;
