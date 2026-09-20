
import { useMemo } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, Switch, Tooltip } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import CustomGridToolbar from '../CustomGridToolbar';

interface TecniciListProps {
    tecnici: Tecnico[];
    ditte: Ditta[];
    categorie: Categoria[];
    onAdd: () => void;
    onEdit: (tecnico: Tecnico) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onStatusChange: (id: string, newStatus: boolean) => void;
    onViewDetails: (id: string) => void;
    isSaving: boolean;
    updatingId: string | null;
}

const TecniciList = ({
    tecnici,
    ditte,
    categorie,
    onAdd,
    onEdit,
    onDelete,
    onStatusChange,
}: TecniciListProps) => {

    const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d.nome])), [ditte]);
    const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c.nome])), [categorie]);

    const columns: GridColDef[] = [
        {
            field: 'attivo',
            headerName: 'Stato',
            width: 80,
            renderCell: (params) => (
                <Tooltip title={params.value ? 'Attivo' : 'Inattivo'}>
                    <Switch
                        checked={params.value}
                        onChange={(e) => onStatusChange(params.row.id, e.target.checked)}
                        color="primary"
                    />
                </Tooltip>
            ),
        },
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
        { field: 'cognome', headerName: 'Cognome', flex: 1, minWidth: 150 },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        { field: 'telefono', headerName: 'Telefono', flex: 1, minWidth: 150 },
        { field: 'codiceFiscale', headerName: 'Codice Fiscale', flex: 1, minWidth: 180 },
        {
            field: 'dittaId',
            headerName: 'Ditta',
            flex: 1,
            minWidth: 180,
            valueGetter: (value, row) => ditteMap.get(row.dittaId) ?? 'N/A',
        },
        {
            field: 'categoriaId',
            headerName: 'Categoria',
            flex: 1,
            minWidth: 150,
            valueGetter: (value, row) => categorieMap.get(row.categoriaId) ?? 'N/A',
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 150,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Modifica"
                    onClick={() => onEdit(params.row as Tecnico)}
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Disattiva"
                    onClick={(e) => onDelete(e, params.id as string)}
                />,
                <GridActionsCellItem
                    icon={<VisibilityIcon />}
                    label="Dettagli"
                    disabled 
                />,
            ],
        },
    ];

    return (
        <Box sx={{ width: '100%', height: 700 }}>
            <DataGrid
                rows={tecnici}
                columns={columns}
                slots={{
                    toolbar: CustomGridToolbar,
                }}
                slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      onAdd: onAdd,
                      addLabel: "Aggiungi Tecnico"
                    },
                }}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                density='compact'
                autoHeight={false}
                localeText={{
                    toolbarColumns: "Colonne",
                    toolbarFilters: "Filtri",
                    toolbarDensity: "Densità",
                    toolbarExport: "Esporta",
                    toolbarQuickFilterPlaceholder: "Cerca..."
                }}
                initialState={{
                    pagination: {
                      paginationModel: { pageSize: 100 },
                    },
                  }}
                  pageSizeOptions={[25, 50, 100]}
            />
        </Box>
    );
};

export default TecniciList;
