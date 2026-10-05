import React, { useMemo, useEffect, useCallback } from 'react';
import {
    Box, Paper, Typography, Grid, Autocomplete, TextField, IconButton, Switch, FormControlLabel, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DettaglioOreTecnici, Tecnico } from '@/models/definitions';
import dayjs from 'dayjs';

interface GestoreOrariTecnicoProps {
    dettaglioOreTecnici: DettaglioOreTecnici[];
    setDettaglioOreTecnici: (dettagli: DettaglioOreTecnici[]) => void;
    tecniciDisponibili: Tecnico[];
    isReadOnly: boolean;
}

// La funzione di calcolo è sicura, non ha bisogno di modifiche.
const calculateHours = (oraInizio: string, oraFine: string, pausa: number): { hours: number, error: string | null } => {
    if (!oraInizio || !oraFine) {
        return { hours: 0, error: null };
    }
    const start = dayjs(`2000-01-01T${oraInizio}`);
    const end = dayjs(`2000-01-01T${oraFine}`);

    if (end.isBefore(start)) {
        return { hours: 0, error: "L'ora di fine non può essere precedente o uguale all'ora di inizio." };
    }
    const diffInMinutes = end.diff(start, 'minute');
    const totalHours = (diffInMinutes - (pausa || 0)) / 60;
    if (totalHours < 0) {
        return { hours: 0, error: "La pausa non può superare la durata totale." };
    }
    return { hours: parseFloat(totalHours.toFixed(2)), error: null };
};

const GestoreOrariTecnico: React.FC<GestoreOrariTecnicoProps> = ({
    dettaglioOreTecnici,
    setDettaglioOreTecnici,
    tecniciDisponibili,
    isReadOnly,
}) => {

    // --- LA VERA SOLUZIONE È QUI --- 
    // Questo `useEffect` viene eseguito UNA SOLA VOLTA se i dati caricati sono corrotti.
    // Li sanifica, imposta un errore chiaro e impedisce per sempre il loop infinito.
    useEffect(() => {
        let needsCorrection = false;
        const sanitizedDetails = dettaglioOreTecnici.map(d => {
            // Se l'errore di caricamento è già stato impostato, non fare nulla.
            if (d.error?.includes('Dati non validi')) return d;

            if (!d.isManual && d.oraInizio && d.oraFine) {
                const start = dayjs(`2000-01-01T${d.oraInizio}`);
                const end = dayjs(`2000-01-01T${d.oraFine}`);
                if (end.isBefore(start)) {
                    needsCorrection = true;
                    // Dati corrotti trovati! Li neutralizzo e imposto un errore permanente.
                    return {
                        ...d,
                        ore: 0,
                        error: 'Dati non validi caricati dal DB. Correggere manualmente gli orari.'
                    };
                }
            }
            return { ...d, error: null }; // Pulisce errori precedenti se i dati ora sono validi
        });

        if (needsCorrection) {
            setDettaglioOreTecnici(sanitizedDetails);
        }
    }, [dettaglioOreTecnici, setDettaglioOreTecnici]);

    const tecniciMap = useMemo(() => new Map(tecniciDisponibili.map(t => [t.id, t])), [tecniciDisponibili]);

    const handleAddTecnico = (tecnici: Tecnico[]) => {
        const currentIds = new Set(dettaglioOreTecnici.map(d => d.tecnicoId));
        const newTecnicoDetails = tecnici
            .filter(t => !currentIds.has(t.id))
            .map(t => ({
                tecnicoId: t.id,
                nome: `${t.cognome} ${t.nome}`.trim(),
                ore: 8, pausa: 60, oraInizio: '08:00', oraFine: '17:00', isManual: false, error: null,
            }));
        const finalDetails = dettaglioOreTecnici
            .filter(d => tecnici.some(t => t.id === d.tecnicoId))
            .concat(newTecnicoDetails);
        setDettaglioOreTecnici(finalDetails);
    };

    const handleRemoveTecnico = (tecnicoId: string) => {
        setDettaglioOreTecnici(dettaglioOreTecnici.filter(d => d.tecnicoId !== tecnicoId));
    };

    const handleDettaglioChange = (tecnicoId: string, field: keyof DettaglioOreTecnici, value: any) => {
        const updatedDettagli = dettaglioOreTecnici.map(d => {
            if (d.tecnicoId === tecnicoId) {
                const newDetail = { ...d, [field]: value };
                // L'errore di caricamento non viene cancellato finché l'utente non modifica i campi
                if (newDetail.error?.includes('Dati non validi')) {
                    newDetail.error = null;
                }

                if (field === 'isManual') {
                    newDetail.ore = newDetail.isManual ? 8 : calculateHours(newDetail.oraInizio, newDetail.oraFine, newDetail.pausa).hours;
                    newDetail.error = null;
                } else if ([ 'oraInizio', 'oraFine', 'pausa'].includes(field as string)) {
                    const { hours, error } = calculateHours(newDetail.oraInizio, newDetail.oraFine, newDetail.pausa);
                    newDetail.ore = hours;
                    newDetail.error = error;
                } else if (field === 'ore') {
                    newDetail.ore = parseFloat(value) || 0;
                }
                return newDetail;
            }
            return d;
        });
        setDettaglioOreTecnici(updatedDettagli);
    };

    const tecniciSelezionati = useMemo(() => 
        dettaglioOreTecnici.map(d => tecniciMap.get(d.tecnicoId)).filter(Boolean) as Tecnico[],
        [dettaglioOreTecnici, tecniciMap]
    );

    return (
        <Box>
            {!isReadOnly && (
                 <Autocomplete
                    multiple fullWidth options={tecniciDisponibili}
                    getOptionLabel={(option) => `${option.cognome} ${option.nome}`.trim()}
                    value={tecniciSelezionati} onChange={(_, newValue) => handleAddTecnico(newValue)}
                    renderInput={(params) => <TextField {...params} label="Aggiungi o Rimuovi Tecnici Coinvolti" />}
                    isOptionEqualToValue={(o,v) => o.id === v.id}
                />
            )}
           
            {dettaglioOreTecnici.map((dettaglio) => {
                const tecnicoInfo = tecniciMap.get(dettaglio.tecnicoId);
                return (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2, position: 'relative' }} key={dettaglio.tecnicoId}>
                         {!isReadOnly && (
                            <IconButton size="small" onClick={() => handleRemoveTecnico(dettaglio.tecnicoId)} sx={{ position: 'absolute', top: 8, right: 8 }}>
                                <DeleteIcon />
                            </IconButton>
                        )}
                        <Typography variant="body1" fontWeight="500" gutterBottom>{dettaglio.nome || `${tecnicoInfo?.cognome} ${tecnicoInfo?.nome}`}</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12}><FormControlLabel control={<Switch checked={dettaglio.isManual || false} onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'isManual', e.target.checked)} disabled={isReadOnly} />} label="Inserimento Manuale Ore" /></Grid>
                            {dettaglio.isManual ? (
                                <Grid item xs={6} md={4}><TextField label="Ore Lavorate" type="number" fullWidth value={dettaglio.ore || ''} onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'ore', e.target.value)} disabled={isReadOnly} /></Grid>
                            ) : (
                                <>
                                    <Grid item xs={6} md={3}><TextField label="Ora Inizio" type="time" fullWidth value={dettaglio.oraInizio || ''} onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'oraInizio', e.target.value)} disabled={isReadOnly} InputLabelProps={{ shrink: true }} /></Grid>
                                    <Grid item xs={6} md={3}><TextField label="Ora Fine" type="time" fullWidth value={dettaglio.oraFine || ''} onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'oraFine', e.target.value)} disabled={isReadOnly} InputLabelProps={{ shrink: true }} /></Grid>
                                    <Grid item xs={6} md={2}><TextField label="Pausa (min)" type="number" fullWidth value={dettaglio.pausa || 0} onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'pausa', parseInt(e.target.value) || 0)} disabled={isReadOnly} /></Grid>
                                    <Grid item xs={6} md={2}><Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>Tot: <strong>{`${(dettaglio.ore || 0).toFixed(2)} ore`}</strong></Typography></Grid>
                                </> 
                            )}
                        </Grid>
                         {dettaglio.error && (
                            <Alert severity={dettaglio.error.includes('Dati non validi') ? 'warning' : 'error'} sx={{ mt: 2 }}>{dettaglio.error}</Alert>
                        )}
                    </Paper>
                );
            })}
        </Box>
    );
};

export default GestoreOrariTecnico;
