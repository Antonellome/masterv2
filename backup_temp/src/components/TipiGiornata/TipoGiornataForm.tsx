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
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { doc, addDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import type { TipoGiornata } from '../../types/definitions';

interface TipoGiornataFormProps {
    open: boolean;
    onClose: () => void;
    tipoGiornata: Partial<TipoGiornata> | null;
}

const schema = yup.object().shape({
    nome: yup.string().required('Il nome è obbligatorio'),
    gettonata: yup.boolean().required(),
});

const TipoGiornataForm = ({ open, onClose, tipoGiornata }: TipoGiornataFormProps) => {
    const {
        handleSubmit,
        control,
        reset,
        formState: { isSubmitting, errors },
    } = useForm<TipoGiornata>({
        resolver: yupResolver(schema),
        defaultValues: {
            nome: '',
            gettonata: false,
        },
    });

    const isEditMode = tipoGiornata && tipoGiornata.id;

    // FIX: Dipendenza stabile per useEffect
    // L'hook ora dipende da `tipoGiornata?.id` (una stringa stabile) invece che dall'intero oggetto `tipoGiornata`,
    // prevenendo il ciclo infinito di rendering.
    useEffect(() => {
        if (open) {
            if (isEditMode) {
                reset(tipoGiornata as TipoGiornata);
            } else {
                reset({ nome: '', gettonata: false });
            }
        }
    }, [tipoGiornata?.id, open, isEditMode, reset]);

    const handleFormSubmit: SubmitHandler<TipoGiornata> = async (data) => {
        try {
            if (isEditMode) {
                const tipoGiornataRef = doc(db, 'tipiGiornata', tipoGiornata.id!);
                await updateDoc(tipoGiornataRef, data);
            } else {
                await addDoc(collection(db, 'tipiGiornata'), data);
            }
            onClose();
        } catch (error) {
            console.error("Errore nel salvataggio:", error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditMode ? 'Modifica Tipo Giornata' : 'Nuovo Tipo Giornata'}</DialogTitle>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <Controller
                                name="nome"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Nome"
                                        fullWidth
                                        error={!!errors.nome}
                                        helperText={errors.nome?.message}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Controller
                                        name="gettonata"
                                        control={control}
                                        render={({ field }) => <Checkbox {...field} checked={field.value} />}
                                    />
                                }
                                label="Gettonata"
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

export default TipoGiornataForm; 
