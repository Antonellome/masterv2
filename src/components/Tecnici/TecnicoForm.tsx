
import { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControlLabel, Switch, MenuItem, Divider, Typography
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import { TIPI_CONTRATTO } from '@/utils/contratti'; // <-- IMPORTATO

// Elenco di tutti i campi data per la conversione
const dateFields: (keyof Tecnico)[] = [
    'dataAssunzione', 'scadenzaContratto', 'scadenzaVisita', 'scadenzaUnilav',
    'scadenzaCartaIdentita', 'scadenzaPassaporto', 'scadenzaPatente', 'scadenzaCQC',
    'scadenzaCorsoSicurezza', 'scadenzaPrimoSoccorso', 'scadenzaAntincendio'
];

// Funzione per creare un campo data riutilizzabile
const renderDatePicker = (label: string, name: keyof Tecnico, value: any, handleChange: (name: keyof Tecnico, date: dayjs.Dayjs | null) => void) => (
    <Grid
        size={{
            xs: 12,
            sm: 6,
            md: 4
        }}>
        <DatePicker
            label={label}
            value={value ? dayjs(value) : null}
            onChange={(date) => handleChange(name, date)}
            sx={{ width: '100%' }}
        />
    </Grid>
);

interface TecnicoFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (formData: Partial<Tecnico>) => void;
    tecnico: Tecnico | null;
    ditte: Ditta[];
    categorie: Categoria[];
}

const TecnicoForm: React.FC<TecnicoFormProps> = ({ open, onClose, onSave, tecnico, ditte, categorie }) => {

    const [formData, setFormData] = useState<Partial<Tecnico>>({});

    useEffect(() => {
        if (open) {
            const initialData = tecnico ? { ...tecnico } : {
                nome: '', cognome: '', codiceFiscale: '', indirizzo: '', citta: '', cap: '', provincia: '', email: '', telefono: '',
                dittaId: '', categoriaId: '', tipoContratto: '', // <-- Valore iniziale per il contratto
                numeroPatente: '', categoriaPatente: '', numeroCQC: '', 
                numeroCartaIdentita: '', numeroPassaporto: '',
                note: '', attivo: true, sincronizzazioneAttiva: false
            };

            dateFields.forEach(field => {
                const dateValue = initialData[field];
                if (dateValue && dateValue instanceof Timestamp) {
                    // @ts-ignore
                    initialData[field] = dayjs(dateValue.toDate());
                }
            });
            setFormData(initialData);
        }
    }, [tecnico, open]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleDateChange = (name: keyof Tecnico, date: dayjs.Dayjs | null) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleSave = () => {
        const dataToSave = { ...formData };
        dateFields.forEach(field => {
            const dateValue = dataToSave[field];
            if (dayjs.isDayjs(dateValue)) {
                 // @ts-ignore
                dataToSave[field] = Timestamp.fromDate(dateValue.toDate());
            }
        });
        onSave(dataToSave);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{tecnico ? `Modifica ${tecnico.nome} ${tecnico.cognome}` : 'Nuovo Tecnico'}</DialogTitle>
            <DialogContent sx={{ pt: '20px !important' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
                    <Grid container spacing={2.5}>

                        {/* --- SEZIONE ANAGRAFICA --- */}
                        <Grid size={12}><Divider textAlign="left"><Typography variant="h6" sx={{ color: 'text.secondary' }}>Anagrafica</Typography></Divider></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}><TextField name="cognome" label="Cognome" value={formData.cognome || ''} onChange={handleChange} fullWidth required /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}><TextField name="nome" label="Nome" value={formData.nome || ''} onChange={handleChange} fullWidth required /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}><TextField name="codiceFiscale" label="Codice Fiscale" value={formData.codiceFiscale || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}><TextField name="email" label="Email" value={formData.email || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4
                            }}><TextField name="telefono" label="Telefono" value={formData.telefono || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}><TextField name="indirizzo" label="Indirizzo" value={formData.indirizzo || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 3
                            }}><TextField name="citta" label="Città" value={formData.citta || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 1.5
                            }}><TextField name="cap" label="CAP" value={formData.cap || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 6,
                                sm: 1.5
                            }}><TextField name="provincia" label="Provincia" value={formData.provincia || ''} onChange={handleChange} fullWidth /></Grid>
                        

                        {/* --- SEZIONE DOCUMENTI --- */}
                        <Grid size={12}><Divider textAlign="left" sx={{ mt: 2 }}><Typography variant="h6" sx={{ color: 'text.secondary' }}>Documenti</Typography></Divider></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}><TextField name="numeroCartaIdentita" label="Numero Carta Identità" value={formData.numeroCartaIdentita || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Carta Identità", 'scadenzaCartaIdentita', formData.scadenzaCartaIdentita, handleDateChange)}
                        <Grid
                            size={{
                                xs: 12,
                                md: 4
                            }}></Grid> {/* Spacer */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}><TextField name="numeroPassaporto" label="Numero Passaporto" value={formData.numeroPassaporto || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Passaporto", 'scadenzaPassaporto', formData.scadenzaPassaporto, handleDateChange)}
                        <Grid
                            size={{
                                xs: 12,
                                md: 4
                            }}></Grid> {/* Spacer */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 3
                            }}><TextField name="numeroPatente" label="Numero Patente" value={formData.numeroPatente || ''} onChange={handleChange} fullWidth /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 4,
                                md: 2
                            }}><TextField name="categoriaPatente" label="Cat. Patente" value={formData.categoriaPatente || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza Patente", 'scadenzaPatente', formData.scadenzaPatente, handleDateChange)}
                        <Grid
                            size={{
                                xs: 12,
                                md: 3
                            }}></Grid> {/* Spacer */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}><TextField name="numeroCQC" label="Numero CQC" value={formData.numeroCQC || ''} onChange={handleChange} fullWidth /></Grid>
                        {renderDatePicker("Scadenza CQC", 'scadenzaCQC', formData.scadenzaCQC, handleDateChange)}
                        

                        {/* --- SEZIONE DATI LAVORATIVI E NOTE --- */}
                        <Grid size={12}><Divider textAlign="left" sx={{ mt: 2 }}><Typography variant="h6" sx={{ color: 'text.secondary' }}>Dati Lavorativi</Typography></Divider></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}><TextField select name="dittaId" label="Ditta" value={formData.dittaId || ''} onChange={handleChange} fullWidth>{ditte.map(d => <MenuItem key={d.id} value={d.id}>{d.nome}</MenuItem>)}</TextField></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}><TextField select name="categoriaId" label="Categoria" value={formData.categoriaId || ''} onChange={handleChange} fullWidth>{categorie.map(c => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}</TextField></Grid>
                        
                        {/* CAMPO MODIFICATO: TENDINA CONTRATTI */}
                        <Grid
                            size={{
                                xs: 12,
                                sm: 6,
                                md: 4
                            }}>
                            <TextField select name="tipoContratto" label="Tipo Contratto" value={formData.tipoContratto || ''} onChange={handleChange} fullWidth>
                                {TIPI_CONTRATTO.map(option => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {renderDatePicker("Data Assunzione", 'dataAssunzione', formData.dataAssunzione, handleDateChange)}
                        {renderDatePicker("Scadenza Contratto", 'scadenzaContratto', formData.scadenzaContratto, handleDateChange)}
                        {renderDatePicker("Scadenza UNILAV", 'scadenzaUnilav', formData.scadenzaUnilav, handleDateChange)}
                        
                        {/* CAMPO SPOSTATO: NOTE */}
                        <Grid size={12}><TextField name="note" label="Note su Contratto e Altro" value={formData.note || ''} onChange={handleChange} fullWidth multiline rows={3} /></Grid>


                        {/* --- SEZIONE SICUREZZA --- */}
                        <Grid size={12}><Divider textAlign="left" sx={{ mt: 2 }}><Typography variant="h6" sx={{ color: 'text.secondary' }}>Formazione e Sicurezza</Typography></Divider></Grid>
                        {renderDatePicker("Scadenza Visita Medica", 'scadenzaVisita', formData.scadenzaVisita, handleDateChange)}
                        {renderDatePicker("Scadenza Corso Sicurezza", 'scadenzaCorsoSicurezza', formData.scadenzaCorsoSicurezza, handleDateChange)}
                        {renderDatePicker("Scadenza Primo Soccorso", 'scadenzaPrimoSoccorso', formData.scadenzaPrimoSoccorso, handleDateChange)}
                        {renderDatePicker("Scadenza Antincendio", 'scadenzaAntincendio', formData.scadenzaAntincendio, handleDateChange)}

                        {/* --- IMPOSTAZIONI --- */}
                        <Grid size={12}><Divider textAlign="left" sx={{ mt: 2 }}><Typography variant="h6" sx={{ color: 'text.secondary' }}>Impostazioni</Typography></Divider></Grid>
                        <Grid
                            container
                            spacing={1}
                            alignItems="center"
                            justifyContent="center"
                            size={12}>
                            <Grid><FormControlLabel control={<Switch name="attivo" checked={formData.attivo ?? true} onChange={handleChange} />} label="Tecnico Attivo" /></Grid>
                            <Grid><FormControlLabel control={<Switch name="sincronizzazioneAttiva" checked={formData.sincronizzazioneAttiva || false} onChange={handleChange} />} label="Sincronizzazione App" /></Grid>
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose}>Annulla</Button>
                <Button onClick={handleSave} variant="contained" color="primary">Salva</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TecnicoForm;
