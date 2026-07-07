
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';
import { doc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase'; 
import { tecnicoConverter } from '@/firebase/converters';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import TecniciList from './TecniciList';
import TecnicoForm from './TecnicoForm';
import ConfirmationDialog from '../Anagrafiche/ConfirmationDialog';

// Funzione helper per caricare anagrafiche semplici
const fetchAnagrafica = async (collectionName: string) => {
    const q = query(collection(db, collectionName), orderBy('nome'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

const GestioneTecnici = () => {
    // Stati dei dati
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [ditte, setDitte] = useState<Ditta[]>([]);
    const [categorie, setCategorie] = useState<Categoria[]>([]);

    // Stati di controllo UI
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
    const [isSaving, setIsSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const collectionName = 'tecnici';

    // Caricamento unificato di tutti i dati necessari al componente
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tecniciData, ditteData, categorieData] = await Promise.all([
                getDocs(query(collection(db, collectionName).withConverter(tecnicoConverter), orderBy('cognome'), orderBy('nome'))),
                fetchAnagrafica('ditte') as Promise<Ditta[]>,
                fetchAnagrafica('categorie') as Promise<Categoria[]>
            ]);
            
            setTecnici(tecniciData.docs.map(doc => doc.data()));
            setDitte(ditteData);
            setCategorie(categorieData);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Errore sconosciuto nel caricamento dati.';
            setError(message);
            console.error("Errore caricamento dati per GestioneTecnici:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    const handleSave = useCallback(async (formData: Partial<Tecnico> & { password?: string }) => {
        setIsSaving(true);
        try {
            const { id, ...dataToSave } = formData;
            if (id) {
                await updateDoc(doc(db, collectionName, id), dataToSave);
                setSnackbar({ open: true, message: 'Dati tecnico aggiornati!', severity: 'success' });
            } else {
                const createTecnicoFn = httpsCallable(functions, 'createTecnico');
                const result = await createTecnicoFn(dataToSave);
                console.log('Risultato Cloud Function:', result.data);
                setSnackbar({ open: true, message: (result.data as any).message || 'Tecnico creato con successo!', severity: 'success' });
            }
            await fetchData(); // Ricarica tutti i dati
            setFormOpen(false);
        } catch (e) {
            handleError(e, "Errore nel salvataggio del tecnico");
        } finally {
            setIsSaving(false);
        }
    }, [fetchData]);

    const handleDelete = (id: string) => {
        setTecnicoToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = useCallback(async () => {
        if (!tecnicoToDelete) return;
        setIsSaving(true);
        try {
            const eliminaTecnicoFn = httpsCallable(functions, 'eliminaTecnico');
            await eliminaTecnicoFn({ uid: tecnicoToDelete });
            setSnackbar({ open: true, message: 'Tecnico eliminato con successo.', severity: 'success' });
            await fetchData(); // Ricarica tutti i dati
        } catch (e) {
            handleError(e, "Errore durante l'eliminazione del tecnico");
        } finally {
            setTecnicoToDelete(null);
            setDeleteDialogOpen(false);
            setIsSaving(false);
        }
    }, [tecnicoToDelete, fetchData]);
    
    const handleStatusChange = useCallback(async (id: string, newStatus: boolean) => {
        setUpdatingId(id);
        try {
            await updateDoc(doc(db, collectionName, id), { attivo: newStatus });
            setSnackbar({ open: true, message: `Stato del tecnico aggiornato.`, severity: 'success' });
            await fetchData(); // Ricarica tutti i dati
        } catch (e) {
            handleError(e, "Errore nell'aggiornamento dello stato");
        } finally {
            setUpdatingId(null);
        }
    }, [fetchData]);

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
    
    const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d.nome])), [ditte]);
    const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c.nome])), [categorie]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Typography color="error">{`Errore nel caricamento dati: ${error}`}</Typography>;
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
                message="Sei sicuro di voler eliminare questo record? L'utente verrà rimosso anche dal sistema di autenticazione. L'azione è irreversibile."
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
