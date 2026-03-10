import { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { Ditta } from '@/models/definitions';

interface DittaFormProps {
    open: boolean;
    onClose: () => void;
    ditta: Ditta | null;
    onSave: (ditta: Ditta) => Promise<void>; 
}

const defaultValues: Ditta = {
    id: '',
    name: '',
    indirizzo: '',
    email: '',
    telefono: ''
};

const DittaForm = ({ open, onClose, ditta, onSave }: DittaFormProps) => {
    const { handleSubmit, control, reset, formState: { isSubmitting, errors } } = useForm<Ditta>({ defaultValues });

    useEffect(() => {
        if (open) {
           reset(ditta || defaultValues);
        }
    }, [ditta, open, reset]);

    const handleFormSubmit = async (data: Ditta) => {
        await onSave(data);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{ditta?.id ? 'Modifica Ditta' : 'Nuova Ditta'}</DialogTitle>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogContent>
                    {/* Ripristino: Aderenza alla sintassi ibrida obbligatoria del blueprint.md */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12 }}>
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: 'Il nome è obbligatorio' }}
                                render={({ field }) => (
                                    <TextField {...field} label="Nome Ditta" fullWidth error={!!errors.name} helperText={errors.name?.message} />
                                )}
                            />
                        </Grid>
                         <Grid size={{ xs: 12, sm: 8 }}>
                            <Controller
                                name="indirizzo"
                                control={control}
                                render={({ field }) => <TextField {...field} label="Indirizzo" fullWidth />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                             <Controller
                                name="cap"
                                control={control}
                                render={({ field }) => <TextField {...field} label="CAP" fullWidth />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="piva"
                                control={control}
                                render={({ field }) => <TextField {...field} label="Partita IVA" fullWidth />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Controller
                                name="cf"
                                control={control}
                                render={({ field }) => <TextField {...field} label="Codice Fiscale" fullWidth />}
                            />
                        </Grid>
                         <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="telefono"
                                control={control}
                                render={({ field }) => <TextField {...field} label="Telefono" fullWidth />}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Controller
                                name="email"
                                control={control}
                                rules={{ pattern: { value: /\S+@\S+\.\S+/, message: "Indirizzo email non valido" } }}
                                render={({ field }) => <TextField {...field} label="Email" fullWidth type="email" error={!!errors.email} helperText={errors.email?.message} />}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isSubmitting}>Annulla</Button>
                    <Button type="submit" variant="contained" disabled={isSubmitting}>
                        {isSubmitting ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default DittaForm;
