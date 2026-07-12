
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { TextField, Button, Grid, Autocomplete } from '@mui/material';
import { Luogo, Cliente } from '@/models/definitions';
import { useCollectionData } from '@/hooks/useCollectionData';

interface LuoghiFormProps {
  onSubmit: (data: Partial<Luogo>) => void;
  defaultValues?: Partial<Luogo>;
}

const schema = yup.object().shape({
  nome: yup.string().required('Il nome è obbligatorio').min(2, 'Il nome deve essere di almeno 2 caratteri'),
  clienteId: yup.string().nullable().optional(),
});

const LuoghiForm: React.FC<LuoghiFormProps> = ({ onSubmit, defaultValues }) => {
  const { data: clienti, loading: loadingClienti } = useCollectionData<Cliente>('clienti');

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Partial<Luogo>>({
    resolver: yupResolver(schema),
    defaultValues: defaultValues || { nome: '', clienteId: null },
  });

  const defaultCliente = defaultValues?.clienteId ? clienti.find(c => c.id === defaultValues.clienteId) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Controller
            name="nome"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Nome Luogo"
                fullWidth
                error={!!errors.nome}
                helperText={errors.nome?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="clienteId"
            control={control}
            render={({ field }) => (
              <Autocomplete
                options={clienti}
                getOptionLabel={(option) => option.nome || ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                loading={loadingClienti}
                defaultValue={defaultCliente}
                onChange={(e, value) => {
                  // CORREZIONE: Salva solo l'ID del cliente, non l'intero oggetto.
                  setValue('clienteId', value?.id || null, { shouldValidate: true });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente di appartenenza (opzionale)"
                    error={!!errors.clienteId}
                    helperText={errors.clienteId?.message}
                  />
                )}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Salva
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default LuoghiForm;
