import React, { useState, useMemo, useEffect } from 'react';
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

import { useRapportiniStore } from '@/store/useRapportiniStore'; // CORRETTO
import type { Rapportino, TipoGiornata, Tecnico, DettaglioOreTecnici, ServerRapportinoPayload } from '@/models/definitions'; // CORRETTO
import { rapportinoCloudService } from '@/services/rapportinoCloudService'; // CORRETTO
import SignatureDialog from '@/components/SignatureDialog'; 
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';

dayjs.locale('it');

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {title}
        </Typography>
        <Grid container spacing={2}>
            {children}
        </Grid>
    </Paper>
);

const getCleanId = (id: any): string | undefined => (typeof id === 'string' && id) ? id : undefined;

const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo) return true;
    return !['ferie', 'malattia', 'permesso'].includes(tipo.categoria || '');
};


const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id: reportId } = useParams<{ id: string }>();
    const isNewMode = !reportId || reportId === 'new';
    const isEditMode = !isNewMode;

    const {
        profile, showNotification, addRapportinoToStore, updateRapportinoInStore, getRapportinoById,
        rapportini, tecnici, veicoli, navi, luoghi, tipiGiornata, areAnagraficheLoading,
        tipiGiornataMap
    } = useRapportiniStore(state => state); // CORRETTO

    // State del Form
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [data, setData] = useState<Dayjs | null>(dayjs()); // CORRETTO
    const [tecnicoId, setTecnicoId] = useState<string | null>(null);
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [ordineLavoro, setOrdineLavoro] = useState('');
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [includeTrasferta, setIncludeTrasferta] = useState(false);
    const [trasfertaId, setTrasfertaId] = useState('');
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [dettaglioOreTecnici, setDettaglioOreTecnici] = useState<DettaglioOreTecnici[]>([]); // CORRETTO
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');

    // State per UI e modali
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreTecnici | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreTecnici | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [initialFirma, setInitialFirma] = useState<string | null>(null);

    // Dati derivati
    const tipiGiornataLavorativi = useMemo(() => tipiGiornata.filter(t => t.categoria !== 'trasferta').sort((a,b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);
    const tipiGiornataTrasferta = useMemo(() => tipiGiornata.filter(t => t.categoria === 'trasferta').sort((a,b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);
    const isLavorativo = useMemo(() => isGiornataLavorativa(tipiGiornataMap.get(tipoGiornataId)), [tipoGiornataId, tipiGiornataMap]);

    // --- LOGICA DI CARICAMENTO E POPOLAMENTO RISTRUTTURATA ---
    useEffect(() => {
        if (areAnagraficheLoading || (isEditMode && rapportini.length === 0)) {
            setPageLoading(true);
        } else {
            setPageLoading(false);
        }
    }, [areAnagraficheLoading, isEditMode, rapportini.length]);
    
    useEffect(() => {
        if (isEditMode && !pageLoading && reportId) {
            const reportData = getRapportinoById(reportId);
            if (reportData) {
                setData(dayjs(reportData.data)); // CORRETTO
                setTecnicoId(getCleanId(reportData.tecnicoId) || null);
                setTipoGiornataId(getCleanId(reportData.tipoGiornataId) || '');
                setOrdineLavoro(reportData.ordineLavoro || '');
                setDescrizioneBreve(reportData.descrizioneBreve || '');
                setLavoroEseguito(reportData.lavoroEseguito || '');
                setMaterialiImpiegati(reportData.materialiImpiegati || '');
                setIncludeTrasferta(reportData.includeTrasferta || false);
                setTrasfertaId(getCleanId(reportData.trasfertaId) || '');
                setVeicoloId(getCleanId(reportData.veicoloId) || null);
                setNaveId(getCleanId(reportData.naveId) || null);
                setLuogoId(getCleanId(reportData.luogoId) || null);
                setFirmaVettoriale(reportData.firmaVettoriale || null);
                setInitialFirma(reportData.firmaVettoriale || null);
                setFirmaFirmatarioNome(reportData.firmaFirmatarioNome || '');
                setFirmaFirmatarioSocieta(reportData.firmaFirmatarioSocieta || '');
                const dettagliCaricati = (reportData.dettaglioOreTecnici || []).map(d => ({...d, tecnicoId: getCleanId(d.tecnicoId)!})); // CORRETTO
                setDettaglioOreTecnici(dettagliCaricati);
            } else {
                showNotification("Rapportino non trovato.", "error");
                navigate('/rapportini');
            }
        }
    }, [isEditMode, pageLoading, reportId, getRapportinoById, navigate, showNotification]);

    useEffect(() => {
        if (isNewMode && !areAnagraficheLoading) {
            setTecnicoId(null);
            setDettaglioOreTecnici([]); // CORRETTO
            setData(dayjs()); // CORRETTO
            setTipoGiornataId('');
            setLavoroEseguito('');
            setMaterialiImpiegati('');
            setFirmaVettoriale(null);
            setFirmaFirmatarioNome('');
            setFirmaFirmatarioSocieta('');
            setOrdineLavoro('');
            setDescrizioneBreve('');
            setIncludeTrasferta(false);
            setTrasfertaId('');
            setVeicoloId(null);
            setNaveId(null);
            setLuogoId(null);
        }
    }, [isNewMode, areAnagraficheLoading]);

    const handleTecnicoResponsabileChange = (_: any, nuovoTecnico: Tecnico | null) => {
        const nuovoId = nuovoTecnico?.id || null;
        setTecnicoId(nuovoId);
        if (nuovoId && nuovoTecnico) {
            setDettaglioOreTecnici([{ tecnicoId: nuovoId, nome: `${nuovoTecnico.cognome} ${nuovoTecnico.nome}` }]); // CORRETTO
        } else {
            setDettaglioOreTecnici([]);
        }
    };
    
    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabiliPresenti = dettaglioOreTecnici.filter(d => d.tecnicoId === tecnicoId);
        const nuoviDettagli = nuoviTecnici.map(t => {
            const esistente = dettaglioOreTecnici.find(d => d.tecnicoId === t.id);
            return esistente || { tecnicoId: t.id, nome: `${t.cognome} ${t.nome}` };
        });
        setDettaglioOreTecnici([...responsabiliPresenti, ...nuoviDettagli]);
    };
    
    const removeTecnico = (idToRemove: string) => {
        if (idToRemove === tecnicoId) return;
        setDettaglioOreTecnici(prev => prev.filter(d => d.tecnicoId !== idToRemove));
    };
    
    const handleOreUpdate = (updatedData: DettaglioOreTecnici) => {
        setDettaglioOreTecnici(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d));
    };

    const handleOpenModal = (tecnico: DettaglioOreTecnici) => {
        setEditingTecnico(tecnico);
        setTempDettaglioOre(tecnico);
        setIsModalOpen(true);
    };
    
    const handleSaveFromModal = () => {
        if (tempDettaglioOre) {
            handleOreUpdate(tempDettaglioOre);
        }
        setIsModalOpen(false);
    };

    const handleSaveSignature = (signature: string) => {
        setFirmaVettoriale(signature);
    };
    const isFirmaLocked = isEditMode && !!initialFirma;

    const handleSubmit = async () => {
        if (!tecnicoId || !tipoGiornataId || !data) {
            showNotification("Compila campi obbligatori: Tecnico, Data, Tipo Giornata.", "warning");
            return;
        }
        if (isLavorativo && !lavoroEseguito) {
             showNotification("Il campo Lavoro Eseguito è obbligatorio.", "warning");
             return;
        }
        setIsSaving(true);
        const payload: ServerRapportinoPayload = {
            data: data.toDate(), // CORRETTO
            tecnicoId: tecnicoId,
            presenze: [...new Set(dettaglioOreTecnici.map(d => d.tecnicoId))],
            tipoGiornataId: tipoGiornataId,
            includeTrasferta, trasfertaId: includeTrasferta ? trasfertaId : null,
            naveId, luogoId, veicoloId,
            lavoroEseguito, descrizioneBreve, materialiImpiegati, ordineLavoro,
            dettaglioOreTecnici: dettaglioOreTecnici.map(({ nome, ...rest }) => rest), // CORRETTO
            firmaVettoriale, firmaFirmatarioNome, firmaFirmatarioSocieta,
        };
        try {
            if (isEditMode && reportId) {
                await rapportinoCloudService.update(reportId, payload); // CORRETTO
                const rapportinoOriginale = getRapportinoById(reportId);
                updateRapportinoInStore({ ...rapportinoOriginale, ...payload, id: reportId } as Rapportino);
                showNotification("Rapportino aggiornato!", "success");
            } else {
                const newId = await rapportinoCloudService.create(payload); // CORRETTO
                addRapportinoToStore({ ...payload, id: newId, createdBy: profile?.id || 'admin', createdAt: new Date() } as Rapportino);
                showNotification("Rapportino creato!", "success");
            }
            navigate('/rapportini');
        } catch (error: any) {
            showNotification(error.message || "Errore salvataggio.", "error");
        } finally { setIsSaving(false); }
    };

    const tecnicoResponsabileSelezionato = useMemo(() => sortedTecnici.find(t => t.id === tecnicoId) || null, [tecnicoId, sortedTecnici]);
    const responsabileDettaglio = dettaglioOreTecnici.find(d => d.tecnicoId === tecnicoId);
    const altriTecniciSelezionati = useMemo(() => sortedTecnici.filter(t => dettaglioOreTecnici.some(d => d.tecnicoId === t.id && d.tecnicoId !== tecnicoId)), [dettaglioOreTecnici, sortedTecnici, tecnicoId]);
    const altriTecniciOpzioni = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoId), [sortedTecnici, tecnicoId]);
    
    if (pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
               <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</Typography>
               
               <Section title="Dati Principali">
                   <Grid
                       size={{
                           xs: 12,
                           md: 4
                       }}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={tecnicoResponsabileSelezionato} onChange={handleTecnicoResponsabileChange} disabled={isSaving || isEditMode} renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />} /></Grid>
                   <Grid
                       size={{
                           xs: 12,
                           md: 4
                       }}><DatePicker label="Data" value={data} onChange={setData} disabled={isSaving} /></Grid>
                   <Grid
                       size={{
                           xs: 12,
                           md: 4
                       }}><TextField label="Ordine di Lavoro" value={ordineLavoro} onChange={e => setOrdineLavoro(e.target.value)} fullWidth disabled={isSaving} /></Grid>
                   <Grid
                       size={{
                           xs: 12,
                           md: 8
                       }}><FormControl fullWidth required><InputLabel>Tipo Giornata</InputLabel><Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => setTipoGiornataId(e.target.value)} disabled={isSaving}>{tipiGiornataLavorativi.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>
                   <Grid
                       size={{
                           xs: 12,
                           md: 4
                       }}><FormControlLabel control={<Switch checked={includeTrasferta} onChange={e => setIncludeTrasferta(e.target.checked)} />} label="Aggiungi Trasferta" disabled={isSaving} /></Grid>
                   {includeTrasferta && (<Grid size={12}><FormControl fullWidth required><InputLabel>Tipo di Trasferta</InputLabel><Select value={trasfertaId} label="Tipo di Trasferta" onChange={e => setTrasfertaId(e.target.value)} disabled={isSaving}>{tipiGiornataTrasferta.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>)}
               </Section>
               
               {tipoGiornataId && isLavorativo && (
               <>
                   <Section title="Tecnici Coinvolti">
                       {responsabileDettaglio && <Grid size={12}><OreLavoroSingoloTecnico datiOre={responsabileDettaglio} onUpdate={handleOreUpdate} isReadOnly={isSaving} /></Grid>}
                       <Grid size={12}><Autocomplete multiple options={altriTecniciOpzioni} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={altriTecniciSelezionati} onChange={handleAltriTecniciChange} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici" />} disabled={!tecnicoId || isSaving} /></Grid>
                       {dettaglioOreTecnici.filter(d => d.tecnicoId !== tecnicoId).map(dett => (
                           <Grid key={dett.tecnicoId} size={12}>
                               <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                   <Box><Typography fontWeight="500">{dett.nome}</Typography><Chip label={dett.isManual ? `Manuale: ${dett.ore || 0}h` : `Orario: ${dett.oraInizio || '-'}/${dett.oraFine || '-'} (${(dett.ore || 0).toFixed(2)}h)`} size="small" /></Box>
                                   <Box><IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={isSaving}><EditIcon /></IconButton><IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={isSaving}><DeleteIcon /></IconButton></Box>
                               </Paper>
                           </Grid>
                       ))}
                   </Section>
                   <Section title="Dettagli Intervento">
                       <Grid
                           size={{
                               xs: 12,
                               md: 6
                           }}><Autocomplete options={[...navi].sort((a,b) => a.nome.localeCompare(b.nome))} getOptionLabel={o => o.nome} value={navi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={params => <TextField {...params} label="Nave" />} disabled={isSaving}/></Grid>
                       <Grid
                           size={{
                               xs: 12,
                               md: 6
                           }}><Autocomplete options={[...luoghi].sort((a,b) => a.nome.localeCompare(b.nome))} getOptionLabel={o => o.nome} value={luoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={params => <TextField {...params} label="Luogo" />} disabled={isSaving} /></Grid>
                       <Grid size={12}><Autocomplete options={[...veicoli].sort((a,b) => (a.targa || '').localeCompare(b.targa || ''))} getOptionLabel={o => `${o.targa} - ${o.nome}`} value={veicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={params => <TextField {...params} label="Veicolo" />} disabled={isSaving} /></Grid>
                       <Grid size={12}><TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth disabled={isSaving} /></Grid>
                       <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={isSaving} /></Grid>
                       <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required disabled={isSaving} /></Grid>
                   </Section>
                   <Section title="Firma Cliente">
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}><TextField label="Nome e Cognome Firmatario" value={firmaFirmatarioNome} onChange={(e) => setFirmaFirmatarioNome(e.target.value)} fullWidth required disabled={isSaving || isFirmaLocked} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                md: 6
                            }}><TextField label="Società" value={firmaFirmatarioSocieta} onChange={(e) => setFirmaFirmatarioSocieta(e.target.value)} fullWidth disabled={isSaving || isFirmaLocked} /></Grid>
                        <Grid size={12}>{firmaVettoriale ? (<Box sx={{ border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}><img src={firmaVettoriale} alt="Firma" style={{ maxWidth: '200px', height: 'auto' }} /><br/>{!isFirmaLocked && <Button onClick={() => setIsSignatureModalOpen(true)} startIcon={<EditIcon />} sx={{ mt: 1 }} disabled={isSaving}>Modifica Firma</Button>}</Box>) : (<Button variant="outlined" startIcon={<BorderColorIcon />} onClick={() => setIsSignatureModalOpen(true)} disabled={isSaving} fullWidth>Aggiungi Firma Cliente</Button>)}</Grid>
                   </Section>
               </>
               )}
               <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                   <Button variant="text" onClick={() => navigate('/rapportini')} disabled={isSaving}>Annulla</Button>
                   <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button>
               </Box>
           </Box>
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle><DialogContent>{tempDettaglioOre && (<Box sx={{ pt: 2 }}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={isSaving} /></Box>)}</DialogContent><DialogActions><Button onClick={() => setIsModalOpen(false)}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions></Dialog>
            <SignatureDialog open={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
        </LocalizationProvider>
    );
};

export default RapportinoEdit;
