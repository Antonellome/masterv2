
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
import { db } from '@/db/db';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
// ** MODIFICA APPORTATA: Import per le Firebase Functions **
import { getFunctions, httpsCallable } from 'firebase/functions';

dayjs.locale('it');

// --------- SOTTOCOMPONENTI E UTILS (INVARIATI) ------------
const OreLavoroSingoloTecnico: React.FC<any> = ({ datiOre, onUpdate, isReadOnly }) => {
    const oreOptions = useMemo(() => Array.from({ length: 49 }, (_, i) => i * 0.5), []);
    const handleValueChange = (field: keyof DettaglioOreData, value: any) => {
        const newDati = { ...datiOre, [field]: value };
        if ((field === 'oraInizio' || field === 'oraFine' || field === 'pausa') && !newDati.isManual && newDati.oraInizio && newDati.oraFine) {
            const inizio = dayjs(`1970-01-01T${newDati.oraInizio}`);
            const fine = dayjs(`1970-01-01T${newDati.oraFine}`);
            if (fine.isAfter(inizio)) {
                const oreCalcolate = (fine.diff(inizio, 'minute') - (newDati.pausa || 0)) / 60;
                newDati.ore = Math.round(oreCalcolate * 4) / 4; 
            }
        }
        onUpdate(newDati);
    };
    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1}}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}><FormControlLabel control={<Switch checked={datiOre.isManual} onChange={(e) => handleValueChange('isManual', e.target.checked)} disabled={isReadOnly} />} label="Ore manuali" /></Grid>
                
                {!datiOre.isManual ? (
                    <>
                        <Grid item xs={6} sm={3}><TextField label="Inizio" type="time" value={datiOre.oraInizio || ''} onChange={e => handleValueChange('oraInizio', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={6} sm={3}><TextField label="Fine" type="time" value={datiOre.oraFine || ''} onChange={e => handleValueChange('oraFine', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={12} sm={3}><FormControl fullWidth disabled={isReadOnly}><InputLabel>Pausa (min)</InputLabel><Select value={datiOre.pausa ?? 60} label="Pausa (min)" onChange={e => handleValueChange('pausa', Number(e.target.value))}>{[0, 30, 60, 90, 120].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl></Grid>
                    </>
                ) : null}
                 <Grid item xs={12} sm={datiOre.isManual ? 12 : 3}>
                     <FormControl fullWidth disabled={isReadOnly || !datiOre.isManual}>
                        <InputLabel>Ore Lavorate</InputLabel>
                        <Select value={datiOre.ore ?? 0} label="Ore Lavorate" onChange={e => handleValueChange('ore', Number(e.target.value))}>
                            {datiOre.ore && !oreOptions.includes(datiOre.ore) && (<MenuItem key={datiOre.ore} value={datiOre.ore}>{datiOre.ore.toFixed(2)}</MenuItem>)}
                            {oreOptions.map(ora => (<MenuItem key={ora} value={ora}>{ora}</MenuItem>))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>
    );
};
const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'legge 104'];
const isTrasfertaTipo = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo) return false;
    if ((tipo as any).categoria === 'trasferta') return true;
    return (tipo.nome || '').toLowerCase().includes('trasferta');
};
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo) return true;
    if ((tipo as any).categoria === 'ferie' || (tipo as any).categoria === 'malattia') return false;
    return !NON_LAVORATIVO_KEYWORDS.some(k => (tipo.nome || '').toLowerCase().includes(k));
};
const emptyDettaglioOre: DettaglioOreData = { tecnicoId: 'placeholder', nome: '', isManual: false, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8 };
// ----------------------------------------------------------------

const RapportinoEdit: React.FC = () => {
    // --- STATO E HOOKS (invariati) ---
    const navigate = useNavigate();
    const { id: reportId } = useParams<{ id: string }>();
    const isEditMode = Boolean(reportId);
    const showNotification = useGlobalStore((state) => state.showNotification);
    const profile = useGlobalStore((state) => state.profile);
    const { tipiGiornata, tecnici, veicoli, navi, luoghi, areAnagraficheLoading: collectionsLoading } = useGlobalStore((state) => ({
        tipiGiornata: state.tipiGiornata, tecnici: state.tecnici, veicoli: state.veicoli, navi: state.navi, luoghi: state.luoghi,
        areAnagraficheLoading: state.areAnagraficheLoading,
    }));

    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [tipiGiornata]);
    const tipiGiornataLavorativi = useMemo(() => sortedTipiGiornata.filter(t => !isTrasfertaTipo(t)), [sortedTipiGiornata]);
    const tipiGiornataTrasferta = useMemo(() => sortedTipiGiornata.filter(t => isTrasfertaTipo(t)), [sortedTipiGiornata]);
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [luoghi]);
    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => (a.targa || '').localeCompare(b.targa || '')), [veicoli]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => (`${a.cognome || ''} ${a.nome || ''}`.trim()).localeCompare((`${b.cognome || ''} ${b.nome || ''}`.trim()))), [tecnici]);
    
    const [tecnicoResponsabileId, setTecnicoResponsabileId] = useState<string | null>(null);
    const [data, setData] = useState<Dayjs | null>(dayjs());
    const [giornataId, setGiornataId] = useState('');
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
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);
    const [firma, setFirma] = useState<string | null>(null);
    // --------------------------------

    // --- *** LOGICA DI CARICAMENTO ROBUSTA *** ---
    useEffect(() => {
        // Attende che le anagrafiche siano caricate
        if (collectionsLoading) return;

        const loadData = async () => {
            if (isEditMode) {
                if (!reportId) {
                    showNotification("ID rapportino non valido.", "error");
                    navigate('/reportistica');
                    return;
                }
                setPageLoading(true);
                try {
                    const reportData = await db.rapportini.get(reportId);

                    // CONTROLLO DI VALIDITÀ: Se il rapportino non esiste o non ha dati essenziali, esci.
                    if (!reportData || !reportData.id || !reportData.tecnicoId) {
                        showNotification("Dati del rapportino non trovati o corrotti. Impossibile modificare.", "error");
                        navigate('/reportistica');
                        return; // Uscita sicura
                    }

                    // Se i dati sono validi, procedi a impostare lo stato
                    const dateToLoad = reportData.dataInizio || reportData.data;
                    let dataDaImpostare: Dayjs | null = null;
                    if (dateToLoad) {
                        // Normalizzazione della data per gestire sia Timestamp che stringhe ISO
                        const parsedDate = dayjs(dateToLoad instanceof Date ? dateToLoad : (dateToLoad as any).seconds * 1000);
                        if (parsedDate.isValid()) dataDaImpostare = parsedDate;
                    }
                    setData(dataDaImpostare);

                    setTecnicoResponsabileId(reportData.tecnicoId);
                    const resolvedGiornataId = reportData.tipoGiornataId || '';
                    setGiornataId(resolvedGiornataId);
                    const loadedTrasfertaId = (reportData as any).trasfertaId || '';
                    setIncludeTrasferta(Boolean(loadedTrasfertaId));
                    setTrasfertaId(loadedTrasfertaId);
                    const tipo = tipiGiornataMap.get(resolvedGiornataId);
                    setIsLavorativo(isGiornataLavorativa(tipo));
                    setVeicoloId(reportData.veicoloId || null);
                    setNaveId(reportData.naveId || null);
                    setLuogoId(reportData.luogoId || null);
                    setDescrizioneBreve(reportData.descrizioneBreve || '');
                    setLavoroEseguito(reportData.lavoroEseguito || '');
                    setMaterialiImpiegati(reportData.materialiImpiegati || '');
                    setFirma(reportData.firmaVettoriale || null);
                    setOrdineLavoro(reportData.ordineLavoro || '');

                    const dettagliCaricati: DettaglioOreData[] = (reportData.dettaglioOreTecnici || []).map((d: any) => ({
                        tecnicoId: d.tecnicoId,
                        nome: d.nome || 'Nome non disp.',
                        isManual: d.isManual ?? false,
                        oraInizio: d.oraInizio || '07:30',
                        oraFine: d.oraFine || '16:30',
                        pausa: d.pausa ?? 60,
                        ore: d.ore ?? 0,
                    }));
                    setDettaglioOre(dettagliCaricati);
                    
                } catch (e) {
                    console.error("Errore critico durante il caricamento del rapportino da Dexie: ", e);
                    showNotification("Errore irreversibile nel caricamento del rapportino.", "error");
                    navigate('/reportistica'); // Ritorna alla pagina precedente in caso di errore
                } finally {
                    setPageLoading(false);
                }
            } else {
                // Logica per un nuovo rapportino (invariata)
                setTecnicoResponsabileId(profile.tecnicoId || null);
                const tecnicoCorrente = tecnici.find(t => t.id === profile.tecnicoId);
                setDettaglioOre(tecnicoCorrente ? [{ ...emptyDettaglioOre, tecnicoId: tecnicoCorrente.id, nome: `${tecnicoCorrente.cognome} ${tecnicoCorrente.nome}`.trim() }] : []);
                setPageLoading(false);
            }
        };

        loadData();
    }, [isEditMode, reportId, navigate, collectionsLoading, tipiGiornataMap, showNotification, profile.tecnicoId, tecnici]);
    
    // --- LOGICA E HANDLERS (invariati) ---
    const tecnicoResponsabileSelezionato = useMemo(() => {
        if (!tecnicoResponsabileId) return null;
        return sortedTecnici.find(t => t.id === tecnicoResponsabileId) || null;
    }, [tecnicoResponsabileId, sortedTecnici]);

    const handleTecnicoResponsabileChange = (_: any, nuovoTecnico: Tecnico | null) => {
        const nuovoId = nuovoTecnico?.id || null;
        setTecnicoResponsabileId(nuovoId);
        if (nuovoTecnico && !dettaglioOre.some(d => d.tecnicoId === nuovoId)) {
            const dettaglioDefault = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId) || emptyDettaglioOre;
            setDettaglioOre(prev => [...prev, { ...dettaglioDefault, tecnicoId: nuovoTecnico.id, nome: `${nuovoTecnico.cognome} ${nuovoTecnico.nome}`.trim() }]);
        } else if (!nuovoTecnico) {
            setDettaglioOre([]);
        }
    };
    const handleTipoGiornataChange = (id: string) => { setGiornataId(id); setIsLavorativo(isGiornataLavorativa(tipiGiornataMap.get(id))); };
    const handleCancel = () => navigate(-1); // Torna indietro invece di una rotta fissa
    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d)), []);
    const handleMasterOreUpdate = (updatedData: DettaglioOreData) => setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : { ...d, ...updatedData, tecnicoId: d.tecnicoId, nome: d.nome }));
    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabile = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
        if (!responsabile) return;
        const allSelectedTecnici = [responsabile, ...nuoviTecnici.map(t => dettaglioOre.find(d => d.tecnicoId === t.id) || { ...responsabile, tecnicoId: t.id, nome: `${t.cognome} ${t.nome}`.trim() })];
        setDettaglioOre(Array.from(new Map(allSelectedTecnici.map(item => [item.tecnicoId, item])).values()));
    };
    const removeTecnico = (idToRemove: string) => {
        if (idToRemove === tecnicoResponsabileId) { showNotification("Non puoi rimuovere il tecnico responsabile.", "warning"); return; }
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== idToRemove));
    }
    const handleOpenModal = (tecnico: DettaglioOreData) => { setEditingTecnico(tecnico); setTempDettaglioOre(tecnico); setIsModalOpen(true); };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleSaveFromModal = () => { if (tempDettaglioOre) handleOreUpdate(tempDettaglioOre); handleCloseModal(); };

    // =======================================================================================
    // ** FUNZIONE DI SALVATAGGIO/AGGIORNAMENTO REFACTORING CON FIREBASE SDK **
    // =======================================================================================
    const handleSubmit = async () => {
        if (!tecnicoResponsabileId || !giornataId || !data) { 
            showNotification("Compila tutti i campi obbligatori: Tecnico, Data e Tipo Giornata.", "warning"); 
            return; 
        }
        if (includeTrasferta && !trasfertaId) { 
            showNotification("Se attivi la trasferta devi selezionare il tipo.", "warning"); 
            return; 
        }

        setIsSaving(true);

        // 1. Prepara il payload di dati
        const rapportinoData: Partial<Rapportino> = {
            dataInizio: data.toDate(), 
            tipoGiornataId: giornataId, 
            tecnicoId: tecnicoResponsabileId,
            presenze: dettaglioOre.map(d => d.tecnicoId),
            dettaglioOreTecnici: dettaglioOre.map(d => ({ ...d, ore: d.ore || 0 })),
            oreLavoro: dettaglioOre.reduce((sum, item) => sum + (item.ore || 0), 0),
            ...(isLavorativo && { veicoloId, naveId, luogoId, descrizioneBreve, lavoroEseguito, materialiImpiegati, ordineLavoro }),
            ...(includeTrasferta && trasfertaId && { trasfertaId }),
            ...(firma && { firmaVettoriale: firma }),
        };

        try {
            // 2. Inizializza il servizio Functions
            const functions = getFunctions();

            if (isEditMode && reportId) {
                // --- LOGICA DI AGGIORNAMENTO SICURA ---
                const updateRapportino = httpsCallable(functions, 'updateRapportino');
                await updateRapportino({ id: reportId, data: rapportinoData });

                // Aggiorna anche Dexie per consistenza UI immediata
                await db.rapportini.update(reportId, rapportinoData);
                showNotification("Rapportino aggiornato con successo!", "success");

            } else {
                // --- LOGICA DI CREAZIONE SICURA ---
                const createRapportino = httpsCallable(functions, 'createRapportino');
                // La funzione di creazione potrebbe restituire il nuovo ID, qui lo gestiamo
                const result = await createRapportino({ ...rapportinoData, createdBy: profile.id });
                const newId = (result.data as any)?.id;

                // Aggiorna Dexie con il nuovo rapportino (usando l'ID dal backend se disponibile)
                if (newId) {
                    await db.rapportini.put({ ...rapportinoData, id: newId });
                }
                showNotification("Rapportino creato con successo!", "success");
            }
            
            navigate('/reportistica');

        } catch (error: any) { 
            console.error("Errore durante il salvataggio del rapportino:", error); 
            const errorMessage = error.message || "Errore sconosciuto durante il salvataggio.";
            showNotification(errorMessage, "error");
        } finally { 
            setIsSaving(false); 
        }
    };

    const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId) || emptyDettaglioOre;
    const altriTecniciSelezionati = useMemo(() => sortedTecnici.filter(t => dettaglioOre.some(d => d.tecnicoId === t.id && d.tecnicoId !== tecnicoResponsabileId)), [dettaglioOre, sortedTecnici, tecnicoResponsabileId]);
    const altriTecniciOpzioni = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoResponsabileId), [sortedTecnici, tecnicoResponsabileId]);

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress size={60} /></Box>;

    // --- RENDER (invariato) ---
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ flexShrink: 0 }}>{isEditMode ? 'Dettaglio' : 'Nuovo'} Rapportino</Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto', pr: 2 }}>
                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => `${o.cognome || ''} ${o.nome || ''}`.trim()} value={tecnicoResponsabileSelezionato} onChange={handleTecnicoResponsabileChange} isOptionEqualToValue={(o, v) => o.id === v.id} disabled={isSaving} renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />} /></Grid>
                                <Grid item xs={12} md={4}><DatePicker label="Data" value={data} onChange={setData} disabled={isSaving} /></Grid>
                                <Grid item xs={12} md={4}><TextField label="Ordine di Lavoro" value={ordineLavoro} onChange={e => setOrdineLavoro(e.target.value)} fullWidth disabled={isSaving} /></Grid>
                            </Grid>
                            <FormControl fullWidth required><InputLabel>Tipo Giornata</InputLabel><Select value={giornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isSaving}>{tipiGiornataLavorativi.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl>
                            <FormControlLabel control={<Switch checked={includeTrasferta} onChange={(e) => { setIncludeTrasferta(e.target.checked); if (!e.target.checked) setTrasfertaId(''); }} />} label="Aggiungi Trasferta" disabled={isSaving} />
                            {includeTrasferta && (<FormControl fullWidth required><InputLabel>Tipo di Trasferta</InputLabel><Select value={trasfertaId} label="Tipo di Trasferta" onChange={e => setTrasfertaId(e.target.value)} disabled={isSaving}>{tipiGiornataTrasferta.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}</Select></FormControl>)}
                            {isLavorativo && (
                                <fieldset disabled={!tecnicoResponsabileId || isSaving} style={{border: 'none', padding: 0, margin: 0}}>
                                    <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                    <OreLavoroSingoloTecnico datiOre={responsabileDettaglio} onUpdate={handleMasterOreUpdate} isReadOnly={!tecnicoResponsabileId || isSaving} />
                                    <Autocomplete multiple options={altriTecniciOpzioni} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={altriTecniciSelezionati} onChange={handleAltriTecniciChange} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici" />} />
                                    {dettaglioOre.filter(d => d.tecnicoId !== tecnicoResponsabileId).map(dett => (<Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Box><Typography fontWeight="bold">{dett.nome}</Typography><Chip label={`${dett.ore || 0}h`} size="small" /></Box><Box><IconButton size="small" onClick={() => handleOpenModal(dett)}><EditIcon /></IconButton><IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)}><DeleteIcon /></IconButton></Box></Paper>))}
                                    <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                    <Autocomplete options={sortedNavi} getOptionLabel={o => o.nome || ''} value={sortedNavi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={params => <TextField {...params} label="Nave" />} />
                                    <Autocomplete options={sortedLuoghi} getOptionLabel={o => o.nome || ''} value={sortedLuoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={params => <TextField {...params} label="Luogo" />} />
                                    <Autocomplete options={sortedVeicoli} getOptionLabel={o => `${o.targa || ''} - ${o.nome || ''}`} value={sortedVeicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={params => <TextField {...params} label="Veicolo" />} />
                                    <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth />
                                    <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} />
                                    <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required/>
                                    {isEditMode && firma && (<><Divider sx={{ my: 2 }}><Typography variant="overline">Firma Cliente</Typography></Divider><Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}><img src={firma} alt="Firma del cliente" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} /></Paper></>)}
                                </fieldset>
                            )}
                        </Box>
                    </Paper>
                </Box>
                <Box sx={{ pt: 2, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <Button variant="outlined" size="large" onClick={handleCancel} disabled={isSaving}>Annulla</Button>
                    <Button sx={{ml: 1}} variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button>
                </Box>
            </Box>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth><DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle><DialogContent>{tempDettaglioOre && (<Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} /></Box>)}</DialogContent><DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions></Dialog>
        </LocalizationProvider>
    );
};

interface DettaglioOreData { tecnicoId: string; nome: string; isManual: boolean; oraInizio: string | null; oraFine: string | null; pausa: number | null; ore: number | null; }

export default RapportinoEdit;
