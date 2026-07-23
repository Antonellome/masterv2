
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
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
    // This is a simple browser print. 
    // It's often better to use CSS @media print for fine-grained control.
    const printContent = document.getElementById('printable-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent?.innerHTML || '';
    window.print();
    document.body.innerHTML = originalContents;
    // Reload is necessary to re-apply React's listeners
    window.location.reload(); 
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
