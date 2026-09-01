import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Typography, Button, Grid, Paper, TextField, Autocomplete,
    Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Rapportino, TipoGiornata, Tecnico, DettaglioOreTecnici } from '@/models/definitions';
import { logger } from '@/utils/logger';
import SignatureDialog from '@/components/SignatureDialog';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';

dayjs.locale('it');

// Placeholder per la sincronizzazione cloud
const handleCloudSync = async (operation: 'create' | 'update', collectionName: string, data: any) => {
    logger.log(`[Cloud Sync] ${operation} su ${collectionName}:`, data);
    return Promise.resolve(crypto.randomUUID()); // Simula il ritorno di un nuovo ID
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom component="div">{title}</Typography>
        <Grid container spacing={2}>{children}</Grid>
    </Paper>
);

const isGiornataLavorativa = (tipo?: TipoGiornata): boolean => !tipo || !['ferie', 'malattia', 'permesso'].includes(tipo.categoria || '');

// *** STATO UNIFICATO PER IL FORM ***
type FormState = Partial<Rapportino>;

const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id: reportId } = useParams<{ id: string }>();
    const isNewMode = !reportId || reportId === 'new';

    // 1. CARICAMENTO DATI REATTIVO DA DEXIE
    const anagrafiche = useLiveQuery(() => Promise.all([
        db.tecnici.toArray(), db.veicoli.toArray(), db.navi.toArray(), db.luoghi.toArray(), db.tipiGiornata.toArray()
    ]), []);
    const [tecnici, veicoli, navi, luoghi, tipiGiornata] = anagrafiche || [[], [], [], [], []];

    const initialRapportino = useLiveQuery(() => isNewMode ? Promise.resolve(undefined) : db.rapportini.get(reportId!), [reportId]);

    const [formState, setFormState] = useState<FormState>({});
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' as const });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreTecnici | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const pageLoading = !anagrafiche || (isNewMode ? false : initialRapportino === undefined);

    // 2. POPOLAMENTO INIZIALE DEL FORM
    useEffect(() => {
        if (isNewMode) {
            setFormState({ data: new Date(), dettaglioOreTecnici: [] });
        } else if (initialRapportino) {
            setFormState(initialRapportino);
        }
    }, [initialRapportino, isNewMode]);

    // Helper per aggiornare lo stato del form
    const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleTecnicoResponsabileChange = (_: any, nuovoTecnico: Tecnico | null) => {
        const nuovoId = nuovoTecnico?.id;
        updateField('tecnicoId', nuovoId);
        if (nuovoId && nuovoTecnico) {
            updateField('dettaglioOreTecnici', [{ tecnicoId: nuovoId, nome: `${nuovoTecnico.cognome} ${nuovoTecnico.nome}` }]);
        } else {
            updateField('dettaglioOreTecnici', []);
        }
    };
    
    // Gestione altri tecnici, ore, firma... (logica adattata allo stato unificato)
    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabili = formState.dettaglioOreTecnici?.filter(d => d.tecnicoId === formState.tecnicoId) || [];
        const nuoviDettagli = nuoviTecnici.map(t => {
            const esistente = formState.dettaglioOreTecnici?.find(d => d.tecnicoId === t.id);
            return esistente || { tecnicoId: t.id, nome: `${t.cognome} ${t.nome}` };
        });
        updateField('dettaglioOreTecnici', [...responsabili, ...nuoviDettagli]);
    };
    
    const removeTecnico = (idToRemove: string) => {
        if (idToRemove === formState.tecnicoId) return;
        updateField('dettaglioOreTecnici', formState.dettaglioOreTecnici?.filter(d => d.tecnicoId !== idToRemove));
    };

    const handleOreUpdate = (updatedData: DettaglioOreTecnici) => {
        updateField('dettaglioOreTecnici', formState.dettaglioOreTecnici?.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d));
        setIsModalOpen(false);
    };
    
    // 3. SALVATAGGIO SU DEXIE (E POI CLOUD)
    const handleSubmit = async () => {
        if (!formState.tecnicoId || !formState.tipoGiornataId || !formState.data) {
            setNotification({ open: true, message: "Compila campi obbligatori: Tecnico, Data, Tipo Giornata.", severity: "warning" });
            return;
        }
        setIsSaving(true);
        try {
            const dataToSave: Rapportino = { ...formState, id: formState.id || crypto.randomUUID() } as Rapportino;

            if (isNewMode) {
                await db.rapportini.add(dataToSave);
                await handleCloudSync('create', 'rapportini', dataToSave);
                setNotification({ open: true, message: "Rapportino creato!", severity: "success" });
            } else {
                await db.rapportini.update(reportId!, dataToSave);
                await handleCloudSync('update', 'rapportini', dataToSave);
                setNotification({ open: true, message: "Rapportino aggiornato!", severity: "success" });
            }
            navigate('/rapportini');
        } catch (error) {
            logger.error("Errore salvataggio rapportino", error);
            setNotification({ open: true, message: "Errore durante il salvataggio.", severity: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    // Dati derivati e memoizzati
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);
    const selectedTipoGiornata = tipiGiornataMap.get(formState.tipoGiornataId || '');
    const isLavorativo = isGiornataLavorativa(selectedTipoGiornata);

    if (pageLoading) return <CircularProgress />;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h4" gutterBottom>{isNewMode ? 'Nuovo Rapportino' : 'Modifica Rapportino'}</Typography>
                
                <Section title="Dati Principali">
                    <Grid item xs={12} md={4}><Autocomplete options={tecnici} getOptionLabel={(o) => o.nome} value={tecnici.find(t=>t.id === formState.tecnicoId) || null} onChange={handleTecnicoResponsabileChange} disabled={isSaving || !isNewMode} renderInput={(params) => <TextField {...params} label="Tecnico Resp." required />} /></Grid>
                    <Grid item xs={12} md={4}><DatePicker label="Data" value={dayjs(formState.data)} onChange={d => updateField('data', d?.toDate())} disabled={isSaving} /></Grid>
                    <Grid item xs={12} md={4}><TextField label="Ordine Lavoro" value={formState.ordineLavoro || ''} onChange={e => updateField('ordineLavoro', e.target.value)} fullWidth disabled={isSaving} /></Grid>
                    <Grid item xs={12} md={8}><FormControl fullWidth required><InputLabel>Tipo Giornata</InputLabel><Select value={formState.tipoGiornataId || ''} label="Tipo Giornata" onChange={e => updateField('tipoGiornataId', e.target.value)} disabled={isSaving}>{tipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>
                </Section>

                {isLavorativo && (
                <>
                    { /* Sezioni Tecnici, Dettagli, Firma ... (adattate a formState) */ }
                </>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                   <Button variant="text" onClick={() => navigate('/rapportini')} disabled={isSaving}>Annulla</Button>
                   <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isNewMode ? 'Salva' : 'Aggiorna')}</Button>
                </Box>
            </Box>
            {/* Modali (logica adattata) */}
             <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}><DialogContent>{editingTecnico && <OreLavoroSingoloTecnico datiOre={editingTecnico} onUpdate={handleOreUpdate} isReadOnly={isSaving}/>}</DialogContent></Dialog>
             <SignatureDialog open={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={(sig) => updateField('firmaVettoriale', sig)} />
        </LocalizationProvider>
    );
};

export default RapportinoEdit;
