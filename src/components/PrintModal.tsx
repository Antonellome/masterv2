
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  DialogTitle,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const PrintModal: React.FC<PrintModalProps> = ({ open, onClose, children }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handlePrint = () => {
    const printableContent = document.getElementById('printable-content');
    if (!printableContent) {
        alert('Contenuto da stampare non trovato.');
        return;
    }

    const printStyle = document.createElement('style');
    printStyle.id = 'print-style';
    printStyle.innerHTML = `
        @media print {
            body * {
                visibility: hidden;
            }
            #printable-content, #printable-content * {
                visibility: visible;
            }
            #printable-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .MuiDialog-paper {
                box-shadow: none;
            }
        }
    `;

    document.head.appendChild(printStyle);

    // Add a listener for after the print dialog is closed
    const afterPrint = () => {
        const styleElement = document.getElementById('print-style');
        if (styleElement) {
            styleElement.remove();
        }
        window.removeEventListener('afterprint', afterPrint);
    };

    window.addEventListener('afterprint', afterPrint);

    try {
        window.print();
    } catch (e) {
        console.error('Stampa fallita:', e);
        alert(`Stampa fallita: ${e instanceof Error ? e.message : String(e)}`);
        // Clean up immediately if print fails
        afterPrint();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, '@media print': { display: 'none' } }}>
        Anteprima di Stampa
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <div id="printable-content">
            {children}
        </div>
      </DialogContent>
      <DialogActions sx={{ '@media print': { display: 'none' } }}>
        <Button onClick={onClose}>Chiudi</Button>
        <Button onClick={handlePrint} startIcon={<PrintIcon />} variant="contained">
          Stampa
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintModal;
