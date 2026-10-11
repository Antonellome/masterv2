
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const PrintModal: React.FC<PrintModalProps> = ({ open, onClose, children, title = "Stampa" }) => {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Stampa</title>
              <style>
                @media print {
                  body { -webkit-print-color-adjust: exact; } /* Chrome, Safari */
                  body { color-adjust: exact; } /* Firefox */
                }
                /* Add any styles you need for printing here */
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box ref={printRef}>
            {children}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
        <Button onClick={handlePrint} startIcon={<PrintIcon />}>
          Stampa
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintModal;
