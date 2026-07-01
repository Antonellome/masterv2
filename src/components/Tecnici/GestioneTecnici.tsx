
import { useState, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import type { Tecnico } from '@/models/definitions';
import { useDataContext, CollectionName } from '@/contexts/DataContext';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';
import { db } from '@/firebase'; 
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { tecnicoConverter } from '@/firebase/converters';

const GestioneTecnici = () => {
    const { 
        ditte, categorie, 
        addDocument, updateDocument, deleteDocument 
    } = useDataContext();

    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const collectionName: CollectionName = 'tecnici';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Ripristino la query ottimale con doppio ordinamento, ora che l'indice esiste.
            const q = query(
                collection(db, 'tecnici').withConverter(tecnicoConverter),
                orderBy('cognome'),
                orderBy('nome')
            );
            const snapshot = await getDocs(q);
            const tecniciList = snapshot.docs.map(doc => doc.data());
            setTecnici(tecniciList);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento tecnici.';
            setError(message);
            console.error("Errore caricamento tecnici:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const handleError = (e: unknown, context: string) => {
        console.error(`${context}:`, e);
        const message = e instanceof Error ? e.message : 'Si è verificato un errore sconosciuto.';
        setSnackbar({ open: true, message: `${context}: ${message}`, severity: 'error' });
    };
    
    const refreshAndClose = () => {
        fetchData();
        setFormOpen(false);
    }

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
                await addDocument(collectionName, dataToSave as Tecnico);
                setSnackbar({ open: true, message: 'Tecnico creato con successo!', severity: 'success' });
            }
            refreshAndClose();
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
            fetchData();
        } catch (e) {
            handleError(e, "Errore durante l'eliminazione del tecnico");
        } finally {
            setTecnicoToDelete(null);
            setDeleteDialogOpen(false);
            setIsSaving(false);
        }
    }, [tecnicoToDelete, deleteDocument, fetchData]);
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        try {
            await updateDocument(collectionName, id, { attivo: newStatus });
            setSnackbar({ open: true, message: `Stato del tecnico aggiornato.`, severity: 'success' });
            fetchData();
        } catch (e) {
            handleError(e, "Errore nell'aggiornamento dello stato");
        } finally {
            setUpdatingId(null);
        }
    }, [updateDocument, fetchData]);

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
