
import { useState, useEffect, useMemo } from 'react';
import { doc, addDoc, updateDoc, deleteDoc, serverTimestamp, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, Alert, CircularProgress, Tabs, Tab
} from '@mui/material';
import TecnicoForm from '@/components/Tecnici/TecnicoForm';
import DettaglioItemDialog from '@/components/common/DettaglioItemDialog';
import TecniciList from '@/components/Tecnici/TecniciList';
import SincronizzatiApp from '@/components/Tecnici/SincronizzatiApp';
import { TECNICI_SCADENZE_FIELDS } from '@/utils/scadenze';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import dayjs from 'dayjs';

interface ItemToView {
    titolo: string;
    dettagli: { label: string; value: string }[];
}

// Funzione helper per formattare date o restituire un placeholder
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
        const unsubCategorie = onSnapshot(collection(db, 'categorie'), snapshot => setCategorie(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Categoria))), err => console.error("Errore caricamento categorie:", err));

        return () => { unsubTecnici(); unsubDitte(); unsubCategorie(); };
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setCurrentTab(newValue);
    const refreshData = () => {};

    const handleSave = async (data: Partial<Tecnico>) => {
        try {
            const dataToSave = { ...data, lastModified: serverTimestamp() };
            if (selectedTecnico?.id) {
                await updateDoc(doc(db, 'tecnici', selectedTecnico.id), dataToSave);
                setSnackbar({ open: true, message: 'Tecnico aggiornato!', severity: 'success' });
            } else {
                await addDoc(collection(db, 'tecnici'), { ...dataToSave, attivo: true, sincronizzazioneAttiva: false });
                setSnackbar({ open: true, message: 'Tecnico creato!', severity: 'success' });
            }
        } catch (dbError) {
            console.error("Errore salvataggio:", dbError);
            setSnackbar({ open: true, message: "Errore nel salvataggio.", severity: 'error' });
        }
        setFormOpen(false);
        setSelectedTecnico(null);
    };

    const handleStatusChange = async (event: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => {
        if (!tecnico.id) return;
        const nuovoStato = event.target.checked;
        // Aggiornamento ottimistico dell'UI
        setTecnici(prev => prev.map(t => t.id === tecnico.id ? { ...t, attivo: nuovoStato } : t));
        try {
            await updateDoc(doc(db, 'tecnici', tecnico.id), { attivo: nuovoStato });
            // Il listener onSnapshot aggiornerà lo stato definitivo,
            // ma l'aggiornamento ottimistico rende l'UI più reattiva.
        } catch (error) {
            console.error("Errore aggiornamento stato:", error);
            setSnackbar({ open: true, message: 'Errore: impossibile aggiornare lo stato.', severity: 'error' });
            // Ripristino in caso di errore
            setTecnici(prev => prev.map(t => t.id === tecnico.id ? { ...t, attivo: !nuovoStato } : t));
        }
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
            { label: 'Codice Fiscale', value: tecnico.codiceFiscale || '-' },
            { label: 'Indirizzo', value: `${tecnico.indirizzo || '-'}, ${tecnico.citta || '-'} ${tecnico.cap || ''} (${tecnico.provincia || '-'})` },
            { label: 'Email', value: tecnico.email || '-' },
            { label: 'Telefono', value: tecnico.telefono || '-' },
            { label: "Carta d'Identità", value: `${tecnico.numeroCartaIdentita || '-'} (Scad. ${formatDetailDate(tecnico.scadenzaCartaIdentita)})` },
            { label: "Passaporto", value: `${tecnico.numeroPassaporto || '-'} (Scad. ${formatDetailDate(tecnico.scadenzaPassaporto)})` },
            { label: "Patente", value: `${tecnico.numeroPatente || '-'} [${tecnico.categoriaPatente || '-'}] (Scad. ${formatDetailDate(tecnico.scadenzaPatente)})` },
            { label: "CQC", value: `${tecnico.numeroCQC || '-'} (Scad. ${formatDetailDate(tecnico.scadenzaCQC)})` },
            { label: 'Ditta', value: ditteMap.get(tecnico.dittaId || '') || 'N/A' },
            { label: 'Categoria', value: categorieMap.get(tecnico.categoriaId || '') || 'N/D' },
            { label: 'Contratto', value: `${tecnico.tipoContratto || '-'} (dal ${formatDetailDate(tecnico.dataAssunzione)})` },
            { label: 'Scadenza Contratto', value: formatDetailDate(tecnico.scadenzaContratto) },
            { label: 'Scadenza UNILAV', value: formatDetailDate(tecnico.scadenzaUnilav) },
            { label: 'Scad. Visita Medica', value: formatDetailDate(tecnico.scadenzaVisita) },
            { label: 'Scad. Corso Sicurezza', value: formatDetailDate(tecnico.scadenzaCorsoSicurezza) },
            { label: 'Scad. Primo Soccorso', value: formatDetailDate(tecnico.scadenzaPrimoSoccorso) },
            { label: 'Scad. Antincendio', value: formatDetailDate(tecnico.scadenzaAntincendio) },
            { label: 'Stato', value: tecnico.attivo ? 'Attivo' : 'Non Attivo' },
            { label: 'Sync App', value: tecnico.sincronizzazioneAttiva ? 'Attiva' : 'Non Attiva' },
        ];
        setItemToView({ titolo: `Dettaglio Tecnico: ${tecnico.nome} ${tecnico.cognome}`, dettagli });
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
        setSnackbar({ open: true, message: `Tecnico eliminato.`, severity: 'success' });
        setDeleteDialogOpen(false);
        setTecnicoToDelete(null);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs value={currentTab} onChange={handleTabChange}>
                    <Tab label="Gestione Completa" />
                    <Tab label="Accesso App" />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, pt: 3, overflow: 'hidden' }}>
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
            </Box>
            
            <TecnicoForm open={isFormOpen} onClose={() => { setFormOpen(false); setSelectedTecnico(null); }} onSave={handleSave} tecnico={selectedTecnico} ditte={ditte} categorie={categorie}/>
            {itemToView && <DettaglioItemDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} items={itemToView.dettagli} title={itemToView.titolo} />}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}><DialogTitle>Conferma Eliminazione</DialogTitle><DialogContent><DialogContentText>Sei sicuro di voler eliminare il tecnico <b>{tecnicoToDelete?.nome} {tecnicoToDelete?.cognome}</b>? L&apos;azione è irreversibile.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button><Button onClick={handleConfirmDelete} color="error" variant="contained">Elimina</Button></DialogActions></Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>
        </Box>
    );
};

export default GestioneTecnici;
