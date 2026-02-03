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
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { Timestamp } from 'firebase/firestore';
import type { Documento } from '@/models/definitions';

dayjs.locale('it');

interface DocumentoFormProps {
    open: boolean;
    onClose: (shouldRefresh: boolean) => void;
    onSave: (data: Partial<Documento>) => void;
    documento: Partial<Documento> | null;
}

const convertToDayjs = (date: unknown): dayjs.Dayjs | null => {
    if (!date) return null;
    // Duck-typing for objects with a toDate method like Firestore Timestamps
    if (typeof (date as { toDate?: () => Date }).toDate === 'function') {
        return dayjs((date as { toDate: () => Date }).toDate());
    }
    if (dayjs.isDayjs(date)) return date;
    // Attempt to parse other types that dayjs supports
    const parsedDate = dayjs(date as string | number | Date);
    return parsedDate.isValid() ? parsedDate : null;
};

const defaultValues: Partial<Documento> = {
    nome: '',
    descrizione: '',
    scadenza1: null,
    scadenza2: null,
    note: ''
};

const DocumentoForm = ({ open, onClose, onSave, documento }: DocumentoFormProps) => {
    const { handleSubmit, control, reset, formState: { isSubmitting } } = useForm<Partial<Documento>>({ defaultValues });

    const isEditMode = documento && documento.id;

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                const docConDate = {
                    ...documento,
                    scadenza1: convertToDayjs(documento.scadenza1),
                    scadenza2: convertToDayjs(documento.scadenza2),
                };
                reset(docConDate);
            } else {
                reset(defaultValues);
            }
        }
    }, [documento, open, reset, isEditMode]);

    const handleFormSubmit: SubmitHandler<Partial<Documento>> = (data) => {
        const dataToSave = { ...data };
        if (dataToSave.scadenza1) {
            dataToSave.scadenza1 = Timestamp.fromDate(dayjs(dataToSave.scadenza1).toDate());
        }
        if (dataToSave.scadenza2) {
            dataToSave.scadenza2 = Timestamp.fromDate(dayjs(dataToSave.scadenza2).toDate());
        }
        onSave(dataToSave);
    };

    const renderDatePicker = (name: keyof Documento, label: string) => (
        <Grid item xs={12} sm={6}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <DatePicker
                        label={label}
                        value={field.value ? dayjs(field.value) : null}
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
                <DialogTitle>{isEditMode ? 'Modifica Documento' : 'Nuovo Documento'}</DialogTitle>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}><Controller name="nome" control={control} rules={{ required: 'Il nome è obbligatorio' }} render={({ field }) => <TextField {...field} label="Nome" fullWidth />} /></Grid>
                            <Grid item xs={12} sm={6}><Controller name="descrizione" control={control} render={({ field }) => <TextField {...field} label="Descrizione" fullWidth />} /></Grid>
                            <Grid item xs={12}><hr /></Grid>
                            {renderDatePicker('scadenza1', 'Scadenza 1')}
                            {renderDatePicker('scadenza2', 'Scadenza 2')}
                            <Grid item xs={12}><hr /></Grid>
                            <Grid item xs={12}><Controller name="note" control={control} render={({ field }) => <TextField {...field} label="Note" multiline rows={4} fullWidth />} /></Grid>
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

export default DocumentoForm;
