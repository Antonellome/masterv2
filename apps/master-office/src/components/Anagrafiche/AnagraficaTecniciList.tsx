import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, CircularProgress, Paper, Typography } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { Tecnico, Categoria, Ditta } from '@/models/definitions';

interface AnagraficaTecniciListProps {
    tecnici: Tecnico[];
    onEdit: (tecnico: Tecnico) => void;
    onDelete: (id: string) => void;
}

const AnagraficaTecniciList: React.FC<AnagraficaTecniciListProps> = ({ tecnici, onEdit, onDelete }) => {

    const categorieQuery = useMemo(() => collection(db, 'categorie'), []);
    const { data: categorie, loading: loadingCategorie } = useCollectionData<Categoria>(categorieQuery);

    const ditteQuery = useMemo(() => collection(db, 'ditte'), []);
    const { data: ditte, loading: loadingDitte } = useCollectionData<Ditta>(ditteQuery);

    const categorieMap = useMemo(() => new Map(categorie?.map(c => [c.id, c.nome])), [categorie]);
    const ditteMap = useMemo(() => new Map(ditte?.map(d => [d.id, d.nome])), [ditte]);

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'cognome', headerName: 'Cognome', flex: 1 },
        {
            field: 'categoriaId',
            headerName: 'Categoria',
            flex: 1,
            valueGetter: (params) => categorieMap.get(params.row.categoriaId) || 'N/A',
        },
        {
            field: 'dittaId',
            headerName: 'Ditta',
            flex: 1,
            valueGetter: (params) => ditteMap.get(params.row.dittaId) || 'N/A',
        },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        { field: 'telefono', headerName: 'Telefono', flex: 1 },
        {
            field: 'attivo',
            headerName: 'Stato',
            width: 100,
            type: 'boolean'
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 120,
            cellClassName: 'actions',
            getActions: ({ row }) => [
                <GridActionsCellItem
                    key={`edit-${row.id}`}
                    icon={<Edit />}
                    label="Modifica"
                    onClick={() => onEdit(row as Tecnico)}
                    color="primary"
                />,
                <GridActionsCellItem
                    key={`delete-${row.id}`}
                    icon={<Delete />}
                    label="Elimina"
                    onClick={() => onDelete(row.id as string)}
                    color="error"
                />,
            ],
        },
    ];

    const loading = loadingCategorie || loadingDitte;

    return (
        <Paper sx={{ p: 2, height: 'auto', minHeight: 600, width: '100%' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Elenco Tecnici</Typography>
            </Box>
            {loading && <CircularProgress />}
            {!loading && (
                <Box sx={{ height: 500, width: '100%' }}>
                    <DataGrid
                        rows={tecnici || []}
                        columns={columns}
                        autoHeight
                        rowHeight={48}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        loading={loading}
                    />
                </Box>
            )}
        </Paper>
    );
};

export default AnagraficaTecniciList;
