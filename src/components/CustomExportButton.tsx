import { useState, MouseEvent } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { useGridApiContext } from '@mui/x-data-grid';
import { GetApp as ExportIcon } from '@mui/icons-material';

interface CustomExportButtonProps {
    onOpenPrintModal: () => void;
}

const CustomExportButton = ({ onOpenPrintModal }: CustomExportButtonProps) => {
    const apiRef = useGridApiContext();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleExportCsv = () => {
        apiRef.current.exportDataAsCsv({ allColumns: true, fileName: 'elenco-tecnici' });
        handleClose();
    };

    const handlePrint = () => {
        onOpenPrintModal();
        handleClose();
    };

    return (
        <>
            <Button
                color="primary"
                startIcon={<ExportIcon />}
                onClick={handleClick}
                size="small"
            >
                Esporta
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >
                <MenuItem onClick={handleExportCsv}>Esporta in CSV</MenuItem>
                <MenuItem onClick={handlePrint}>Stampa / PDF</MenuItem>
            </Menu>
        </>
    );
};

export default CustomExportButton;
