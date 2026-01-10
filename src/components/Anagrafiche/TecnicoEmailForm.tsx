import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress } from '@mui/material';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE
import type { Tecnico } from '@/models/definitions';

interface TecnicoEmailFormProps {
  open: boolean;
  onClose: () => void;
  tecnico: Tecnico | null;
}

const schema = yup.object().shape({
  email: yup.string().email("L'email non è valida").required("L'email è obbligatoria"),
});

const TecnicoEmailForm = ({ open, onClose, tecnico }: TecnicoEmailFormProps) => {
  const { updateData } = useData(); // HOOK CORRETTO
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<Pick<Tecnico, 'email'>>({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (tecnico) {
      reset({ email: tecnico.email || '' });
    } else {
      reset({ email: '' });
    }
  }, [tecnico, reset]);

  const onSubmit = async (data: Pick<Tecnico, 'email'>) => {
    if (!tecnico) return;
    try {
      // La logica di aggiornamento è ora corretta grazie all'hook giusto
      await updateData('tecnici', tecnico.id, data);
      onClose(); 
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'email:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifica Email Tecnico</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
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

export default TecnicoEmailForm;
