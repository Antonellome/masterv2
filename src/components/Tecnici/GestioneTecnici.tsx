
import { useState, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import { doc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase'; 
import { tecnicoConverter } from '@/firebase/converters';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions'; // Import Ditta and Categoria
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';

// Helper function to fetch simple anagrafiche
const fetchAnagrafica = async (collectionName: string) => {
    const q = query(collection(db, collectionName), orderBy('nome'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

const GestioneTecnici = () => {
    // State for anagrafiche needed by this component
    const [ditte, setDitte] = useState<Ditta[]>([]);
    const [categorie, setCategorie] = useState<Categoria[]>([]);
    const [anagraficheLoading, setAnagraficheLoading] = useState(true);
    const [anagraficheError, setAnagraficheError] = useState<string | null>(null);

    // State for the main data (tecnici)
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const collectionName = 'tecnici';

    // Fetch main data (tecnici)
    const fetchTecnici = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, collectionName).withConverter(tecnicoConverter),
                orderBy('cognome'),
                orderBy('nome')
            );
            const snapshot = await getDocs(q);
            setTecnici(snapshot.docs.map(doc => doc.data()));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento tecnici.';
            setError(message);
            console.error("Errore caricamento tecnici:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch related anagrafiche (ditte, categorie) directly
    const fetchRelatedAnagrafiche = useCallback(async () => {
        setAnagraficheLoading(true);
        setAnagraficheError(null);
        try {
            const [ditteData, categorieData] = await Promise.all([
                fetchAnagrafica('ditte') as Promise<Ditta[]>,
                fetchAnagrafica('categorie') as Promise<Categoria[]>
            ]);
            setDitte(ditteData);
            setCategorie(categorieData);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento anagrafiche.';
            setAnagraficheError(message);
            console.error("Errore caricamento anagrafiche per tecnici:", err);
        } finally {
            setAnagraficheLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTecnici();
        fetchRelatedAnagrafiche();
    }, [fetchTecnici, fetchRelatedAnagrafiche]);


    const handleError = (e: unknown, context: string) => {
        console.error(`${context}:`, e);
        const message = e instanceof Error ? e.message : 'Si è verificato un errore sconosciuto.';
        setSnackbar({ open: true, message: `${context}: ${message}`, severity: 'error' });
    };
    
    const refreshAndClose = () => {
        fetchTecnici(); // Only refetch tecnici, anagrafiche are stable
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
                await updateDoc(doc(db, collectionName, id), dataToSave);
                setSnackbar({ open: true, message: 'Dati tecnico aggiornati!', severity: 'success' });
            } else {
                await addDoc(collection(db, collectionName), dataToSave as Tecnico);
                setSnackbar({ open: true, message: 'Tecnico creato con successo!', severity: 'success' });
            }
            refreshAndClose();
        } catch (e) {
            handleError(e, "Errore nel salvataggio del tecnico");
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
        setIsSaving(true);
        try {
            await deleteDoc(doc(db, collectionName, tecnicoToDelete));
            setSnackbar({ open: true, message: 'Tecnico eliminato con successo.', severity: 'success' });
            fetchTecnici(); // Refetch
        } catch (e) {
            handleError(e, "Errore durante l'eliminazione del tecnico");
        } finally {
            setTecnicoToDelete(null);
            setDeleteDialogOpen(false);
            setIsSaving(false);
        }
    }, [tecnicoToDelete, fetchTecnici]);
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        try {
            await updateDoc(doc(db, collectionName, id), { attivo: newStatus });
            setSnackbar({ open: true, message: `Stato del tecnico aggiornato.`, severity: 'success' });
            fetchTecnici(); // Refetch
        } catch (e) {
            handleError(e, "Errore nell'aggiornamento dello stato");
        } finally {
            setUpdatingId(null);
        }
    }, [fetchTecnici]);

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    if (loading || anagraficheLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }
    if (error || anagraficheError) {
        return <Typography color="error">{`Errore nel caricamento dati: ${error || anagraficheError}`}</Typography>;
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
