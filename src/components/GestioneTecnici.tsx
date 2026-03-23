import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, deleteDoc, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db, app } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, Alert, CircularProgress, Tabs, Tab
} from '@mui/material';
import TecnicoForm from '@/components/Tecnici/TecnicoForm';
import DettaglioItemDialog from '@/components/common/DettaglioItemDialog';
import TecniciList from '@/components/Tecnici/TecniciList';
import SincronizzatiApp from '@/components/Tecnici/SincronizzatiApp';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import dayjs from 'dayjs';

interface ItemToView {
    titolo: string;
    dettagli: { label: string; value: string }[];
}

const formatDetailDate = (date: Timestamp | undefined) => {
    if (date && date instanceof Timestamp) {
        return dayjs(date.toDate()).format('DD/MM/YYYY');
    }
    return 'N/D';
};

const GestioneTecnici = () => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [ditte, setDitte] = useState<Ditta[]>([]);
    const [categorie, setCategorie] = useState<Categoria[]>([]);

    const ditteMap = useMemo(() => new Map(ditte.map(d => [d.id, d.nome])), [ditte]);
    const categorieMap = useMemo(() => new Map(categorie.map(c => [c.id, c.nome])), [categorie]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [itemToView, setItemToView] = useState<ItemToView | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [tecnicoToDelete, setTecnicoToDelete] = useState<Tecnico | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
    const [currentTab, setCurrentTab] = useState(0);

    useEffect(() => {
        setLoading(true);
        const unsubTecnici = onSnapshot(collection(db, 'tecnici'), snapshot => {
            setTecnici(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tecnico)));
            setLoading(false);
        }, err => { setError("Errore caricamento tecnici."); setLoading(false); console.error(err); });

        const unsubDitte = onSnapshot(collection(db, 'ditte'), snapshot => setDitte(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ditta))), err => console.error("Errore caricamento ditte:", err));
        const unsubCategorie = onSnapshot(collection(db, 'categorie'), snapshot => setCategorie(snapshot.docs.map(c => ({ id: c.id, ...c.data() } as Categoria))), err => console.error("Errore caricamento categorie:", err));

        return () => { unsubTecnici(); unsubDitte(); unsubCategorie(); };
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setCurrentTab(newValue);
    const refreshData = () => {};

    const handleSave = async (data: Partial<Tecnico>) => {
        setSaving(true);
        const sanitizedData: { [key: string]: unknown } = {};
        (Object.keys(data) as Array<keyof Tecnico>).forEach(key => {
            const value = data[key];
            sanitizedData[key] = value === undefined ? null : value;
        });
        if (!sanitizedData.email) {
            setSnackbar({ open: true, message: "L'email è un campo obbligatorio.", severity: 'warning' });
            setSaving(false);
            return;
        }
        const payload = { email: sanitizedData.email, profileData: { ...sanitizedData } };
        delete (payload.profileData as { email?: unknown }).email;
        if (payload.profileData.id === null) {
            delete (payload.profileData as { id?: unknown }).id;
        }
        const functions = getFunctions(app, 'europe-west1');
        const provisionTecnico = httpsCallable(functions, 'provisionTecnico');
        try {
            await provisionTecnico(payload);
            const message = (payload.profileData as {id?: unknown}).id ? 'Tecnico aggiornato!' : 'Tecnico creato!';
            setSnackbar({ open: true, message, severity: 'success' });
        } catch (error: unknown) {
            const err = error as { details?: { message?: string }; message: string };
            const errorMessage = err.details?.message || err.message;
            setSnackbar({ open: true, message: `Errore: ${errorMessage}`, severity: 'error' });
        } finally {
            setSaving(false);
            setFormOpen(false);
            setSelectedTecnico(null);
        }
    };

    const handleStatusChange = async (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => {
        if (!tecnico.id) return;
        await updateDoc(doc(db, 'tecnici', tecnico.id), { attivo: event.target.checked });
    };

    const handleSyncChange = async (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => {
        if (!tecnico.id) return;
        if (event.target.checked && !tecnico.email) {
             setSnackbar({ open: true, message: "Email obbligatoria per la sincronizzazione.", severity: 'warning' });
             return;
        }
        await updateDoc(doc(db, 'tecnici', tecnico.id), { sincronizzazioneAttiva: event.target.checked });
    };

    const handleOpenForm = (tecnico: Tecnico | null = null) => {
        setSelectedTecnico(tecnico);
        setFormOpen(true);
    };

    const handleViewDetails = (tecnico: Tecnico) => {
        const dettagli = [
            { label: 'Cognome', value: tecnico.cognome },
            { label: 'Nome', value: tecnico.nome },
            { label: 'Email', value: tecnico.email || '-' },
            // Aggiungi altri dettagli rilevanti qui
        ];
        setItemToView({ titolo: `Dettaglio: ${tecnico.nome} ${tecnico.cognome}`, dettagli });
        setDetailsOpen(true);
    };
    
    const handleOpenDeleteDialog = (event: React.MouseEvent, id: string) => {
        const tecnico = tecnici.find(t => t.id === id);
        if (tecnico) {
            setTecnicoToDelete(tecnico);
            setDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (!tecnicoToDelete?.id) return;
        await deleteDoc(doc(db, 'tecnici', tecnicoToDelete.id));
        setSnackbar({ open: true, message: 'Tecnico eliminato.', severity: 'success' });
        setDeleteDialogOpen(false);
        setTecnicoToDelete(null);
    };

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange}>
                    <Tab label="Lista Tecnici" />
                    <Tab label="Accesso App" />
                </Tabs>
            </Box>
            {currentTab === 0 && (
                <TecniciList 
                    tecnici={tecnici}
                    ditteMap={ditteMap}
                    categorieMap={categorieMap}
                    onViewDetails={handleViewDetails}
                    onStatusChange={handleStatusChange}
                    onSyncChange={handleSyncChange}
                    onEdit={handleOpenForm}
                    onDelete={handleOpenDeleteDialog}
                    onAdd={() => handleOpenForm(null)}
                />
            )}
            {currentTab === 1 && (
                 <Box sx={{ p: 3 }}>
                    <SincronizzatiApp onDataChange={refreshData} />
                 </Box>
            )}
            
            <TecnicoForm open={isFormOpen} onClose={() => { setFormOpen(false); setSelectedTecnico(null); }} onSave={handleSave} tecnico={selectedTecnico} ditte={ditte} categorie={categorie} isSaving={saving}/>
            {itemToView && <DettaglioItemDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} items={itemToView.dettagli} title={itemToView.titolo} />}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}><DialogTitle>Conferma Eliminazione</DialogTitle><DialogContent><DialogContentText>Sei sicuro di voler eliminare <b>{tecnicoToDelete?.nome} {tecnicoToDelete?.cognome}</b>?</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button><Button onClick={handleConfirmDelete} color="error">Elimina</Button></DialogActions></Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}><Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert></Snackbar>
        </Box>
    );
};

export default GestioneTecnici;
