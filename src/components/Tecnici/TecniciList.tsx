import {
    DataGrid, GridColDef, GridToolbarContainer, GridToolbarColumnsButton, 
    GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, 
    GridColumnVisibilityModel, GridToolbarQuickFilter, GridRenderCellParams
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import type { Tecnico } from '@/models/definitions';
import { Switch, Tooltip, IconButton, Link, Box, Button, Divider, CircularProgress } from '@mui/material';
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

// 1. MODIFICATA LA FIRMA DELLA FUNZIONE
interface TecniciListProps {
    tecnici: Tecnico[];
    ditteMap: Map<string, string>;
    categorieMap: Map<string, string>;
    onViewDetails: (tecnico: Tecnico) => void;
    onStatusChange: (id: string, newStatus: boolean) => void; 
    onEdit: (tecnico: Tecnico) => void;
    onDelete: (event: React.MouseEvent, id: string) => void;
    onAdd: () => void; 
    isSaving?: boolean; // Aggiunto per feedback visivo
}

const TecniciList: React.FC<TecniciListProps> = ({ 
    tecnici, ditteMap, categorieMap, onViewDetails, onStatusChange, onEdit, onDelete, onAdd, isSaving 
}) => {

    const handleExport = (event: React.MouseEvent, tecnico: Tecnico) => {
        event.stopPropagation();
        exportSingleTecnico(tecnico, ditteMap, categorieMap);
    };

    const allColumns: GridColDef[] = [
        // 2. CORRETTO IL PASSAGGIO DEI DATI
        { 
            field: 'attivo', 
            headerName: 'Stato', 
            width: 75, 
            align: 'center', 
            headerAlign: 'center', 
            renderCell: (params) => (
                <Tooltip title={params.value ? 'Attivo' : 'Non Attivo'}>
                    {/* 3. AGGIUNTO IL FEEDBACK DI CARICAMENTO */}
                    <span>
                        <Switch 
                            size="small" 
                            checked={Boolean(params.value)} 
                            onChange={(e) => onStatusChange(params.row.id, e.target.checked)} 
                            onClick={(e) => e.stopPropagation()} 
                            color="primary" 
                            disabled={isSaving} // Disabilita durante il salvataggio
                        />
                         {isSaving && params.row.id === (tecnici.find(t=>t.attivo !== params.row.attivo)?.id) && <CircularProgress size={20} sx={{position: 'absolute', top: '50%', left: '50%', marginTop: '-10px', marginLeft: '-10px'}}/>}
                    </span>
                </Tooltip>
            )
        },
        { field: 'cognome', headerName: 'Cognome', flex: 1, renderCell: (params) => (<Link component="button" variant="body2" onClick={() => onViewDetails(params.row as Tecnico)} sx={{ textAlign: 'left', fontWeight: 'bold' }}>{params.value}</Link>)}, 
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { 
            field: 'dittaId', 
            headerName: 'Ditta', 
            flex: 1, 
            renderCell: (params: GridRenderCellParams<Tecnico, string>) => ditteMap.get(params.value || '') || 'N/A'
        },
        { 
            field: 'categoriaId', 
            headerName: 'Categoria', 
            flex: 1, 
            renderCell: (params: GridRenderCellParams<Tecnico, string>) => categorieMap.get(params.value || '') || 'N/A'
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
                    <Tooltip title="Modifica"><IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(params.row as Tecnico); }} color="primary" disabled={isSaving}><Edit /></IconButton></Tooltip>
                    <Tooltip title="Elimina"><IconButton size="small" onClick={(e) => onDelete(e, params.id as string)} color="default" disabled={isSaving}><Delete /></IconButton></Tooltip>
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
        <Box sx={{ height: '100%', width: '100%' }}>
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
