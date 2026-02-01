import { MouseEvent } from 'react';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import { 
    GridToolbarContainer, 
    GridToolbarColumnsButton, 
    GridToolbarFilterButton, 
    GridToolbarDensitySelector 
} from '@mui/x-data-grid';
import Add from '@mui/icons-material/Add';
import GetApp from '@mui/icons-material/GetApp';

const AddIcon = Add;
const ExportIcon = GetApp;

interface CustomToolbarProps {
    onAdd: () => void;
    anchorEl: null | HTMLElement;
    handleMenuOpen: (event: MouseEvent<HTMLElement>) => void;
    handleMenuClose: () => void;
    handleExport: (format: 'csv' | 'pdf') => void;
}

const CustomToolbar = ({ onAdd, anchorEl, handleMenuOpen, handleMenuClose, handleExport }: CustomToolbarProps) => {
    return (
        <GridToolbarContainer>
            {/* Pulsanti Custom */}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd} size="small">
                Aggiungi
            </Button>
            <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                Esporta Vista
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            {/* Pulsanti Standard di DataGrid */}
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />

            {/* Menu per l'esportazione custom */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <MenuItem onClick={() => handleExport('csv')}>Esporta CSV</MenuItem>
                <MenuItem onClick={() => handleExport('pdf')}>Esporta PDF</MenuItem>
            </Menu>
        </GridToolbarContainer>
    );
};

export default CustomToolbar;
