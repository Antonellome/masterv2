import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, 
    QuerySnapshot, DocumentData, QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRapportinoSchema, type RapportinoSchema } from '@/models/rapportino.schema';
import { 
    TextField, Button, Grid, CircularProgress, Typography, Paper, Box, 
    Autocomplete, IconButton, Divider, Switch, FormControlLabel 
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAlert } from '@/contexts/AlertContext';
import { Tecnico, Nave, Luogo, TipoGiornata, Veicolo, Rapportino } from '@/models/definitions';


interface RapportinoEditProps {
    isReadOnly?: boolean;
}

type RapportinoFirestore = Omit<Rapportino, 'id' | 'data' | 'oraInizio' | 'oraFine'> & {
    data: Timestamp;
    oraInizio: Timestamp | null;
    oraFine: Timestamp | null;
};

const initialOptions: {
    tecnici: Tecnico[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
    veicoli: Veicolo[];
} = {
    tecnici: [], navi: [], luoghi: [], tipiGiornata: [], veicoli: []
};

const RapportinoEdit: React.FC<RapportinoEditProps> = ({ isReadOnly = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [options, setOptions] = useState(initialOptions);

  const rapportinoSchema = useMemo(() => createRapportinoSchema(options.tipiGiornata), [options.tipiGiornata]);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RapportinoSchema>({
    resolver: zodResolver(rapportinoSchema),
    defaultValues: {
        data: dayjs(),
        inserimentoManualeOre: false,
        oraInizio: null,
        oraFine: null,
        pausa: 0,
        oreLavorate: 0,
        tecnicoScriventeId: '',
        tecniciAggiuntiIds: [],
        naveId: null,
        luogoId: null,
        giornataId: '',
        veicoloId: null,
        breveDescrizione: '',
        lavoroEseguito: '',
        materialiImpiegati: '',
    },
    reValidateMode: 'onChange',
  });

  const watchGiornataId = watch('giornataId');
  const watchInserimentoManuale = watch('inserimentoManualeOre');
  const watchOraInizio = watch('oraInizio');
  const watchOraFine = watch('oraFine');
  const watchPausa = watch('pausa');
  
  const isGiornataLavorativa = useMemo(() => {
    const tipo = options.tipiGiornata.find(t => t.id === watchGiornataId);
    return tipo ? tipo.lavorativa : false;
  }, [watchGiornataId, options.tipiGiornata]);

  useEffect(() => {
       setValue('giornataId', watchGiornataId, { shouldValidate: true });
   }, [watchGiornataId, setValue]);

  useEffect(() => {
    setLoading(true);
    const fetchOptionsAndData = async () => {
        try {
            const [tecniciSnap, naviSnap, luoghiSnap, tipiGiornataSnap, veicoliSnap] = await Promise.all([
                getDocs(collection(db, 'tecnici')),
                getDocs(collection(db, 'navi')),
                getDocs(collection(db, 'luoghi')),
                getDocs(collection(db, 'tipiGiornata')),
                getDocs(collection(db, 'veicoli')),
            ]);
            const mapSnap = <T extends DocumentData>(snap: QuerySnapshot<DocumentData>) => 
                snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as T));

            const fetchedOptions = {
                tecnici: mapSnap<Tecnico>(tecniciSnap).sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '')),
                navi: mapSnap<Nave>(naviSnap).sort((a,b) => (a.nome || '').localeCompare(b.nome || '')),
                luoghi: mapSnap<Luogo>(luoghiSnap).sort((a,b) => (a.nome || '').localeCompare(b.nome || '')),
                tipiGiornata: mapSnap<TipoGiornata>(tipiGiornataSnap).sort((a,b) => (a.nome || '').localeCompare(b.nome || '')),
                veicoli: mapSnap<Veicolo>(veicoliSnap).sort((a,b) => (a.nome || '').localeCompare(b.nome || ''))
            };
            setOptions(fetchedOptions);

            // ** LA CORREZIONE CHIAVE È QUI **
            // Carica sempre i dati se c'è un ID, indipendentemente da isReadOnly
            if (id) {
                const docRef = doc(db, 'rapportini', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as RapportinoFirestore;
                    reset({
                        ...data,
                        giornataId: data.giornataId || null,
                        data: data.data ? dayjs(data.data.toDate()) : null,
                        oraInizio: data.oraInizio ? dayjs(data.oraInizio.toDate()) : null,
                        oraFine: data.oraFine ? dayjs(data.oraFine.toDate()) : null,
                        tecniciAggiuntiIds: data.tecniciAggiuntiIds || [],
                    });
                } else if (!isReadOnly) { // Mostra errore solo se non siamo in una pagina di stampa
                    showAlert('Rapportino non trovato.', 'error');
                    navigate('/reportistica');
                }
            }
        } catch (error) {
            console.error("Errore caricamento dati:", error);
            if (!isReadOnly) showAlert("Impossibile caricare i dati necessari", 'error');
        } finally {
            setLoading(false);
        }
    };
    fetchOptionsAndData();
  }, [id, reset, navigate, showAlert, isReadOnly]);

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

 const onSubmit = async (data: RapportinoSchema) => {
     if (isReadOnly) return;
     // ... (logica di salvataggio invariata)
     try {
        const saveData: Partial<RapportinoFirestore> = {
            data: data.data ? Timestamp.fromDate(dayjs(data.data).toDate()) : Timestamp.now(),
            inserimentoManualeOre: data.inserimentoManualeOre,
            oreLavorate: data.oreLavorate,
            breveDescrizione: data.breveDescrizione,
            lavoroEseguito: data.lavoroEseguito,
            materialiImpiegati: data.materialiImpiegati || '',
            tecnicoScriventeId: data.tecnicoScriventeId,
            tecniciAggiuntiIds: data.tecniciAggiuntiIds || [],
            naveId: data.naveId,
            luogoId: data.luogoId,
            giornataId: data.giornataId,
            veicoloId: data.veicoloId || null,
            oraInizio: null,
            oraFine: null,
            pausa: 0,
        };

      if (!data.inserimentoManualeOre) {
        saveData.oraInizio = data.oraInizio ? Timestamp.fromDate(dayjs(data.oraInizio).toDate()) : null;
        saveData.oraFine = data.oraFine ? Timestamp.fromDate(dayjs(data.oraFine).toDate()) : null;
        saveData.pausa = data.pausa || 0;
      }

      if (isNew) {
        await addDoc(collection(db, 'rapportini'), saveData);
        showAlert('Rapportino creato con successo!', 'success');
      } else if(id) {
        await updateDoc(doc(db, 'rapportini', id), saveData);
        showAlert('Rapportino aggiornato con successo!', 'success');
      }
      navigate('/reportistica');
    } catch (error: unknown) {
      console.error("Errore nel salvataggio: ", error);
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      showAlert(`Si è verificato un errore: ${message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (isReadOnly || !id) return;
    if (window.confirm('Sei sicuro di voler eliminare questo rapportino?')) {
      try {
        await deleteDoc(doc(db, 'rapportini', id));
        showAlert('Rapportino eliminato.', 'warning');
        navigate('/reportistica');
      } catch (error: unknown) {
        console.error("Errore durante l'eliminazione", error);
        const message = error instanceof Error ? error.message : 'Errore sconosciuto';
        showAlert(`Errore durante l'eliminazione: ${message}`, 'error');
      }
    }
  };
  
  const getValueFromId = <T extends {id: string}>(id: string | null, list: T[]): T | null => id ? list.find(item => item.id === id) || null : null;

  if (loading) return <Box sx={{display: 'flex', justifyContent: 'center', p: 5}}><CircularProgress /></Box>;

  return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
          <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 }, '@media print': { boxShadow: 'none', margin: 0, padding: 0 } }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, '@media print': { display: 'none' } }}>
                {!isReadOnly && (
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <IconButton onClick={() => navigate(-1)}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4" component="h1">
                        {isNew ? 'Nuovo Rapportino' : 'Modifica Rapportino'}
                        </Typography>
                    </Box>
                )}
                 {isReadOnly && (
                     <Typography variant="h4" component="h1">
                        Dettaglio Rapportino
                    </Typography>
                 )}
            </Box>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                {/* ... sezioni del form con campi readOnly ... */}
                <Grid size={12}><Divider>Dettagli Principali</Divider></Grid>

                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 4
                    }}><Controller name="data" control={control} render={({ field }) => <DatePicker {...field} label="Data" sx={{ width: '100%' }} readOnly={isReadOnly} />} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 6,
                        md: 8
                    }}>
                  <Controller
                    name="tecnicoScriventeId"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Autocomplete<Tecnico>
                            options={options.tecnici}
                            getOptionLabel={(option) => option ? `${option.cognome} ${option.nome}` : ''}
                            value={getValueFromId(field.value, options.tecnici)}
                            onChange={(_, data: Tecnico | null) => field.onChange(data?.id || null)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            readOnly={isReadOnly}
                            renderInput={(params) => <TextField {...params} label="Tecnico Scrivente" required error={!!fieldState.error} helperText={fieldState.error?.message} InputProps={{...params.InputProps, readOnly: isReadOnly}} />}
                        />
                    )}
                  />
                </Grid>

                <Grid size={12}><Divider>Tempo Lavorato</Divider></Grid>

                <Grid size={12}>
                    <Controller name="inserimentoManualeOre" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} disabled={isReadOnly} />} label="Inserisci ore manuali" />} />
                </Grid>
                
                <Grid
                    size={{
                        xs: 6,
                        sm: 3,
                        md: 3
                    }}><Controller name="oraInizio" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Inizio" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} readOnly={isReadOnly} slotProps={{ textField: { error: !!fieldState.error, helperText: fieldState.error?.message, InputProps: { readOnly: isReadOnly } } }} />} /></Grid>
                <Grid
                    size={{
                        xs: 6,
                        sm: 3,
                        md: 3
                    }}><Controller name="oraFine" control={control} render={({ field, fieldState }) => <TimePicker {...field} label="Ora Fine" ampm={false} sx={{ width: '100%' }} disabled={watchInserimentoManuale} readOnly={isReadOnly} slotProps={{ textField: { error: !!fieldState.error, helperText: fieldState.error?.message, InputProps: { readOnly: isReadOnly } } }} />} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 3,
                        md: 3
                    }}><Controller name="pausa" control={control} render={({ field }) => <TextField {...field} type="number" label="Pausa (minuti)" fullWidth disabled={watchInserimentoManuale || isReadOnly} InputProps={{ readOnly: isReadOnly }} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/>} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        sm: 3,
                        md: 3
                    }}><Controller name="oreLavorate" control={control} render={({ field, fieldState }) => <TextField {...field} type="number" label="Ore Lavorate" fullWidth disabled={!watchInserimentoManuale || isReadOnly} InputProps={{ readOnly: isReadOnly }} error={!!fieldState.error} helperText={fieldState.error?.message} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/>} /></Grid>

                <Grid size={12}><Divider>Riferimenti</Divider></Grid>
                
                <Grid
                    size={{
                        xs: 12,
                        md: 6
                    }}><Controller name="naveId" control={control} render={({ field, fieldState }) => <Autocomplete<Nave> options={options.navi} getOptionLabel={(o) => o.nome || ''} value={getValueFromId(field.value, options.navi)} onChange={(_,data: Nave | null) => field.onChange(data?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Nave" required={isGiornataLavorativa} error={!!errors.naveId} helperText={errors.naveId?.message} InputProps={{...params.InputProps, readOnly: isReadOnly}} />} />} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: 6
                    }}><Controller name="luogoId" control={control} render={({ field, fieldState }) => <Autocomplete<Luogo> options={options.luoghi} getOptionLabel={(o) => o.nome || ''} value={getValueFromId(field.value, options.luoghi)} onChange={(_,data: Luogo | null) => field.onChange(data?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Luogo" required={isGiornataLavorativa} error={!!errors.luogoId} helperText={errors.luogoId?.message} InputProps={{...params.InputProps, readOnly: isReadOnly}} />} />} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: 6
                    }}><Controller name="giornataId" control={control} render={({ field, fieldState }) => <Autocomplete<TipoGiornata> options={options.tipiGiornata} getOptionLabel={(o) => o.nome || ''} value={getValueFromId(field.value, options.tipiGiornata)} onChange={(_,data: TipoGiornata | null) => field.onChange(data?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Tipo Giornata" required error={!!fieldState.error} helperText={fieldState.error?.message} InputProps={{...params.InputProps, readOnly: isReadOnly}} />} />} /></Grid>
                <Grid
                    size={{
                        xs: 12,
                        md: 6
                    }}><Controller name="veicoloId" control={control} render={({ field }) => <Autocomplete<Veicolo> options={options.veicoli} getOptionLabel={(o) => o.nome || ''} value={getValueFromId(field.value, options.veicoli)} onChange={(_,data: Veicolo | null) => field.onChange(data?.id || null)} isOptionEqualToValue={(o,v) => o.id === v.id} readOnly={isReadOnly} renderInput={(params) => <TextField {...params} label="Veicolo" InputProps={{...params.InputProps, readOnly: isReadOnly}} />} />} /></Grid>
                
                <Grid size={12}><Divider>Dettagli Intervento</Divider></Grid>

                <Grid size={12}><Controller name="breveDescrizione" control={control} render={({ field, fieldState }) => <TextField {...field} label="Breve Descrizione Intervento" fullWidth required={isGiornataLavorativa} error={!!errors.breveDescrizione} helperText={errors.breveDescrizione?.message} InputProps={{ readOnly: isReadOnly }} />} /></Grid>
                <Grid size={12}><Controller name="lavoroEseguito" control={control} render={({ field, fieldState }) => <TextField {...field} label="Lavoro Eseguito" multiline rows={5} fullWidth required={isGiornataLavorativa} error={!!errors.lavoroEseguito} helperText={errors.lavoroEseguito?.message} InputProps={{ readOnly: isReadOnly }} />} /></Grid>
                <Grid size={12}><Controller name="materialiImpiegati" control={control} render={({ field }) => <TextField {...field} label="Materiali Impiegati" multiline rows={3} fullWidth InputProps={{ readOnly: isReadOnly }} />} /></Grid>

                <Grid size={12}><Divider>Altri Tecnici Presenti</Divider></Grid>
                 <Grid size={12}>
                     <Controller
                        name="tecniciAggiuntiIds"
                        control={control}
                        render={({ field }) => (
                            <Autocomplete<Tecnico, true>
                                multiple
                                options={options.tecnici.filter(t => t.id !== watch('tecnicoScriventeId'))}
                                getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                                value={(field.value || []).map(id => getValueFromId(id, options.tecnici)).filter(Boolean) as Tecnico[]}
                                onChange={(_, data: Tecnico[]) => field.onChange(data.map(d => d.id))}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                readOnly={isReadOnly}
                                 renderInput={(params) => <TextField {...params} label="Aggiungi colleghi presenti all'intervento" InputProps={{...params.InputProps, readOnly: isReadOnly}} />}
                            />
                        )}
                    />
                </Grid>

                {!isReadOnly && (
                     <Grid
                         sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}
                         size={12}>
                        <Button variant="outlined" color="secondary" onClick={() => navigate('/reportistica')}>Annulla</Button>
                        <Box>
                            {!isNew && <Button variant="outlined" color="error" onClick={handleDelete} startIcon={<DeleteIcon />} sx={{ mr: 2}}>Elimina</Button>}
                            <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />}>Salva Rapportino</Button>
                        </Box>
                    </Grid>
                )}
              </Grid>
            </form>
          </Paper>
      </LocalizationProvider>
  );
};

export default RapportinoEdit;
