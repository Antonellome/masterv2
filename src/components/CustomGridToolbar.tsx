
import { useState } from 'react';
import {
    GridToolbarContainer,
    GridToolbarColumnsButton,
    GridToolbarFilterButton,
    GridToolbarDensitySelector,
    GridCsvExportMenuItem,
    GridCsvExportOptions,
    GridToolbarQuickFilter, // <-- 1. IMPORTATO IL COMPONENTE MANCANTE
} from '@mui/x-data-grid';
import { Button, Menu, MenuItem, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; // <-- 2. IMPORTATA L'ICONA PER IL PULSANTE
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// --- PROPS AMPLIATE PER ACCETTARE LA LOGICA DI AGGIUNTA E RICERCA ---
interface CustomGridToolbarProps {
    onOpenPrintModal?: () => void;
    csvOptions?: GridCsvExportOptions;
    onAdd?: () => void; // Prop per la funzione di aggiunta
    addLabel?: string;  // Etichetta per il pulsante di aggiunta
    showQuickFilter?: boolean; // Per mostrare/nascondere il filtro rapido
}

const CustomGridToolbar = (props: CustomGridToolbarProps) => {
    // --- DESTRUTTURAZIONE DI TUTTE LE PROPS, INCLUSE QUELLE NUOVE ---
    const { onOpenPrintModal, csvOptions, onAdd, addLabel, showQuickFilter } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handlePrint = () => {
        onOpenPrintModal?.();
        handleMenuClose();
    };

    const handlePdf = () => {
        onOpenPrintModal?.(); 
        handleMenuClose();
    };

    return (
        <GridToolbarContainer>
            {/* --- SEZIONE SINISTRA: PULSANTI E FILTRI -- */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                
                {/* 3. ECCO IL PULSANTE: APPARE SOLO SE VIENE PASSATA LA FUNZIONE onAdd */}
                {onAdd && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onAdd}
                        size="small"
                    >
                        {addLabel || 'Nuovo'}
                    </Button>
                )}
                
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
                    MenuListProps={{ 'aria-labelledby': 'export-button' }}
                >
                    {onOpenPrintModal && [
                        <MenuItem key="print" onClick={handlePrint}><PrintIcon sx={{ mr: 1 }} />Stampa</MenuItem>,
                        <MenuItem key="pdf" onClick={handlePdf}><PictureAsPdfIcon sx={{ mr: 1 }} />Download PDF</MenuItem>
                    ]}
                    {csvOptions && <GridCsvExportMenuItem options={csvOptions} onExport={() => handleMenuClose()} />}
                </Menu>
            </Box>
            
            {/* --- SEZIONE DESTRA: BARRA DI RICERCA RIPRISTINATA -- */}
            {/* 4. ECCO LA BARRA DI RICERCA: APPARE SOLO SE showQuickFilter è true */}
            {showQuickFilter && (
                <GridToolbarQuickFilter
                    quickFilterParser={(searchInput) => searchInput.split(',').map((value) => value.trim())}
                    debounceMs={600}
                />
            )}

        </GridToolbarContainer>
    );
};

export default CustomGridToolbar;
