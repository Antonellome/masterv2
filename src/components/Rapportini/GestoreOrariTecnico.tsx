
import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Autocomplete,
    TextField,
    Chip,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DettaglioOreData, Tecnico } from '@/models/definitions';

interface GestoreOrariTecnicoProps {
    dettaglioOre: DettaglioOreData[];
    setDettaglioOre: (dettagli: DettaglioOreData[]) => void;
    tecniciDisponibili: Tecnico[];
    isReadOnly: boolean;
}

const GestoreOrariTecnico: React.FC<GestoreOrariTecnicoProps> = ({
    dettaglioOre,
    setDettaglioOre,
    tecniciDisponibili,
    isReadOnly,
}) => {
    // Aggiunge un tecnico alla lista dei dettagli
    const handleAddTecnico = (tecnici: Tecnico[]) => {
        const nuoviDettagli = tecnici.map(t => {
            const dettaglioEsistente = dettaglioOre.find(d => d.tecnicoId === t.id);
            if (dettaglioEsistente) {
                return dettaglioEsistente;
            }
            return {
                tecnicoId: t.id,
                nome: `${t.cognome} ${t.nome}`.trim(),
                ore: 8, // Default
                pausa: 60, // Default in minuti
            };
        });
        setDettaglioOre(nuoviDettagli);
    };

    // Rimuove un tecnico dalla lista
    const handleRemoveTecnico = (tecnicoId: string) => {
        setDettaglioOre(dettaglioOre.filter(d => d.tecnicoId !== tecnicoId));
    };

    // Aggiorna un valore specifico (ore o pausa) per un tecnico
    const handleDettaglioChange = (tecnicoId: string, field: 'ore' | 'pausa', value: number | string) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return;

        const nuoviDettagli = dettaglioOre.map(d =>
            d.tecnicoId === tecnicoId ? { ...d, [field]: numValue } : d
        );
        setDettaglioOre(nuoviDettagli);
    };

    const oreOptions = Array.from({ length: 25 }, (_, i) => i * 0.5); // da 0 a 12 con step di 0.5
    const pausaOptions = [0, 30, 60, 90, 120]; // in minuti

    // I tecnici già selezionati per l'autocomplete
    const tecniciSelezionati = tecniciDisponibili.filter(t => 
        dettaglioOre.some(d => d.tecnicoId === t.id)
    );

    return (
        <Box>
            <Autocomplete
                multiple
                fullWidth
                readOnly={isReadOnly}
                options={tecniciDisponibili}
                getOptionLabel={(option) => `${option.cognome} ${option.nome}`.trim()}
                value={tecniciSelezionati}
                onChange={(_, newValue) => handleAddTecnico(newValue)}
                renderInput={(params) => <TextField {...params} label="Aggiungi Tecnici" />}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            label={`${option.cognome} ${option.nome}`}
                            {...getTagProps({ index })}
                            disabled={isReadOnly}
                        />
                    ))
                }
            />
            {dettaglioOre.length > 0 && (
                <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                    {dettaglioOre.map(dettaglio => (
                        <Grid container spacing={2} key={dettaglio.tecnicoId} alignItems="center" sx={{ mb: 1.5 }}>
                            <Grid
                                size={{
                                    xs: 12,
                                    sm: 5
                                }}>
                                <Typography variant="body1" fontWeight="500">
                                    {dettaglio.nome}
                                </Typography>
                            </Grid>
                            <Grid
                                size={{
                                    xs: 5,
                                    sm: 3
                                }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Ore</InputLabel>
                                    <Select
                                        label="Ore"
                                        value={dettaglio.ore ?? ''}
                                        disabled={isReadOnly}
                                        onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'ore', e.target.value)}
                                    >
                                        {oreOptions.map(ora => <MenuItem key={ora} value={ora}>{ora}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                             <Grid
                                 size={{
                                     xs: 5,
                                     sm: 3
                                 }}>
                                <FormControl fullWidth size="small">
                                     <InputLabel>Pausa</InputLabel>
                                     <Select
                                        label="Pausa"
                                        value={dettaglio.pausa ?? ''}
                                        disabled={isReadOnly}
                                        onChange={(e) => handleDettaglioChange(dettaglio.tecnicoId, 'pausa', e.target.value)}
                                    >
                                        {pausaOptions.map(p => <MenuItem key={p} value={p}>{p} min</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid
                                sx={{ textAlign: 'right' }}
                                size={{
                                    xs: 2,
                                    sm: 1
                                }}>
                                <IconButton
                                    size="small"
                                    onClick={() => handleRemoveTecnico(dettaglio.tecnicoId)}
                                    disabled={isReadOnly}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Grid>
                        </Grid>
                    ))}
                </Paper>
            )}
        </Box>
    );
};

export default GestoreOrariTecnico;
