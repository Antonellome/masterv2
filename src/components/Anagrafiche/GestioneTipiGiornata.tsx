
import GestioneAnagrafica from './GestioneAnagrafica';
import type { TipoGiornata } from '@/models/definitions';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box } from '@mui/material';

const GestioneTipiGiornata: React.FC = () => {

    const tipiGiornataFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'colore', label: 'Colore', type: 'color', required: true },
        { name: 'costoOrario', label: 'Costo Orario (€)', type: 'number' },
    ];

    const columns: GridColDef<TipoGiornata>[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        {
            field: 'colore',
            headerName: 'Colore',
            width: 150,
            renderCell: (params: GridRenderCellParams<any, string>) => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        backgroundColor: params.value, 
                        border: '1px solid #ccc', 
                        mr: 1 
                    }} />
                    {params.value}
                </Box>
            )
        },
        {
            field: 'costoOrario',
            headerName: 'Costo Orario',
            flex: 1,
            editable: true,
            type: 'number',
            valueFormatter: (value: number | undefined) => value != null ? `€ ${value}` : ''
        },
    ];

    return (
        <GestioneAnagrafica<TipoGiornata>
            collectionName="tipiGiornata"
            anagraficaType="tipiGiornata"
            title="Tipi Giornata"
            fields={tipiGiornataFields}
            columns={columns}
            initialSortModel={[{ field: 'nome', sort: 'asc' }]}
        />
    );
};

export default GestioneTipiGiornata;
