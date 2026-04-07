
import { useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import type { Tecnico } from '@/models/definitions';
import { useDataContext, CollectionName } from '@/contexts/DataContext';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';

const GestioneTecnici = () => {
    const { 
        tecnici, ditte, categorie, loading, error, 
        addDocument, updateDocument, deleteDocument 
    } = useDataContext();

    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);

    const collectionName: CollectionName = 'tecnici';

    const handleError = (e: unknown, context: string) => {
        console.error(`${context}:`, e);
        const message = e instanceof Error ? e.message : 'Si è verificato un errore sconosciuto.';
        setSnackbar({ open: true, message: `${context}: ${message}`, severity: 'error' });
    };

    const handleAdd = () => {
        setSelectedTecnico(null);
        setFormOpen(true);
    };

    const handleEdit = (tecnico: Tecnico) => {
        setSelectedTecnico(tecnico);
        setFormOpen(true);
    };

    const handleSave = useCallback(async (formData: Partial<Tecnico>) => {
        setIsSaving(true);
        try {
            const { id, ...dataToSave } = formData;
            if (id) {
                await updateDocument(collectionName, id, dataToSave);
                setSnackbar({ open: true, message: 'Dati tecnico aggiornati!', severity: 'success' });
            } else {
                await addDocument(collectionName, dataToSave);
                setSnackbar({ open: true, message: 'Tecnico creato con successo!', severity: 'success' });
            }
            setFormOpen(false);
        } catch (e) {
            handleError(e, "Errore nel salvataggio del tecnico");
        } finally {
            setIsSaving(false);
        }
    }, [updateDocument, addDocument]);

    const handleDelete = (id: string) => {
        setTecnicoToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = useCallback(async () => {
        if (!tecnicoToDelete) return;
        setIsSaving(true);
        try {
            await deleteDocument(collectionName, tecnicoToDelete);
            setSnackbar({ open: true, message: 'Tecnico eliminato con successo.', severity: 'success' });
        } catch (e) {
            handleError(e, "Errore durante l'eliminazione del tecnico");
        } finally {
            setTecnicoToDelete(null);
            setDeleteDialogOpen(false);
            setIsSaving(false);
        }
    }, [tecnicoToDelete, deleteDocument]);
    
    // 1. FUNZIONE CREATA
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setIsSaving(true);
        try {
            await updateDocument(collectionName, id, { attivo: newStatus });
            setSnackbar({ open: true, message: `Stato del tecnico aggiornato a ${newStatus ? 'Attivo' : 'Inattivo'}.`, severity: 'success' });
        } catch (e) {
            handleError(e, "Errore nell'aggiornamento dello stato");
        } finally {
            setIsSaving(false);
        }
    }, [updateDocument]);


    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }
    if (error) {
        return <Typography color="error">{`Errore nel caricamento dati: ${error}`}</Typography>;
    }

    const ditteMap = new Map(ditte.map(d => [d.id, d.nome]));
    const categorieMap = new Map(categorie.map(c => [c.id, c.nome]));

    return (
        <>
            <TecniciList
                tecnici={tecnici}
                ditteMap={ditteMap}
                categorieMap={categorieMap}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={(_e, id) => handleDelete(id)}
                // 2. FUNZIONE COLLEGATA
                onStatusChange={handleStatusChange} 
                onSyncChange={() => {}} 
                onViewDetails={() => {}}
                isSaving={isSaving} // Aggiungo isSaving per disabilitare i controlli durante le operazioni
            />
            <TecnicoForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                tecnico={selectedTecnico}
                ditte={ditte}
                categorie={categorie}
                isSaving={isSaving}
            />
            <ConfirmationDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Conferma Eliminazione"
                message="Sei sicuro di voler eliminare questo record? L'azione è irreversibile."
            />
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default GestioneTecnici;
