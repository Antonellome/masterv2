import {
    DataGrid, GridColDef, GridToolbarContainer, GridToolbarColumnsButton, 
    GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, 
    GridColumnVisibilityModel, GridToolbarQuickFilter, GridRenderCellParams
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import type { Tecnico } from '@/models/definitions';
import { Switch, Tooltip, IconButton, Link, Box, Button, Divider } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Add from '@mui/icons-material/Add';
import Print from '@mui/icons-material/Print';
import { TECNICI_SCADENZE_FIELDS } from '@/utils/scadenze';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { exportSingleTecnico } from '@/utils/exportUtils';

function CustomToolbar({ onAdd }: { onAdd: () => void }) {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button color="primary" startIcon={<Add />} onClick={onAdd}>Aggiungi Tecnico</Button>
            <Box sx={{ flex: 1 }} />
            <GridToolbarQuickFilter sx={{ minWidth: 240, mr: 1 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

interface TecniciListProps {
    tecnici: Tecnico[];
    ditteMap: Map<string, string>;
    categorieMap: Map<string, string>;
    onViewDetails: (tecnico: Tecnico) => void;
    onStatusChange: (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => void;
    onSyncChange: (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => void;
    onEdit: (tecnico: Tecnico) => void;
    onDelete: (event: React.MouseEvent, id: string) => void;
    onAdd: () => void; 
}

const TecniciList: React.FC<TecniciListProps> = ({ tecnici, ditteMap, categorieMap, onViewDetails, onStatusChange, onSyncChange, onEdit, onDelete, onAdd }) => {

    const handleExport = (event: React.MouseEvent, tecnico: Tecnico) => {
        event.stopPropagation(); // Evita che altri click vengano triggerati
        exportSingleTecnico(tecnico, ditteMap, categorieMap);
    };

    const allColumns: GridColDef[] = [
        { field: 'attivo', headerName: 'Stato', width: 65, align: 'center', headerAlign: 'center', renderCell: (params) => (<Tooltip title={params.value ? 'Attivo' : 'Non Attivo'}><Switch size="small" checked={Boolean(params.value)} onChange={(e) => onStatusChange(e, params.row as Tecnico)} onClick={(e) => e.stopPropagation()} color="primary"/></Tooltip>)},
        { field: 'sincronizzazioneAttiva', headerName: 'Sync', width: 55, align: 'center', headerAlign: 'center', renderCell: (params) => { const hasEmail = !!params.row.email; const tooltipText = !hasEmail ? "Email mancante" : params.value ? "Sync attiva" : "Sync non attiva"; return (<Tooltip title={tooltipText}><span><Switch size="small" checked={Boolean(params.value)} onChange={(e) => onSyncChange(e, params.row as Tecnico)} onClick={(e) => e.stopPropagation()} disabled={!hasEmail} color="secondary"/></span></Tooltip>);}},
        { field: 'cognome', headerName: 'Cognome', flex: 1, renderCell: (params) => (<Link component="button" variant="body2" onClick={() => onViewDetails(params.row as Tecnico)} sx={{ textAlign: 'left', fontWeight: 'bold' }}>{params.value}</Link>)}, 
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { 
            field: 'dittaId', 
            headerName: 'Ditta', 
            flex: 1, 
            renderCell: (params: GridRenderCellParams<any, string>) => ditteMap.get(params.value || '') || 'N/A'
        },
        { 
            field: 'categoriaId', 
            headerName: 'Categoria', 
            flex: 1, 
            renderCell: (params: GridRenderCellParams<any, string>) => categorieMap.get(params.value || '') || 'N/A'
        },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { field: 'telefono', headerName: 'Telefono', flex: 1 },
        
        ...TECNICI_SCADENZE_FIELDS.map(field => ({
            field: field.key,
            headerName: field.label,
            flex: 1,
            align: 'center' as const,
            headerAlign: 'center' as const,
            renderCell: (params: GridRenderCellParams<Timestamp | string | undefined>) => {
                const { value } = params;
                if (value == null) return 'N/D';
                if (value instanceof Timestamp) {
                    return dayjs(value.toDate()).format('DD/MM/YYYY');
                }
                if (typeof value === 'string' && dayjs(value).isValid()){
                    return dayjs(value).format('DD/MM/YYYY');
                }
                if (typeof value === 'object' && 'seconds' in value) {
                    return dayjs((value as Timestamp).toDate()).format('DD/MM/YYYY');
                }
                return 'N/D';
            },
        })),
        { field: 'actions', headerName: 'Azioni', width: 110, align: 'center', headerAlign: 'center', sortable: false, filterable: false, disableColumnMenu: true, 
            renderCell: (params) => (
                <Box>
                    <Tooltip title="Esporta/Stampa"><IconButton size="small" onClick={(e) => handleExport(e, params.row as Tecnico)} color="default"><Print /></IconButton></Tooltip>
                    <Tooltip title="Modifica"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(params.row as Tecnico); }} color="primary"><Edit /></IconButton></Tooltip>
                    <Tooltip title="Elimina"><IconButton size="small" onClick={(e) => onDelete(e, params.id as string)} color="default"><Delete /></IconButton></Tooltip>
                </Box>
            ) 
        }
    ];

    const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({ 
        email: false,
        telefono: false,
        ...TECNICI_SCADENZE_FIELDS.reduce((acc, field) => ({
            ...acc, 
           [field.key]: ![
               'scadenzaContratto', 
               'scadenzaVisita', 
               'scadenzaPatente',
           ].includes(field.key)
       }), {}),
    });

    return (
        <Box sx={{ height: '75vh', width: '100%' }}>
            <DataGrid
                rows={tecnici || []}
                columns={allColumns}
                sx={{ width: '100%', '& .MuiDataGrid-cell': { py: 0.5 }, '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' } }}
                localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                columnVisibilityModel={columnVisibilityModel}
                onColumnVisibilityModelChange={(newModel) => setColumnVisibilityModel(newModel)}
                density="compact"
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 100 } } }}
                pageSizeOptions={[25, 50, 100]}
                slots={{ toolbar: () => <CustomToolbar onAdd={onAdd} /> }}
                disableRowSelectionOnClick
            />
        </Box>
    );
};

export default TecniciList;
