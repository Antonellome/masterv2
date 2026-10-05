import React, { useState, useEffect, useMemo } from 'react';
import {
    DialogContent, DialogTitle, DialogActions, Autocomplete, Button, CircularProgress, Grid, Alert, 
    Divider, Box, Chip, TextField, Typography, Paper
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { Timestamp } from 'firebase/firestore';
import { Rapportino, Tecnico, Nave, Luogo, Veicolo, DettaglioOreTecnici } from '@/models/definitions';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { parseToDayjs } from '@/utils/dateUtils';
import GestoreOrariTecnico from './GestoreOrariTecnico';

dayjs.locale('it');

interface RapportinoFormProps {
    rapportino: Rapportino | null;
    initialDate?: dayjs.Dayjs;
    onClose: () => void; // onClose è di nuovo necessaria per la coerenza
}

// Stato iniziale per un nuovo rapportino
const getInitialState = (initialDate?: dayjs.Dayjs, defaultTecnicoId?: string) => ({
    data: initialDate || dayjs(),
    tecnicoScriventeId: defaultTecnicoId || '',
    tipoGiornataId: '',
    naveId: null as string | null,
    luogoId: null as string | null,
    veicoloId: null as string | null,
    lavoroEseguito: '',
    materialiImpiegati: '',
    dettaglioOreTecnici: [] as DettaglioOreTecnici[],
    presenze: defaultTecnicoId ? [defaultTecnicoId] : [],
    ordineLavoro: '',
    descrizioneBreve: '',
    includeTrasferta: false,
});

const RapportinoForm: React.FC<RapportinoFormProps> = ({ rapportino, initialDate, onClose }) => {
    
    const {
        tecnici, navi, luoghi, veicoli, tipiGiornata, tipiGiornataMap
    } = useRapportiniStore(state => ({
        tecnici: state.tecnici,
        navi: state.navi,
        luoghi: state.luoghi,
        veicoli: state.veicoli,
        tipiGiornata: state.tipiGiornata,
        tipiGiornataMap: state.tipiGiornataMap,
    }));

    // Unico stato per il form
    const [formState, setFormState] = useState(getInitialState(initialDate, tecnici[0]?.id));

    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);

    // --- EFFETTO CHIAVE PER IL RESET DEL FORM ---
    // Questo effect si attiva ogni volta che `rapportino` cambia.
    // Resetta lo stato del form con i dati del nuovo rapportino (se in modifica)
    // o con i valori iniziali (se in creazione).
    useEffect(() => {
        if (rapportino) {
            // Modalità Modifica: popola il form con i dati esistenti
            setFormState({
                data: parseToDayjs(rapportino.data),
                tecnicoScriventeId: rapportino.tecnicoScriventeId || '',
                tipoGiornataId: rapportino.tipoGiornataId || '',
                naveId: rapportino.naveId || null,
                luogoId: rapportino.luogoId || null,
                veicoloId: rapportino.veicoloId || null,
                lavoroEseguito: rapportino.lavoroEseguito || '',
                materialiImpiegati: rapportino.materialiImpiegati || '',
                dettaglioOreTecnici: rapportino.dettaglioOreTecnici || [],
                presenze: rapportino.presenze || [],
                ordineLavoro: rapportino.ordineLavoro || '',
                descrizioneBreve: rapportino.descrizioneBreve || '',
                includeTrasferta: rapportino.includeTrasferta || false,
            });
        } else {
            // Modalità Creazione: resetta il form allo stato iniziale
            setFormState(getInitialState(initialDate, tecnici[0]?.id));
        }
    }, [rapportino, initialDate, tecnici]); // Dipende da `rapportino` per triggerare il reset

    const handleStateChange = (field: keyof typeof formState, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };
    
    // Aggiorna le presenze quando i tecnici cambiano
    useEffect(() => {
        const ids = formState.dettaglioOreTecnici.map(d => d.tecnicoId);
        if (formState.tecnicoScriventeId) {
            handleStateChange('presenze', [...new Set([formState.tecnicoScriventeId, ...ids].filter(Boolean))]);
        } else {
             handleStateChange('presenze', [...new Set(ids.filter(Boolean))]);
        }
    }, [formState.dettaglioOreTecnici, formState.tecnicoScriventeId]);


    const handleSubmit = async () => {
        const hasErrors = formState.dettaglioOreTecnici.some(d => (d as any).error);
        if (hasErrors) {
            setFormError("Sono presenti errori negli orari dei tecnici. Correggere prima di salvare.");
            return;
        }

        if (!formState.tecnicoScriventeId || !formState.tipoGiornataId || !formState.data) {
            setFormError("Compilare i campi obbligatori: Tecnico, Data e Tipo Giornata.");
            return;
        }
        if (!formState.lavoroEseguito.trim()) {
            setFormError("Il campo 'Lavoro Eseguito' è obbligatorio.");
            return;
        }

        setFormError(null);
        setIsSaving(true);

        try {
            const dataToSave: Partial<Rapportino> = {
                ...formState,
                data: Timestamp.fromDate(formState.data.toDate()),
                tecnicoId: formState.tecnicoScriventeId, // Assicura coerenza
                oreLavoro: formState.dettaglioOreTecnici.reduce((sum, d) => sum + (d.ore || 0), 0),
                updatedAt: Timestamp.now(),
                version: (rapportino?.version || 0) + 1,
            };
            
            if (rapportino && rapportino.id) {
                await rapportinoCloudService.update(rapportino.id, dataToSave);
            } else {
                await rapportinoCloudService.create({
                    ...dataToSave,
                    createdAt: Timestamp.now(),
                    completed: false,
                    isLocked: false,
                    isDeleted: false,
                });
            }
            onClose(); // Usa la prop onClose passata dal controller
        } catch (e: any) {
            console.error("Errore durante il salvataggio: ", e);
            setFormError(`Errore durante il salvataggio: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!tecnici.length || !tipiGiornata.length) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;
    
    // Valori derivati per gli Autocomplete, basati sull'unico stato del form
    const selectedTecnico = useMemo(() => tecniciMap.get(formState.tecnicoScriventeId) || null, [formState.tecnicoScriventeId, tecniciMap]);
    const selectedTipoGiornata = useMemo(() => tipiGiornataMap.get(formState.tipoGiornataId) || null, [formState.tipoGiornataId, tipiGiornataMap]);
    const selectedNave = useMemo(() => navi.find(n => n.id === formState.naveId) || null, [formState.naveId, navi]);
    const selectedLuogo = useMemo(() => luoghi.find(l => l.id === formState.luogoId) || null, [formState.luogoId, luoghi]);
    const selectedVeicolo = useMemo(() => veicoli.find(v => v.id === formState.veicoloId) || null, [formState.veicoloId, veicoli]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <DialogTitle>{rapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {formError && <Grid item xs={12}><Alert severity="error" sx={{whiteSpace: 'pre-wrap'}}>{formError}</Alert></Grid>}
                    
                    <Grid item xs={12}><Divider><Chip label="Dati Principali" /></Divider></Grid>
                    <Grid item xs={12} md={4}><DatePicker label="Data" value={formState.data} onChange={v => handleStateChange('data', v)} sx={{ width: '100%' }} /></Grid>
                    <Grid item xs={12} md={8}><Autocomplete value={selectedTipoGiornata} onChange={(_, v) => handleStateChange('tipoGiornataId', v?.id || '')} options={[...tipiGiornata]} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Tipo Giornata" required />} /></Grid>
                    <Grid item xs={12} md={8}><Autocomplete value={selectedTecnico} onChange={(_, v) => handleStateChange('tecnicoScriventeId', v?.id || '')} options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Tecnico" required />} /></Grid>
                    <Grid item xs={12} md={4}><TextField label="Ordine di Lavoro" value={formState.ordineLavoro} onChange={e => handleStateChange('ordineLavoro', e.target.value)} fullWidth /></Grid>
                    
                    <Grid item xs={12}><Divider sx={{ my: 2 }}><Chip label="Orari Tecnici Coinvolti" /></Divider></Grid>
                    <Grid item xs={12}>
                       <GestoreOrariTecnico dettaglioOreTecnici={formState.dettaglioOreTecnici} setDettaglioOreTecnici={v => handleStateChange('dettaglioOreTecnici', v)} tecniciDisponibili={sortedTecnici} isReadOnly={isSaving} />
                    </Grid>

                    <Grid item xs={12}><Divider sx={{ my: 2 }}><Chip label="Dettagli Intervento" /></Divider></Grid>
                    <Grid item xs={12} md={4}><Autocomplete value={selectedNave} onChange={(_,v) => handleStateChange('naveId', v?.id || null)} options={navi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Nave" />} /></Grid>
                    <Grid item xs={12} md={4}><Autocomplete value={selectedLuogo} onChange={(_,v) => handleStateChange('luogoId', v?.id || null)} options={luoghi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Luogo" />} /></Grid>
                    <Grid item xs={12} md={4}><Autocomplete value={selectedVeicolo} onChange={(_,v) => handleStateChange('veicoloId', v?.id || null)} options={veicoli} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Veicolo" />} /></Grid>
                    <Grid item xs={12}><TextField label="Lavoro Eseguito" value={formState.lavoroEseguito} onChange={e => handleStateChange('lavoroEseguito', e.target.value)} fullWidth multiline rows={6} required /></Grid>
                    <Grid item xs={12}><TextField label="Materiali Impiegati" value={formState.materialiImpiegati} onChange={e => handleStateChange('materialiImpiegati', e.target.value)} fullWidth multiline rows={3} /></Grid>
                    <Grid item xs={12}><TextField label="Descrizione Breve (per lista)" value={formState.descrizioneBreve} onChange={e => handleStateChange('descrizioneBreve', e.target.value)} fullWidth /></Grid>

                    {rapportino?.firmaVettoriale && (
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }}><Chip label="Firma Cliente" /></Divider>
                            <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                                <Typography variant="h6" gutterBottom>Report già Firmato</Typography>
                                <img src={rapportino.firmaVettoriale} alt="Firma" style={{ width: '300px', height: '150px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }} />
                                {(rapportino.firmaFirmatarioNome || rapportino.firmaFirmatarioSocieta) && (
                                   <Typography variant="body1" sx={{ mt: 1 }}>
                                       Da: <strong>{rapportino.firmaFirmatarioNome}</strong> {rapportino.firmaFirmatarioSocieta && `(${rapportino.firmaFirmatarioSocieta})`}
                                   </Typography>
                                )}
                            </Paper>
                        </Grid>
                    )}

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Annulla</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving || !tecnici.length}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button>
            </DialogActions>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
