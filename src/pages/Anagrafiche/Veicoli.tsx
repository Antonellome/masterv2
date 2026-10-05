
import React, { useState, useMemo } from 'react';
import { Box, Button, TextField, IconButton, Typography, Paper, Alert } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar, itIT } from '@mui/x-data-grid';
import { useLiveQuery } from 'dexie-react-hooks';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

import { db } from '@/db/database';
import type { Veicolo } from '@/models/definitions';
import { logger } from '@/utils/logger';
import PageHeader from '@/components/PageHeader';

const Veicoli: React.FC = () => {
    const veicoli = useLiveQuery(() => db.veicoli.toArray(), []);

    const [editRowsModel, setEditRowsModel] = useState<any>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newVeicolo, setNewVeicolo] = useState<Partial<Veicolo>>({ nome: '', targa: '' });
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleRowEditStart = (params: any) => {
        setEditRowsModel({ [params.id]: { ...params.row } });
    };

    const handleRowEditStop = () => {
        setEditRowsModel({});
    };

    const processRowUpdate = async (newRow: Veicolo) => {
        try {
            await db.veicoli.update(newRow.id, newRow);
            setNotification({ type: 'success', message: 'Veicolo aggiornato con successo!' });
            return newRow;
        } catch (error) {
            logger.error('Failed to update veicolo:', error);
            setNotification({ type: 'error', message: 'Errore durante l'aggiornamento del veicolo.' });
            return editRowsModel[newRow.id];
        }
    };

    const handleDelete = async (id: string | number) => {
        try {
            await db.veicoli.delete(id as any);
            setNotification({ type: 'success', message: 'Veicolo eliminato con successo!' });
        } catch (error) {
            logger.error('Failed to delete veicolo:', error);
            setNotification({ type: 'error', message: 'Errore durante l'eliminazione del veicolo.' });
        }
    };

    const handleAddNew = () => {
        setIsAdding(true);
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewVeicolo({ nome: '', targa: '' });
    };

    const handleSaveNew = async () => {
        if (!newVeicolo.nome) {
            setNotification({ type: 'error', message: 'Il nome del veicolo è obbligatorio.' });
            return;
        }
        const id = crypto.randomUUID();
        try {
            await db.veicoli.add({ ...newVeicolo, id } as Veicolo);
            setNotification({ type: 'success', message: 'Veicolo aggiunto con successo!' });
            handleCancelNew();
        } catch (error) {
            logger.error('Failed to add veicolo:', error);
            setNotification({ type: 'error', message: 'Errore durante l'aggiunta del veicolo.' });
        }
    };

    const columns: GridColDef[] = useMemo(() => [
        { field: 'nome', headerName: 'Nome', width: 200, editable: true },
        { field: 'targa', headerName: 'Targa', width: 150, editable: true },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                const isInEditMode = editRowsModel[id] !== undefined;

                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            key="save"
                            icon={<SaveIcon />}
                            label="Save"
                            onClick={() => processRowUpdate(editRowsModel[id])}
                            color="primary"
                        />,
                        <GridActionsCellItem
                            key="cancel"
                            icon={<CancelIcon />}
                            label="Cancel"
                            onClick={handleRowEditStop}
                            color="inherit"
                        />,
                    ];
                }

                return [
                    <GridActionsCellItem
                        key="edit"
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleRowEditStart({ id, row: veicoli?.find(v => v.id === id) })}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        key="delete"
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={() => handleDelete(id)}
                        color="inherit"
                    />,
                ];
            },
        },
    ], [editRowsModel, veicoli]);

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <PageHeader title="Gestione Veicoli" />
            
            {notification && (
                <Alert severity={notification.type} onClose={() => setNotification(null)} sx={{ mb: 2 }}>
                    {notification.message}
                </Alert>
            )}

            <Button startIcon={<AddIcon />} onClick={handleAddNew} variant="contained" sx={{ mb: 2 }}>
                Aggiungi Veicolo
            </Button>

            {isAdding && (
                <Paper sx={{ p: 2, mb: 2 }} component="form">
                    <Typography variant="h6" gutterBottom>Nuovo Veicolo</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid xs={12} sm={6} md={4}>
                            <TextField
                                label="Nome"
                                value={newVeicolo.nome}
                                onChange={(e) => setNewVeicolo({ ...newVeicolo, nome: e.target.value })}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid xs={12} sm={6} md={4}>
                            <TextField
                                label="Targa"
                                value={newVeicolo.targa}
                                onChange={(e) => setNewVeicolo({ ...newVeicolo, targa: e.target.value })}
                                fullWidth
                            />
                        </Grid>
                        <Grid xs={12} md={4}>
                            <IconButton onClick={handleSaveNew} color="primary"><SaveIcon /></IconButton>
                            <IconButton onClick={handleCancelNew}><CancelIcon /></IconButton>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={veicoli || []}
                    columns={columns}
                    editMode="row"
                    rowModesModel={editRowsModel}
                    onRowModesModelChange={setEditRowsModel}
                    onRowEditStart={handleRowEditStart}
                    onRowEditStop={handleRowEditStop}
                    processRowUpdate={processRowUpdate}
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{
                        toolbar: { showQuickFilter: true },
                    }}
                    localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                />
            </Paper>
        </Box>
    );
};

export default Veicoli;
