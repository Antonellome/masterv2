import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, CircularProgress, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: () => void;
  pdfDataUrl: string | null;
  isGenerating: boolean;
  fileName: string;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({ open, onClose, onShare, pdfDataUrl, isGenerating, fileName }) => {

    const handleDownload = () => {
        if (!pdfDataUrl) return;
        const link = document.createElement('a');
        link.href = pdfDataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Anteprima PDF
                <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {isGenerating && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Generazione del PDF in corso...</Typography>
                    </Box>
                )}
                {!isGenerating && pdfDataUrl && (
                    <iframe src={pdfDataUrl} style={{ width: '100%', height: '500px', border: 'none' }} title="Anteprima PDF" />
                )}
                 {!isGenerating && !pdfDataUrl && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
                        <Typography color="error">Impossibile visualizzare l'anteprima del PDF.</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
                <Button onClick={handleDownload} disabled={!pdfDataUrl || isGenerating} variant="outlined">
                    Scarica
                </Button>
                <Button onClick={onShare} disabled={!pdfDataUrl || isGenerating} variant="contained">
                    Condividi
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PdfPreviewDialog;
