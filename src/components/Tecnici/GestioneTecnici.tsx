
import { useState, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';
import { v4 as uuidv4 } from 'uuid';
import { useGlobalStore } from '@/stores/globalStore';

const GestioneTecnici = () => {
    const areAnagraficheLoading = useGlobalStore((state) => state.areAnagraficheLoading);

    const tecnici = useLiveQuery(() => db.tecnici.orderBy('cognome').toArray());
    const ditte = useLiveQuery(() => db.ditte.orderBy('nome').toArray());
    const categorie = useLiveQuery(() => db.categorie.orderBy('nome').toArray());

    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
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

    const handleSave = useCallback(async (formData: Partial<Tecnico>) => {
        setIsSaving(true);
        try {
            const now = new Date();
            if (formData.id) { 
                await db.tecnici.update(formData.id, {
                    ...formData,
                    isDirty: true,
                    updatedAt: now,
                });
                showSnackbar('Tecnico aggiornato con successo. La modifica sarà sincronizzata.', 'success');
            } else { 
                const newId = uuidv4();
                const newTecnico: Tecnico = {
                    ...formData,
                    id: newId,
                    uid: newId, 
                    attivo: true,
                    appAccess: false,
                    createdAt: now,
                    updatedAt: now,
                    isDirty: true,
                } as Tecnico;
                await db.tecnici.add(newTecnico);
                showSnackbar('Tecnico creato con successo. Sarà sincronizzato con il server.', 'success');
            }
            setFormOpen(false);
            setSelectedTecnico(null);
        } catch (e) {
            console.error("Errore durante il salvataggio:", e);
            showSnackbar(e instanceof Error ? e.message : 'Errore sconosciuto durante il salvataggio', 'error');
        } finally {
            setIsSaving(false);
        }
    }, []);

    const handleDelete = (id: string) => {
        setTecnicoToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = useCallback(async () => {
        if (!tecnicoToDelete) return;
        setUpdatingId(tecnicoToDelete);
        try {
            await db.tecnici.update(tecnicoToDelete, { 
                attivo: false, 
                isDirty: true, 
                updatedAt: new Date(),
            });
            showSnackbar('Tecnico disattivato. La modifica sarà sincronizzata.', 'success');
        } catch (e) {
            console.error("Errore durante la disattivazione del tecnico:", e);
            showSnackbar(e instanceof Error ? e.message : 'Errore sconosciuto', 'error');
        } finally {
            setTecnicoToDelete(null);
            setDeleteDialogOpen(false);
            setUpdatingId(null);
        }
    }, [tecnicoToDelete]);
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        try {
            await db.tecnici.update(id, { 
                attivo: newStatus, 
                isDirty: true, 
                updatedAt: new Date(),
            });
            showSnackbar(`Stato del tecnico aggiornato. La modifica sarà sincronizzata.`, 'success');
        } catch (e) {
            console.error("Errore durante il cambio di stato:", e);
            showSnackbar(e instanceof Error ? e.message : 'Errore sconosciuto', 'error');
        } finally {
            setUpdatingId(null);
        }
    }, []);

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
    
    const ditteMap = useMemo(() => new Map(ditte?.map(d => [d.id, d.nome])), [ditte]);
    const categorieMap = useMemo(() => new Map(categorie?.map(c => [c.id, c.nome])), [categorie]);

    if (areAnagraficheLoading || !tecnici || !ditte || !categorie) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Typography color="error">{`Si è verificato un errore: ${error}`}</Typography>;
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1, minHeight: 0, height: '100%' }}>
                <TecniciList
                    tecnici={tecnici}
                    ditteMap={ditteMap}
                    categorieMap={categorieMap}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={(_e, id) => handleDelete(id)}
                    onStatusChange={handleStatusChange} 
                    onViewDetails={() => { /* Funzionalità futura */ }}
                    isSaving={isSaving}
                    updatingId={updatingId}
                />
            </Box>
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
                title="Conferma Disattivazione"
                message="Sei sicuro di voler disattivare questo tecnico? Il record non verrà eliminato ma solo contrassegnato come inattivo."
            />
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default GestioneTecnici;
