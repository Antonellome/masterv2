
import { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
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
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
// AGGIORNAMENTO: Corretto il path del modello
import type { TipoGiornata } from '@/models/definitions';

interface TipoGiornataFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: Partial<TipoGiornata>) => Promise<void>; // Aggiunta la prop onSave
    tipoGiornata: Partial<TipoGiornata> | null;
}

// AGGIORNAMENTO: Schema di validazione completo e corretto
const schema = yup.object().shape({
    nome: yup.string().required('Il nome è obbligatorio').min(3, 'Il nome deve essere di almeno 3 caratteri'),
    tariffa: yup.number().typeError('La tariffa deve essere un numero').min(0, 'La tariffa non può essere negativa').required('La tariffa è obbligatoria'),
    tipo: yup.string().oneOf(['Lavoro', 'Straordinario', 'Ferie', 'Malattia', 'Permesso', 'Altro']).required('Il tipo è obbligatorio'),
});

const TipoGiornataForm = ({ open, onClose, onSave, tipoGiornata }: TipoGiornataFormProps) => {
    const {
        handleSubmit,
        control,
        reset,
        formState: { isSubmitting, errors },
    } = useForm<TipoGiornata>({
        resolver: yupResolver(schema),
        defaultValues: {
            nome: '',
            tariffa: 0,
            tipo: 'Lavoro',
        },
    });

    const isEditMode = tipoGiornata && tipoGiornata.id;

    useEffect(() => {
        if (open) {
            if (isEditMode) {
                reset(tipoGiornata);
            } else {
                reset({ nome: '', tariffa: 0, tipo: 'Lavoro' });
            }
        }
    }, [tipoGiornata, open, reset, isEditMode]);

    // AGGIORNAMENTO: La sottomissione ora chiama la prop onSave
    const handleFormSubmit: SubmitHandler<TipoGiornata> = async (data) => {
        await onSave(data);
        // La chiusura e il feedback sono gestiti dal componente genitore
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditMode ? 'Modifica Tipo Giornata' : 'Nuovo Tipo Giornata'}</DialogTitle>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogContent>
                    <Grid container spacing={3} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <Controller
                                name="nome"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Nome" fullWidth error={!!errors.nome} helperText={errors.nome?.message} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <Controller
                                name="tariffa"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Tariffa (€)" type="number" fullWidth error={!!errors.tariffa} helperText={errors.tariffa?.message} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!errors.tipo}>
                                <InputLabel>Tipo</InputLabel>
                                <Controller
                                    name="tipo"
                                    control={control}
                                    render={({ field }) => (
                                        <Select {...field} label="Tipo">
                                            <MenuItem value="Lavoro">Lavoro</MenuItem>
                                            <MenuItem value="Straordinario">Straordinario</MenuItem>
                                            <MenuItem value="Ferie">Ferie</MenuItem>
                                            <MenuItem value="Malattia">Malattia</MenuItem>
                                            <MenuItem value="Permesso">Permesso</MenuItem>
                                            <MenuItem value="Altro">Altro</MenuItem>
                                        </Select>
                                    )}
                                />
                                {errors.tipo && <p style={{ color: '#d32f2f', fontSize: '0.75rem', margin: '3px 14px 0' }}>{errors.tipo.message}</p>}
                             </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={onClose} disabled={isSubmitting}>Annulla</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default TipoGiornataForm;
