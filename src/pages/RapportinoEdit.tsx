
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Divider, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useGlobalStore } from '@/stores/globalStore';
import type { Rapportino, TipoGiornata, Tecnico, DettaglioOre, ServerRapportino } from '@/models/definitions';
import { getFunctions, httpsCallable } from 'firebase/functions';

dayjs.locale('it');

// ========= INIZIO MODIFICA DEFINITIVA =========

interface DettaglioOreData { 
    tecnicoId: string; 
    nome: string; 
    isManual: boolean; 
    oraInizio: string | null; 
    oraFine: string | null; 
    pausa: number | null;
    ore: number | null; 
}

const OreLavoroSingoloTecnico: React.FC<{ datiOre: DettaglioOreData, onUpdate: (data: DettaglioOreData) => void, isReadOnly: boolean }> = ({ datiOre, onUpdate, isReadOnly }) => {
    const oreOptions = useMemo(() => Array.from({ length: 49 }, (_, i) => i * 0.5), []);
    const handleValueChange = (field: keyof DettaglioOreData, value: any) => {
        const newDati = { ...datiOre, [field]: value };
        if (!newDati.isManual && newDati.oraInizio && newDati.oraFine) {
            const inizio = dayjs(`1970-01-01T${newDati.oraInizio}`);
            const fine = dayjs(`1970-01-01T${newDati.oraFine}`);
            if (fine.isAfter(inizio)) {
                const minutiPausa = newDati.pausa || 0;
                const oreCalcolate = (fine.diff(inizio, 'minute') - minutiPausa) / 60;
                newDati.ore = Math.max(0, Math.round(oreCalcolate * 4) / 4); 
            }
        }
        onUpdate(newDati);
    };
    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1}}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}><FormControlLabel control={<Switch checked={datiOre.isManual} onChange={(e) => handleValueChange('isManual', e.target.checked)} disabled={isReadOnly} />} label="Inserimento Ore Manuale" /></Grid>
                {!datiOre.isManual ? (
                    <>
                        <Grid item xs={6} sm={3}><TextField label="Inizio" type="time" value={datiOre.oraInizio || ''} onChange={e => handleValueChange('oraInizio', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={6} sm={3}><TextField label="Fine" type="time" value={datiOre.oraFine || ''} onChange={e => handleValueChange('oraFine', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={12} sm={3}><FormControl fullWidth disabled={isReadOnly}><InputLabel>Pausa (min)</InputLabel><Select value={datiOre.pausa ?? 60} label="Pausa (min)" onChange={e => handleValueChange('pausa', Number(e.target.value))}>{[0, 30, 60, 90, 120].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl></Grid>
                    </>
                ) : null}
                 <Grid item xs={12} sm={datiOre.isManual ? 12 : 3}>
                     <FormControl fullWidth disabled={isReadOnly || !datiOre.isManual}>
                        <InputLabel>Ore Totali</InputLabel>
                        <Select value={datiOre.ore ?? 0} label="Ore Totali" onChange={e => handleValueChange('ore', Number(e.target.value))}>
                            {datiOre.ore && !oreOptions.includes(datiOre.ore) && (<MenuItem key={datiOre.ore} value={datiOre.ore}>{datiOre.ore.toFixed(2)}</MenuItem>)}
                            {oreOptions.map(ora => (<MenuItem key={ora} value={ora}>{ora}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>
    );
};

const getCleanId = (id: any): string | undefined => (typeof id === 'string' && id) ? id : undefined;
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo) return true;
    return !['ferie', 'malattia', 'permesso'].includes(tipo.categoria || '');
};
const isTrasfertaTipo = (tipo: TipoGiornata | undefined): boolean => tipo?.categoria === 'trasferta';
const emptyDettaglioOre: DettaglioOreData = { tecnicoId: 'placeholder', nome: '', isManual: false, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8 };


const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id: reportId } = useParams<{ id: string }>();
    const isNewMode = reportId === 'new';
    const isEditMode = !isNewMode;

    // 1. ORA TUTTI I DATI PROVENGONO DA ZUSTAND
    const {
        profile, showNotification, addRapportinoToStore, updateRapportinoInStore, getRapportinoById,
        tecnici, veicoli, navi, luoghi, tipiGiornata, areAnagraficheLoading,
        tecniciMap, tipiGiornataMap
    } = useGlobalStore(state => ({ 
        ...state 
    }));

    // --- Stato del Form ---
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [dataInizio, setDataInizio] = useState<Dayjs | null>(dayjs());
    const [tecnicoId, setTecnicoId] = useState<string | null>(null);
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [ordineLavoro, setOrdineLavoro] = useState('');
    const [includeTrasferta, setIncludeTrasferta] = useState(false);
    const [trasfertaId, setTrasfertaId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [firmaVettoriale, setFirmaVettoriale] = useState<string | null>(null);
    const [firmaFirmatarioNome, setFirmaFirmatarioNome] = useState('');
    const [firmaFirmatarioSocieta, setFirmaFirmatarioSocieta] = useState('');

    // --- Dati Derivati e Ordinati (Selectors) ---
    const sortedTipiGiornata = useMemo(() => [...(tipiGiornata || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);
    const tipiGiornataLavorativi = useMemo(() => sortedTipiGiornata.filter(t => !isTrasfertaTipo(t)), [sortedTipiGiornata]);
    const tipiGiornataTrasferta = useMemo(() => sortedTipiGiornata.filter(t => isTrasfertaTipo(t)), [sortedTipiGiornata]);
    const sortedNavi = useMemo(() => [...(navi || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...(luoghi || [])].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);
    const sortedVeicoli = useMemo(() => [...(veicoli || [])].sort((a, b) => (a.targa || '').localeCompare(b.targa || '')), [veicoli]);
    const sortedTecnici = useMemo(() => [...(tecnici || [])].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);

    // 2. Logica di caricamento dati allineata a Zustand
    useEffect(() => {
        if (areAnagraficheLoading) return;
        if (isEditMode && reportId) {
            const reportData = getRapportinoById(reportId);
            if (reportData) {
                setDataInizio(dayjs(reportData.dataInizio));
                setTecnicoId(getCleanId(reportData.tecnicoId) || null);
                setTipoGiornataId(getCleanId(reportData.tipoGiornataId) || '');
                setOrdineLavoro(reportData.ordineLavoro || '');
                setIncludeTrasferta(reportData.includeTrasferta || false);
                setTrasfertaId(getCleanId(reportData.trasfertaId) || '');
                setVeicoloId(getCleanId(reportData.veicoloId) || null);
                setNaveId(getCleanId(reportData.naveId) || null);
                setLuogoId(getCleanId(reportData.luogoId) || null);
                setDescrizioneBreve(reportData.descrizioneBreve || '');
                setLavoroEseguito(reportData.lavoroEseguito || '');
                setMaterialiImpiegati(reportData.materialiImpiegati || '');
                setFirmaVettoriale(reportData.firmaVettoriale || null);
                setFirmaFirmatarioNome(reportData.firmaFirmatarioNome || '');
                setFirmaFirmatarioSocieta(reportData.firmaFirmatarioSocieta || '');

                const dettagliCaricati: DettaglioOreData[] = (reportData.dettaglioOre || []).map(d => ({
                    tecnicoId: getCleanId(d.tecnicoId)!,
                    nome: tecniciMap?.get(getCleanId(d.tecnicoId) || '') || 'N/D',
                    isManual: d.isManual ?? false,
                    oraInizio: d.oraInizio || '07:30',
                    oraFine: d.oraFine || '16:30',
                    pausa: d.pausa ?? 60,
                    ore: d.ore ?? 0,
                }));
                setDettaglioOre(dettagliCaricati);
                setIsLavorativo(isGiornataLavorativa(tipiGiornataMap?.get(getCleanId(reportData.tipoGiornataId) || '')));
            } else {
                showNotification("Rapportino non trovato. Potrebbe essere stato eliminato.", "error");
                navigate('/reportistica');
            }
        } else {
            const adminAsTecnicoId = getCleanId(profile?.tecnicoId);
            if (adminAsTecnicoId) {
                setTecnicoId(adminAsTecnicoId);
                const adminInfo = tecniciMap?.get(adminAsTecnicoId);
                setDettaglioOre(adminInfo ? [{ ...emptyDettaglioOre, tecnicoId: adminAsTecnicoId, nome: adminInfo }] : []);
            }
        }
        setPageLoading(false);
    }, [reportId, isEditMode, areAnagraficheLoading, getRapportinoById, navigate, showNotification, profile, tecniciMap, tipiGiornataMap]);

    const handleTecnicoResponsabileChange = (_: any, nuovoTecnico: Tecnico | null) => {
        const nuovoId = nuovoTecnico?.id || null;
        setTecnicoId(nuovoId);
        if (nuovoId && !dettaglioOre.some(d => d.tecnicoId === nuovoId)) {
            const dettaglioDefault = dettaglioOre.length > 0 ? dettaglioOre[0] : emptyDettaglioOre;
            const tecnicoInfo = tecniciMap?.get(nuovoId);
            setDettaglioOre(prev => [...prev, { ...dettaglioDefault, tecnicoId: nuovoId, nome: tecnicoInfo || 'N/D' }]);
        }
    };
    const handleTipoGiornataChange = (id: string) => { setTipoGiornataId(id); setIsLavorativo(isGiornataLavorativa(tipiGiornataMap?.get(id))); };
    const handleCancel = () => navigate(-1);

    // 3. Logica di salvataggio allineata a report_tecnici.md
    const handleSubmit = async () => {
        if (!tecnicoId || !tipoGiornataId || !dataInizio) {
            showNotification("Compila tutti i campi obbligatori: Tecnico, Data e Tipo Giornata.", "warning");
            return;
        }

        setIsSaving(true);
        const presenze = [...new Set(dettaglioOre.map(d => d.tecnicoId))];
        const payload: Omit<ServerRapportino, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'isLocked' | 'version'> = {
            dataInizio: dataInizio.toDate(),
            tecnicoId: tecnicoId,
            presenze: presenze,
            tipoGiornataId: tipoGiornataId,
            includeTrasferta: includeTrasferta,
            trasfertaId: includeTrasferta ? trasfertaId || null : null,
            naveId: isLavorativo ? naveId || null : null,
            luogoId: isLavorativo ? luogoId || null : null,
            veicoloId: isLavorativo ? veicoloId || null : null,
            lavoroEseguito: isLavorativo ? lavoroEseguito || '' : '',
            descrizioneBreve: isLavorativo ? descrizioneBreve || '' : '',
            materialiImpiegati: isLavorativo ? materialiImpiegati || '' : '',
            ordineLavoro: ordineLavoro || '',
            dettaglioOre: dettaglioOre.map(({ nome, ...rest }) => rest), 
        };

        try {
            const functions = getFunctions();
            if (isEditMode && reportId) {
                const updateRapportinoFunc = httpsCallable(functions, 'updateRapportino');
                await updateRapportinoFunc({ rapportinoId: reportId, data: payload });
                const rapportinoOriginale = getRapportinoById(reportId);
                const updatedRapportinoForStore = { ...rapportinoOriginale, ...payload, id: reportId } as Rapportino;
                updateRapportinoInStore(updatedRapportinoForStore);
                showNotification("Rapportino aggiornato con successo!", "success");
            } else {
                const createRapportinoFunc = httpsCallable(functions, 'createRapportino');
                const result = await createRapportinoFunc({ data: payload });
                const newId = (result.data as any)?.id;
                if (newId) {
                    const newRapportinoForStore = { ...payload, id: newId, createdBy: profile?.id, createdAt: new Date() } as Rapportino;
                    addRapportinoToStore(newRapportinoForStore);
                    showNotification("Rapportino creato con successo!", "success");
                } else { throw new Error("La creazione non ha restituito un ID."); }
            }
            navigate('/reportistica');
        } catch (error: any) {
            console.error("Errore durante il salvataggio:", error);
            showNotification(error.message || "Errore sconosciuto.", "error");
        } finally {
            setIsSaving(false);
        }
    };
    
    const tecnicoResponsabileSelezionato = useMemo(() => sortedTecnici.find(t => t.id === tecnicoId) || null, [tecnicoId, sortedTecnici]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);
    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d)), []);
    const handleMasterOreUpdate = (updatedData: DettaglioOreData) => setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? { ...updatedData } : d));
    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabile = dettaglioOre.find(d => d.tecnicoId === tecnicoId);
        if (!responsabile) return;
        const allSelectedTecnici = [responsabile, ...nuoviTecnici.map(t => dettaglioOre.find(d => d.tecnicoId === t.id) || { ...responsabile, tecnicoId: t.id, nome: `${t.cognome} ${t.nome}` })];
        setDettaglioOre(Array.from(new Map(allSelectedTecnici.map(item => [item.tecnicoId, item])).values()));
    };
    const removeTecnico = (idToRemove: string) => {
        if (idToRemove === tecnicoId) { showNotification("Non puoi rimuovere il tecnico responsabile.", "warning"); return; }
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== idToRemove));
    }
    const handleOpenModal = (tecnico: DettaglioOreData) => { setEditingTecnico(tecnico); setTempDettaglioOre(tecnico); setIsModalOpen(true); };
    const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoId) || emptyDettaglioOre;
    const altriTecniciSelezionati = useMemo(() => sortedTecnici.filter(t => dettaglioOre.some(d => d.tecnicoId === t.id && d.tecnicoId !== tecnicoId)), [dettaglioOre, sortedTecnici, tecnicoId]);
    const altriTecniciOpzioni = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoId), [sortedTecnici, tecnicoId]);

    if (pageLoading || areAnagraficheLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress size={60} /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
             <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio Amministrativo' : 'Nuovo'} Rapportino</Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 2 }}>
                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                        <Grid container spacing={2} component="form">
                            <Grid item xs={12} md={4}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} value={tecnicoResponsabileSelezionato} onChange={handleTecnicoResponsabileChange} disabled={isSaving || isEditMode} renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />} /></Grid>
                            <Grid item xs={12} md={4}><DatePicker label="Data" value={dataInizio} onChange={setDataInizio} disabled={isSaving} /></Grid>
                            <Grid item xs={12} md={4}><TextField label="Ordine di Lavoro" value={ordineLavoro} onChange={e => setOrdineLavoro(e.target.value)} fullWidth disabled={isSaving} /></Grid>
                            <Grid item xs={12}><FormControl fullWidth required><InputLabel>Tipo Giornata</InputLabel><Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isSaving}>{tipiGiornataLavorativi.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>
                            <Grid item xs={12}><FormControlLabel control={<Switch checked={includeTrasferta} onChange={e => setIncludeTrasferta(e.target.checked)} />} label="Aggiungi Trasferta" disabled={isSaving} /></Grid>
                            {includeTrasferta && (<Grid item xs={12}><FormControl fullWidth required><InputLabel>Tipo di Trasferta</InputLabel><Select value={trasfertaId} label="Tipo di Trasferta" onChange={e => setTrasfertaId(e.target.value)} disabled={isSaving}>{tipiGiornataTrasferta.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl></Grid>)}
                        </Grid>
                        {isLavorativo && (
                            <Box sx={{mt: 2}}>
                                <Divider sx={{ my: 2 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                {responsabileDettaglio.tecnicoId !== 'placeholder' && <OreLavoroSingoloTecnico datiOre={responsabileDettaglio} onUpdate={handleMasterOreUpdate} isReadOnly={!tecnicoId || isSaving} />}
                                <Autocomplete sx={{mt: 2}} multiple options={altriTecniciOpzioni} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={altriTecniciSelezionati} onChange={handleAltriTecniciChange} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici" />} />
                                {dettaglioOre.filter(d => d.tecnicoId !== tecnicoId).map(dett => (<Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1 }}><Box><Typography fontWeight="bold">{dett.nome}</Typography><Chip label={`${dett.ore || 0}h`} size="small" /></Box><Box><IconButton size="small" onClick={() => handleOpenModal(dett)}><EditIcon /></IconButton><IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)}><DeleteIcon /></IconButton></Box></Paper>))}
                                <Divider sx={{ my: 2 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}><Autocomplete options={sortedNavi} getOptionLabel={o => o.nome} value={sortedNavi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={params => <TextField {...params} label="Nave" />} /></Grid>
                                    <Grid item xs={12} md={6}><Autocomplete options={sortedLuoghi} getOptionLabel={o => o.nome} value={sortedLuoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={params => <TextField {...params} label="Luogo" />} /></Grid>
                                    <Grid item xs={12}><Autocomplete options={sortedVeicoli} getOptionLabel={o => `${o.targa} - ${o.nome}`} value={sortedVeicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={params => <TextField {...params} label="Veicolo" />} /></Grid>
                                    <Grid item xs={12}><TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth /></Grid>
                                    <Grid item xs={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} /></Grid>
                                    <Grid item xs={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required/> </Grid>
                                </Grid>
                            </Box>
                        )}
                        {isEditMode && firmaVettoriale && (
                            <>
                                <Divider sx={{ my: 2 }}><Typography variant="overline">Firma Cliente</Typography></Divider>
                                <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}><TextField label="Nome Firmatario" value={firmaFirmatarioNome} fullWidth InputProps={{ readOnly: true }} /></Grid>
                                    <Grid item xs={12} md={6}><TextField label="Società Firmatario" value={firmaFirmatarioSocieta} fullWidth InputProps={{ readOnly: true }} /></Grid>
                                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, border: '1px dashed grey', borderRadius: 1, mt: 1}}>
                                        <img src={firmaVettoriale} alt="Firma del cliente" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                                    </Grid>
                                </Grid>
                                </Paper>
                            </>
                        )}
                    </Paper>
                </Box>
                <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, flexShrink: 0 }}>
                    <Button variant="outlined" size="large" onClick={handleCancel} disabled={isSaving}>Annulla</Button>
                    <Button variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button>
                </Box>
            </Box>
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle><DialogContent>{tempDettaglioOre && (<Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} /></Box>)}</DialogContent><DialogActions><Button onClick={() => setIsModalOpen(false)}>Annulla</Button><Button onClick={() => {if (tempDettaglioOre) handleOreUpdate(tempDettaglioOre); setIsModalOpen(false);}} variant="contained">Salva Orario</Button></DialogActions></Dialog>
        </LocalizationProvider>
    );
};

export default RapportinoEdit;

// ========= FINE MODIFICA DEFINITIVA =========
