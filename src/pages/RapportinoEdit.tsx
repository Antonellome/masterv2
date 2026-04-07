import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRapportinoSchema, type RapportinoSchema, type TecnicoAggiunto } from '@/models/rapportino.schema';
import {
    TextField, Button, Grid, CircularProgress, Typography, Paper, Box,
    Autocomplete, IconButton, Divider, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import { DatePicker, TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { useAlert } from '@/contexts/AlertContext';
import { Tecnico, Nave, Luogo, TipoGiornata, Veicolo, Rapportino, Orari } from '@/models/definitions';
import { formatOreLavoro } from '@/utils/formatters';

// --- FUNZIONE DI UTILITÀ PER LA CONVERSIONE SICURA ---
const safeTimestampToDayjs = (value: any) => {
    if (value instanceof Timestamp) {
        return dayjs(value.toDate());
    }
    if (dayjs(value).isValid()){
        return dayjs(value)
    }
    return null;
};


// --- TIPI E INTERFACCE ---
interface RapportinoEditProps { isReadOnly?: boolean; }
type RapportinoFirestore = Omit<Rapportino, 'id' | 'data' | 'oraInizio' | 'oraFine' | 'tecniciAggiunti'> & {
    data: Timestamp;
    oraInizio: Timestamp | null;
    oraFine: Timestamp | null;
    tecniciAggiunti?: (Omit<TecnicoAggiunto, 'oraInizio' | 'oraFine'> & { oraInizio: Timestamp | null; oraFine: Timestamp | null; })[];
};

// --- DIALOGO PER ORARI TECNICO AGGIUNTO ---
interface OrariTecnicoDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: TecnicoAggiunto) => void;
    valoriIniziali: TecnicoAggiunto | {};
    nomeTecnico: string;
}

const OrariTecnicoDialog: React.FC<OrariTecnicoDialogProps> = ({ open, onClose, onSave, valoriIniziali, nomeTecnico }) => {
    const { control, handleSubmit, watch, setValue, reset } = useForm<TecnicoAggiunto>({ defaultValues: valoriIniziali });
    const watchInserimentoManuale = watch('inserimentoManualeOre');
    const watchOraInizio = watch('oraInizio');
    const watchOraFine = watch('oraFine');
    const watchPausa = watch('pausa');

    useEffect(() => { reset(valoriIniziali); }, [valoriIniziali, reset]);

    useEffect(() => {
        if (!watchInserimentoManuale && watchOraInizio && watchOraFine) {
            const inizio = dayjs(watchOraInizio);
            const fine = dayjs(watchOraFine);
            if (fine.isAfter(inizio)) {
                const diffMinuti = fine.diff(inizio, 'minute');
                const pausaMinuti = watchPausa || 0;
                const ore = (diffMinuti - pausaMinuti) / 60;
                setValue('oreLavorate', Math.round(ore * 100) / 100);
            }
        }
    }, [watchOraInizio, watchOraFine, watchPausa, watchInserimentoManuale, setValue]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Orari per {nomeTecnico}</DialogTitle>
            <form onSubmit={handleSubmit(onSave)}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}><FormControlLabel control={<Switch {...control.register('inserimentoManualeOre')} />} label="Inserisci ore manuali" /></Grid>
                        <Grid item xs={6}><Controller name="oraInizio" control={control} render={({ field }) => <TimePicker {...field} label="Ora Inizio" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} />} /></Grid>
                        <Grid item xs={6}><Controller name="oraFine" control={control} render={({ field }) => <TimePicker {...field} label="Ora Fine" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} />} /></Grid>
                        <Grid item xs={6}><Controller name="pausa" control={control} render={({ field }) => <TextField {...field} type="number" label="Pausa (minuti)" fullWidth disabled={watchInserimentoManuale} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />} /></Grid>
                        <Grid item xs={6}><Controller name="oreLavorate" control={control} render={({ field }) => <TextField {...field} type="number" label="Ore Lavorate" fullWidth disabled={!watchInserimentoManuale} InputProps={{ inputProps: { step: 0.5 } }} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />} /></Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Annulla</Button>
                    <Button type="submit" variant="contained">Salva Orari</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

// --- COMPONENTE PRINCIPALE ---
const RapportinoEdit: React.FC<RapportinoEditProps> = ({ isReadOnly = false }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const isNew = !id;

    const [loading, setLoading] = useState(true);
    const [options, setOptions] = useState<{tecnici: Tecnico[], navi: Nave[], luoghi: Luogo[], tipiGiornata: TipoGiornata[], veicoli: Veicolo[]}>({ tecnici: [], navi: [], luoghi: [], tipiGiornata: [], veicoli: [] });
    const [isOrariModalOpen, setOrariModalOpen] = useState(false);
    const [editingTecnicoIndex, setEditingTecnicoIndex] = useState<number | null>(null);
    const [tecnicoSelezionato, setTecnicoSelezionato] = useState<Tecnico | null>(null);

    const rapportinoSchema = useMemo(() => createRapportinoSchema(options.tipiGiornata), [options.tipiGiornata]);

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RapportinoSchema>({
        resolver: zodResolver(rapportinoSchema),
        defaultValues: { data: dayjs(), inserimentoManualeOre: false, pausa: 0, oreLavorate: 0, tecniciAggiunti: [] },
        reValidateMode: 'onChange',
    });
    
    const { fields, append, remove, update } = useFieldArray({ control, name: "tecniciAggiunti" });
    const watchGiornataId = watch('giornataId');
    const watchInserimentoManuale = watch('inserimentoManualeOre');
    const watchOraInizio = watch('oraInizio');
    const watchOraFine = watch('oraFine');
    const watchPausa = watch('pausa');
    const watchOreLavorate = watch('oreLavorate');
    const watchTecnicoScriventeId = watch('tecnicoScriventeId');

    const isGiornataLavorativa = useMemo(() => options.tipiGiornata.find(t => t.id === watchGiornataId)?.lavorativa ?? false, [watchGiornataId, options.tipiGiornata]);
    const oreLavorateFormatted = useMemo(() => formatOreLavoro(watchOreLavorate), [watchOreLavorate]);

    const formatTecnicoAggiuntoOre = useCallback((tecnico: TecnicoAggiunto) => {
        if (watchInserimentoManuale) {
            return formatOreLavoro(tecnico.oreLavorate);
        }
        const inizio = tecnico.oraInizio ? dayjs(tecnico.oraInizio).format('HH:mm') : '--';
        const fine = tecnico.oraFine ? dayjs(tecnico.oraFine).format('HH:mm') : '--';
        return `In: ${inizio}, Out: ${fine}, P: ${tecnico.pausa || 0}m`;
    }, [watchInserimentoManuale]);

    useEffect(() => {
        const fetchOptionsAndData = async () => {
            setLoading(true);
            try {
                const snaps = await Promise.all([
                    getDocs(collection(db, 'tecnici')), getDocs(collection(db, 'navi')), getDocs(collection(db, 'luoghi')),
                    getDocs(collection(db, 'tipiGiornata')), getDocs(collection(db, 'veicoli'))
                ]);
                const [tecnici, navi, luoghi, tipiGiornata, veicoli] = snaps.map(s => s.docs.map(d => ({ id: d.id, ...d.data() } as any)));

                const safeSort = (a: any, b: any) => String(a.nome || '').localeCompare(String(b.nome || ''));

                setOptions({
                    tecnici: tecnici.sort((a: any, b: any) => String(a.cognome || '').localeCompare(String(b.cognome || '')) || String(a.nome || '').localeCompare(String(b.nome || ''))),
                    navi: navi.sort(safeSort),
                    luoghi: luoghi.sort(safeSort),
                    tipiGiornata: tipiGiornata.sort(safeSort),
                    veicoli: veicoli.sort(safeSort)
                });

                if (id) {
                    const docSnap = await getDoc(doc(db, 'rapportini', id));
                    if (docSnap.exists()) {
                        const data = docSnap.data() as RapportinoFirestore;
                        reset({
                            ...data,
                            data: safeTimestampToDayjs(data.data),
                            oraInizio: safeTimestampToDayjs(data.oraInizio),
                            oraFine: safeTimestampToDayjs(data.oraFine),
                            tecniciAggiunti: data.tecniciAggiunti?.map(t => ({...t, oraInizio: safeTimestampToDayjs(t.oraInizio), oraFine: safeTimestampToDayjs(t.oraFine) })) || [],
                        });
                    } else { showAlert('Rapportino non trovato.', 'error'); navigate('/reportistica'); }
                } else {
                    const orariDefaultRef = doc(db, 'configurazione', 'orariDefault');
                    const orariDefaultSnap = await getDoc(orariDefaultRef);

                    let oraInizio = dayjs().hour(7).minute(30); 
                    let oraFine = dayjs().hour(16).minute(30); 
                    let pausa = 60; 

                    if (orariDefaultSnap.exists()) {
                        const orariData = orariDefaultSnap.data() as Orari;
                        // --- FIX: Aggiunto controllo di esistenza prima di usare .split() ---
                        if (orariData && typeof orariData.inizio === 'string' && orariData.inizio) {
                            const [startHour, startMinute] = orariData.inizio.split(':').map(Number);
                            oraInizio = dayjs().hour(startHour).minute(startMinute);
                        }
                        if (orariData && typeof orariData.fine === 'string' && orariData.fine) {
                            const [endHour, endMinute] = orariData.fine.split(':').map(Number);
                            oraFine = dayjs().hour(endHour).minute(endMinute);
                        }
                        if (orariData && typeof orariData.pausa === 'number') {
                            pausa = orariData.pausa;
                        }
                        // --- FINE FIX ---
                    }

                    reset({ 
                        data: dayjs(), 
                        oraInizio: oraInizio, 
                        oraFine: oraFine, 
                        pausa: pausa, 
                        oreLavorate: (oraFine.diff(oraInizio, 'minute') - pausa) / 60, 
                        tecniciAggiunti: [] 
                    });
                }
            } catch (error) { console.error("Errore caricamento dati:", error); showAlert("Impossibile caricare i dati", 'error');
            } finally { setLoading(false); }
        };
        fetchOptionsAndData();
    }, [id, reset, navigate, showAlert]);

    useEffect(() => {
        if (!watchInserimentoManuale && watchOraInizio && watchOraFine && dayjs(watchOraFine).isAfter(watchOraInizio)) {
            const ore = (dayjs(watchOraFine).diff(watchOraInizio, 'minute') - (watchPausa || 0)) / 60;
            setValue('oreLavorate', Math.round(ore * 100) / 100);
        }
    }, [watchOraInizio, watchOraFine, watchPausa, watchInserimentoManuale, setValue]);

    const onSubmit = async (data: RapportinoSchema) => {
        if (isReadOnly) return;
        try {
            const toTimestamp = (date: any) => date ? Timestamp.fromDate(dayjs(date).toDate()) : null;
            const saveData: Omit<RapportinoFirestore, 'id'> = {
                ...data,
                data: toTimestamp(data.data) as Timestamp,
                oraInizio: toTimestamp(data.oraInizio),
                oraFine: toTimestamp(data.oraFine),
                tecniciAggiunti: data.tecniciAggiunti?.map(t => ({ ...t, oraInizio: toTimestamp(t.oraInizio), oraFine: toTimestamp(t.oraFine) }))
            };

            if (isNew) {
                await addDoc(collection(db, 'rapportini'), saveData);
                showAlert('Rapportino creato!', 'success');
            } else if (id) {
                await updateDoc(doc(db, 'rapportini', id), saveData);
                showAlert('Rapportino aggiornato!', 'success');
            }
            navigate('/reportistica');
        } catch (error: any) { console.error("Errore salvataggio:", error); showAlert(`Errore: ${error.message}`, 'error'); }
    };

    const handleDelete = async () => {
        if (isReadOnly || !id) return;
        if (window.confirm('Sei sicuro di voler eliminare questo rapportino?')) {
            try {
                await deleteDoc(doc(db, 'rapportini', id));
                showAlert('Rapportino eliminato.', 'warning');
                navigate('/reportistica');
            } catch (error: any) { console.error("Errore eliminazione:", error); showAlert(`Errore: ${error.message}`, 'error'); }
        }
    };

    const handleOpenOrariModal = (index: number) => { setEditingTecnicoIndex(index); setOrariModalOpen(true); };
    const handleCloseOrariModal = () => { setEditingTecnicoIndex(null); setOrariModalOpen(false); };
    const handleSaveOrariTecnico = (data: TecnicoAggiunto) => {
        if (editingTecnicoIndex !== null) {
            update(editingTecnicoIndex, data);
            handleCloseOrariModal();
        }
    };
    const handleAddTecnico = () => {
        if (tecnicoSelezionato) {
            append({ tecnicoId: tecnicoSelezionato.id, inserimentoManualeOre: watchInserimentoManuale, oraInizio: watchOraInizio, oraFine: watchOraFine, pausa: watchPausa, oreLavorate: watchOreLavorate });
            setTecnicoSelezionato(null);
        }
    };

    const getVeicoloLabel = (o: Veicolo) => {
        const nome = o.nome || 'Veicolo senza nome';
        const targa = o.targa ? `(${o.targa})` : '';
        return `${nome} ${targa}`.trim();
    };
    
    const getOptionLabel = (o: { nome?: string; cognome?: string; }) => `${o.cognome || ''} ${o.nome || ''}`.trim() || 'Senza nome';

    const getValueFromId = <T extends {id: string}>(id: string | null, list: T[]): T | null => id ? list.find(item => item.id === id) || null : null;

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
                    <Typography variant="h4" component="h1">{isNew ? 'Nuovo Rapportino' : 'Modifica Rapportino'}</Typography>
                    <Box sx={{width: 48}} />
                </Box>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}><Divider>Dettagli Principali</Divider></Grid>
                        <Grid item xs={12} sm={6} md={4}><Controller name="data" control={control} render={({ field }) => <DatePicker {...field} label="Data" sx={{ width: '100%' }} readOnly={isReadOnly} />} /></Grid>
                        <Grid item xs={12} sm={6} md={4}><Controller name="tecnicoScriventeId" control={control} render={({ field, fieldState }) => <Autocomplete options={options.tecnici} getOptionLabel={getOptionLabel} value={getValueFromId(field.value, options.tecnici)} onChange={(_, data) => field.onChange(data?.id || null)} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Tecnico Scrivente" required error={!!fieldState.error} />} />} /></Grid>
                        <Grid item xs={12} sm={12} md={4}><Controller name="giornataId" control={control} render={({ field }) => <Autocomplete options={options.tipiGiornata} getOptionLabel={(o: TipoGiornata) => o.nome || ''} value={getValueFromId(field.value, options.tipiGiornata)} onChange={(_,data) => field.onChange(data?.id || null)} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Tipo Giornata" required error={!!errors.giornataId} helperText={errors.giornataId?.message} />} />} /></Grid>

                        <Grid item xs={12}><Divider>Tempo Lavorato</Divider></Grid>
                        <Grid item xs={12}><Controller name="inserimentoManualeOre" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} disabled={isReadOnly} />} label="Inserisci ore manuali" />} /></Grid>
                        <Grid item xs={6} sm={3}><Controller name="oraInizio" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Inizio" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale || isReadOnly} slotProps={{ textField: { error: !!fieldState.error } }} />} /></Grid>
                        <Grid item xs={6} sm={3}><Controller name="oraFine" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Fine" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale || isReadOnly} slotProps={{ textField: { error: !!fieldState.error } }} />} /></Grid>
                        <Grid item xs={12} sm={3}><Controller name="pausa" control={control} render={({ field }) => <TextField {...field} type="number" label="Pausa (minuti)" fullWidth disabled={watchInserimentoManuale || isReadOnly} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />} /></Grid>
                        <Grid item xs={12} sm={3}><Controller name="oreLavorate" control={control} render={({ field, fieldState }) => <TextField {...field} type="number" label="Ore Lavorate" fullWidth disabled={!watchInserimentoManuale || isReadOnly} InputProps={{ inputProps: { step: 0.5 } }} error={!!fieldState.error} helperText={!fieldState.error && `Valore: ${oreLavorateFormatted}`} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />} /></Grid>

                        <Grid item xs={12}><Divider>Altri Tecnici Presenti</Divider></Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <Autocomplete
                                    sx={{ flexGrow: 1 }}
                                    options={options.tecnici.filter(t => t.id !== watchTecnicoScriventeId && !fields.some(f => f.tecnicoId === t.id))}
                                    getOptionLabel={getOptionLabel}
                                    value={tecnicoSelezionato}
                                    onChange={(_, newValue) => setTecnicoSelezionato(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Seleziona un tecnico da aggiungere" />}
                                />
                                <Button variant="contained" onClick={handleAddTecnico} disabled={!tecnicoSelezionato || isReadOnly}>Aggiungi</Button>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {fields.map((field, index) => {
                                    const tecnicoInfo = options.tecnici.find(t => t.id === field.tecnicoId);
                                    return (
                                        <Chip
                                            key={field.id} 
                                            label={`${tecnicoInfo ? getOptionLabel(tecnicoInfo) : 'Tecnico non trovato'} [${formatTecnicoAggiuntoOre(field)}]`}
                                            onDelete={isReadOnly ? undefined : () => remove(index)}
                                            deleteIcon={isReadOnly ? <span /> : <DeleteIcon />}
                                            icon={isReadOnly ? undefined : <EditCalendarIcon />}
                                            onClick={isReadOnly ? undefined : () => handleOpenOrariModal(index)}
                                            sx={{ justifyContent: 'space-between', p: 2.5, height: 'auto' }}
                                        />
                                    );
                                })}
                            </Box>
                        </Grid>

                        <Grid item xs={12}><Divider>Riferimenti</Divider></Grid>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="naveId"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={options.navi}
                                        getOptionLabel={(o: Nave) => o.nome || ''}
                                        value={getValueFromId(field.value, options.navi)}
                                        onChange={(_, data) => field.onChange(data?.id || null)}
                                        readOnly={isReadOnly}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Nave"
                                                required={isGiornataLavorativa}
                                                error={!!errors.naveId}
                                                helperText={errors.naveId?.message}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="luogoId"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={options.luoghi}
                                        getOptionLabel={(o: Luogo) => o.nome || ''}
                                        value={getValueFromId(field.value, options.luoghi)}
                                        onChange={(_, data) => field.onChange(data?.id || null)}
                                        readOnly={isReadOnly}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Luogo"
                                                required={isGiornataLavorativa}
                                                error={!!errors.luogoId}
                                                helperText={errors.luogoId?.message}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="veicoloId"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={options.veicoli}
                                        getOptionLabel={getVeicoloLabel}
                                        value={getValueFromId(field.value, options.veicoli)}
                                        onChange={(_, data) => field.onChange(data?.id || null)}
                                        readOnly={isReadOnly}
                                        renderInput={(params) => <TextField {...params} label="Veicolo" />}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12}><Divider>Dettagli Intervento</Divider></Grid>
                        <Grid item xs={12}><Controller name="breveDescrizione" control={control} render={({ field }) => <TextField {...field} label="Breve Descrizione Intervento" fullWidth required={isGiornataLavorativa} error={!!errors.breveDescrizione} helperText={errors.breveDescrizione?.message} InputProps={{ readOnly: isReadOnly }} />} /></Grid>
                        <Grid item xs={12}><Controller name="lavoroEseguito" control={control} render={({ field }) => <TextField {...field} label="Lavoro Eseguito" multiline rows={5} fullWidth required={isGiornataLavorativa} error={!!errors.lavoroEseguito} helperText={errors.lavoroEseguito?.message} InputProps={{ readOnly: isReadOnly }} />} /></Grid>
                        <Grid item xs={12}><Controller name="materialiImpiegati" control={control} render={({ field }) => <TextField {...field} label="Materiali Impiegati" multiline rows={3} fullWidth InputProps={{ readOnly: isReadOnly }} />} /></Grid>

                        {!isReadOnly && (
                            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                                {!isNew && <Button variant="outlined" color="error" onClick={handleDelete} startIcon={<DeleteIcon />}>Elimina</Button>}
                                <Box /> 
                                <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>Salva</Button>
                            </Grid>
                        )}
                    </Grid>
                </form>
            </Paper>

            {editingTecnicoIndex !== null && (
                <OrariTecnicoDialog
                    open={isOrariModalOpen}
                    onClose={handleCloseOrariModal}
                    onSave={handleSaveOrariTecnico}
                    valoriIniziali={fields[editingTecnicoIndex] || {}}
                    nomeTecnico={options.tecnici.find(t => t.id === fields[editingTecnicoIndex]?.tecnicoId)?.nome || ''}
                />
            )}
        </LocalizationProvider>
    );
};

export default RapportinoEdit;
