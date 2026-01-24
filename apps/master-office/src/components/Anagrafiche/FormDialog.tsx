import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, Switch, FormControlLabel, Autocomplete, CircularProgress, Typography, Box, Divider } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { FormField, Anagrafica, SelectOptions } from '@/models/definitions';
import { useData } from '@/hooks/useData';
import { safeGetDayjs } from '@/utils/dateUtils';

// Hook per caricare le opzioni del select
const useSelectOptions = (fieldOptions: SelectOptions | undefined) => {
    const [options, setOptions] = useState<{ label: string; value: string; }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (typeof fieldOptions === 'object' && !Array.isArray(fieldOptions) && fieldOptions !== null) {
            const fetchOptions = async () => {
                setLoading(true);
                try {
                    const snapshot = await getDocs(collection(db, fieldOptions.collectionName));
                    const fetchedOptions = snapshot.docs.map(doc => ({
                        label: doc.data()[fieldOptions.labelField] || 'Label non trovato',
                        value: doc.id,
                    }));
                    setOptions(fetchedOptions);
                } catch (error) {
                    console.error("Errore nel caricamento delle opzioni per il select:", error);
                    setOptions([]);
                }
                setLoading(false);
            };
            fetchOptions();
        } else if (Array.isArray(fieldOptions)) {
            setOptions(fieldOptions);
        }
    }, [fieldOptions]);

    return { options, loading };
};

// Componente SelectField che utilizza l'hook
const SelectField = ({ field, value, onChange }: { field: FormField, value: any, onChange: (name: string, value: any) => void }) => {
    const { options, loading } = useSelectOptions(field.options);

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
    anagraficaType?: string;
}

type FieldValue = T[keyof T];

const FormDialog = <T extends Anagrafica>({ open, onClose, onSave, fields, initialData, title }: FormDialogProps<T>) => {
    const [formData, setFormData] = useState<Partial<T>>(initialData || {});
    const { ditte, categorie } = useData();

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData, open]);

    const handleSave = async () => {
        await onSave(formData);
        onClose();
    };

    const handleChange = useCallback((name: keyof T, value: FieldValue | string | boolean | null) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const renderField = (field: FormField) => {
        const value = formData[field.name as keyof T] as FieldValue;

        switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
                // --- BUG CORRETTO: Rimosso `name` dal TextField per evitare conflitti ---
                return <TextField fullWidth label={field.label} value={String(value || '')} onChange={(e) => handleChange(field.name as keyof T, e.target.value)} required={field.required} />;
            case 'textarea':
                return <TextField fullWidth label={field.label} value={String(value || '')} onChange={(e) => handleChange(field.name as keyof T, e.target.value)} multiline rows={3} required={field.required} />;
            case 'switch':
                return <FormControlLabel control={<Switch checked={!!value} onChange={(e) => handleChange(field.name as keyof T, e.target.checked)} />} label={field.label} />;
            case 'date':
                return <DatePicker label={field.label} value={safeGetDayjs(value as string)} onChange={(date) => handleChange(field.name as keyof T, date?.toISOString() ?? null)} sx={{ width: '100%' }} />;
            case 'select':
                return <SelectField field={field} value={value} onChange={handleChange as any} />;
            case 'custom-select':
                 const options = field.name === 'dittaId' ? ditte : categorie;
                 return (
                     <Autocomplete
                         options={options || []}
                         getOptionLabel={(option) => option.nome}
                         value={options?.find(opt => opt.id === value) || null}
                         onChange={(_, newValue) => handleChange(field.name as keyof T, newValue?.id ?? null)}
                         renderInput={(params) => <TextField {...params} label={field.label} />}
                         isOptionEqualToValue={(option, val) => option.id === val.id}
                     />
                 );
            default:
                return null;
        }
    };
    
    const getFieldsBySection = (sectionFields: (string | undefined)[]) => {
      return fields.filter(f => sectionFields.includes(f.name));
    }

    const knownInfoFields = getFieldsBySection(['cognome', 'nome', 'email', 'telefono', 'indirizzo', 'citta', 'cap', 'provincia', 'partitaIva', 'codiceFiscale']);
    const knownContractFields = getFieldsBySection(['dittaId', 'categoriaId', 'tipoContratto', 'dataAssunzione', 'dataLicenziamento', 'scadenzaContratto', 'scadenzaVisitaMedica']);
    const noteField = fields.find(f => f.name === 'note');
    
    const otherFields = fields.filter(f => 
        !knownInfoFields.map(f => f.name).includes(f.name) && 
        !knownContractFields.map(f => f.name).includes(f.name) && 
        f.name !== noteField?.name
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                 <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Box component="form" sx={{ mt: 2 }}>
                       
                        {knownInfoFields.length > 0 && <Typography variant="h6" gutterBottom>Informazioni Personali</Typography>}
                        <Grid container spacing={2}>
                            {knownInfoFields.map((field) => (
                                <Grid key={field.name}>{renderField(field)}</Grid>
                            ))}
                        </Grid>
                        
                        {knownContractFields.length > 0 && <Divider sx={{ my: 3 }} />}

                        {knownContractFields.length > 0 && <Typography variant="h6" gutterBottom>Dettagli Contrattuali e Scadenze</Typography>}
                        <Grid container spacing={2}>
                            {knownContractFields.map((field) => (
                                <Grid key={field.name}>{renderField(field)}</Grid>
                            ))}
                        </Grid>
                        
                        {otherFields.length > 0 && <Divider sx={{ my: 3 }} />}

                        {otherFields.length > 0 && <Typography variant="h6" gutterBottom>Altro</Typography>}
                        <Grid container spacing={2}>
                            {otherFields.map((field) => (
                                <Grid key={field.name}>{renderField(field)}</Grid>
                            ))}
                        </Grid>
                        
                        {noteField && (
                            <Box sx={{mt: 2}}>
                                <Grid container spacing={2}>
                                    <Grid key={noteField.name} size={12}>{renderField(noteField)}</Grid>
                                </Grid>
                            </Box>
                        )}

                    </Box>
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
