
import React from 'react';
import { 
    Grid, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    OutlinedInput, 
    SelectChangeEvent, 
    TextField, 
    Autocomplete, 
    Box,
    Chip 
} from '@mui/material';
import { FiltriCheckin, Tecnico, Anagrafica } from '@/models/definitions';

interface CheckinFiltersProps {
    filtri: FiltriCheckin;
    onFilterChange: (nuoviFiltri: FiltriCheckin) => void;
    tecnici: Tecnico[];
    luoghi: Anagrafica[];
    navi: Anagrafica[];
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const CheckinFilters: React.FC<CheckinFiltersProps> = ({ filtri, onFilterChange, tecnici, luoghi, navi }) => {

    const handleLuoghiChange = (event: SelectChangeEvent<string[]>) => {
        const { target: { value } } = event;
        onFilterChange({
            ...filtri,
            luoghiSelezionati: typeof value === 'string' ? value.split(',') : value,
        });
    };

    const handleNaviChange = (event: SelectChangeEvent<string[]>) => {
        const { target: { value } } = event;
        onFilterChange({
            ...filtri,
            naviSelezionate: typeof value === 'string' ? value.split(',') : value,
        });
    };

    const handleTecnicoChange = (event: any, newValue: Tecnico | null) => {
        onFilterChange({
            ...filtri,
            ricercaTecnico: newValue ? newValue.id : '',
        });
    };

    const selectedTecnico = tecnici.find(t => t.id === filtri.ricercaTecnico) || null;

    return (
        <Grid container spacing={2} sx={{ alignItems: 'center', py: 2 }}>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                    <InputLabel>Filtra per Luogo</InputLabel>
                    <Select
                        multiple
                        value={filtri.luoghiSelezionati}
                        onChange={handleLuoghiChange}
                        input={<OutlinedInput label="Filtra per Luogo" />}
                        renderValue={(selectedIds) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selectedIds.map((id) => (
                                    <Chip key={id} label={luoghi.find(l => l.id === id)?.nome || ''} size="small" />
                                ))}
                            </Box>
                        )}
                        MenuProps={MenuProps}
                    >
                        {luoghi.map((luogo) => (
                            <MenuItem key={luogo.id} value={luogo.id}>
                                {luogo.nome}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                    <InputLabel>Filtra per Nave</InputLabel>
                    <Select
                        multiple
                        value={filtri.naviSelezionate}
                        onChange={handleNaviChange}
                        input={<OutlinedInput label="Filtra per Nave" />}
                        renderValue={(selectedIds) => (
                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selectedIds.map((id) => (
                                    <Chip key={id} label={navi.find(n => n.id === id)?.nome || ''} size="small" />
                                ))}
                            </Box>
                        )}
                        MenuProps={MenuProps}
                    >
                        {navi.map((nave) => (
                            <MenuItem key={nave.id} value={nave.id}>
                                {nave.nome}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
                <Autocomplete
                    fullWidth
                    size="small"
                    options={tecnici}
                    getOptionLabel={(option) => `${option.nome} ${option.cognome}`}
                    value={selectedTecnico}
                    onChange={handleTecnicoChange}
                    renderInput={(params) => <TextField {...params} label="Cerca Tecnico" />}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderOption={(props, option) => (
                        <li {...props} key={option.id}>
                            {option.nome} {option.cognome}
                        </li>
                    )}
                />
            </Grid>
        </Grid>
    );
};

export default CheckinFilters;
