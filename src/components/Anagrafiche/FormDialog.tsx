import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, CircularProgress } from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { FormField, Anagrafica } from '@/models/definitions';
import { safeGetDayjs } from '@/utils/dateUtils';

interface SelectFieldProps {
    field: FormField;
    value: any;
    onChange: (name: string, value: any) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ field, value, onChange }) => {
    const [options, setOptions] = useState<{ label: string; value: string; }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (field.options && 'collectionName' in field.options) {
            const fetchOptions = async () => {
                setLoading(true);
                try {
                    const snapshot = await getDocs(collection(db, field.options.collectionName));
                    const fetchedOptions = snapshot.docs.map(doc => ({
                        label: doc.data()[field.options.labelField] || 'Label non trovato',
                        value: doc.id,
                    }));
                    setOptions(fetchedOptions);
                } catch (error) {
                    console.error(`Errore caricamento opzioni per ${field.options.collectionName}:`, error);
                    setOptions([]);
                }
                setLoading(false);
            };
            fetchOptions();
        }
    }, [field.options]);

    return (
        <Autocomplete
            options={options}
            loading={loading}
            getOptionLabel={(option) => option.label}
            value={options.find(opt => opt.value === value) || null}
            onChange={(_, newValue) => onChange(field.name, newValue?.value ?? null)}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={field.label}
                    required={field.required}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
            isOptionEqualToValue={(option, val) => option.value === val.value}
        />
    );
};


interface FormDialogProps<T extends Anagrafica> {
    open: boolean;
    onClose: () => void;
    onSave: (data: Partial<T>) => Promise<void>;
    fields: FormField[];
    initialData: Partial<T> | null;
    title: string;
}

const FormDialog = <T extends Anagrafica>({ open, onClose, onSave, fields, initialData, title }: FormDialogProps<T>) => {
    const [formData, setFormData] = useState<Partial<T>>(initialData || {});

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData, open]);

    const handleSave = async () => {
        await onSave(formData);
        onClose();
    };

    const handleChange = useCallback((name: keyof T, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const renderField = (field: FormField) => {
        const value = formData[field.name as keyof T];

        switch (field.type) {
            case 'text':
            case 'number':
            case 'email':
                return <TextField 
                            fullWidth 
                            type={field.type} 
                            label={field.label} 
                            value={value || ''} 
                            onChange={(e) => handleChange(field.name as keyof T, e.target.value)} 
                            required={field.required} 
                        />;
            case 'textarea':
                return <TextField 
                            fullWidth 
                            label={field.label} 
                            value={value || ''} 
                            onChange={(e) => handleChange(field.name as keyof T, e.target.value)} 
                            required={field.required}
                            multiline 
                            rows={field.rows || 3} 
                        />;
            case 'date':
                return <DatePicker 
                            label={field.label} 
                            value={safeGetDayjs(value as string)} 
                            onChange={(date) => handleChange(field.name as keyof T, date?.toISOString() ?? null)} 
                            sx={{ width: '100%' }} 
                        />;
            case 'select':
                return <SelectField field={field} value={value} onChange={handleChange as any} />;
            default:
                return null;
        }
    };
    
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                 <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {fields.map((field) => (
                            <Grid key={field.name} {...field.gridProps}>
                                {renderField(field)}
                            </Grid>
                        ))}
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annulla</Button>
                <Button onClick={handleSave} variant="contained">Salva</Button>
            </DialogActions>
        </Dialog>
    );
};

export default FormDialog;
