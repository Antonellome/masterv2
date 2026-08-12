import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress } from '@mui/material';
import type { Tecnico } from '@/models/definitions';
import { api } from '@/services/api';
import { useGlobalStore } from '@/stores/globalStore';

interface TecnicoEmailFormProps {
  open: boolean;
  onClose: () => void;
  tecnico: Tecnico | null;
}

const schema = yup.object().shape({
  email: yup.string().email("L'email non è valida").required("L'email è obbligatoria"),
});

const TecnicoEmailForm = ({ open, onClose, tecnico }: TecnicoEmailFormProps) => {
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
    const { setSuccess, setError } = useGlobalStore.getState();
    try {
      // Logica di aggiornamento che utilizza la Cloud Function tramite il servizio API
      await api.tecnici.update(tecnico.id, data);
      setSuccess('Email del tecnico aggiornata con successo!');
      onClose();
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'email:", error);
      setError("Si è verificato un errore durante l'aggiornamento dell'email.");
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
