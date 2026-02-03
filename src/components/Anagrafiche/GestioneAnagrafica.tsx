import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, writeBatch, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Box, Typography, IconButton, Button, CircularProgress, Snackbar, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel, GridToolbar, GridRenderCellParams, GridRowModel, GridPaginationModel } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import FormDialog from './FormDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import type { FormField, Anagrafica } from '@/models/definitions';

interface GestioneAnagraficaProps<T extends Anagrafica> {
    collectionName: string;
    title: string;
    fields: FormField[];
    columns: GridColDef<T>[];
    initialFormState?: Partial<T>;
    anagraficaType: string;
    lookupMaps?: { [key: string]: Map<string, string> };
    initialSortModel?: { field: string; sort: 'asc' | 'desc' }[];
}

function GestioneAnagrafica<T extends Anagrafica>({ 
    collectionName, title, fields, columns, initialFormState, anagraficaType, lookupMaps, initialSortModel
}: GestioneAnagraficaProps<T>) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setFormOpen] = useState(false);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<T | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 25, page: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const mainSnapshot = await getDocs(collection(db, collectionName));
            const items = mainSnapshot.docs.map(doc => {
                const docData = doc.data() as T;
                const sanitizedData: T = { id: doc.id, ...docData };

                fields.forEach(field => {
                    if (sanitizedData[field.name as keyof T] === undefined || sanitizedData[field.name as keyof T] === null) {
                        if (field.type === 'number') {
                            (sanitizedData as any)[field.name] = 0;
                        } else {
                            (sanitizedData as any)[field.name] = '';
                        }
                    }
                });

                return sanitizedData;
            });
            setData(items);
        } catch (error) {
            console.error(`Errore durante il caricamento della collezione '${collectionName}':`, error);
            setData([]);
            setSnackbar({ open: true, message: `Errore caricamento dati per ${collectionName}.`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [collectionName, fields]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (item: Partial<T>) => {
        const batch = writeBatch(db);
        const docRef = item.id ? doc(db, collectionName, item.id) : doc(collection(db, collectionName));
        
        if (!item.id) {
            item.id = docRef.id;
        }

        batch.set(docRef, item, { merge: true });
        await batch.commit();
        setSnackbar({ open: true, message: 'Elemento salvato con successo!', severity: 'success' });
        fetchData();
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, collectionName, id));
        setSnackbar({ open: true, message: 'Elemento eliminato.', severity: 'success' });
        fetchData();
    };
    
    const processRowUpdate = useCallback(async (newRow: GridRowModel, oldRow: GridRowModel) => {
        try {
            const { id, ...dataToUpdate } = newRow;
            for (const field of fields) {
                if (field.type === 'number' && dataToUpdate[field.name] !== undefined) {
                    dataToUpdate[field.name] = Number(dataToUpdate[field.name]);
                }
            }
            await updateDoc(doc(db, collectionName, id), dataToUpdate);
            setSnackbar({ open: true, message: 'Modifica salvata!', severity: 'success' });
            return newRow;
        } catch (error) {
            setSnackbar({ open: true, message: 'Errore durante l\'aggiornamento.', severity: 'error' });
            console.error("Update Error:", error);
            return oldRow;
        }
    }, [collectionName, fields]);

    const handleAddNew = () => {
        setSelectedItem(null);
        setFormOpen(true);
    };

    const handleEdit = useCallback((item: T) => {
        setSelectedItem(item);
        setFormOpen(true);
    }, []);

    const handleConfirmDeleteRequest = useCallback((id: string) => {
        setItemToDelete(id);
        setConfirmOpen(true);
    }, []);

    const memoizedColumns = useMemo(() => {
        const processedColumns = columns.map(col => {
            const lookupMap = lookupMaps?.[col.field];
            if (lookupMap) {
                return {
                    ...col,
                    type: 'singleSelect',
                    valueOptions: Array.from(lookupMap.entries()).map(([value, label]) => ({ value, label }))
                };
            }
            return col;
        });

        return [
            ...processedColumns,
            {
                field: 'actions',
                headerName: 'Azioni',
                width: 120,
                sortable: false,
                renderCell: (params: GridRenderCellParams<T>) => (
                    <Box>
                        <IconButton size="small" onClick={() => handleEdit(params.row as T)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => handleConfirmDeleteRequest(params.id as string)}><DeleteIcon /></IconButton>
                    </Box>
                ),
            },
        ];
    }, [columns, handleEdit, handleConfirmDeleteRequest, lookupMaps]);

    const handleConfirmDelete = async () => {
        if (itemToDelete) await handleDelete(itemToDelete);
        setConfirmOpen(false);
        setItemToDelete(null);
    };

    const handleCloseSnackbar = () => {
        setSnackbar(null);
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
             <Box sx={{ p: 2, pb: 1.5, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
                    {title}
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNew}>Nuovo</Button>
            </Box>

            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                <DataGrid
                    sx={{ border: 0 }}
                    rows={data || []}
                    columns={memoizedColumns}
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                      toolbar: {
                        showQuickFilter: true,
                      },
                    }}
                    processRowUpdate={processRowUpdate}
                    onProcessRowUpdateError={(error) => console.error(error)}
                    initialState={{
                        sorting: {
                            sortModel: initialSortModel || [],
                        },
                        pagination: {
                            paginationModel: { pageSize: 25, page: 0 },
                        },
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={(newSelectionModel) => setSelectionModel(newSelectionModel)}
                    rowSelectionModel={selectionModel}
                    editMode="row"
                />
            </Box>

            <FormDialog
                open={isFormOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                fields={fields}
                initialData={selectedItem ?? (initialFormState as Partial<T>)}
                title={selectedItem ? `Modifica ${title.slice(0, -1)}` : `Nuovo ${title.slice(0, -1)}`}
                anagraficaType={anagraficaType}
            />

            <ConfirmationDialog
                open={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione"
                message="Sei sicuro di voler eliminare questo elemento? L'azione è irreversibile."
            />
            {snackbar && (
                <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            )}
        </Box>
    );
}

export default GestioneAnagrafica;
