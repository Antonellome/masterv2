import React, { useState, useEffect } from 'react';
import { Box, TextField, Switch, FormControlLabel, Grid, InputAdornment, Typography } from '@mui/material';
import { DettaglioOreData } from '@/models/definitions';
import dayjs from 'dayjs';

interface OreLavoroSingoloTecnicoProps {
  datiOre: DettaglioOreData;
  onUpdate: (newData: DettaglioOreData) => void;
  isReadOnly: boolean;
  isScrivente?: boolean; // Flag per UI speciale se è il tecnico principale
}

// Funzione per calcolare le ore, assicurandosi che sia pura e non dipenda da stati esterni
const calculateOre = (dettaglio: Partial<DettaglioOreData>): number => {
    if (dettaglio.isManual) {
        return parseFloat(String(dettaglio.ore)) || 0;
    }
    
    const inizio = dayjs(`1970-01-01T${dettaglio.oraInizio || '00:00'}`);
    let fine = dayjs(`1970-01-01T${dettaglio.oraFine || '00:00'}`);

    if (fine.isBefore(inizio) || fine.isSame(inizio)) {
        fine = fine.add(1, 'day');
    }

    const diff = fine.diff(inizio, 'minute');
    const oreCalcolate = (diff - (dettaglio.pausa || 0)) / 60;
    
    return Math.max(0, parseFloat(oreCalcolate.toFixed(2)));
};

const OreLavoroSingoloTecnico: React.FC<OreLavoroSingoloTecnicoProps> = ({ datiOre, onUpdate, isReadOnly, isScrivente }) => {
    const [localDati, setLocalDati] = useState(datiOre);

    useEffect(() => {
        setLocalDati(datiOre);
    }, [datiOre]);

    const handleUpdate = (field: keyof DettaglioOreData, value: any) => {
        const updatedDati = { ...localDati, [field]: value };
        const oreCalcolate = calculateOre(updatedDati);
        const finalData = { ...updatedDati, ore: oreCalcolate };
        setLocalDati(finalData);
        onUpdate(finalData);
    };

    const handleManualModeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isManual = event.target.checked;
        handleUpdate('isManual', isManual);
    };

    return (
        <Box sx={{ p: isScrivente ? 0 : 2, border: isScrivente ? 'none' : '1px solid #ddd', borderRadius: 1 }}>
            {isScrivente && (
                <Typography variant="subtitle2" gutterBottom>Imposta le tue ore o quelle di default per tutti</Typography>
            )}
            <FormControlLabel
                control={<Switch checked={localDati.isManual} onChange={handleManualModeToggle} disabled={isReadOnly} />}
                label="Inserimento Manuale Ore"
            />
            {localDati.isManual ? (
                <TextField
                    label="Ore Lavorate"
                    type="number"
                    fullWidth
                    value={localDati.ore}
                    onChange={(e) => handleUpdate('ore', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    disabled={isReadOnly}
                    InputProps={{ inputProps: { min: 0, step: 0.5 } }}
                    sx={{mt: 2}}
                />
            ) : (
                <Grid container spacing={2} sx={{mt: 1}}>
                    <Grid
                        size={{
                            xs: 6,
                            sm: 4
                        }}>
                        <TextField
                            label="Inizio"
                            type="time"
                            fullWidth
                            value={localDati.oraInizio || ''}
                            onChange={(e) => handleUpdate('oraInizio', e.target.value)}
                            disabled={isReadOnly}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 6,
                            sm: 4
                        }}>
                        <TextField
                            label="Fine"
                            type="time"
                            fullWidth
                            value={localDati.oraFine || ''}
                            onChange={(e) => handleUpdate('oraFine', e.target.value)}
                            disabled={isReadOnly}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 4
                        }}>
                        <TextField
                            label="Pausa"
                            type="number"
                            fullWidth
                            value={localDati.pausa || ''}
                            onChange={(e) => handleUpdate('pausa', e.target.value === '' ? null : parseInt(e.target.value))}
                            disabled={isReadOnly}
                            InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment>, inputProps: { min: 0 } }}
                        />
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default OreLavoroSingoloTecnico;
