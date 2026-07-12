
import React, { useState, useEffect, useMemo } from 'react';
import {
    DialogContent, DialogTitle, DialogActions, Autocomplete, Button, CircularProgress, Grid, Alert, 
    Divider, Box, Chip, TextField, Paper, IconButton, Typography
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { Timestamp } from 'firebase/firestore';
import type { Rapportino, TipoGiornata, Tecnico, Nave, Luogo, Veicolo, DettaglioOre } from '@/models/definitions';
import { saveRapportino } from '@/services/rapportiniService';
import { useData } from '@/hooks/useData';
import { v4 as uuidv4 } from 'uuid';
import DeleteIcon from '@mui/icons-material/Delete';
import { convertToRapportinoStandard, RapportinoStandard } from '@/utils/rapportinoConverter';
import { calculateTotalHours } from '@/utils/hoursCalculator';

dayjs.locale('it');

// Stato interno per la UI
interface DettaglioOreState extends DettaglioOre { nome: string; }

interface RapportinoFormProps {
    onClose: () => void;
    rapportino: Rapportino | null;
    initialDate?: dayjs.Dayjs;
}

// ======================================================================================
// == RAPPORITNO FORM - VERSIONE "TRADUTTORE UNIVERSALE" (2024-07-28)
// ======================================================================================
const RapportinoForm: React.FC<RapportinoFormProps> = ({ onClose, rapportino: rapportinoGrezzzo, initialDate }) => {
    
    // 1. USARE IL TRADUTTORE PER AVERE DATI PULITI
    const standardData = useMemo(() => convertToRapportinoStandard(rapportinoGrezzzo), [rapportinoGrezzzo]);

    const { tecnici, navi, luoghi, veicoli, tipiGiornata, loading: loadingMasterData } = useData();

    // 2. STATI DEL FORM BASATI ESCLUSIVAMENTE SUI DATI STANDARD
    const [tecnicoScrivente, setTecnicoScrivente] = useState<Tecnico | null>(null);
    const [dataInizio, setDataInizio] = useState<dayjs.Dayjs | null>(dayjs(standardData.dataInizio));
    const [tipoGiornataId, setTipoGiornataId] = useState(standardData.tipoGiornataId);
    const [nave, setNave] = useState<Nave | null>(null);
    const [luogo, setLuogo] = useState<Luogo | null>(null);
    const [lavoroEseguito, setLavoroEseguito] = useState(standardData.lavoroEseguito);
    const [materialiImpiegati, setMaterialiImpiegati] = useState(standardData.materialiImpiegati);
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreState[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);

    // 3. EFFETTO DI POPOLAMENTO SEMPLIFICATO
    useEffect(() => {
        if (loadingMasterData) return;

        // Popola il form usando solo i dati standardizzati
        setTecnicoScrivente(tecniciMap.get(standardData.tecnicoId) || null);
        setNave(navi.find(n => n.id === standardData.naveId) || null);
        setLuogo(luoghi.find(l => l.id === standardData.luogoId) || null);
        setLavoroEseguito(standardData.lavoroEseguito);
        setMaterialiImpiegati(standardData.materialiImpiegati);
        setTipoGiornataId(standardData.tipoGiornataId);
        setDataInizio(dayjs(standardData.dataInizio));

        const dettagliConNome = standardData.dettaglioOre.map(d => {
            const tecnico = tecniciMap.get(d.tecnicoId);
            const tipoGiornata = tipiGiornataMap.get(standardData.tipoGiornataId);
            // **RISPOSTA SULLE ORE CORRETTE**: Usa il calcolatore se le ore non sono manuali
            const oreCalcolate = calculateTotalHours(tipoGiornata, [d]);
            return {
                ...d,
                nome: tecnico ? `${tecnico.cognome} ${tecnico.nome}` : `ID Sconosciuto: ${d.tecnicoId}`,
                ore: d.isManual ? d.ore : oreCalcolate
            };
        });
        setDettaglioOre(dettagliConNome);

    }, [standardData, loadingMasterData, tecniciMap, navi, luoghi, tipiGiornataMap]);

    
    const handleAddTecnico = (_: any, tecnico: Tecnico | null) => {
        if (tecnico && !dettaglioOre.some(d => d.tecnicoId === tecnico.id)) {
            const nuovoDettaglio: DettaglioOreState = {
                tecnicoId: tecnico.id,
                nome: `${tecnico.cognome} ${tecnico.nome}`,
                ore: 8, // Default
                isManual: true, // Le ore aggiunte da qui sono sempre manuali
            };
            setDettaglioOre(prev => [...prev, nuovoDettaglio]);
        }
    };

    const handleUpdateOre = (tecnicoId: string, ore: number) => {
        setDettaglioOre(prev => prev.map(d => d.tecnicoId === tecnicoId ? { ...d, ore: isNaN(ore) ? 0 : ore, isManual: true } : d));
    };
    
    const handleRemoveDettaglio = (tecnicoId: string) => {
        setDettaglioOre(prev => prev.filter(d => d.tecnicoId !== tecnicoId));
    };

    // 4. LOGICA DI SALVATAGGIO CHE SCRIVE SEMPRE NEL FORMATO NUOVO
    const handleSubmit = async () => {
        if (!tecnicoScrivente || !tipoGiornataId || !dataInizio) { setFormError("Compilare i campi obbligatori."); return; }
        setFormError(null);
        setIsSaving(true);

        try {
            const docToSave: Rapportino = {
                ...(standardData.originalData),
                id: standardData.id || uuidv4(),
                dataInizio: Timestamp.fromDate(dataInizio.toDate()),
                tecnicoId: tecnicoScrivente.id,
                presenze: [...new Set(dettaglioOre.map(d => d.tecnicoId))],
                tipoGiornataId,
                naveId: nave?.id || null,
                luogoId: luogo?.id || null,
                lavoroEseguito,
                materialiImpiegati,
                // Scrive sempre il dettaglio ore nel formato nuovo e pulito
                dettaglioOre: dettaglioOre.map(({nome, ...rest}) => rest),
                updatedAt: Timestamp.now(),
                updatedBy: tecnicoScrivente.id,
                version: (standardData.originalData?.version || 0) + 1,
                // Rimuove i campi legacy sporchi
                data: undefined,
                note: undefined,
                dettaglioOreTecnici: undefined,
                oreLavoro: undefined,
            } as Rapportino;

            await saveRapportino(docToSave);
            onClose();
        } catch (e: any) { setFormError(`Errore: ${e.message}`); }
        finally { setIsSaving(false); }
    };

    if (loadingMasterData) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <DialogTitle>{standardData.isNew ? 'Nuovo Rapportino' : 'Modifica Rapportino'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {formError && <Grid item xs={12}><Alert severity="error">{formError}</Alert></Grid>}
                    
                    {/* CAMPI FORM (ora più semplici) */}
                    <Grid item xs={12} md={8}>
                        <Autocomplete value={tecnicoScrivente} onChange={(_, v) => setTecnicoScrivente(v)} options={sortedTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Tecnico Responsabile" />} />
                    </Grid>
                    <Grid item xs={12} md={4}><DatePicker label="Data" value={dataInizio} onChange={setDataInizio} sx={{ width: '100%' }} /></Grid>
                    <Grid item xs={12}><Autocomplete value={tipiGiornataMap.get(tipoGiornataId) || null} onChange={(_, v) => setTipoGiornataId(v?.id || '')} options={[...tipiGiornataMap.values()]} getOptionLabel={(o) => o.nome} renderInput={(p) => <TextField {...p} label="Tipo Giornata" />} /></Grid>

                    <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Dettagli e Descrizione" /></Divider></Grid>
                    <Grid item xs={12} md={6}><Autocomplete value={nave} onChange={(_,v) => setNave(v)} options={navi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Nave" />} /></Grid>
                    <Grid item xs={12} md={6}><Autocomplete value={luogo} onChange={(_,v) => setLuogo(v)} options={luoghi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Luogo" />} /></Grid>
                    <Grid item xs={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} /></Grid>
                    <Grid item xs={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} /></Grid>

                    <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Tecnici e Ore" /></Divider></Grid>
                    <Grid item xs={12}>{
                        dettaglioOre.map(d => (
                             <Paper key={d.tecnicoId} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <Typography variant="body1" sx={{ flexGrow: 1 }}>{d.nome}</Typography>
                                <TextField label="Ore" type="number" value={d.ore || ''} onChange={(e) => handleUpdateOre(d.tecnicoId, parseFloat(e.target.value))} sx={{ width: '100px' }} size="small" helperText={d.isManual ? "Manuale" : "Calcolate"} />
                                <IconButton size="small" onClick={() => handleRemoveDettaglio(d.tecnicoId)}><DeleteIcon /></IconButton>
                            </Paper>
                        ))}
                    </Grid>
                    <Grid item xs={12}><Autocomplete options={sortedTecnici.filter(t => !dettaglioOre.some(d => d.tecnicoId === t.id))} onChange={handleAddTecnico} getOptionLabel={(o) => `${o.cognome} ${o.nome}`} renderInput={(p) => <TextField {...p} label="Aggiungi Tecnico..." />} value={null} clearOnBlur /></Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Annulla</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving || loadingMasterData}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button>
            </DialogActions>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
