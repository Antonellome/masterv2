import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Switch, FormControlLabel, Autocomplete, Button, CircularProgress, Grid, Alert, Divider, Box,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useAuth } from '@/contexts/AuthProvider';
import { useData } from '@/hooks/useData';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { useAlert } from '@/contexts/AlertContext';

dayjs.locale('it');

// Componente per le ore (invariato)
interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

const OreLavoroSingoloTecnico: React.FC<any> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {
    const handleValueChange = (field: keyof DettaglioOreData, value: any) => {
        const newDati = { ...datiOre, [field]: value };
        if ((field === 'oraInizio' || field === 'oraFine' || field === 'pausa') && !newDati.isManual && newDati.oraInizio && newDati.oraFine) {
            const inizio = dayjs(`1970-01-01T${newDati.oraInizio}`);
            const fine = dayjs(`1970-01-01T${newDati.oraFine}`);
            if (fine.isAfter(inizio)) {
                newDati.ore = (fine.diff(inizio, 'minute') - (newDati.pausa || 0)) / 60;
            }
        }
        onUpdate(newDati);
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 1, mb: 1, borderLeft: isScrivente ? '4px solid' : undefined, borderColor: 'primary.main' }}>
            {isScrivente && <Typography variant="caption" display="block" sx={{mb: 1}}>Orario principale (si applica a tutti)</Typography>}
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}><FormControlLabel control={<Switch checked={datiOre.isManual} onChange={(e) => handleValueChange('isManual', e.target.checked)} disabled={isReadOnly} />} label="Inserimento manuale ore (Trasferta)" /></Grid>
                {!datiOre.isManual ? (
                    <>
                        <Grid item xs={6} sm={3}><TextField label="Inizio" type="time" value={datiOre.oraInizio || ''} onChange={e => handleValueChange('oraInizio', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={6} sm={3}><TextField label="Fine" type="time" value={datiOre.oraFine || ''} onChange={e => handleValueChange('oraFine', e.target.value)} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
                        <Grid item xs={12} sm={3}><FormControl fullWidth disabled={isReadOnly}><InputLabel>Pausa (min)</InputLabel><Select value={datiOre.pausa ?? 60} label="Pausa (min)" onChange={e => handleValueChange('pausa', Number(e.target.value))}>{[0, 30, 60, 90, 120].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl></Grid>
                    </>
                ) : null}
                 <Grid item xs={12} sm={3}><TextField label="Ore Lavorate" type="number" value={datiOre.ore || 0} onChange={e => handleValueChange('ore', Number(e.target.value))} disabled={isReadOnly || !datiOre.isManual} fullWidth /></Grid>
            </Grid>
        </Paper>
    );
};

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => !tipo ? true : !NON_LAVORATIVO_KEYWORDS.some(k => (tipo.nome || '').toLowerCase().includes(k));

// --- INIZIO VERO COMPONENTE RapportinoEdit ---
const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Admin user
    const { id: reportId } = useParams<{ id: string }>();
    const { showAlert } = useAlert();
    const isEditMode = Boolean(reportId);

    const { tipiGiornata, tecnici, veicoli, navi, luoghi, loading: collectionsLoading } = useData();

    // Dati memoizzati e ordinati
    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [tipiGiornata]);
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [luoghi]);
    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => (a.targa || '').localeCompare(b.targa || '')), [veicoli]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => (`${a.cognome || ''} ${a.nome || ''}`.trim()).localeCompare((`${b.cognome || ''} ${b.nome || ''}`.trim()))), [tecnici]);

    // State del form
    const [tecnicoResponsabileId, setTecnicoResponsabileId] = useState<string | null>(null);
    const [data, setData] = useState<Dayjs | null>(dayjs());
    const [giornataId, setGiornataId] = useState(''); // <-- CAMPO CORRETTO
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [pageLoading, setPageLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Dayjs | null>(dayjs());
    const [dataFine, setDataFine] = useState<Dayjs | null>(dayjs());
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);
    
    // Gestione selezione Tecnico Responsabile
    const handleTecnicoResponsabileChange = (_: any, tecnico: Tecnico | null) => {
        setTecnicoResponsabileId(tecnico?.id || null);
        if (tecnico) {
            setDettaglioOre([{
                tecnicoId: tecnico.id,
                nome: `${tecnico.cognome} ${tecnico.nome}`.trim(),
                isManual: false, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8,
            }]);
        } else {
            setDettaglioOre([]);
        }
    };
    
    // Caricamento dati in modalità modifica
    useEffect(() => {
        if (collectionsLoading) return;

        const loadReport = async () => {
            if (!isEditMode || !reportId) {
                setPageLoading(false);
                return;
            }
            
            setPageLoading(true);
            try {
                const reportSnap = await getDoc(doc(db, 'rapportini', reportId));
                if (reportSnap.exists()) {
                    const reportData = reportSnap.data() as Rapportino;
                    
                    setTecnicoResponsabileId(reportData.tecnicoId);
                    setData(dayjs(reportData.data.toDate()));
                    
                    // LEGGE IL CAMPO CORRETTO: giornataId
                    const resolvedGiornataId = reportData.giornataId || '';
                    if (resolvedGiornataId && !tipiGiornataMap.has(resolvedGiornataId)) {
                        showAlert(`Tipo Giornata non più valido. Selezionane uno nuovo.`, 'warning');
                        setGiornataId('');
                    } else {
                        setGiornataId(resolvedGiornataId);
                    }

                    const tipo = tipiGiornataMap.get(resolvedGiornataId);
                    setIsLavorativo(isGiornataLavorativa(tipo));
                    setVeicoloId(reportData.veicoloId || null);
                    setNaveId(reportData.naveId || null);
                    setLuogoId(reportData.luogoId || null);
                    setDescrizioneBreve(reportData.descrizioneBreve || '');
                    setLavoroEseguito(reportData.lavoroEseguito || '');
                    setMaterialiImpiegati(reportData.materialiImpiegati || '');

                    // Ricostruzione dettagli ore
                    const allTecnicoIds = Array.from(new Set(reportData.presenze || [reportData.tecnicoId]));
                    const dettagliCaricati: DettaglioOreData[] = allTecnicoIds.map(id => {
                        const tecnico = tecnici.find(t => t.id === id);
                        const dettaglioSalvato = reportData.dettaglioOreTecnici?.find(d => d.tecnicoId === id);
                        return {
                            tecnicoId: id,
                            nome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : 'Tecnico non trovato',
                            isManual: reportData.isTrasferta || false,
                            oraInizio: reportData.oraInizio || '07:30',
                            oraFine: reportData.oraFine || '16:30',
                            pausa: reportData.pausa ?? 60,
                            ore: dettaglioSalvato?.ore ?? reportData.oreLavoro ?? 0,
                        };
                    });
                    setDettaglioOre(dettagliCaricati);

                } else {
                    showAlert("Rapportino non trovato.", "error");
                    navigate('/reportistica');
                }
            } catch (e) {
                console.error("Errore caricamento report: ", e);
                showAlert("Errore durante il caricamento del report.", "error");
            } finally {
                setPageLoading(false);
            }
        };
        loadReport();
    }, [isEditMode, reportId, navigate, collectionsLoading, tecnici, tipiGiornataMap, showAlert]);
    
    const handleTipoGiornataChange = (id: string) => { setGiornataId(id); const tipo = tipiGiornataMap.get(id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate('/reportistica');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
         setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d));
    }, []);

    // Se modifico l'orario del responsabile, lo applico a tutti
    const handleMasterOreUpdate = (updatedData: DettaglioOreData) => {
        setDettaglioOre(prev => prev.map(d => {
            if(d.tecnicoId === updatedData.tecnicoId) return updatedData;
            return { ...d, isManual: updatedData.isManual, oraInizio: updatedData.oraInizio, oraFine: updatedData.oraFine, pausa: updatedData.pausa, ore: updatedData.ore };
        }));
    };

    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabile = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
        if (!responsabile) return;
        const nuoviDettagli = nuoviTecnici.map(t => dettaglioOre.find(d => d.tecnicoId === t.id) || { ...responsabile, tecnicoId: t.id, nome: `${t.cognome} ${t.nome}`.trim() });
        setDettaglioOre([responsabile, ...nuoviDettagli]);
    };

    const removeTecnico = (idToRemove: string) => setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== idToRemove));
    const handleOpenModal = (tecnico: DettaglioOreData) => { setEditingTecnico(tecnico); setTempDettaglioOre(tecnico); setIsModalOpen(true); };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleSaveFromModal = () => { if (tempDettaglioOre) { handleOreUpdate(tempDettaglioOre); } handleCloseModal(); };

    const handleSubmit = async () => {
        if (!tecnicoResponsabileId) {
            showAlert("Seleziona un Tecnico Responsabile.", "error");
            return;
        }
        if ((!data && !isPeriodo) || !giornataId) { // <-- CAMPO CORRETTO
            showAlert("Compila i campi obbligatori: Data e Tipo Giornata.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            if (isPeriodo && !isEditMode) {
                const batch = writeBatch(db);
                let currentDay = dataInizio!;
                while (!currentDay.isAfter(dataFine!, 'day')) {
                    const newReportRef = doc(collection(db, 'rapportini'));
                    batch.set(newReportRef, { 
                        nome: 'Rapportino di periodo', 
                        giornataId, // <-- CAMPO CORRETTO
                        data: Timestamp.fromDate(currentDay.toDate()), 
                        tecnicoId: tecnicoResponsabileId, 
                        presenze: [tecnicoResponsabileId],
                        createdBy: user?.uid,
                        createdAt: serverTimestamp(), 
                        updatedAt: serverTimestamp(), 
                        oreLavoro: 0,
                        tipoGiornataId: null // Pulisce il campo vecchio
                    });
                    currentDay = currentDay.add(1, 'day');
                }
                await batch.commit();
                showAlert(`Creati i rapportini di assenza.`, "success");
            } else { 
                const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
                if (isLavorativo && (!responsabileDettaglio || (responsabileDettaglio.ore ?? 0) <= 0)) {
                    showAlert("Le ore di lavoro per il tecnico responsabile non possono essere zero.", "warning");
                    setIsSaving(false);
                    return;
                }

                const presenze = dettaglioOre.map(d => d.tecnicoId);
                const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 }));
                const oreLavoroTotali = dettaglioOreTecniciToSave.reduce((sum, item) => sum + item.ore, 0);

                const rapportinoData = {
                    data: Timestamp.fromDate(data!.toDate()),
                    giornataId, // <-- CAMPO CORRETTO
                    tecnicoId: tecnicoResponsabileId, 
                    presenze,
                    nome: isLavorativo ? 'Rapportino giornaliero' : 'Rapportino non lavorativo',
                    oreLavoro: isLavorativo ? oreLavoroTotali : 0,
                    dettaglioOreTecnici: isLavorativo ? dettaglioOreTecniciToSave : [],
                    isTrasferta: isLavorativo ? responsabileDettaglio?.isManual : false,
                    oraInizio: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.oraInizio : null,
                    oraFine: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.oraFine : null,
                    pausa: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.pausa : null,
                    veicoloId: isLavorativo ? veicoloId : null,
                    naveId: isLavorativo ? naveId : null,
                    luogoId: isLavorativo ? luogoId : null,
                    descrizioneBreve: isLavorativo ? descrizioneBreve : '',
                    lavoroEseguito: isLavorativo ? lavoroEseguito : '',
                    materialiImpiegati: isLavorativo ? materialiImpiegati : '',
                    updatedAt: serverTimestamp(),
                    tipoGiornataId: null, // Pulisce il campo vecchio
                    ...(isEditMode ? {} : { createdBy: user?.uid, createdAt: serverTimestamp() })
                };

                if (isEditMode && reportId) {
                    await updateDoc(doc(db, 'rapportini', reportId), rapportinoData);
                    showAlert("Rapportino aggiornato!", "success");
                } else {
                    await addDoc(collection(db, 'rapportini'), rapportinoData);
                    showAlert("Rapportino creato!", "success");
                }
            }
            navigate('/reportistica');
        } catch (error) { 
            console.error("Errore salvataggio: ", error); 
            showAlert(`Errore durante il salvataggio. Dettagli: ${error.message}`, "error");
        } finally { 
            setIsSaving(false); 
        }
    };
    
    // Variabili per la UI
    const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
    const altriTecniciSelezionati = useMemo(() => sortedTecnici.filter(t => dettaglioOre.some(d => d.tecnicoId === t.id && d.tecnicoId !== tecnicoResponsabileId)), [dettaglioOre, sortedTecnici, tecnicoResponsabileId]);
    const altriTecniciOpzioni = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoResponsabileId), [sortedTecnici, tecnicoResponsabileId]);


    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 }, mx: 'auto', maxWidth: 900 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio' : 'Nuovo'} Rapportino</Typography>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <Autocomplete
                            options={sortedTecnici}
                            getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                            value={sortedTecnici.find(t => t.id === tecnicoResponsabileId) || null}
                            onChange={handleTecnicoResponsabileChange}
                            disabled={isEditMode || isSaving}
                            renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />}
                        />
                        <DatePicker label="Data" value={data} onChange={setData} disabled={isSaving} />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={giornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isSaving}>
                                {sortedTipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {isLavorativo && !isPeriodo && !!tecnicoResponsabileId && (
                            <>
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                {responsabileDettaglio && <OreLavoroSingoloTecnico datiOre={responsabileDettaglio} onUpdate={handleMasterOreUpdate} isReadOnly={false} isScrivente={true} />}
                                <Autocomplete 
                                    multiple 
                                    options={altriTecniciOpzioni} 
                                    getOptionLabel={o => `${o.cognome} ${o.nome}`} 
                                    value={altriTecniciSelezionati} 
                                    onChange={handleAltriTecniciChange} 
                                    renderInput={params => <TextField {...params} label="Aggiungi altri tecnici" />} 
                                    disabled={!responsabileDettaglio} 
                                />
                                {dettaglioOre.filter(d => d.tecnicoId !== tecnicoResponsabileId).map(dett => (
                                     <Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box><Typography fontWeight="bold">{dett.nome}</Typography><Chip label={dett.isManual ? `Ore: ${dett.ore || 0}` : `${dett.oraInizio || '-'} - ${dett.oraFine || '-'}`} size="small" /></Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenModal(dett)} disabled={d.tecnicoId === tecnicoResponsabileId}><EditIcon /></IconButton>
                                            <IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)} disabled={d.tecnicoId === tecnicoResponsabileId}><DeleteIcon /></IconButton>
                                        </Box>
                                    </Paper>
                                ))},
                                 <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                <Autocomplete options={sortedNavi} getOptionLabel={o => o.nome || ''} value={sortedNavi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={params => <TextField {...params} label="Nave" />} />
                                <Autocomplete options={sortedLuoghi} getOptionLabel={o => o.nome || ''} value={sortedLuoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={params => <TextField {...params} label="Luogo" />} />
                                <Autocomplete options={sortedVeicoli} getOptionLabel={o => `${o.targa || ''} - ${o.nome || ''}`} value={sortedVeicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={params => <TextField {...params} label="Veicolo" />} />
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required/>
                            </>
                        )}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid item><Button variant="outlined" size="large" onClick={handleCancel}>Annulla</Button></Grid>
                            <Grid item><Button variant="contained" color="primary" size="large" onClick={handleSubmit} disabled={isSaving}>{isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Salva')}</Button></Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Box>

            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent>
                    {tempDettaglioOre && (
                        <Box sx={{pt: 2}}>
                             <OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} isScrivente={false} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>

        </LocalizationProvider>
    );
};
export default RapportinoEdit;
