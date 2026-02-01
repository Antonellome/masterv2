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
    DialogTitle,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Add from '@mui/icons-material/Add';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE
import TipoGiornataForm from '@/components/TipiGiornata/TipoGiornataForm';
import type { TipoGiornata } from '@/models/definitions';

const GestioneTipiGiornata: React.FC = () => {
    const { tipiGiornata, loading, error, addData, updateData, deleteData } = useData();

    const [formOpen, setFormOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedTipoGiornata, setSelectedTipoGiornata] = useState<TipoGiornata | null>(null);
    const [itemToDelete, setItemToDelete] = useState<TipoGiornata | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleOpenForm = (item: TipoGiornata | null = null) => {
        setSelectedTipoGiornata(item);
        setFormOpen(true);
        setFeedback(null);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setSelectedTipoGiornata(null);
    };

    const handleOpenDeleteDialog = (item: TipoGiornata) => {
        setItemToDelete(item);
        setConfirmDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setConfirmDialogOpen(false);
        setItemToDelete(null);
    };

    const handleSave = async (formData: Partial<TipoGiornata>) => {
        try {
            if (selectedTipoGiornata && selectedTipoGiornata.id) {
                await updateData('tipiGiornata', selectedTipoGiornata.id, formData);
                setFeedback({ type: 'success', message: `"${formData.nome}" aggiornato con successo.` });
            } else {
                await addData('tipiGiornata', formData);
                setFeedback({ type: 'success', message: `"${formData.nome}" creato con successo.` });
            }
            handleCloseForm();
        } catch (err) {
            console.error("Errore nel salvataggio:", err);
            setFeedback({ type: 'error', message: 'Si è verificato un errore durante il salvataggio.' });
        }
    };

    const handleDelete = async () => {
        if (itemToDelete && itemToDelete.id) {
            try {
                await deleteData('tipiGiornata', itemToDelete.id);
                setFeedback({ type: 'success', message: 'Tipo giornata eliminato con successo.' });
            } catch (err) {
                console.error("Errore eliminazione:", err);
                setFeedback({ type: 'error', message: 'Impossibile eliminare il tipo giornata.' });
            }
        }
        handleCloseDeleteDialog();
    };

    if (loading) return <CircularProgress sx={{ display: 'block', margin: 'auto' }} />;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Tipi di Giornata Lavorativa</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>Aggiungi Tipo Giornata</Button>
            </Stack>

            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ my: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Tariffa (€)</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell align="right">Azioni</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tipiGiornata && tipiGiornata.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.nome}</TableCell>
                                <TableCell>{typeof item.tariffa === 'number' ? item.tariffa.toFixed(2) : 'N/D'}</TableCell>
                                <TableCell>{item.tipo}</TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Modifica">
                                        <IconButton size="small" onClick={() => handleOpenForm(item)}><Edit /></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Elimina">
                                        <IconButton size="small" onClick={() => handleOpenDeleteDialog(item)}><Delete /></IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <TipoGiornataForm
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                tipoGiornata={selectedTipoGiornata}
            />

            <Dialog open={confirmDialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare il tipo di giornata <Typography component="span" fontWeight="bold">{itemToDelete?.nome}</Typography>? L&apos;azione è irreversibile.
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

export default GestioneTipiGiornata;
