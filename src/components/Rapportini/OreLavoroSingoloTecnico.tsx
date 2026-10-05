
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, TextField, Typography, Switch, FormControlLabel, InputAdornment, 
    Alert, Paper, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { TimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

import type { DettaglioOreTecnici, TipoGiornata } from '@/models/definitions';

// --- FUNZIONI DI UTILITÀ ---
const isGiornataLavorativa = (tipo?: TipoGiornata): boolean => {
    if (!tipo) return true;
    const categoria = tipo.categoria?.toLowerCase() || '';
    const nome = tipo.nome?.toLowerCase() || '';
    return !['ferie', 'malattia', 'permesso'].some(keyword => categoria.includes(keyword) || nome.includes(keyword));
};

const parseTimeToDayjs = (timeStr: string | undefined): Dayjs | null => {
    if (!timeStr) return null;
    return dayjs(timeStr, 'HH:mm');
};

const formatTimeFromDayjs = (dayjsObj: Dayjs | null): string => {
    if (!dayjsObj) return '';
    return dayjsObj.format('HH:mm');
};

const getSafePausa = (pausaValue: any): number => {
    const p = Number(pausaValue);
    const validPauseValues = [0, 30, 60];
    return !isNaN(p) && validPauseValues.includes(p) ? p : 60;
};

// --- LOGICA DI CALCOLO DEFINITIVA CHE GESTISCE IL LAVORO NOTTURNO ---
const calculateOvernightHours = (oraInizio: Dayjs | null, oraFine: Dayjs | null, pausa: number): { hours: number, error: string | null } => {
    if (!oraInizio || !oraFine) {
        return { hours: 0, error: null };
    }

    let end = oraFine;
    // Se l'ora di fine è precedente a quella di inizio, significa che è il giorno dopo.
    if (end.isBefore(oraInizio)) {
        end = end.add(1, 'day');
    }

    const diffInMinutes = end.diff(oraInizio, 'minute');
    const totalHours = (diffInMinutes - pausa) / 60;

    if (totalHours < 0) {
        return { hours: 0, error: "La pausa non può superare la durata totale." };
    }

    return { hours: parseFloat(totalHours.toFixed(2)), error: null };
};


// --- TIPI E PROPS ---
interface OreLavoroSingoloTecnicoProps {
    datiIniziali: DettaglioOreTecnici;
    onUpdate: (data: DettaglioOreTecnici) => void;
    tipoGiornata?: TipoGiornata;
    isReadOnly?: boolean;
}

// --- COMPONENTE RISTRUTTURATO E FUNZIONANTE ---
const OreLavoroSingoloTecnico: React.FC<OreLavoroSingoloTecnicoProps> = ({ 
    datiIniziali, 
    onUpdate, 
    tipoGiornata,
    isReadOnly = false 
}) => {
    // Stato locale del componente
    const [isManual, setIsManual] = useState(false);
    const [oraInizio, setOraInizio] = useState<Dayjs | null>(null);
    const [oraFine, setOraFine] = useState<Dayjs | null>(null);
    const [pausa, setPausa] = useState<number>(60);
    const [oreLavorate, setOreLavorate] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const isLavorativo = useMemo(() => isGiornataLavorativa(tipoGiornata), [tipoGiornata]);

    // Unico Effetto per inizializzare e sincronizzare lo stato dai dati del DB
    useEffect(() => {
        const isLavorativoAttuale = isGiornataLavorativa(tipoGiornata);
        const initialIsManual = datiIniziali.isManual ?? !isLavorativoAttuale;
        setIsManual(initialIsManual);

        const initialOraInizio = parseTimeToDayjs(datiIniziali.oraInizio);
        const initialOraFine = parseTimeToDayjs(datiIniziali.oraFine);
        const initialPausa = getSafePausa(datiIniziali.pausa);

        setOraInizio(initialOraInizio);
        setOraFine(initialOraFine);
        setPausa(initialPausa);

        if (initialIsManual) {
            setOreLavorate(datiIniziali.ore || 8);
            setError(null);
        } else {
            // Calcola le ore iniziali usando la logica corretta
            const { hours, error: calcError } = calculateOvernightHours(initialOraInizio, initialOraFine, initialPausa);
            setOreLavorate(hours);
            setError(calcError);
        }
    }, [datiIniziali, tipoGiornata]);

    // Funzione per notificare il componente padre dei cambiamenti
    const triggerUpdate = useCallback((currentData: any) => {
        onUpdate({
            ...datiIniziali,
            ...currentData,
        });
    }, [onUpdate, datiIniziali]);


    // Gestore unico che viene chiamato quando l'utente modifica un valore
    const handleValueChange = (field: string, value: any) => {
        let newOraInizio = oraInizio;
        let newOraFine = oraFine;
        let newPausa = pausa;
        let newIsManual = isManual;
        let newOreLavorate = oreLavorate;

        // Aggiorna il valore specifico
        if (field === 'oraInizio') newOraInizio = value;
        if (field === 'oraFine') newOraFine = value;
        if (field === 'pausa') newPausa = value;
        if (field === 'isManual') newIsManual = value;
        if (field === 'oreLavorate') newOreLavorate = value;
        
        // Ricalcola se non è manuale
        if (!newIsManual) {
            const { hours, error: calcError } = calculateOvernightHours(newOraInizio, newOraFine, newPausa);
            newOreLavorate = hours;
            setError(calcError);
        } else {
            setError(null);
        }

        // Aggiorna lo stato locale per la UI
        setOraInizio(newOraInizio);
        setOraFine(newOraFine);
        setPausa(newPausa);
        setIsManual(newIsManual);
        setOreLavorate(newOreLavorate);
        
        // Notifica il componente padre
        triggerUpdate({
            isManual: newIsManual,
            oraInizio: formatTimeFromDayjs(newOraInizio),
            oraFine: formatTimeFromDayjs(newOraFine),
            pausa: newPausa,
            ore: newOreLavorate,
        });
    };
    
    // UI per giornate non lavorative
    if (!isLavorativo) {
        return (
             <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <TextField
                    label="Ore Totali"
                    type="number"
                    value={oreLavorate}
                    onChange={(e) => handleValueChange('oreLavorate', parseFloat(e.target.value) || 0)}
                    fullWidth
                    disabled={isReadOnly}
                    InputProps={{ endAdornment: <InputAdornment position="end">ore</InputAdornment>, inputProps: { step: 0.5 } }}
                />
            </Box>
        );
    }

    // UI principale per giornate lavorative
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Paper variant="outlined" sx={{ p: 2, borderColor: error ? 'error.main' : 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid xs={12} md="auto">
                        <FormControlLabel
                            control={<Switch checked={isManual} onChange={(e) => handleValueChange('isManual', e.target.checked)} disabled={isReadOnly} />}
                            label="Inserimento Manuale"
                        />
                    </Grid>
                    {isManual ? (
                        <Grid xs={12} md>
                             <TextField
                                label="Ore Lavorate"
                                type="number"
                                value={oreLavorate}
                                onChange={(e) => handleValueChange('oreLavorate', parseFloat(e.target.value) || 0)}
                                fullWidth
                                disabled={isReadOnly}
                                InputProps={{ endAdornment: <InputAdornment position="end">ore</InputAdornment>, inputProps: { step: 0.5 } }}
                            />
                        </Grid>
                    ) : (
                        <>
                            <Grid xs={12} sm={6} md={3}>
                                <TimePicker label="Ora Inizio" value={oraInizio} onChange={(v) => handleValueChange('oraInizio', v)} ampm={false} disabled={isReadOnly} slotProps={{ textField: { fullWidth: true } }} />
                            </Grid>
                            <Grid xs={12} sm={6} md={3}>
                                <TimePicker label="Ora Fine" value={oraFine} onChange={(v) => handleValueChange('oraFine', v)} ampm={false} disabled={isReadOnly} slotProps={{ textField: { fullWidth: true } }} />
                            </Grid>
                            <Grid xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel>Pausa</InputLabel>
                                    <Select label="Pausa" value={pausa} onChange={(e) => handleValueChange('pausa', Number(e.target.value))} disabled={isReadOnly}>
                                        <MenuItem value={0}>0 min</MenuItem>
                                        <MenuItem value={30}>30 min</MenuItem>
                                        <MenuItem value={60}>60 min</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid xs={12} sm={6} md={3} sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                                    <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                                    <Typography variant="h6" component="span">{oreLavorate.toFixed(2)} ore</Typography>
                                </Box>
                            </Grid>
                        </>
                    )}
                </Grid>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Paper>
        </LocalizationProvider>
    );
};

export default OreLavoroSingoloTecnico;
