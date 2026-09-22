
import { useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import type { Tecnico } from '@/models/definitions';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { logger } from '@/utils/logger';
import { tecniciService } from '@/services/tecniciService';

const GestioneTecnici = () => {
    const { tecnici, ditte, categorie, isLoading: areAnagraficheLoading, error: anagraficheError } = useAnagrafiche();

    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToAction, setTecnicoToAction] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleAdd = () => {
        setSelectedTecnico(null);
        setFormOpen(true);
    };

    const handleEdit = (tecnico: Tecnico) => {
        setSelectedTecnico(tecnico);
        setFormOpen(true);
    };

    const handleSave = useCallback(async (formData: Partial<Tecnico> & { password?: string }) => {
        setIsSaving(true);
        setUpdatingId(formData.id ?? 'new');
        showSnackbar('Salvataggio in corso...', 'info');

        try {
            const isNew = !formData.id;
            const operation = isNew ? 'add' : 'update'; // Corrected 'create' to 'add'

            await tecniciService(operation, formData);

            showSnackbar(isNew ? 'Tecnico creato con successo.' : 'Tecnico aggiornato con successo.', 'success');
            setFormOpen(false);
            setSelectedTecnico(null);

        } catch (e) {
            logger.error("Errore durante il salvataggio (GestioneTecnici):", e);
        } finally {
            setIsSaving(false);
            setUpdatingId(null);
        }
    }, []);

    const handleDelete = (id: string) => {
        setTecnicoToAction(id);
        setDeleteDialogOpen(true);
    };
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        showSnackbar('Aggiornamento stato in corso...', 'info');
        
        try {
            await tecniciService('toggle-active', { id: id, attivo: newStatus });
            showSnackbar(`Stato del tecnico aggiornato.`, 'success');
        } catch (e: any) {
            logger.error("Errore durante il cambio di stato (GestioneTecnici):", e);
        } finally {
            setUpdatingId(null);
        }
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!tecnicoToAction) return;
        await handleStatusChange(tecnicoToAction, false);
        setDeleteDialogOpen(false);
        setTecnicoToAction(null);
    }, [tecnicoToAction, handleStatusChange]);

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    if (areAnagraficheLoading && !tecnici?.length) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (anagraficheError) {
        return <Typography color="error">{`Si è verificato un errore: ${anagraficheError}`}</Typography>;
    }

    return (
        <>
            <TecniciList
                tecnici={tecnici || []}
                ditte={ditte || []}
                categorie={categorie || []}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={(_e, id) => handleDelete(id)}
                onStatusChange={handleStatusChange}
                onViewDetails={() => {}}
                isSaving={isSaving}
                updatingId={updatingId}
            />
            <TecnicoForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSave={handleSave}
                tecnico={selectedTecnico}
                ditte={ditte || []}
                categorie={categorie || []}
                isSaving={isSaving}
            />
            <ConfirmationDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Conferma Disattivazione"
                message="Sei sicuro di voler disattivare questo tecnico? Sarà marcato come inattivo e gli sarà revocato l'accesso all'app."
                isSaving={isSaving || !!updatingId}
            />
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default GestioneTecnici;
