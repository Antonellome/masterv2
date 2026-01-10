import { useState } from 'react';
import {
    GridToolbarContainer,
    GridToolbarColumnsButton,
    GridToolbarFilterButton,
    GridToolbarDensitySelector,
    GridCsvExportMenuItem,
    GridCsvExportOptions, // Importato il tipo corretto
} from '@mui/x-data-grid';
import { Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Props del componente con i tipi corretti
interface CustomGridToolbarProps {
    onOpenPrintModal: () => void;
    csvOptions: GridCsvExportOptions; // Tipo specifico invece di any
}

const CustomGridToolbar = (props: CustomGridToolbarProps) => {
    const { onOpenPrintModal, csvOptions } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handlePrint = () => {
        onOpenPrintModal();
        handleMenuClose();
    };

    const handlePdf = () => {
        onOpenPrintModal(); // La modale gestirà sia la stampa che il PDF
        handleMenuClose();
    };

    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            
            {/* Pulsante "Esporta" con menu a tendina */}
            <Button
                id="export-button"
                aria-controls={open ? 'export-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleMenuClick}
                endIcon={<ArrowDropDownIcon />}
                size="small"
            >
                Esporta
            </Button>
            <Menu
                id="export-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'export-button',
                }}
            >
                {/* Opzione 1: Stampa */}
                <MenuItem onClick={handlePrint}>
                    <PrintIcon sx={{ mr: 1 }} />
                    Stampa
                </MenuItem>
                
                {/* Opzione 2: Download PDF */}
                <MenuItem onClick={handlePdf}>
                    <PictureAsPdfIcon sx={{ mr: 1 }} />
                    Download PDF
                </MenuItem>

                {/* Opzione 3: Download CSV (usa il componente di MUI) */}
                <GridCsvExportMenuItem
                    options={csvOptions}
                    onExport={() => handleMenuClose()} // Chiude il menu dopo il click
                />
            </Menu>
        </GridToolbarContainer>
    );
};

export default CustomGridToolbar;
