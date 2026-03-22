import React, { useMemo } from 'react';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import { TextField as FormikTextField } from 'formik-mui';
import { Button, DialogActions, DialogContent, DialogTitle, CircularProgress, Grid, MenuItem, Autocomplete, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { useCollection } from '@/hooks/useCollection';
import type { Rapportino, Tecnico, Nave, Luogo, TipoGiornata } from '@/models/definitions';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { createRapportinoSchema } from '@/models/rapportino.schema';

interface RapportinoFormProps {
    onClose: () => void;
    rapportino?: Rapportino | null;
    currentTecnico?: Tecnico;
    initialDate?: Dayjs;
}

// Definiamo una struttura dati rigorosa per i valori del form
interface RapportinoFormValues {
    data: Dayjs;
    tecnicoId: string;
    giornataId: string;
    oreLavorate: number;
    naveId: Nave | null;
    luogoId: Luogo | null;
    breveDescrizione: string;
    lavoroEseguito: string;
    inserimentoManualeOre: boolean;
}

const RapportinoForm: React.FC<RapportinoFormProps> = ({ onClose, rapportino, currentTecnico, initialDate }) => {

    const { data: tecnici, loading: loadingTecnici } = useCollection<Tecnico>('tecnici');
    const { data: navi, loading: loadingNavi } = useCollection<Nave>('navi');
    const { data: luoghi, loading: loadingLuoghi } = useCollection<Luogo>('luoghi');
    const { data: tipiGiornata, loading: loadingTipi } = useCollection<TipoGiornata>('tipiGiornata');

    const validationSchema = useMemo(() => createRapportinoSchema(tipiGiornata || []), [tipiGiornata]);

    // Logica per estrarre l'ID in modo sicuro, sia che il dato sia una stringa o un oggetto
    const getId = (value: string | { id: string } | undefined | null): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        return value.id;
    };

    const initialValues: RapportinoFormValues = useMemo(() => {
        const naveIdToFind = getId(rapportino?.naveId);
        const luogoIdToFind = getId(rapportino?.luogoId);

        return {
            data: initialDate || (rapportino?.data ? dayjs(rapportino.data.toDate()) : dayjs()),
            tecnicoId: rapportino?.tecnicoId || currentTecnico?.id || '',
            giornataId: rapportino?.giornataId || '',
            oreLavorate: rapportino?.oreLavorate ?? 8,
            naveId: navi?.find(n => n.id === naveIdToFind) || null,
            luogoId: luoghi?.find(l => l.id === luogoIdToFind) || null,
            breveDescrizione: rapportino?.breveDescrizione || '',
            lavoroEseguito: rapportino?.lavoroEseguito || '',
            inserimentoManualeOre: rapportino?.inserimentoManualeOre || false,
        };
    }, [rapportino, currentTecnico, initialDate, navi, luoghi]);


    const handleSubmit = async (values: RapportinoFormValues, { setSubmitting }: FormikHelpers<RapportinoFormValues>) => {
        try {
            const id = rapportino?.id || doc(collection(db, 'rapportini')).id;

            const docData = {
                ...values,
                // Salviamo solo gli ID nel database, non l'intero oggetto
                naveId: values.naveId?.id || null,
                luogoId: values.luogoId?.id || null,
                data: values.data.toDate(),
                updatedAt: serverTimestamp(),
                ...(!rapportino && { createdAt: serverTimestamp() })
            };

            await setDoc(doc(db, 'rapportini', id), docData, { merge: true });
            onClose();
        } catch (error) {
            console.error("Errore nel salvataggio del rapportino:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const isLoading = loadingTecnici || loadingNavi || loadingLuoghi || loadingTipi;

    if (isLoading) {
        return <DialogContent><CircularProgress /></DialogContent>;
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ isSubmitting, setFieldValue, values, errors, touched }) => (
                    <Form>
                        <DialogTitle>{rapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2} sx={{ pt: 1 }}>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 4
                                    }}>
                                    <DatePicker
                                        label="Data"
                                        value={values.data}
                                        onChange={(newValue) => setFieldValue('data', newValue)}
                                        sx={{ width: '100%' }}
                                    />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 8
                                    }}>
                                    <Field
                                        name="tecnicoId"
                                        component={FormikTextField}
                                        select
                                        label="Tecnico Scrivente"
                                        fullWidth
                                        required
                                    >
                                        {tecnici?.map(option => (
                                            <MenuItem key={option.id} value={option.id}>
                                                {`${option.cognome} ${option.nome}`}
                                            </MenuItem>
                                        ))}
                                    </Field>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Field
                                        name="giornataId"
                                        component={FormikTextField}
                                        select
                                        label="Tipo Giornata"
                                        fullWidth
                                        required
                                    >
                                        {tipiGiornata?.map(option => (
                                            <MenuItem key={option.id} value={option.id}>{option.nome}</MenuItem>
                                        ))}
                                    </Field>
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Field name="oreLavorate" component={FormikTextField} type="number" label="Ore Lavorate" fullWidth />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Autocomplete
                                        options={navi || []}
                                        getOptionLabel={(option) => option.nome}
                                        value={values.naveId}
                                        onChange={(_, newValue) => setFieldValue('naveId', newValue)}
                                        renderInput={(params) => <TextField {...params} label="Nave" error={touched.naveId && !!errors.naveId} />}
                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                    />
                                </Grid>
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}>
                                    <Autocomplete
                                        options={luoghi || []}
                                        getOptionLabel={(option) => option.nome}
                                        value={values.luogoId}
                                        onChange={(_, newValue) => setFieldValue('luogoId', newValue)}
                                        renderInput={(params) => <TextField {...params} label="Luogo" error={touched.luogoId && !!errors.luogoId} />}
                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                    />
                                </Grid>
                                <Grid size={12}>
                                    <Field
                                        name="breveDescrizione"
                                        component={FormikTextField}
                                        label="Breve Descrizione Intervento"
                                        multiline
                                        rows={3}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid size={12}>
                                    <Field
                                        name="lavoroEseguito"
                                        component={FormikTextField}
                                        label="Lavoro Eseguito"
                                        multiline
                                        rows={5}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={onClose}>Annulla</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={24} /> : 'Salva'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
