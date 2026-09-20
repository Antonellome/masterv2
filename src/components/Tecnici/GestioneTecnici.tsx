
import { useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import type { Tecnico } from '@/models/definitions';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog'; // Assumendo esista, altrimenti da creare/spostare
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { logger } from '@/utils/logger';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

const GestioneTecnici = () => {
    // UTILIZZIAMO IL MODELLO IBRIDO CORRETTO
    const { tecnici, ditte, categorie, isLoading: areAnagraficheLoading, error: anagraficheError, updateTecnico } = useAnagrafiche();

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

        const functions = getFunctions(getApp(), 'europe-west6');
        const callable = httpsCallable(functions, 'master_gestisciTecnico');

        try {
            const isNew = !formData.id;
            const operation = isNew ? 'create' : 'update';

            const result = await callable({ operation, data: formData });
            const resultData = result.data as { success: boolean, id: string };

            if (resultData.success) {
                showSnackbar(isNew ? 'Tecnico creato con successo.' : 'Tecnico aggiornato con successo.', 'success');
                setFormOpen(false);
                setSelectedTecnico(null);
            } else {
                throw new Error('Errore sconosciuto dal server.');
            }
        } catch (e) {
            logger.error("Errore durante il salvataggio:", e);
            showSnackbar(e instanceof Error ? e.message : 'Errore sconosciuto durante il salvataggio', 'error');
        } finally {
            setIsSaving(false);
            setUpdatingId(null);
        }
    }, []);

    const handleDelete = (id: string) => {
        setTecnicoToAction(id);
        setDeleteDialogOpen(true);
    };
    
    // *** ORDINE CORRETTO: DEFINITA PRIMA DI ESSERE USATA ***
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        showSnackbar('Aggiornamento stato in corso...', 'info');
        
        const functions = getFunctions(getApp(), 'europe-west6');
        const callable = httpsCallable(functions, 'master_gestisciTecnico');

        try {
            const result = await callable({ 
                operation: 'toggle-attivo',
                data: { id: id, attivo: newStatus }
            });
            const resultData = result.data as { success: boolean };

            if (resultData.success) {
                const updatePayload: Partial<Tecnico> = { attivo: newStatus };
                if (newStatus === false) {
                    updatePayload.appAccess = false;
                    updatePayload.accessoApp = false; // Per coerenza
                }
                await updateTecnico(id, updatePayload);
                showSnackbar(`Stato del tecnico aggiornato.`, 'success');
            } else {
                throw new Error('Operazione negata dal server.');
            }
            
        } catch (e: any) {
            logger.error("Errore durante il cambio di stato:", e);
            showSnackbar(e.message || 'Errore sconosciuto', 'error');
        } finally {
            setUpdatingId(null);
        }
    }, [updateTecnico]);

    // Ora questa funzione può accedere a `handleStatusChange` senza errori
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
