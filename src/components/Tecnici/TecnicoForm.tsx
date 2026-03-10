import { useEffect, useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControlLabel, Switch, MenuItem, Divider, Typography, CircularProgress
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import { TIPI_CONTRATTO } from '@/utils/contratti';

const dateFields: (keyof Tecnico)[] = [
    'dataAssunzione', 'scadenzaContratto', 'scadenzaVisita', 'scadenzaUnilav',
    'scadenzaCartaIdentita', 'scadenzaPassaporto', 'scadenzaPatente', 'scadenzaCQC',
    'scadenzaCorsoSicurezza', 'scadenzaPrimoSoccorso', 'scadenzaAntincendio'
];

const renderDatePicker = (label: string, name: keyof Tecnico, value: dayjs.Dayjs | Timestamp | null | undefined, handleChange: (name: keyof Tecnico, date: dayjs.Dayjs | null) => void) => (
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
    isSaving?: boolean;
}

const TecnicoForm: React.FC<TecnicoFormProps> = ({ open, onClose, onSave, tecnico, ditte, categorie, isSaving = false }) => {

    const initialData = useMemo(() => {
        const baseData = {
            nome: '', cognome: '', codiceFiscale: '', indirizzo: '', citta: '', cap: '', provincia: '', email: '', telefono: '',
            dittaId: '', categoriaId: '', tipoContratto: '', 
            numeroPatente: '', categoriaPatente: '', numeroCQC: '', 
            numeroCartaIdentita: '', numeroPassaporto: '',
            note: '', attivo: true,
            dataAssunzione: null, scadenzaContratto: null, scadenzaVisita: null, scadenzaUnilav: null,
            scadenzaCartaIdentita: null, scadenzaPassaporto: null, scadenzaPatente: null, scadenzaCQC: null,
            scadenzaCorsoSicurezza: null, scadenzaPrimoSoccorso: null, scadenzaAntincendio: null
        };

        if (!tecnico) return baseData;

        const tecnicoData = { ...tecnico };

        // Gestione categoriaId: il dato 'tecnico' può arrivare con l'oggetto `categoria` popolato.
        // Per il form, è necessario estrarre l'ID e rimuovere l'oggetto per evitare conflitti.
        // @ts-expect-error - `tecnicoData.categoria` è un campo dinamico, non strettamente tipizzato nel modello base.
        if (tecnicoData.categoria && typeof tecnicoData.categoria === 'object' && tecnicoData.categoria.id) {
            // @ts-expect-error - Assegnazione a `categoriaId` che non è definito nel tipo inferito di `tecnicoData` in questo scope.
            tecnicoData.categoriaId = tecnicoData.categoria.id;
            // @ts-expect-error - Rimozione del campo `categoria` per pulire l'oggetto dati del form.
            delete tecnicoData.categoria;
        }

        // Conversione Timestamp in Dayjs per i componenti DatePicker.
        dateFields.forEach(field => {
            const dateValue = tecnicoData[field];
            if (dateValue && dateValue instanceof Timestamp) {
                 // @ts-expect-error - Il tipo di `tecnicoData[field]` è un'unione complessa; qui forziamo l'assegnazione a `Dayjs`.
                tecnicoData[field] = dayjs(dateValue.toDate());
            }
        });

        return { ...baseData, ...tecnicoData };

    }, [tecnico]);

    const [formData, setFormData] = useState<Partial<Tecnico>>(initialData);

    // Effetto per resettare il form quando il dialogo viene aperto o i dati iniziali cambiano.
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData(initialData); // Volutamente si resetta lo stato all'apertura, il rischio di loop è controllato dalle dipendenze.
        }
    }, [open, initialData]);
    

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
                // @ts-expect-error - Conversione da Dayjs a stringa ISO per salvataggio su Firestore.
                dataToSave[field] = dateValue.toISOString();
            } else if (dateValue === null || dateValue === undefined) {
                 // @ts-expect-error - Normalizzazione a `null` per i campi data non valorizzati.
                dataToSave[field] = null;
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
                            }}><TextField name="email" label="Email" value={formData.email || ''} onChange={handleChange} fullWidth required/></Grid>
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
                        </Grid>
                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={handleSave} variant="contained" color="primary" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}>
                    {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TecnicoForm;
