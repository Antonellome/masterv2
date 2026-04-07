
import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, 
    FormControlLabel, Switch, MenuItem, Paper, Typography, CircularProgress, Autocomplete
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions'; // Rimosso Qualifica
import { TIPI_CONTRATTO } from '@/utils/contratti';

dayjs.locale('it');

const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Paper elevation={2} sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
            {title}
        </Typography>
        <Grid container spacing={2.5}>
            {children}
        </Grid>
    </Paper>
);

interface TecnicoFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (formData: Partial<Tecnico>) => void;
    tecnico: Tecnico | null;
    ditte: Ditta[];
    categorie: Categoria[];
    // Rimosso qualifiche
    isSaving?: boolean;
}

const initialFormData: Partial<Tecnico> = {
    nome: '', cognome: '', codiceFiscale: '', indirizzo: '', citta: '', cap: '', provincia: '', email: '', telefono: '',
    dittaId: '', categoriaId: '', tipoContratto: '', // Rimosso qualificaId
    numeroPatente: '', categoriaPatente: '', numeroCQC: '', 
    numeroCartaIdentita: '', numeroPassaporto: '',
    note: '', attivo: true, dataSync: null,
    dataAssunzione: null, scadenzaContratto: null, scadenzaVisita: null, scadenzaUnilav: null,
    scadenzaCartaIdentita: null, scadenzaPassaporto: null, scadenzaPatente: null, scadenzaCQC: null,
    scadenzaCorsoSicurezza: null, scadenzaPrimoSoccorso: null, scadenzaAntincendio: null
};

const TecnicoForm: React.FC<TecnicoFormProps> = ({ open, onClose, onSave, tecnico, ditte, categorie, isSaving = false }) => {

    const [formData, setFormData] = useState<Partial<Tecnico>>(initialFormData);

    useEffect(() => {
        if (open) {
            if (tecnico) {
                const processedData: Partial<Tecnico> = { ...tecnico };
                Object.keys(processedData).forEach(key => {
                    const field = key as keyof Tecnico;
                    const value = processedData[field];
                    if (value instanceof Timestamp) {
                        (processedData as any)[field] = dayjs(value.toDate());
                    }
                });
                setFormData(processedData);
            } else {
                setFormData(initialFormData);
            }
        }
    }, [open, tecnico]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDateChange = (name: keyof Tecnico, date: dayjs.Dayjs | null) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };
    
    const handleAutocompleteChange = (name: keyof Tecnico, value: string | null) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const dataToSave = { ...formData };
        Object.keys(dataToSave).forEach(key => {
            const field = key as keyof Tecnico;
            const value = dataToSave[field];
            if (dayjs.isDayjs(value)) {
                (dataToSave as any)[field] = Timestamp.fromDate(value.toDate());
            } else if (value === undefined) {
                (dataToSave as any)[field] = null;
            }
        });
        onSave(dataToSave);
    };

    const renderDatePicker = (label: string, name: keyof Tecnico) => (
        <Grid item xs={12} md={6}>
            <DatePicker
                label={label}
                value={formData[name] ? dayjs(formData[name] as any) : null}
                onChange={(date) => handleDateChange(name, date)}
                sx={{ width: '100%' }}
            />
        </Grid>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
                {tecnico ? `Modifica ${tecnico.nome} ${tecnico.cognome}` : 'Nuovo Tecnico'}
            </DialogTitle>
            <DialogContent sx={{ pt: '20px !important', pb: '20px !important' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                    <FormSection title="Anagrafica e Ruolo">
                        <Grid item xs={12} sm={6}><TextField name="cognome" label="Cognome" value={formData.cognome || ''} onChange={handleChange} fullWidth required /></Grid>
                        <Grid item xs={12} sm={6}><TextField name="nome" label="Nome" value={formData.nome || ''} onChange={handleChange} fullWidth required /></Grid>
                        <Grid item xs={12} sm={6}><Autocomplete
                                options={ditte}
                                getOptionLabel={(option) => option.nome}
                                value={ditte.find(d => d.id === formData.dittaId) || null}
                                onChange={(_, newValue) => handleAutocompleteChange('dittaId', newValue ? newValue.id : null)}
                                renderInput={(params) => <TextField {...params} label="Ditta" fullWidth required />}
                            /></Grid>
                        <Grid item xs={12} sm={6}><Autocomplete
                                options={categorie}
                                getOptionLabel={(option) => option.nome}
                                value={categorie.find(c => c.id === formData.categoriaId) || null}
                                onChange={(_, newValue) => handleAutocompleteChange('categoriaId', newValue ? newValue.id : null)}
                                renderInput={(params) => <TextField {...params} label="Categoria" fullWidth />}
                            /></Grid>
                        <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <FormControlLabel control={<Switch name="attivo" checked={formData.attivo ?? true} onChange={handleChange} />} label="Tecnico Attivo" />
                        </Grid>
                    </FormSection>

                    <FormSection title="Recapiti e Indirizzo">
                        <Grid item xs={12} sm={6}><TextField name="email" label="Email" value={formData.email || ''} onChange={handleChange} fullWidth required/></Grid>
                        <Grid item xs={12} sm={6}><TextField name="telefono" label="Telefono" value={formData.telefono || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid item xs={12}><TextField name="indirizzo" label="Indirizzo" value={formData.indirizzo || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid item xs={12} sm={5}><TextField name="citta" label="Città" value={formData.citta || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid item xs={12} sm={3}><TextField name="provincia" label="Provincia" value={formData.provincia || ''} onChange={handleChange} fullWidth inputProps={{ maxLength: 2 }} /></Grid>
                        <Grid item xs={12} sm={4}><TextField name="cap" label="CAP" value={formData.cap || ''} onChange={handleChange} fullWidth /></Grid>
                    </FormSection>

                    <FormSection title="Dettagli Contrattuali">
                        <Grid item xs={12} md={6}>
                             <Autocomplete
                                options={TIPI_CONTRATTO}
                                getOptionLabel={(option) => option.label}
                                value={TIPI_CONTRATTO.find(tc => tc.value === formData.tipoContratto) || null}
                                onChange={(_, newValue) => setFormData(prev => ({...prev, tipoContratto: newValue ? newValue.value : ''}))}
                                renderInput={(params) => <TextField {...params} label="Tipo Contratto" fullWidth />}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}></Grid> {/* Spacer */}
                        {renderDatePicker("Data Assunzione", 'dataAssunzione')}
                        {renderDatePicker("Scadenza Contratto", 'scadenzaContratto')}
                        {renderDatePicker("Scadenza UNILAV", 'scadenzaUnilav')}
                    </FormSection>

                    <FormSection title="Documenti e Scadenze">
                        <Grid item xs={12} md={6}><TextField name="codiceFiscale" label="Codice Fiscale" value={formData.codiceFiscale || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid item xs={12} md={6}></Grid> {/* Spacer */}
                        <Grid item xs={12} md={6}><TextField name="numeroCartaIdentita" label="Numero Carta Identità" value={formData.numeroCartaIdentita || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Carta Identità", 'scadenzaCartaIdentita')}
                        <Grid item xs={12} md={6}><TextField name="numeroPassaporto" label="Numero Passaporto" value={formData.numeroPassaporto || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Passaporto", 'scadenzaPassaporto')}
                        <Grid item xs={12} md={4}><TextField name="numeroPatente" label="Numero Patente" value={formData.numeroPatente || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid item xs={12} md={2}><TextField name="categoriaPatente" label="Cat. Patente" value={formData.categoriaPatente || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Patente", 'scadenzaPatente')}
                        <Grid item xs={12} md={6}><TextField name="numeroCQC" label="Numero CQC" value={formData.numeroCQC || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza CQC", 'scadenzaCQC')}
                    </FormSection>
                    
                    <FormSection title="Formazione e Sicurezza">
                        {renderDatePicker("Scadenza Visita Medica", 'scadenzaVisita')}
                        {renderDatePicker("Scadenza Corso Sicurezza", 'scadenzaCorsoSicurezza')}
                        {renderDatePicker("Scadenza Primo Soccorso", 'scadenzaPrimoSoccorso')}
                        {renderDatePicker("Scadenza Antincendio", 'scadenzaAntincendio')}
                    </FormSection>

                     <FormSection title="Note">
                        <Grid item xs={12}><TextField name="note" label="Note generali sul tecnico" value={formData.note || ''} onChange={handleChange} fullWidth multiline rows={4} /></Grid>
                    </FormSection>

                </LocalizationProvider>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}>
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TecnicoForm;
