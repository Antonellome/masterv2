import { useState } from 'react';
import { DataGrid, GridActionsCellItem, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { BaseEntity } from '@/models/definitions';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE

interface ListaGestibileProps<T extends BaseEntity> {
    items?: T[]; // La prop è opzionale
    columns: GridColDef[];
    loading: boolean;
    error: { message: string } | null;
    onEdit: (id: string, data: Partial<T>) => void;
    onDelete: (id: string) => void;
    onAdd: (data: Partial<T>) => void;
    FormComponent: React.ElementType;
    collectionName: string;

}

function ListaGestibile<T extends BaseEntity>({
    items = [], // Valore di default per la prop items
    columns,
    loading,
    error,
    onEdit,
    onDelete,
    onAdd,
    FormComponent,

}: ListaGestibileProps<T>) {
    const [isFormOpen, setFormOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<T | null>(null);
    const { ...dataContext } = useData();

    const internalHandleOpenForm = (item: T | null = null) => {
        setItemToEdit(item);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setItemToEdit(null);
    };

    const handleSave = async (formData: Partial<T>) => {
        if (itemToEdit) {
            await onEdit(itemToEdit.id, formData);
        } else {
            await onAdd(formData);
        }
        handleCloseForm();
    };

    const defaultColumns: GridColDef[] = [
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            getActions: (params: GridRenderCellParams) => [
                <GridActionsCellItem
                    key={`edit-${params.id}`}
                    icon={<Edit />}
                    label="Modifica"
                    onClick={() => internalHandleOpenForm(params.row as T)}
                />,
                <GridActionsCellItem
                    key={`delete-${params.id}`}
                    icon={<Delete />}
                    label="Elimina"
                    onClick={async () => {
                        await onDelete(params.id as string);
                    }}
                    color="error"
                />,
            ],
        },
    ];

    const allColumns = [...columns, ...defaultColumns];

    return (
        <>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error.message}</Alert>}
            
            {!loading && !error && (
                <Box sx={{ height: 400, width: '100%' }}>
                    <DataGrid
                        rows={items}
                        columns={allColumns}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 5 } },
                        }}
                        pageSizeOptions={[5, 10, 20]}
                        checkboxSelection
                        disableRowSelectionOnClick
                    />
                </Box>
            )}

            {isFormOpen && (
                <FormComponent
                    open={isFormOpen}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    initialData={itemToEdit}
                    // Passiamo tutti i dati necessari dal contesto al form
                    ditte={dataContext.ditte}
                    clienti={dataContext.clienti}
                    categorie={dataotec.categorie}
                />
            )}
        </>
    );
}

export default ListaGestibile;
