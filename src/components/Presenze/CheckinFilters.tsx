
import { Anagrafica, Luogo, Nave } from "@/models/definitions";
import { Autocomplete, Button, Grid, TextField } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

interface Filters {
    giorno: Dayjs;
    tecnico: Anagrafica | null;
    luogo: Luogo | null;
    nave: Nave | null;
}

interface CheckinFiltersProps {
    filters: Filters;
    onFilterChange: (filters: Partial<Filters>) => void;
    tecnici: Anagrafica[];
    luoghi: Luogo[];
    navi: Nave[];
}

export const CheckinFilters = ({ filters, onFilterChange, tecnici, luoghi, navi }: CheckinFiltersProps) => {

    const handleDateChange = (newDate: Dayjs | null) => {
        if (newDate) {
            onFilterChange({ giorno: newDate });
        }
    };

    const handleFilterChange = <K extends keyof Filters>(field: K, value: Filters[K]) => {
        onFilterChange({ [field]: value });
    };

    const handlePrevDay = () => {
        onFilterChange({ giorno: filters.giorno.subtract(1, 'day') });
    };

    const handleNextDay = () => {
        onFilterChange({ giorno: filters.giorno.add(1, 'day') });
    };

    const handleResetFilters = () => {
        onFilterChange({
            giorno: dayjs(),
            tecnico: null,
            luogo: null,
            nave: null,
        });
    }

    return (
        <Grid container spacing={2} alignItems="center">
            {/* Row 1: Date and Day Navigation */}
            <Grid item xs={12} md={4}>
                <DatePicker
                    label="Giorno"
                    value={filters.giorno}
                    onChange={handleDateChange}
                    slotProps={{ textField: { fullWidth: true } }}
                />
            </Grid>
            <Grid item xs={6} md={4}>
                <Button onClick={handlePrevDay} fullWidth variant="outlined" sx={{ height: '100%' }}>Giorno Prec.</Button>
            </Grid>
            <Grid item xs={6} md={4}>
                <Button onClick={handleNextDay} fullWidth variant="outlined" sx={{ height: '100%' }}>Giorno Succ.</Button>
            </Grid>

            {/* Row 2: Filters and Reset */}
            <Grid item xs={12} md={3}>
                <Autocomplete
                    options={tecnici}
                    getOptionLabel={(option) => option.nome}
                    value={filters.tecnico}
                    onChange={(_, value) => handleFilterChange('tecnico', value)}
                    renderInput={(params) => <TextField {...params} label="Tecnico" />}
                />
            </Grid>
            <Grid item xs={12} md={3}>
                <Autocomplete
                    options={luoghi}
                    getOptionLabel={(option) => option.nome}
                    value={filters.luogo}
                    onChange={(_, value) => handleFilterChange('luogo', value)}
                    renderInput={(params) => <TextField {...params} label="Luogo" />}
                />
            </Grid>
            <Grid item xs={12} md={3}>
                <Autocomplete
                    options={navi}
                    getOptionLabel={(option) => option.nome}
                    value={filters.nave}
                    onChange={(_, value) => handleFilterChange('nave', value)}
                    renderInput={(params) => <TextField {...params} label="Nave" />}
                />
            </Grid>
            <Grid item xs={12} md={3}>
                <Button onClick={handleResetFilters} fullWidth variant="contained" color="secondary">Azzera Filtri</Button>
            </Grid>
        </Grid>
    );
};
