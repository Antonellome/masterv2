import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel } from '@mui/material';
import type { FormField } from '@/models/definitions';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface GenericFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    item: any | null;
    fields: FormField[];
    title: string;
}

const GenericForm: React.FC<GenericFormProps> = ({ open, onClose, onSave, item, fields, title }) => {
    const [formData, setFormData] = useState<any>({});
    const [selectOptions, setSelectOptions] = useState<Record<string, any[]>>({});

    useEffect(() => {
        // Popola il form con i dati dell'item quando viene aperto per la modifica
        if (item) {
            setFormData(item);
        } else {
            // Inizializza il form con valori di default quando si aggiunge un nuovo item
            const initialData: any = {};
            fields.forEach(field => {
                initialData[field.name] = field.type === 'boolean' ? false : '';
            });
            setFormData(initialData);
        }
    }, [item, fields, open]);

    useEffect(() => {
        // Carica le opzioni per i campi di tipo 'select' da Firestore
        const fetchSelectOptions = async () => {
            const options: Record<string, any[]> = {};
            for (const field of fields) {
                if (field.type === 'select' && field.options?.collectionName) {
                    const querySnapshot = await getDocs(collection(db, field.options.collectionName));
                    options[field.name] = querySnapshot.docs.map(doc => ({ 
                        value: doc.id, 
                        label: doc.data()[field.options!.labelField] 
                    }));
                }
            }
            setSelectOptions(options);
        };

        fetchSelectOptions();
    }, [fields]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            setFormData({ ...formData, [name!]: (e.target as HTMLInputElement).checked });
        } else {
            setFormData({ ...formData, [name!]: value });
        }
    };

    const handleSave = () => {
        onSave(formData);
    };

    const renderField = (field: FormField) => {
        const baseProps = {
            key: field.name,
            name: field.name,
            label: field.label,
            value: formData[field.name] || '',
            onChange: handleChange,
            required: field.required,
            fullWidth: true,
        };

        switch (field.type) {
            case 'select':
                return (
                    <FormControl fullWidth required={field.required}>
                        <InputLabel>{field.label}</InputLabel>
                        <Select {...baseProps}>
                            {(selectOptions[field.name] || []).map(option => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );
            case 'boolean':
                return (
                    <FormControlLabel
                        control={<Checkbox name={field.name} checked={!!formData[field.name]} onChange={handleChange} />}
                        label={field.label}
                    />
                );
            case 'textarea':
                return <TextField {...baseProps} multiline rows={3} />;
            case 'number':
                return <TextField {...baseProps} type="number" />;
            case 'date':
                return <TextField {...baseProps} type="date" InputLabelProps={{ shrink: true }} />
            case 'email':
                return <TextField {...baseProps} type="email" />;
            default:
                return <TextField {...baseProps} />;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ pt: 1 }}>
                    {fields.map(field => (
                        <Grid item xs={field.gridProps?.size?.xs || 12} sm={field.gridProps?.size?.sm} md={field.gridProps?.size?.md}>
                            {renderField(field)}
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annulla</Button>
                <Button onClick={handleSave} variant="contained">Salva</Button>
            </DialogActions>
        </Dialog>
    );
};

export default GenericForm;
