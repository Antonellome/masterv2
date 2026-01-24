import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Stack,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import {
    DataGrid,
    GridActionsCellItem
} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE
import CategoriaForm from '@/components/Categorie/CategoriaForm';
import DettaglioItemDialog from '@/components/common/DettaglioItemDialog';
import type { Categoria } from '@/models/definitions';

interface DettaglioCategoria {
    id: string;
    nome: string;
}

const GestioneCategorie: React.FC = () => {
    // CORREZIONE FINALE: Usa 'categorie' dal DataContext
    const { categorie, loading, error, addData, updateData, deleteData } = useData();

    const [feedback, setFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Categoria | null>(null);
    const [itemToView, setItemToView] = useState<DettaglioCategoria | null>(null);

    const handleOpenForm = (categoria: Categoria | null = null) => {
        setFeedback(null);
        setSelectedCategoria(categoria);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setSelectedCategoria(null);
    };

    const handleOpenDetails = (categoria: Categoria) => {
        const itemForDialog: DettaglioCategoria = { id: categoria.id, nome: categoria.nome };
        setItemToView(itemForDialog);
        setDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setItemToView(null);
    };

    const handleOpenDeleteDialog = (categoria: Categoria) => {
        setItemToDelete(categoria);
        setConfirmDialogOpen(true);
        setFeedback(null);
    };

    const handleCloseDeleteDialog = () => {
        setConfirmDialogOpen(false);
        setItemToDelete(null);
    };

    const handleSave = async (formData: { nome: string }) => {
        setFeedback(null);
        try {
            // CORREZIONE: Usa la collection 'categorie'
            if (selectedCategoria && selectedCategoria.id) {
                await updateData('categorie', selectedCategoria.id, formData);
                setFeedback({ type: 'success', message: `Categoria "${formData.nome}" aggiornata.` });
            } else {
                await addData('categorie', formData);
                setFeedback({ type: 'success', message: `Categoria "${formData.nome}" creata.` });
            }
            handleCloseForm();
        } catch (error) {
            console.error("Errore nel salvare:", error);
            setFeedback({ type: 'error', message: "Errore durante il salvataggio." });
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete || !itemToDelete.id) return;
        try {
            // CORREZIONE: Usa la collection 'categorie'
            await deleteData('categorie', itemToDelete.id);
            setFeedback({ type: 'success', message: `Categoria "${itemToDelete.nome}" eliminata.` });
        } catch (err) {
            console.error("Errore eliminazione:", err);
            setFeedback({ type: 'error', message: "Impossibile eliminare la categoria." });
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome Categoria', flex: 1, minWidth: 200 },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem key="edit" icon={<Edit />} label="Modifica" onClick={() => handleOpenForm(params.row as Categoria)} />,
                <GridActionsCellItem key="delete" icon={<Delete />} label="Elimina" onClick={() => handleOpenDeleteDialog(params.row as Categoria)} />,
            ],
        },
    ];

    if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                {/* CORREZIONE: Titolo corretto */}
                <Typography variant="h6">Elenco Categorie</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>Aggiungi Categoria</Button>
            </Stack>
            
            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ my: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            <Box sx={{ width: '100%', height: 400 }}>
                 <DataGrid
                    // CORREZIONE: Passa i dati da 'categorie'
                    rows={categorie || []}
                    columns={columns}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    onRowClick={(params) => handleOpenDetails(params.row as Categoria)}
                    sx={{ cursor: 'pointer' }}
                    getRowId={(row) => row.id}
                />
            </Box>

            <CategoriaForm 
                open={formOpen} 
                onClose={handleCloseForm} 
                onSave={handleSave} 
                categoria={selectedCategoria} 
            />
            
            <DettaglioItemDialog open={detailsOpen} onClose={handleCloseDetails} item={itemToView} title="Dettaglio Categoria" />

            <Dialog open={confirmDialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare la categoria <Typography component="span" fontWeight="bold">{itemToDelete?.nome}</Typography>? L&apos;azione è irreversibile.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Annulla</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Elimina</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestioneCategorie;
