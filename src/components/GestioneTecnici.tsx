import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
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
    dettagli: { label: string; value: string | undefined }[];
}

const GestioneTecnici: React.FC = () => {
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
        }, err => { setError("Errore caricamento anagrafica tecnici."); setLoading(false); console.error(err); });

        const unsubDitte = onSnapshot(collection(db, 'ditte'), snapshot => setDitte(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ditta))), err => console.error("Errore caricamento ditte:", err));
        const unsubCategorie = onSnapshot(collection(db, 'categorie'), snapshot => setCategorie(snapshot.docs.map(c => ({ id: c.id, ...c.data() } as Categoria))), err => console.error("Errore caricamento categorie:", err));

        return () => { unsubTecnici(); unsubDitte(); unsubCategorie(); };
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleSaveAnagrafica = useCallback(async (data: Partial<Tecnico>) => {
        setSaving(true);
        try {
            if (data.id) {
                // Aggiornamento di un tecnico esistente
                const { id, ...rest } = data;
                await updateDoc(doc(db, 'tecnici', id), rest as any);
                setSnackbar({ open: true, message: 'Anagrafica tecnico aggiornata con successo!', severity: 'success' });
            } else {
                // Creazione di un nuovo tecnico
                await addDoc(collection(db, 'tecnici'), data);
                setSnackbar({ open: true, message: 'Nuovo tecnico aggiunto all\'anagrafica!', severity: 'success' });
            }
        } catch (error: any) {
            setSnackbar({ open: true, message: `Errore: ${error.message}`, severity: 'error' });
        } finally {
            setSaving(false);
            setFormOpen(false);
            setSelectedTecnico(null);
        }
    }, []);

    const handleStatusChange = async (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => {
        if (!tecnico.id) return;
        await updateDoc(doc(db, 'tecnici', tecnico.id), { attivo: event.target.checked });
    };

    const handleOpenForm = (tecnico: Tecnico | null = null) => {
        setSelectedTecnico(tecnico);
        setFormOpen(true);
    };
    
    const handleViewDetails = (tecnico: Tecnico) => {
        const dettagli: { label: string, value: string | undefined }[] = [
            { label: 'Cognome', value: tecnico.cognome },
            { label: 'Nome', value: tecnico.nome },
            { label: 'Email', value: tecnico.email || '-' },
            { label: 'Ditta', value: tecnico.id_ditta ? ditteMap.get(tecnico.id_ditta) : 'N/D' },
            { label: 'Categoria', value: tecnico.id_categoria ? categorieMap.get(tecnico.id_categoria) : 'N/D' },
        ];
        setItemToView({ titolo: `Dettaglio Anagrafica: ${tecnico.nome} ${tecnico.cognome}`, dettagli });
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
        try {
            await deleteDoc(doc(db, 'tecnici', tecnicoToDelete.id));
            setSnackbar({ open: true, message: 'Tecnico eliminato dall\'anagrafica.', severity: 'success' });
        } catch (error: any) {
             setSnackbar({ open: true, message: `Errore durante l'eliminazione: ${error.message}`, severity: 'error' });
        } finally {
            setDeleteDialogOpen(false);
            setTecnicoToDelete(null);
        }
    };

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={handleTabChange} centered>
                    <Tab label="Gestione Anagrafica Tecnici" />
                    <Tab label="Gestione Accesso App" />
                </Tabs>
            </Box>

            {currentTab === 0 && (
                <TecniciList 
                    tecnici={tecnici}
                    ditteMap={ditteMap}
                    categorieMap={categorieMap}
                    onViewDetails={handleViewDetails}
                    onStatusChange={handleStatusChange}
                    onEdit={handleOpenForm} // Aggiunto onEdit per coerenza
                    onDelete={(e, id) => handleOpenDeleteDialog(e, id)}
                    onAdd={() => handleOpenForm(null)}
                />
            )}
            {currentTab === 1 && (
                 <SincronizzatiApp />
            )}
            
            <TecnicoForm open={isFormOpen} onClose={() => { setFormOpen(false); setSelectedTecnico(null); }} onSave={handleSaveAnagrafica} tecnico={selectedTecnico} ditte={ditte} categorie={categorie} isSaving={saving}/>
            {itemToView && <DettaglioItemDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} items={itemToView.dettagli as any} title={itemToView.titolo} />}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}><DialogTitle>Conferma Eliminazione Anagrafica</DialogTitle><DialogContent><DialogContentText>Sei sicuro di voler eliminare dall'anagrafica <b>{tecnicoToDelete?.nome} {tecnicoToDelete?.cognome}</b>? Questa azione non elimina l'account utente.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button><Button onClick={handleConfirmDelete} color="error">Elimina</Button></DialogActions></Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}><Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert></Snackbar>
        </Box>
    );
};

export default GestioneTecnici;
