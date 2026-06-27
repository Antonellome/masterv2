
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Typography, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Autocomplete, Button, CircularProgress, Grid, Alert, Divider, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, TextField, Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { db } from '@/firebase';
import { doc, setDoc, collection, Timestamp, writeBatch } from 'firebase/firestore';
import { useData } from '@/hooks/useData.tsx';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';

dayjs.locale('it');

interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso', 'legge 104'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const RapportinoForm: React.FC<{ onClose: () => void; rapportino?: Rapportino | null, initialDate?: Dayjs }> = ({ onClose, rapportino: initialRapportino, initialDate }) => {
    const isEditMode = Boolean(initialRapportino?.id);

    const { tipiGiornata, tecnici, veicoli, navi, luoghi, loading } = useData();

    const [tecnicoScriventeId, setTecnicoScriventeId] = useState<string>('');
    const [data, setData] = useState<Dayjs | null>(initialDate || dayjs());
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Dayjs | null>(dayjs());
    const [dataFine, setDataFine] = useState<Dayjs | null>(dayjs());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);
    const sortedVeicoli = useMemo(() => [...veicoli].sort((a, b) => a.targa.localeCompare(b.targa)), [veicoli]);

    useEffect(() => {
        // Popola il form solo in modalità modifica, quando i dati iniziali sono pronti e il caricamento è terminato.
        if (isEditMode && initialRapportino && !loading) {
            const { data, tecnicoId, tipoGiornataId, veicoloId, naveId, luogoId, descrizioneBreve, lavoroEseguito, materialiImpiegati, dettaglioOreTecnici, altriTecniciIds, isTrasferta, oraInizio, oraFine, pausa, oreLavoro } = initialRapportino;

            // Imposta la data in modo sicuro, con un fallback
            if (data && typeof data.toDate === 'function') {
                setData(dayjs(data.toDate()));
            } else {
                setData(dayjs());
                console.warn("Data del rapportino non valida, impostata a oggi.");
            }
            
            setTecnicoScriventeId(tecnicoId);
            setTipoGiornataId(tipoGiornataId || '');
            const tipo = tipiGiornata.find(t => t.id === tipoGiornataId);
            setIsLavorativo(isGiornataLavorativa(tipo));
            setVeicoloId(veicoloId || null);
            setNaveId(naveId || null);
            setLuogoId(luogoId || null);
            setDescrizioneBreve(descrizioneBreve || '');
            setLavoroEseguito(lavoroEseguito || '');
            setMaterialiImpiegati(materialiImpiegati || '');

            const allTecnicoIds = Array.from(new Set([tecnicoId, ...(altriTecniciIds || [])]));

            // Assicurati che l'elenco dei tecnici sia caricato prima di procedere
            if (allTecnicoIds.length > 0 && tecnici.length > 0) {
                const dettagliCaricati: DettaglioOreData[] = allTecnicoIds.map(id => {
                    const tecnico = tecnici.find(t => t.id === id);
                    if (!tecnico) {
                        console.error(`ID Tecnico ${id} non trovato nella lista dei tecnici.`);
                        return { tecnicoId: id, nome: `ID: ${id} (Non Trovato)`, isManual: false, oraInizio: null, oraFine: null, pausa: null, ore: 0 };
                    }

                    const dettaglioSalvato = dettaglioOreTecnici?.find(d => d.tecnicoId === id);
                    const oreSpecifiche = dettaglioSalvato?.ore;
                    const isManualMode = isTrasferta || false;

                    return {
                        tecnicoId: id,
                        nome: `${tecnico.cognome} ${tecnico.nome}`.trim(),
                        isManual: isManualMode,
                        oraInizio: isManualMode ? null : (oraInizio || '07:30'),
                        oraFine: isManualMode ? null : (oraFine || '16:30'),
                        pausa: isManualMode ? null : (pausa ?? 60),
                        // La priorità delle ore è: dettaglio specifico > ore totali del report > fallback a 8
                        ore: oreSpecifiche ?? oreLavoro ?? 8,
                    };
                });
                setDettaglioOre(dettagliCaricati);
            }
        } else if (!isEditMode && initialDate) {
             setData(initialDate);
        }
    }, [isEditMode, initialRapportino, loading, tipiGiornata, tecnici, initialDate]);

    useEffect(() => {
        if (!isEditMode && tecnicoScriventeId) {
            const scrivente = tecnici.find(t => t.id === tecnicoScriventeId);
            if (scrivente && dettaglioOre.length === 0) {
                setDettaglioOre([
                    {
                        tecnicoId: scrivente.id,
                        nome: `${scrivente.cognome} ${scrivente.nome}`.trim(),
                        isManual: false, oraInizio: '07:30', oraFine: '16:30', pausa: 60, ore: 8,
                    }
                ]);
            }
        } else if (!isEditMode && !tecnicoScriventeId) {
            setDettaglioOre([]);
        }
    }, [tecnicoScriventeId, isEditMode, tecnici, dettaglioOre.length]);

    const handleTipoGiornataChange = (id: string) => {
        setTipoGiornataId(id);
        const tipo = tipiGiornata.find(t => t.id === id);
        setIsLavorativo(isGiornataLavorativa(tipo));
    };

    const handleOreUpdate = useCallback((updatedData: DettaglioOreData) => {
        setDettaglioOre(prevDettagli => {
            const newDettagli = prevDettagli.map(d => d.tecnicoId === updatedData.tecnicoId ? updatedData : d);
            if (updatedData.tecnicoId === tecnicoScriventeId) {
                return newDettagli.map(d => d.tecnicoId === tecnicoScriventeId ? d : { ...d, ...updatedData, tecnicoId: d.tecnicoId, nome: d.nome });
            }
            return newDettagli;
        });
    }, [tecnicoScriventeId]);

    const handleAltriTecniciChange = useCallback((_: any, nuoviTecniciSelezionati: Tecnico[]) => {
        const scrivente = dettaglioOre.find(d => d.tecnicoId === tecnicoScriventeId);
        if (!scrivente) { setError("Seleziona prima un tecnico responsabile."); return; }
    
        const nuoviDettagli = nuoviTecniciSelezionati.map(t => {
            const existingDetail = dettaglioOre.find(d => d.tecnicoId === t.id);
            if (existingDetail) return existingDetail;
    
            // Crea un nuovo oggetto senza duplicare le chiavi
            const newDetail = { 
                ...scrivente, // Eredita i dettagli dell'orario dallo scrivente
                tecnicoId: t.id, 
                nome: `${t.cognome} ${t.nome}`.trim() 
            };
            return newDetail;
        });
    
        setDettaglioOre([scrivente, ...nuoviDettagli]);
    }, [dettaglioOre, tecnicoScriventeId]);

    const removeTecnico = (tecnicoIdToRemove: string) => setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoIdToRemove));
    
    const buildRapportinoDoc = useCallback((): Omit<Rapportino, 'id'> => {
        const scriventeDettaglio = dettaglioOre.find(d => d.tecnicoId === tecnicoScriventeId);
        const presenze = dettaglioOre.map(d => d.tecnicoId);
        
        let oreLavoroTotali: number;
        let dettaglioOreTecniciToSave: { tecnicoId: string; ore: number; }[];

        if (isLavorativo) {
            dettaglioOreTecniciToSave = dettaglioOre.map(d => ({ tecnicoId: d.tecnicoId, ore: d.ore || 0 }));
            oreLavoroTotali = dettaglioOreTecniciToSave.reduce((sum, item) => sum + item.ore, 0);
        } else {
            const selectedTipo = tipiGiornata.find(t => t.id === tipoGiornataId);
            const tipoNome = selectedTipo?.nome.toLowerCase() || '';
            
            let oreDaAssegnare = 0;
            if (tipoNome.includes('ferie') || tipoNome.includes('malattia')) {
                oreDaAssegnare = 8;
            }

            dettaglioOreTecniciToSave = dettaglioOre.map(d => ({
                tecnicoId: d.tecnicoId,
                ore: oreDaAssegnare
            }));
            
            oreLavoroTotali = dettaglioOreTecniciToSave.reduce((sum, item) => sum + item.ore, 0);
        }

        return {
            data: Timestamp.fromDate(data!.toDate()),
            tipoGiornataId: tipoGiornataId,
            tecnicoId: tecnicoScriventeId,
            presenze: presenze,
            updatedAt: Timestamp.now(),
            createdAt: initialRapportino?.createdAt || Timestamp.now(),
            nome: isLavorativo ? 'Rapportino giornaliero' : (initialRapportino?.nome || 'Rapportino non lavorativo'),
            oreLavoro: oreLavoroTotali,
            dettaglioOreTecnici: dettaglioOreTecniciToSave,
            altriTecniciIds: isLavorativo ? dettaglioOre.filter(d => d.tecnicoId !== tecnicoScriventeId).map(d => d.tecnicoId) : [],
            isTrasferta: isLavorativo ? (scriventeDettaglio?.isManual || false) : false,
            oraInizio: isLavorativo && scriventeDettaglio && !scriventeDettaglio.isManual ? (scriventeDettaglio.oraInizio || null) : null,
            oraFine: isLavorativo && scriventeDettaglio && !scriventeDettaglio.isManual ? (scriventeDettaglio.oraFine || null) : null,
            pausa: isLavorativo && scriventeDettaglio && !scriventeDettaglio.isManual ? (scriventeDettaglio.pausa ?? null) : null,
            veicoloId: isLavorativo ? (veicoloId || null) : null,
            naveId: isLavorativo ? (naveId || null) : null,
            luogoId: isLavorativo ? (luogoId || null) : null,
            descrizioneBreve: isLavorativo ? (descrizioneBreve || '') : '',
            lavoroEseguito: isLavorativo ? (lavoroEseguito || '') : '',
            materialiImpiegati: isLavorativo ? (materialiImpiegati || '') : '',
        };
    }, [dettaglioOre, tecnicoScriventeId, isLavorativo, tipoGiornataId, data, initialRapportino, veicoloId, naveId, luogoId, descrizioneBreve, lavoroEseguito, materialiImpiegati, tipiGiornata]);

    const handleSubmit = useCallback(async () => {
        if ((isPeriodo ? !dataInizio || !dataFine : !data) || !tipoGiornataId || !tecnicoScriventeId) {
            setError("Compila i campi obbligatori: Data, Tecnico Responsabile e Tipo Giornata.");
            return;
        }
        if (dettaglioOre.length === 0) {
            setError("Aggiungi almeno un tecnico al rapportino.");
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            if (isPeriodo && !isEditMode) {
                 if (dataFine!.isBefore(dataInizio)) { setError('La data di fine non può precedere quella di inizio.'); setIsSaving(false); return; }
                const batch = writeBatch(db);
                const days = Array.from({ length: dataFine!.diff(dataInizio, 'day') + 1 }, (_, i) => dataInizio!.add(i, 'day'));
                const docDataTemplate = buildRapportinoDoc();
                days.forEach(day => {
                    const newReportRef = doc(collection(db, 'rapportini'));
                    const rapportinoPerGiorno: Omit<Rapportino, 'id'> = {
                        ...docDataTemplate,
                        data: Timestamp.fromDate(day.toDate()),
                    };
                    batch.set(newReportRef, rapportinoPerGiorno);
                });
                await batch.commit();
            } else {
                const docData = buildRapportinoDoc();
                const docRef = isEditMode ? doc(db, 'rapportini', initialRapportino!.id) : doc(collection(db, 'rapportini'));
                await setDoc(docRef, docData, { merge: isEditMode });
            }
            onClose();
        } catch (e: any) { 
            console.error("Errore salvataggio: ", e);
            setError(`Errore imprevisto durante il salvataggio: ${e.message}`);
        } finally { 
            setIsSaving(false);
        }
    }, [isPeriodo, dataInizio, dataFine, data, tipoGiornataId, tecnicoScriventeId, dettaglioOre.length, buildRapportinoDoc, isEditMode, onClose, initialRapportino]);
    
    const handleOpenModal = (tecnico: DettaglioOreData) => { setEditingTecnico(tecnico); setTempDettaglioOre(tecnico); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingTecnico(null); setTempDettaglioOre(null); };
    const handleSaveFromModal = () => { if (tempDettaglioOre) { handleOreUpdate(tempDettaglioOre); } handleCloseModal(); };

    const scriventeDettaglio = useMemo(() => dettaglioOre.find(d => d.tecnicoId === tecnicoScriventeId), [dettaglioOre, tecnicoScriventeId]);
    const altriTecniciSelezionabili = useMemo(() => sortedTecnici.filter(t => t.id !== tecnicoScriventeId), [sortedTecnici, tecnicoScriventeId]);
    const idTecniciAggiunti = useMemo(() => dettaglioOre.filter(d => d.tecnicoId !== tecnicoScriventeId).map(t => t.tecnicoId), [dettaglioOre, tecnicoScriventeId]);

    // Mostra un caricamento più pulito solo se il form è in modalità modifica e i dati non sono ancora pronti
    if (isEditMode && loading) return <DialogContent><Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box></DialogContent>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <DialogTitle>{isEditMode ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {!isEditMode && <Alert severity="info" sx={{ display: 'flex', alignItems: 'center' }}><FormControlLabel control={<Switch checked={isPeriodo} onChange={e => setIsPeriodo(e.target.checked)} disabled={isSaving || isEditMode} />} label="Inserisci per un periodo (es. ferie, malattia)" /></Alert>}
                    
                    <Grid container spacing={2}>
                         {isPeriodo && !isEditMode ? (
                            <>
                                <Grid item xs={12} sm={6}><DatePicker label="Data Inizio" value={dataInizio} onChange={setDataInizio} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                                <Grid item xs={12} sm={6}><DatePicker label="Data Fine" value={dataFine} onChange={setDataFine} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid>
                            </>
                        ) : ( <Grid item xs={12} sm={isEditMode ? 12 : 4}><DatePicker label="Data" value={data} onChange={setData} disabled={isSaving} slotProps={{ textField: { fullWidth: true, required: true } }} /></Grid> )}
                        
                        {!isPeriodo && !isEditMode && <Grid item xs={12} sm={8}>
                            <FormControl fullWidth required>
                                <InputLabel>Tecnico Responsabile</InputLabel>
                                <Select value={tecnicoScriventeId} label="Tecnico Responsabile" onChange={e => setTecnicoScriventeId(e.target.value as string)} disabled={isSaving}>
                                    {sortedTecnici.map(t => <MenuItem key={t.id} value={t.id}>{`${t.cognome} ${t.nome}`}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>}
                         {isEditMode && <Grid item xs={12}><TextField label="Tecnico Responsabile" value={dettaglioOre.find(d => d.tecnicoId === initialRapportino?.tecnicoId)?.nome || 'Caricamento...'} fullWidth disabled /></Grid>}
                    </Grid>
                     
                    <FormControl fullWidth required>
                        <InputLabel>Tipo Giornata</InputLabel>
                        <Select value={tipoGiornataId} label="Tipo Giornata" onChange={e => handleTipoGiornataChange(e.target.value)} disabled={isSaving}>
                            {sortedTipiGiornata.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {isLavorativo && !isPeriodo && (
                        <>
                            <Divider sx={{ my: 1 }}><Typography variant="overline">Dettaglio Ore Lavoro</Typography></Divider>
                            {scriventeDettaglio ? <div></div> : <Typography sx={{textAlign: 'center', color: 'text.secondary'}}>Seleziona un tecnico per definire le ore</Typography>}
                            <Autocomplete multiple options={altriTecniciSelezionabili} getOptionLabel={o => `${o.cognome} ${o.nome}`} value={altriTecniciSelezionabili.filter(t => idTecniciAggiunti.includes(t.id))} onChange={handleAltriTecniciChange} disabled={!tecnicoScriventeId} renderInput={params => <TextField {...params} label="Aggiungi altri tecnici presenti" />} />
                            {dettaglioOre.filter(d => d.tecnicoId !== tecnicoScriventeId).map(dett => (
                                 <Paper key={dett.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                                    <Box><Typography variant="body1" fontWeight="bold">{dett.nome}</Typography><Chip label={dett.isManual ? `Ore manuali: ${dett.ore || 0}` : `Orario: ${dett.oraInizio || 'N/A'} - ${dett.oraFine || 'N/A'} (${dett.ore || 0} ore)`} size="small" /></Box>
                                    <Box><IconButton size="small" onClick={() => handleOpenModal(dett)}><EditIcon /></IconButton><IconButton size="small" onClick={() => removeTecnico(dett.tecnicoId)}><DeleteIcon /></IconButton></Box>
                                </Paper>
                            ))}

                            <Divider sx={{ my: 1 }}><Typography variant="overline">Dettagli Intervento</Typography></Divider>
                            <Autocomplete options={sortedNavi} getOptionLabel={(o) => o.nome} value={sortedNavi.find(n => n.id === naveId) || null} onChange={(_, v) => setNaveId(v?.id || null)} renderInput={(params) => <TextField {...params} label="Nave" />} />
                            <Autocomplete options={sortedLuoghi} getOptionLabel={(o) => o.nome} value={sortedLuoghi.find(l => l.id === luogoId) || null} onChange={(_, v) => setLuogoId(v?.id || null)} renderInput={(params) => <TextField {...params} label="Luogo" />} />
                            <Autocomplete options={sortedVeicoli} getOptionLabel={(o) => `${o.targa} - ${o.nome}`} value={sortedVeicoli.find(v => v.id === veicoloId) || null} onChange={(_, v) => setVeicoloId(v?.id || null)} renderInput={(params) => <TextField {...params} label="Veicolo" />} />
                            <TextField label="Breve Descrizione" value={descrizioneBreve} onChange={e => setDescrizioneBreve(e.target.value)} fullWidth />
                            <TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} />
                            <TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} />
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
                <Button onClick={onClose}>Annulla</Button>
                <Box>
                    {isEditMode && (
                        <>
                            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => console.log('STAMPARE: ', initialRapportino)} sx={{ mr: 1 }}>
                                Stampa
                            </Button>
                            <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => console.log('CONDIVIDERE: ', initialRapportino)} sx={{ mr: 1 }}>
                                Condividi
                            </Button>
                        </>
                    )}
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                </Box>
            </DialogActions>

            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {editingTecnico?.nome}</DialogTitle>
                <DialogContent><Box sx={{pt: 2}}>{tempDettaglioOre && <div></div>}</Box></DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Annulla</Button><Button onClick={handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
