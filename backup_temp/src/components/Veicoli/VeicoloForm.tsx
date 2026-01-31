import { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    CircularProgress,
    MenuItem,
    FormControlLabel,
    Switch,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { Timestamp } from 'firebase/firestore';
import type { Veicolo } from '@/models/definitions';

dayjs.locale('it');

// Definiamo un tipo per l'input della data per riusabilità
type DateInput = string | Date | Timestamp | null | undefined;

// Tipo per i valori del form, con le date come Dayjs
interface VeicoloFormValues extends Omit<Veicolo, 'id' | 'scadenzaAssicurazione' | 'scadenzaBollo' | 'scadenzaRevisione' | 'scadenzaTagliando' | 'scadenzaTachigrafo'> {
    scadenzaAssicurazione: Dayjs | null;
    scadenzaBollo: Dayjs | null;
    scadenzaRevisione: Dayjs | null;
    scadenzaTagliando: Dayjs | null;
    scadenzaTachigrafo: Dayjs | null;
}

interface VeicoloFormProps {
    open: boolean;
    onClose: (shouldRefresh?: boolean) => void;
    onSave: (data: Partial<Veicolo>) => void;
    veicolo: Partial<Veicolo> | null;
}

// Converte in modo sicuro qualsiasi formato di data in un oggetto Dayjs
const convertToDayjs = (date: DateInput): Dayjs | null => {
    if (!date) return null;
    // Se è un Timestamp di Firestore, usa toDate()
    if (date instanceof Timestamp) {
        return dayjs(date.toDate());
    }
    // Altrimenti, prova a parsarlo direttamente (gestisce stringhe, oggetti Date, ecc.)
    const d = dayjs(date as string | Date);
    return d.isValid() ? d : null;
};

const convertToTimestamp = (date: Dayjs | null | undefined): Timestamp | null => {
    if (!date) return null;
    return Timestamp.fromDate(date.toDate());
};

const defaultValues: VeicoloFormValues = {
    targa: '',
    tipo: 'auto',
    marca: '',
    modello: '',
    anno: new Date().getFullYear(),
    kmAttuali: 0,
    attivo: true,
    scadenzaAssicurazione: null,
    scadenzaBollo: null,
    scadenzaRevisione: null,
    scadenzaTagliando: null,
    scadenzaTachigrafo: null,
    note: ''
};

const tipiVeicolo = ['auto', 'furgone', 'camion', 'speciale', 'muletto'];

const VeicoloForm = ({ open, onClose, onSave, veicolo }: VeicoloFormProps) => {
    const { handleSubmit, control, reset, formState: { isSubmitting, errors } } = useForm<VeicoloFormValues>({ defaultValues });

    const isEditMode = veicolo && veicolo.id;

    useEffect(() => {
        if (open) {
            if (isEditMode && veicolo) {
                 const veicoloConDateConvertite: VeicoloFormValues = {
                    ...defaultValues,
                    ...veicolo,
                    scadenzaAssicurazione: convertToDayjs(veicolo.scadenzaAssicurazione),
                    scadenzaBollo: convertToDayjs(veicolo.scadenzaBollo),
                    scadenzaRevisione: convertToDayjs(veicolo.scadenzaRevisione),
                    scadenzaTagliando: convertToDayjs(veicolo.scadenzaTagliando),
                    scadenzaTachigrafo: convertToDayjs(veicolo.scadenzaTachigrafo),
                };
                reset(veicoloConDateConvertite);
            } else {
                reset(defaultValues);
            }
        }
    }, [veicolo, open, reset, isEditMode]);

    const handleFormSubmit: SubmitHandler<VeicoloFormValues> = async (data) => {
        try {
            const dataToSave: Omit<Veicolo, 'id'> = {
                ...data,
                scadenzaAssicurazione: convertToTimestamp(data.scadenzaAssicurazione),
                scadenzaBollo: convertToTimestamp(data.scadenzaBollo),
                scadenzaRevisione: convertToTimestamp(data.scadenzaRevisione),
                scadenzaTagliando: convertToTimestamp(data.scadenzaTagliando),
                scadenzaTachigrafo: convertToTimestamp(data.scadenzaTachigrafo),
            };
            
            onSave(dataToSave);

        } catch (error) {
            console.error("Errore nel salvataggio del veicolo:", error);
        }
    };
    
    const renderDatePicker = (name: keyof VeicoloFormValues, label: string) => (
        <Grid item xs={12} sm={6}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <DatePicker
                        label={label}
                        value={field.value}
                        onChange={field.onChange}
                        sx={{ width: '100%' }}
                    />
                )}
            />
        </Grid>
    );

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
                <DialogTitle>{isEditMode ? 'Modifica Veicolo' : 'Nuovo Veicolo'}</DialogTitle>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={4}><Controller name="targa" control={control} rules={{ required: 'La targa è obbligatoria' }} render={({ field }) => <TextField {...field} label="Targa" fullWidth error={!!errors.targa} helperText={errors.targa?.message} />} /></Grid>
                            <Grid item xs={12} sm={4}><Controller name="tipo" control={control} render={({ field }) => <TextField {...field} label="Tipo" select fullWidth>{tipiVeicolo.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField>} /></Grid>
                            <Grid item xs={12} sm={4}><Controller name="marca" control={control} render={({ field }) => <TextField {...field} label="Marca" fullWidth />} /></Grid>
                            <Grid item xs={12} sm={4}><Controller name="modello" control={control} render={({ field }) => <TextField {...field} label="Modello" fullWidth />} /></Grid>
                            <Grid item xs={12} sm={4}><Controller name="anno" control={control} render={({ field }) => <TextField {...field} label="Anno" type="number" fullWidth />} /></Grid>
                            <Grid item xs={12} sm={4}><Controller name="kmAttuali" control={control} render={({ field }) => <TextField {...field} label="Km Attuali" type="number" fullWidth />} /></Grid>
                            <Grid item xs={12}><hr /></Grid>
                            {renderDatePicker('scadenzaAssicurazione', 'Scadenza Assicurazione')}
                            {renderDatePicker('scadenzaBollo', 'Scadenza Bollo')}
                            {renderDatePicker('scadenzaRevisione', 'Scadenza Revisione')}
                            {renderDatePicker('scadenzaTagliando', 'Scadenza Tagliando')}
                            {renderDatePicker('scadenzaTachigrafo', 'Scadenza Tachigrafo')}
                            <Grid item xs={12}><hr /></Grid>
                            <Grid item xs={12}><Controller name="note" control={control} render={({ field }) => <TextField {...field} label="Note" multiline rows={4} fullWidth />} /></Grid>
                            <Grid item xs={12}><FormControlLabel control={<Controller name="attivo" control={control} render={({ field }) => <Switch {...field} checked={!!field.value} />} />} label="Veicolo attivo" /></Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => onClose(false)} disabled={isSubmitting}>Annulla</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? <CircularProgress size={24} /> : 'Salva'}</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </LocalizationProvider>
    );
};

export default VeicoloForm;
