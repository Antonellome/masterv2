import { useState } from 'react';
import { DataGrid, GridActionsCellItem, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Box, CircularProgress, Alert } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { BaseEntity } from '@/models/definitions';

// Rimossa dipendenza da useData, il componente è ora agnostico rispetto alla fonte dei dati.

interface ListaGestibileProps<T extends BaseEntity> {
    items?: T[];
    columns: GridColDef[];
    loading: boolean;
    error: { message: string } | null;
    onEdit: (id: string, data: Partial<T>) => void;
    onDelete: (id: string) => void;
    onAdd: (data: Partial<T>) => void;
    FormComponent: React.ElementType;
}

function ListaGestibile<T extends BaseEntity>({
    items = [],
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

    // La chiamata a useData() è stata rimossa. Questo componente non ha più bisogno di conoscere l'intero stato dei dati.

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
                    // Rimosso il passaggio di props non necessarie. Il FormComponent
                    // ora recupera i dati ausiliari (es. ditte, categorie)
                    // direttamente da useGlobalStore.
                />
            )}
        </>
    );
}

export default ListaGestibile;
