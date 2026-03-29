import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../../firebase';
import type { Tecnico, Ditta, Categoria } from '../../models/definitions';
import TecniciList from './TecniciList';
import { Box, CircularProgress, Typography, Snackbar, Alert } from '@mui/material';

// Inizializzazione della funzione callable
const app = getApp();
const functions = getFunctions(app, 'europe-west1');
const manageUsersFunction = httpsCallable(functions, 'manageUsers');

const GestioneTecnici = () => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [ditteMap, setDitteMap] = useState(new Map<string, string>());
    const [categorieMap, setCategorieMap] = useState(new Map<string, string>());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const fetchTecnici = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Carica Tecnici
            const tecniciSnapshot = await getDocs(collection(db, 'tecnici'));
            const tecniciData = tecniciSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Tecnico[];
            setTecnici(tecniciData);

            // Carica Ditte
            const ditteSnapshot = await getDocs(collection(db, 'ditte'));
            const ditteData = new Map(ditteSnapshot.docs.map(doc => [doc.id, (doc.data() as Ditta).nome]));
            setDitteMap(ditteData);

            // Carica Categorie
            const categorieSnapshot = await getDocs(collection(db, 'categorie'));
            const categorieData = new Map(categorieSnapshot.docs.map(doc => [doc.id, (doc.data() as Categoria).nome]));
            setCategorieMap(categorieData);

        } catch (err) {
            console.error("Errore nel caricamento dati per Gestione Tecnici:", err);
            setError("Impossibile caricare i dati dei tecnici. Si è verificato un errore.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTecnici();
    }, [fetchTecnici]);

    const handleStatusChange = async (id: string, disabled: boolean) => {
        try {
            await manageUsersFunction({ 
                action: 'setStatus', 
                payload: { uid: id, disabled: disabled } 
            });
            setSnackbar({ open: true, message: `Stato del tecnico aggiornato con successo.`, severity: 'success' });
            // Aggiorniamo lo stato locale per riflettere immediatamente il cambiamento
            setTecnici(prevTecnici => 
                prevTecnici.map(t => t.id === id ? { ...t, disabled: disabled } : t)
            );
        } catch (error: any) {
            console.error("Errore durante l'aggiornamento dello stato del tecnico:", error);
            const message = error.message || 'Operazione fallita.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <TecniciList 
                tecnici={tecnici}
                ditteMap={ditteMap}
                categorieMap={categorieMap}
                onViewDetails={(tecnico) => console.log('View', tecnico)} // Logica non implementata
                onStatusChange={(e, tecnico) => handleStatusChange(tecnico.id, !e.target.checked)}
                onSyncChange={(e, tecnico) => console.log('Sync', tecnico.id, e.target.checked)} // Logica non implementata
                onEdit={(tecnico) => console.log('Edit', tecnico)} // Logica non implementata
                onDelete={(e, id) => console.log('Delete', id)} // Logica non implementata
                onAdd={() => console.log('Add')} // Logica non implementata
            />
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default GestioneTecnici;
