import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, Select, FormControl, InputLabel, CircularProgress, SelectChangeEvent } from '@mui/material';
import type { FormField, BaseAnagrafica } from '@/models/definitions';

interface AnagraficaFormProps<T extends BaseAnagrafica> {
    open: boolean;
    onClose: () => void;
    onSave: (data: Partial<T>) => Promise<void>;
    initialData?: Partial<T>;
    fields: FormField[];
    anagraficaType: string;
}

const AnagraficaForm = <T extends BaseAnagrafica>({
    open,
    onClose,
    onSave,
    initialData,
    fields,
    anagraficaType
}: AnagraficaFormProps<T>) => {
    const [formData, setFormData] = useState<Partial<T>>(initialData || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData, open]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<unknown>) => {
        const { name, value } = event.target;
        if (name) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            onClose(); 
        } catch (error) {
            console.error("Errore durante il salvataggio:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const renderField = (field: FormField) => {
        const { name, label, type, required, options } = field;
        const value = String(formData[name as keyof T] ?? '');

        if (type === 'select' && options) {
            return (
                <FormControl fullWidth required={required} margin="normal">
                    <InputLabel>{label}</InputLabel>
                    <Select name={name} value={value} label={label} onChange={handleChange}>
                        <MenuItem value=""><em>Nessuno</em></MenuItem>
                        {options.map(option => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );
        }

        return (
            <TextField
                fullWidth
                margin="normal"
                name={name}
                label={label}
                type={type}
                required={required}
                value={value}
                onChange={handleChange}
                multiline={type === 'textarea'}
                rows={type === 'textarea' ? 4 : 1}
            />
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{formData.id ? 'Modifica' : 'Aggiungi'} {anagraficaType}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2}>
                    {fields.map(field => (
                        <Grid key={field.name}>
                            {renderField(field)}
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSubmit} color="primary" variant="contained" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AnagraficaForm;
