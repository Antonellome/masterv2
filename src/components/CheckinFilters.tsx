
import React from 'react';
import { Grid, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, SelectChangeEvent, TextField } from '@mui/material';
import { useData } from '@/hooks/useData';
import { FiltriCheckin } from '@/models/definitions';

interface CheckinFiltersProps {
    filtri: FiltriCheckin;
    onFilterChange: (nuoviFiltri: FiltriCheckin) => void;
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

const CheckinFilters: React.FC<CheckinFiltersProps> = ({ filtri, onFilterChange }) => {
    const { navi, luoghi } = useData();

    const handleLuoghiChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onFilterChange({ 
            ...filtri, 
            luoghiSelezionati: typeof value === 'string' ? value.split(',') : value 
        });
    };

    const handleNaviChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onFilterChange({ 
            ...filtri, 
            naviSelezionate: typeof value === 'string' ? value.split(',') : value 
        });
    };

    const handleRicercaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ 
            ...filtri, 
            ricercaTecnico: event.target.value
        });
    };

    return (
        <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel>Filtra per Luogo</InputLabel>
                    <Select
                        multiple
                        value={filtri.luoghiSelezionati}
                        onChange={handleLuoghiChange}
                        input={<OutlinedInput label="Filtra per Luogo" />}
                        renderValue={(selected) => 
                            luoghi.filter(l => selected.includes(l.id)).map(l => l.nome).join(', ')
                        }
                        MenuProps={MenuProps}
                    >
                        {luoghi.map((luogo) => (
                            <MenuItem key={luogo.id} value={luogo.id}>
                                <Checkbox checked={filtri.luoghiSelezionati.includes(luogo.id)} />
                                <ListItemText primary={luogo.nome} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel>Filtra per Nave</InputLabel>
                     <Select
                        multiple
                        value={filtri.naviSelezionate}
                        onChange={handleNaviChange}
                        input={<OutlinedInput label="Filtra per Nave" />}
                        renderValue={(selected) => 
                            navi.filter(n => selected.includes(n.id)).map(n => n.nome).join(', ')
                        }
                        MenuProps={MenuProps}
                    >
                        {navi.map((nave) => (
                            <MenuItem key={nave.id} value={nave.id}>
                                <Checkbox checked={filtri.naviSelezionate.includes(nave.id)} />
                                <ListItemText primary={nave.nome} />
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
                 <TextField 
                    fullWidth
                    label="Cerca per nome tecnico"
                    variant="outlined"
                    value={filtri.ricercaTecnico}
                    onChange={handleRicercaChange}
                 />
            </Grid>
        </Grid>
    );
};

export default CheckinFilters;
