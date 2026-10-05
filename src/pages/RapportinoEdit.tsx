
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Typography, Button, Paper, TextField, Autocomplete,
    Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Divider, Alert, IconButton
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import DeleteIcon from '@mui/icons-material/Delete';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '@/db/database';
import type { Rapportino, TipoGiornata, Tecnico, DettaglioOreTecnici, Nave, Luogo, Veicolo } from '@/models/definitions';
import { logger } from '@/utils/logger';
import SignatureDialog from '@/components/SignatureDialog';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useGlobalStore } from '@/stores/globalStore';

dayjs.locale('it');

const Section: React.FC<{ title: string; children: React.ReactNode; sx?: object }> = ({ title, children, sx }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, ...sx }}>
        <Typography variant="h6" gutterBottom component="div">{title}</Typography>
        <Grid container spacing={2}>{children}</Grid>
    </Paper>
);

const isGiornataLavorativa = (tipo?: TipoGiornata): boolean => {
    if (!tipo) return true;
    const categoria = tipo.categoria?.toLowerCase() || '';
    const nome = tipo.nome?.toLowerCase() || '';
    return !['ferie', 'malattia', 'permesso'].some(keyword => categoria.includes(keyword) || nome.includes(keyword));
};

const getInitialFormState = (): Partial<Rapportino> & { isMultiDay?: boolean } => ({
    data: new Date(),
    isMultiDay: false,
    includeTrasferta: false,
    tecnicoScriventeId: undefined,
    tipoGiornataId: '',
    ordineLavoro: '',
    naveId: undefined,
    luogoId: undefined,
    veicoloId: undefined,
    descrizioneBreve: '',
    lavoroEseguito: '',
    materialiImpiegati: '',
    dettaglioOreTecnici: [],
    firmaVettoriale: undefined,
});

const getTecnicoLabel = (option: Tecnico | string) => typeof option === 'string' ? '' : `${option.cognome} ${option.nome}`;
const getVeicoloLabel = (option: Veicolo | string) => {
    if (typeof option === 'string' || !option?.id) return '';
    return [option.marca, option.modello, option.targa ? `(${option.targa})` : ' '].filter(Boolean).join(' ');
};

const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id: reportId } = useParams<{ id: string }>();
    const isNewMode = !reportId || reportId === 'new';

    const allData = useLiveQuery(() => Promise.all([
        db.tecnici.toArray(), db.veicoli.toArray(), db.navi.toArray(), db.luoghi.toArray(), db.tipiGiornata.toArray(),
        isNewMode ? Promise.resolve(undefined) : db.rapportini.get(reportId!)
    ]), [reportId, isNewMode]);
    const [tecnici, veicoli, navi, luoghi, allTipiGiornata, initialRapportino] = allData || [[], [], [], [], [], undefined];

    const [formState, setFormState] = useState<Partial<Rapportino> & { isMultiDay?: boolean }>(getInitialFormState());
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string, severity: 'success' | 'error' | 'warning' } | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [altroTecnicoInput, setAltroTecnicoInput] = useState<Tecnico | null>(null); 

    const pageLoading = !allData;

    const selectedTipoGiornata = useMemo(() => allTipiGiornata.find(t => t.id === formState.tipoGiornataId), [allTipiGiornata, formState.tipoGiornataId]);

    useEffect(() => {
        if (!pageLoading && !isNewMode && initialRapportino) {
            setFormState(initialRapportino);
        } else if (!pageLoading && isNewMode) {
            setFormState(getInitialFormState());
        }
    }, [pageLoading, isNewMode, initialRapportino]);

    const updateField = useCallback(<K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleOreUpdate = useCallback((updatedData: DettaglioOreTecnici) => {
        setFormState(prev => {
            const newDettagli = (prev.dettaglioOreTecnici || []).map(d => 
                d.tecnicoId === updatedData.tecnicoId ? updatedData : d
            );
            return { ...prev, dettaglioOreTecnici: newDettagli };
        });
    }, []);
    
    const handleTecnicoResponsabileChange = (_: any, nuovoTecnico: Tecnico | null) => {
        const nuovoId = nuovoTecnico?.id;
        const oldId = formState.tecnicoScriventeId;
        updateField('tecnicoScriventeId', nuovoId);
        
        let dettagli = formState.dettaglioOreTecnici || [];
        const isLavorativoAttuale = isGiornataLavorativa(selectedTipoGiornata);

        // Rimuove sia il vecchio che il (potenziale) nuovo tecnico per evitare duplicati
        dettagli = dettagli.filter(d => d.tecnicoId !== oldId && d.tecnicoId !== nuovoId);

        if (nuovoId) {
            const defaultOre = isLavorativoAttuale
                ? { tecnicoId: nuovoId, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8, isManual: false } 
                : { tecnicoId: nuovoId, ore: 8, isManual: true };
            updateField('dettaglioOreTecnici', [...dettagli, defaultOre]);
        }
    };
    
    const handleAddAltroTecnico = (_: any, nuovoTecnico: Tecnico | null) => {
        if (!nuovoTecnico) return;

        const isLavorativoLocale = isGiornataLavorativa(selectedTipoGiornata);
        const nuovoDettaglio = isLavorativoLocale
            ? { tecnicoId: nuovoTecnico.id, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8, isManual: false }
            : { tecnicoId: nuovoTecnico.id, ore: 8, isManual: true };

        updateField('dettaglioOreTecnici', [...(formState.dettaglioOreTecnici || []), nuovoDettaglio]);
        setAltroTecnicoInput(null); 
    };
    
    const removeAltriTecnico = (tecnicoToRemoveId: string) => {
        updateField('dettaglioOreTecnici', 
            (formState.dettaglioOreTecnici || []).filter(d => d.tecnicoId !== tecnicoToRemoveId)
        );
    };

    const sortedTecnici = useMemo(() => (tecnici || []).slice().sort((a, b) => (getTecnicoLabel(a) || '').localeCompare(getTecnicoLabel(b) || '')), [tecnici]);
    const sortedNavi = useMemo(() => (navi || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => (luoghi || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [luoghi]);
    const sortedVeicoli = useMemo(() => (veicoli || []).slice().sort((a, b) => (getVeicoloLabel(a) || '').localeCompare(getVeicoloLabel(b) || '')), [veicoli]);

    const { tipiGiornata, trasferte } = useMemo(() => {
        if (!allTipiGiornata) return { tipiGiornata: [], trasferte: [] };
        const trasferteFiltered = allTipiGiornata.filter(t => t.categoria === 'trasferta' || (t.nome || '').toLowerCase().includes('trasferta'));
        const tipiGiornataFiltered = allTipiGiornata.filter(t => !trasferteFiltered.find(tf => tf.id === t.id));
        tipiGiornataFiltered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        trasferteFiltered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
        return { tipiGiornata: tipiGiornataFiltered, trasferte: trasferteFiltered };
    }, [allTipiGiornata]);

    const tipiGiornataSelezionabili = useMemo(() => 
        formState.isMultiDay ? tipiGiornata.filter(t => !isGiornataLavorativa(t)) : tipiGiornata
    , [formState.isMultiDay, tipiGiornata]);

    const isLavorativo = isGiornataLavorativa(selectedTipoGiornata);
    
    const dettaglioScrivente = useMemo(() => 
        (formState.dettaglioOreTecnici || []).find(d => d.tecnicoId === formState.tecnicoScriventeId)
    , [formState.dettaglioOreTecnici, formState.tecnicoScriventeId]);

    const altriTecniciDettagli = useMemo(() => 
        (formState.dettaglioOreTecnici || []).filter(d => d.tecnicoId !== formState.tecnicoScriventeId)
    , [formState.dettaglioOreTecnici, formState.tecnicoScriventeId]);

    const handleSubmit = async () => {
        if (!formState.tecnicoScriventeId || !formState.data || !formState.tipoGiornataId) {
            setNotification({ message: "Compila i campi obbligatori: Tecnico, Data e Tipo Giornata.", severity: 'warning' });
            return;
        }
        setIsSaving(true);

        const { isMultiDay, ...dataToSave } = formState;

        try {
            if (isNewMode) {
                 await rapportinoCloudService.create(dataToSave);
            } else {
                await rapportinoCloudService.update({ ...dataToSave, id: reportId } as Rapportino);
            }

            await useGlobalStore.getState().syncCollectionByName('rapportini');
            setNotification({ message: `Report ${isNewMode ? 'creato' : 'aggiornato'} con successo!`, severity: 'success' });
            setTimeout(() => navigate('/reportistica'), 1500);
        } catch (error: any) {
            logger.error("Salvataggio fallito", error);
            setNotification({ message: error.message || 'Errore durante il salvataggio.', severity: 'error' });
            setIsSaving(false);
        }
    };

    if (pageLoading) return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
                <Paper sx={{p:3}} elevation={3}>
                    <Typography variant="h4" fontWeight="bold" align="center">Tecnologie Industriali Navali</Typography>
                    <Typography variant="h6" align="center">Report Intervento</Typography>
                    <Divider sx={{ my: 2, borderColor: 'primary.main', borderWidth: 1 }} />

                    <Section title="Dati Principali">
                        {isNewMode && <Grid xs={12}><FormControlLabel control={<Switch checked={formState.isMultiDay || false} onChange={e => updateField('isMultiDay', e.target.checked)} />} label="Crea per più giorni (solo Ferie/Malattia)" /></Grid>}
                        <Grid xs={12} sm={6} md={3}><DatePicker label={formState.isMultiDay ? "Dal" : "Data"} value={formState.data ? dayjs(formState.data) : null} onChange={d => updateField('data', d?.toDate())} sx={{ width: '100%' }} required /></Grid>
                        {formState.isMultiDay && <Grid xs={12} sm={6} md={3}><DatePicker label="Al" value={formState.dataFine ? dayjs(formState.dataFine) : null} onChange={d => updateField('dataFine', d?.toDate())} sx={{ width: '100%' }} /></Grid>}
                        <Grid xs={12} sm={formState.isMultiDay ? 12 : 6} md={3}><FormControl fullWidth required><InputLabel>Tipo Giornata</InputLabel><Select value={formState.tipoGiornataId || ''} label="Tipo Giornata" onChange={e => updateField('tipoGiornataId', e.target.value)} disabled={isSaving}>{tipiGiornataSelezionabili.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>
                        <Grid xs={12} md={6}><Autocomplete options={sortedTecnici || []} getOptionLabel={getTecnicoLabel} value={(tecnici || []).find(t => t.id === formState.tecnicoScriventeId) || null} onChange={handleTecnicoResponsabileChange} disabled={isSaving} renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} md={6}><TextField label="Ordine di Lavoro" value={formState.ordineLavoro || ''} onChange={e => updateField('ordineLavoro', e.target.value)} fullWidth disabled={isSaving} /></Grid>
                        <Grid xs={12} md={6}><FormControlLabel control={<Switch checked={formState.includeTrasferta || false} onChange={e => updateField('includeTrasferta', e.target.checked)} disabled={isSaving} />} label="Aggiungi Trasferta" /></Grid>
                        {formState.includeTrasferta && <Grid xs={12} md={6}><FormControl fullWidth><InputLabel>Tipo di Trasferta</InputLabel><Select value={formState.trasfertaId || ''} label="Tipo di Trasferta" onChange={e => updateField('trasfertaId', e.target.value)} disabled={isSaving}>{trasferte.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>}
                    </Section>

                    {isLavorativo && !formState.isMultiDay && (
                        <>
                             {dettaglioScrivente && (
                                <Section title="Orari Tecnico Scrivente">
                                    <Grid xs={12}>
                                        <OreLavoroSingoloTecnico datiIniziali={dettaglioScrivente} onUpdate={handleOreUpdate} tipoGiornata={selectedTipoGiornata} isReadOnly={isSaving} />
                                    </Grid>
                                </Section>
                            )}

                            <Section title="Altri Tecnici Coinvolti">
                                <Grid xs={12}>
                                    <Autocomplete
                                        value={altroTecnicoInput}
                                        options={(sortedTecnici || []).filter(t => 
                                            t.id !== formState.tecnicoScriventeId && 
                                            !altriTecniciDettagli.some(at => at.tecnicoId === t.id)
                                        )}
                                        getOptionLabel={getTecnicoLabel}
                                        onChange={handleAddAltroTecnico}
                                        renderInput={(params) => <TextField {...params} label="Aggiungi un altro tecnico" />}
                                        disabled={isSaving || !formState.tecnicoScriventeId}
                                        isOptionEqualToValue={(o, v) => o.id === v.id}
                                    />
                                </Grid>
                                {altriTecniciDettagli.map(dettaglio => {
                                    const tecnico = (tecnici || []).find(t => t.id === dettaglio.tecnicoId);
                                    return (
                                        <Grid xs={12} key={dettaglio.tecnicoId} sx={{ mt: 2 }}>
                                            <Paper variant="outlined" sx={{ p: 2, position: 'relative' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">{tecnico ? getTecnicoLabel(tecnico) : 'Sconosciuto'}</Typography>
                                                    <IconButton size="small" onClick={() => removeAltriTecnico(dettaglio.tecnicoId)}><DeleteIcon /></IconButton>
                                                </Box>
                                                <OreLavoroSingoloTecnico datiIniziali={dettaglio} onUpdate={handleOreUpdate} tipoGiornata={selectedTipoGiornata} isReadOnly={isSaving} />
                                            </Paper>
                                        </Grid>
                                    );
                                })}
                            </Section>
                            
                            <Section title="Dettagli Intervento">
                                <Grid xs={12} md={6}><Autocomplete options={sortedNavi || []} getOptionLabel={o => o.nome || ''} value={navi.find(v => v.id === formState.naveId) || null} onChange={(_, val) => updateField('naveId', val?.id)} renderInput={params => <TextField {...params} label="Nave" required={isLavorativo} />} isOptionEqualToValue={(o,v) => o.id === v.id}/></Grid>
                                <Grid xs={12} md={6}><Autocomplete options={sortedLuoghi || []} getOptionLabel={o => o.nome || ''} value={luoghi.find(v => v.id === formState.luogoId) || null} onChange={(_, val) => updateField('luogoId', val?.id)} renderInput={params => <TextField {...params} label="Luogo" required={isLavorativo} />} isOptionEqualToValue={(o,v) => o.id === v.id}/></Grid>
                                <Grid xs={12} md={6}><Autocomplete options={sortedVeicoli || []} getOptionLabel={getVeicoloLabel} value={veicoli.find(v => v.id === formState.veicoloId) || null} onChange={(_, val) => updateField('veicoloId', val?.id)} renderInput={params => <TextField {...params} label="Veicolo" />} isOptionEqualToValue={(o,v) => o.id === v.id}/></Grid>
                                <Grid xs={12}><TextField multiline minRows={3} label="Lavoro Eseguito" value={formState.lavoroEseguito || ''} onChange={e => updateField('lavoroEseguito', e.target.value)} fullWidth required={isLavorativo} /></Grid>
                                <Grid xs={12}><TextField multiline minRows={2} label="Materiali Impiegati" value={formState.materialiImpiegati || ''} onChange={e => updateField('materialiImpiegati', e.target.value)} fullWidth /></Grid>
                                <Grid xs={12}><TextField multiline minRows={2} label="Descrizione Breve (per lista)" value={formState.descrizioneBreve || ''} onChange={e => updateField('descrizioneBreve', e.target.value)} fullWidth /></Grid>
                            </Section>

                             <Section title="Firma Cliente">
                                 <Grid xs={12}>
                                     {formState.firmaVettoriale ? (
                                        <Box sx={{ border: 1, borderColor: 'grey.400', borderRadius: 1, p: 1, textAlign: 'center' }}>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>Firma acquisita:</Typography>
                                            <img 
                                                src={formState.firmaVettoriale}
                                                alt="Firma del cliente" 
                                                style={{ width: '100%', height: 'auto', maxHeight: '150px', objectFit: 'contain' }}
                                            />
                                            {formState.firmaFirmatarioNome && <Typography sx={{mt: 1}}>Firmato da: {formState.firmaFirmatarioNome}</Typography>}
                                        </Box>
                                     ) : (
                                        <Button startIcon={<BorderColorIcon />} variant="outlined" onClick={() => setIsSignatureModalOpen(true)} disabled={isSaving || isNewMode}>
                                            Aggiungi Firma
                                        </Button>
                                     )}
                                </Grid>
                            </Section>
                        </>
                    )}

                    {notification && <Alert severity={notification.severity} sx={{mt: 2}} onClose={() => setNotification(null)}>{notification.message}</Alert>}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                        <Button variant="text" onClick={() => navigate('/reportistica')} disabled={isSaving}>Annulla</Button>
                        <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isNewMode ? 'Crea Report' : 'Aggiorna Report')}</Button>
                    </Box>
                </Paper>
                
                <SignatureDialog open={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={(sig) => updateField('firmaVettoriale', sig)} />
            </Box>
        </LocalizationProvider>
    );
};

export default RapportinoEdit;
