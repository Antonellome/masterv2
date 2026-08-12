
import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Anagrafica, FieldConfig } from '@/models/definitions';

interface AnagraficaFormProps<T extends Anagrafica> {
    // The generic FieldConfig<T> caused issues with the generic form.
    // Using a simpler object structure until that is resolved.
    fields: { name: string, label: string, type: string }[];
    onSubmit: (newItem: Omit<T, 'id'>) => Promise<void>;
}

const AnagraficaForm = <T extends Anagrafica>({ fields, onSubmit }: AnagraficaFormProps<T>) => {
    // Use the 'name' property from the field configuration.
    const initialFormState = fields.reduce((acc, field) => {
        acc[field.name] = '';
        return acc;
    }, {} as { [key: string]: any });

    const [formState, setFormState] = useState(initialFormState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formState as Omit<T, 'id'>);
        setFormState(initialFormState); // Reset form after submission
    };

    return (
        <Accordion sx={{ mb: 2 }}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
            >
                <Typography variant="h6">Aggiungi Nuovo Elemento</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {fields.map(fieldConfig => (
                        <TextField
                            // Use the field's name as the key, it's unique for each form.
                            key={fieldConfig.name}
                            name={fieldConfig.name}
                            label={fieldConfig.label}
                            value={formState[fieldConfig.name]}
                            onChange={handleChange}
                            variant="outlined"
                            size="small"
                        />
                    ))}
                    <Button type="submit" variant="contained">Aggiungi</Button>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default AnagraficaForm;
