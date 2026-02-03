import React, { useMemo } from 'react';
import { Formik, Form, Field } from 'formik';
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

const RapportinoForm: React.FC<RapportinoFormProps> = ({ onClose, rapportino, currentTecnico, initialDate }) => {

    const { data: tecnici, loading: loadingTecnici } = useCollection<Tecnico>('tecnici');
    const { data: navi, loading: loadingNavi } = useCollection<Nave>('navi');
    const { data: luoghi, loading: loadingLuoghi } = useCollection<Luogo>('luoghi');
    const { data: tipiGiornata, loading: loadingTipi } = useCollection<TipoGiornata>('tipiGiornata');

    const validationSchema = useMemo(() => createRapportinoSchema(tipiGiornata || []), [tipiGiornata]);

    const initialValues = useMemo(() => ({
        data: initialDate || (rapportino?.data ? dayjs(rapportino.data.toDate()) : dayjs()),
        tecnicoId: rapportino?.tecnicoId || currentTecnico?.id || '',
        giornataId: rapportino?.giornataId || '',
        oreLavorate: rapportino?.oreLavorate ?? 8,
        // Gestisce sia l'ID stringa (da DB) che l'oggetto (da modifica form)
        naveId: navi?.find(n => n.id === (rapportino?.naveId as any)?.id || rapportino?.naveId) || null,
        luogoId: luoghi?.find(l => l.id === (rapportino?.luogoId as any)?.id || rapportino?.luogoId) || null,
        breveDescrizione: rapportino?.breveDescrizione || '',
        lavoroEseguito: rapportino?.lavoroEseguito || '',
        inserimentoManualeOre: rapportino?.inserimentoManualeOre || false,
    }), [rapportino, currentTecnico, initialDate, navi, luoghi]);


    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const id = rapportino?.id || doc(collection(db, 'rapportini')).id;

            // --- ESTRAZIONE CORRETTA DEGLI ID ---
            const naveId = values.naveId && typeof values.naveId === 'object' ? (values.naveId as Nave).id : values.naveId;
            const luogoId = values.luogoId && typeof values.luogoId === 'object' ? (values.luogoId as Luogo).id : values.luogoId;

            const docData = {
                ...values,
                naveId,      // Salva solo l'ID della nave
                luogoId,     // Salva solo l'ID del luogo
                data: (values.data as Dayjs).toDate(),
                updatedAt: serverTimestamp(),
                ...( !rapportino && { createdAt: serverTimestamp() })
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
        return <DialogContent><CircularProgress /></DialogContent>
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
                                <Grid container spacing={2} sx={{pt: 1}}>
                                    <Grid item xs={12} sm={4}>
                                         <DatePicker
                                            label="Data"
                                            value={values.data}
                                            onChange={(newValue) => setFieldValue('data', newValue)}
                                            sx={{width: '100%'}}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={8}>
                                        <Field
                                            name="tecnicoId" component={FormikTextField} select
                                            label="Tecnico Scrivente" fullWidth required
                                        >
                                            {tecnici?.map(option => (
                                                <MenuItem key={option.id} value={option.id}>
                                                    {`${option.cognome} ${option.nome}`}
                                                </MenuItem>
                                            ))}
                                        </Field>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Field
                                            name="giornataId" component={FormikTextField} select
                                            label="Tipo Giornata" fullWidth required
                                        >
                                            {tipiGiornata?.map(option => (
                                                <MenuItem key={option.id} value={option.id}>{option.nome}</MenuItem>
                                            ))}
                                        </Field>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Field name="oreLavorate" component={FormikTextField} type="number" label="Ore Lavorate" fullWidth />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={navi || []}
                                            getOptionLabel={(option) => option.nome}
                                            value={values.naveId as any}
                                            onChange={(_, newValue) => setFieldValue('naveId', newValue)}
                                            renderInput={(params) => <TextField {...params} label="Nave" error={touched.naveId && !!errors.naveId} />}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={luoghi || []}
                                            getOptionLabel={(option) => option.nome}
                                            value={values.luogoId as any}
                                            onChange={(_, newValue) => setFieldValue('luogoId', newValue)}
                                            renderInput={(params) => <TextField {...params} label="Luogo" error={touched.luogoId && !!errors.luogoId} />}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Field 
                                            name="breveDescrizione" component={FormikTextField} 
                                            label="Breve Descrizione Intervento" multiline rows={3} fullWidth 
                                        />
                                    </Grid>
                                     <Grid item xs={12}>
                                        <Field 
                                            name="lavoroEseguito" component={FormikTextField} 
                                            label="Lavoro Eseguito" multiline rows={5} fullWidth 
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

export default RapportinoForm.tsx;