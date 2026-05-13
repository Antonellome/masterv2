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
import { useAuth } from '@/contexts/AuthProvider';
import { useData } from '@/hooks/useData';
import { db } from '@/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { useAlert } from '@/contexts/AlertContext';

dayjs.locale('it');

// --- COMPONENTE ORE CON SELECT A STEP 0.5 ---
interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

const OreLavoroSingoloTecnico: React.FC<any> = ({ datiOre, onUpdate, isReadOnly }) => {
    
    const oreOptions = useMemo(() => Array.from({ length: 49 }, (_, i) => i * 0.5), []); // 0 to 24 in 0.5 steps

    const handleValueChange = (field: keyof DettaglioOreData, value: any) => {
        const newDati = { ...datiOre, [field]: value };
        if ((field === 'oraInizio' || field === 'oraFine' || field === 'pausa') && !newDati.isManual && newDati.oraInizio && newDati.oraFine) {
            const inizio = dayjs(`1970-01-01T${newDati.oraInizio}`);
            const fine = dayjs(`1970-01-01T${newDati.oraFine}`);
            if (fine.isAfter(inizio)) {
                const oreCalcolate = (fine.diff(inizio, 'minute') - (newDati.pausa || 0)) / 60;
                newDati.ore = Math.round(oreCalcolate * 4) / 4; // Arrotonda al quarto d'ora più vicino (es. 7.75)
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
                        <Select
                            value={datiOre.ore ?? 0}
                            label="Ore Lavorate"
                            onChange={e => handleValueChange('ore', Number(e.target.value))}
                        >
                            {datiOre.ore && !oreOptions.includes(datiOre.ore) && (
                                <MenuItem key={datiOre.ore} value={datiOre.ore}>
                                    {datiOre.ore.toFixed(2)}
                                </MenuItem>
                            )}
                            {oreOptions.map(ora => (
                                <MenuItem key={ora} value={ora}>{ora}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>
    );
};

const NON_LAVORATIVO_KEYWORDS = ['ferie'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => !tipo ? true : !NON_LAVORATIVO_KEYWORDS.some(k => (tipo.nome || '').toLowerCase().includes(k));

const emptyDettaglioOre: DettaglioOreData = {
    tecnicoId: 'placeholder',
    nome: '',
    isManual: false,
    oraInizio: '07:30',
    oraFine: '16:30',
    pausa: 60,
    ore: 8
};


// --- INIZIO VERO COMPONENTE RapportinoEdit ---
const RapportinoEdit: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Admin user
    const { id: reportId } = useParams<{ id: string }>();
    const { showAlert } = useAlert();
    const isEditMode = Boolean(reportId);

    const { tipiGiornata, tecnici, veicoli, navi, luoghi, loading: collectionsLoading } = useData();

    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [tipiGiornata]);
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [luoghi]);
    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => (a.targa || '').localeCompare(b.targa || '')), [veicoli]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => (`${a.cognome || ''} ${a.nome || ''}`.trim()).localeCompare((`${b.cognome || ''} ${b.nome || ''}`.trim()))), [tecnici]);

    // State del form
    const [tecnicoResponsabileId, setTecnicoResponsabileId] = useState<string | null>(null);
    const [data, setData] = useState<Dayjs | null>(dayjs());
    const [giornataId, setGiornataId] = useState('');
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
    
    const handleTecnicoResponsabileChange = (_: any, tecnico: Tecnico | null) => {
        setTecnicoResponsabileId(tecnico?.id || null);
        if (tecnico) {
            setDettaglioOre([{
                ...emptyDettaglioOre,
                tecnicoId: tecnico.id,
                nome: `${tecnico.cognome} ${tecnico.nome}`.trim(),
            }]);
        } else {
            setDettaglioOre([]);
        }
    };
    
    useEffect(() => {
        if (collectionsLoading) return;
        if (isEditMode) {
            const loadReport = async () => {
                if (!reportId) {
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
                        const resolvedGiornataId = reportData.tipoGiornataId || reportData.giornataId || '';
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

                        const allTecnicoIds = Array.from(new Set(reportData.presenze || [reportData.tecnicoId]));
                        const hasDettaglioOre = !!reportData.dettaglioOreTecnici && reportData.dettaglioOreTecnici.length > 0;

                        const dettagliCaricati: DettaglioOreData[] = allTecnicoIds.map(id => {
                            const tecnico = tecnici.find(t => t.id === id);
                            let oreAssegnate = 0;
                            if (hasDettaglioOre) {
                                const dettaglioSalvato = reportData.dettaglioOreTecnici!.find(d => d.tecnicoId === id);
                                oreAssegnate = dettaglioSalvato?.ore ?? 0;
                            } else {
                                if (id === reportData.tecnicoId) {
                                    oreAssegnate = typeof reportData.oreLavoro === 'string' ? parseFloat(reportData.oreLavoro) : reportData.oreLavoro ?? 0;
                                } else {
                                    oreAssegnate = 0;
                                }
                            }
                            return {
                                tecnicoId: id,
                                nome: tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : 'Tecnico non trovato',
                                isManual: reportData.isTrasferta || false,
                                oraInizio: reportData.oraInizio || '07:30',
                                oraFine: reportData.oraFine || '16:30',
                                pausa: reportData.pausa ?? 60,
                                ore: oreAssegnate,
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
        } else {
            // In new mode, set default empty values to show the form structure
            setDettaglioOre([]); // Start empty, will be populated on technician selection
            setPageLoading(false);
        }
    }, [isEditMode, reportId, navigate, collectionsLoading, tecnici, tipiGiornataMap, showAlert]);
    
    const handleTipoGiornataChange = (id: string) => { setGiornataId(id); const tipo = tipiGiornataMap.get(id); setIsLavorativo(isGiornataLavorativa(tipo)); };
    const handleCancel = () => navigate('/reportistica');

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
         setDettaglioOre(prev => prev.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d));
    }, []);

    const handleMasterOreUpdate = (updatedData: DettaglioOreData) => {
        setDettaglioOre(prev => prev.map(d => {
            if(d.tecnicoId === updatedData.tecnicoId) return updatedData;
            if(isEditMode) return d; // In edit mode, don't propagate changes to others
            return { ...d, isManual: updatedData.isManual, oraInizio: updatedData.oraInizio, oraFine: updatedData.oraFine, pausa: updatedData.pausa, ore: updatedData.ore };
        }));
    };

    const handleAltriTecniciChange = (_: any, nuoviTecnici: Tecnico[]) => {
        const responsabile = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
        if (!responsabile) return;
        
        const allSelectedTecnici = [
            responsabile, 
            ...nuoviTecnici.map(t => 
                dettaglioOre.find(d => d.tecnicoId === t.id) || { ...responsabile, tecnicoId: t.id, nome: `${t.cognome} ${t.nome}`.trim() }
            )
        ];
        const uniqueTecnici = Array.from(new Map(allSelectedTecnici.map(item => [item.tecnicoId, item])).values());
        setDettaglioOre(uniqueTecnici);
    };

    const removeTecnico = (idToRemove: string) => setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== idToRemove));
    const handleOpenModal = (tecnico: DettaglioOreData) => { setEditingTecnico(tecnico); setTempDettaglioOre(tecnico); setIsModalOpen(true); };
    const handleCloseModal = () => setIsModalOpen(false);
    const handleSaveFromModal = () => { if (tempDettaglioOre) { handleOreUpdate(tempDettaglioOre); } handleCloseModal(); };

    const handleSubmit = async () => {
        // ... (Submit logic is unchanged)
        if (!tecnicoResponsabileId) { showAlert("Seleziona un Tecnico Responsabile.", "error"); return; }
        if (!giornataId) { showAlert("Compila i campi obbligatori: Data e Tipo Giornata.", "warning"); return; }
        setIsSaving(true);
        try {
            const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId);
            if (isLavorativo && dettaglioOre.some(d => (d.ore ?? 0) <= 0)) {
                showAlert("Le ore di lavoro per ogni tecnico non possono essere zero.", "warning");
                setIsSaving(false);
                return;
            }
            const presenze = dettaglioOre.map(d => d.tecnicoId);
            const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 }));
            const oreLavoroTotali = dettaglioOreTecniciToSave.reduce((sum, item) => sum + item.ore, 0);
            const rapportinoData = {
                data: Timestamp.fromDate(data!.toDate()),
                tipoGiornataId: giornataId, tecnicoId: tecnicoResponsabileId, presenze, nome: isLavorativo ? 'Rapportino giornaliero' : 'Rapportino non lavorativo', 
                oreLavoro: isLavorativo ? oreLavoroTotali : 0,
                dettaglioOreTecnici: isLavorativo ? dettaglioOreTecniciToSave : [],
                isTrasferta: isLavorativo ? responsabileDettaglio?.isManual : false,
                oraInizio: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.oraInizio : null,
                oraFine: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.oraFine : null,
                pausa: isLavorativo && !responsabileDettaglio?.isManual ? responsabileDettaglio?.pausa : null,
                veicoloId: isLavorativo ? veicoloId : null, naveId: isLavorativo ? naveId : null, luogoId: isLavorativo ? luogoId : null,
                descrizioneBreve: isLavorativo ? descrizioneBreve : '', lavoroEseguito: isLavorativo ? lavoroEseguito : '', materialiImpiegati: isLavorativo ? materialiImpiegati : '',
                updatedAt: serverTimestamp(),
                ...(isEditMode ? {} : { createdBy: user?.uid, createdAt: serverTimestamp() })
            };
            if (isEditMode && reportId) {
                await updateDoc(doc(db, 'rapportini', reportId), rapportinoData);
                showAlert("Rapportino aggiornato!", "success");
            } else {
                await addDoc(collection(db, 'rapportini'), rapportinoData);
                showAlert("Rapportino creato!", "success");
            }
            navigate('/reportistica');
        } catch (error: any) { 
            console.error("Errore salvataggio: ", error); 
            showAlert(`Errore: ${error.message}`, "error");
        } finally { 
            setIsSaving(false); 
        }
    };
    
    const responsabileDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoResponsabileId) || emptyDettaglioOre;
    const altriTecniciSelezionati = useMemo(() => sortedTecnici.filter(t => dettaglioOre.some(d => d.tecnicoId === t.id && d.tecnicoId !== tecnicoResponsabileId)), [dettaglioOre, sortedTecnici, tecnicoResponsabileId]);
    const altriTecniciOpzioni = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoResponsabileId), [sortedTecnici, tecnicoResponsabileId]);

    if (pageLoading || collectionsLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 }, mx: 'auto', maxWidth: 900 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="h4" component="h1" gutterBottom>{isEditMode ? 'Dettaglio' : 'Nuovo'} Rapportino</Typography>
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
                        <Autocomplete options={sortedTecnici} getOptionLabel={(option) => `${option.cognome} ${option.nome}`} value={sortedTecnici.find(t => t.id === tecnicoResponsabileId) || null} onChange={handleTecnicoResponsabileChange} disabled={isEditMode || isSaving} renderInput={(params) => <TextField {...params} label="Tecnico Responsabile" required />} />
                        <DatePicker label="Data" value={data} onChange={setData} disabled={isSaving} />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo Giornata</InputLabel>
                            <Select value={giornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isSaving}>
                                {sortedTipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {isLavorativo && (
                             <fieldset disabled={!tecnicoResponsabileId || isSaving} style={{border: 'none', padding: 0, margin: 0}}>
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                                <OreLavoroSingoloTecnico datiOre={responsabileDettaglio} onUpdate={handleMasterOreUpdate} isReadOnly={!tecnicoResponsabileId || isSaving} />
                                
                                <Autocomplete multiple options={altriTecniciOpzioni} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={altriTecniciSelezionati} onChange={handleAltriTecniciChange} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici" />} />
                                {dettaglioOre.filter(d => d.tecnicoId !== tecnicoResponsabileId).map(dett => (
                                     <Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                        <Box><Typography fontWeight="bold">{dett.nome}</Typography><Chip label={`${dett.ore || 0}h`} size="small" /></Box>
                                        <Box>
                                            <IconButton size="small" onClick={() => handleOpenModal(dett)}><EditIcon /></IconButton>
                                            <IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)}><DeleteIcon /></IconButton>
                                        </Box>
                                    </Paper>
                                ))}
                                <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                                <Autocomplete options={sortedNavi} getOptionLabel={o => o.nome || ''} value={sortedNavi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={params => <TextField {...params} label="Nave" />} />
                                <Autocomplete options={sortedLuoghi} getOptionLabel={o => o.nome || ''} value={sortedLuoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={params => <TextField {...params} label="Luogo" />} />
                                <Autocomplete options={sortedVeicoli} getOptionLabel={o => `${o.targa || ''} - ${o.nome || ''}`} value={sortedVeicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={params => <TextField {...params} label="Veicolo" />} />
                                <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth />
                                <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} />
                                <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required/>
                            </fieldset>
                        )}
                        <Grid container spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Grid item><Button variant="outlined" size="large" onClick={handleCancel} disabled={isSaving}>Annulla</Button></Grid>
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
                             <OreLavoroSingoloTecnico datiOre={tempDettaglioOre} onUpdate={setTempDettaglioOre} isReadOnly={false} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>

        </LocalizationProvider>
    );
};
export default RapportinoEdit;
