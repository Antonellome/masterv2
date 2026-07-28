import { useState, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';

const GestioneTecnici = () => {
    // Dati letti in tempo reale dal database locale (Dexie)
    const tecnici = useLiveQuery(() => db.tecnici.orderBy('cognome').toArray());
    const ditte = useLiveQuery(() => db.ditte.orderBy('nome').toArray());
    const categorie = useLiveQuery(() => db.categorie.orderBy('nome').toArray());

    // Stati di controllo UI
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleError = (e: unknown, context: string) => {
        console.error(`${context}:`, e);
        const firebaseError = e as { code?: string; message?: string };
        const message = firebaseError.message || 'Si è verificato un errore sconosciuto.';
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

    // --- FUNZIONI DI SCRITTURA TEMPORANEAMENTE DISATTIVATE ---
    const handleSave = useCallback(async (formData: Partial<Tecnico> & { password?: string }) => {
        setIsSaving(true);
        console.warn("Salvataggio non ancora implementato in modalità offline.", formData);
        setSnackbar({ open: true, message: 'Salvataggio non ancora implementato in modalità offline.', severity: 'error' });
        setIsSaving(false);
        setFormOpen(false);
    }, []);

    const handleDelete = (id: string) => {
        setTecnicoToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = useCallback(async () => {
        if (!tecnicoToDelete) return;
        setIsSaving(true);
        console.warn("Eliminazione non ancora implementata in modalità offline.", tecnicoToDelete);
        setSnackbar({ open: true, message: 'Eliminazione non ancora implementata in modalità offline.', severity: 'error' });
        setTecnicoToDelete(null);
        setDeleteDialogOpen(false);
        setIsSaving(false);
    }, [tecnicoToDelete]);
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        console.warn("Cambio stato non ancora implementato in modalità offline.", id, newStatus);
        setSnackbar({ open: true, message: 'Cambio stato non ancora implementato in modalità offline.', severity: 'error' });
        setUpdatingId(null);
    }, []);
    // --- FINE BLOCCO FUNZIONI DISATTIVATE ---

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
    
    // Memoizzazione per ottimizzare le performance
    const ditteMap = useMemo(() => new Map(ditte?.map(d => [d.id, d.nome])), [ditte]);
    const categorieMap = useMemo(() => new Map(categorie?.map(c => [c.id, c.nome])), [categorie]);

    // Se i dati non sono ancora stati caricati da Dexie, mostra un loader
    if (!tecnici || !ditte || !categorie) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Typography color="error">{`Si è verificato un errore: ${error}`}</Typography>;
    }

    return (
        <>
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
                message="Sei sicuro di voler eliminare questo record? Questa azione verrà sincronizzata con il server."
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
