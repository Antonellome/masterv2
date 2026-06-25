
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    IconButton, 
    Box, 
    CircularProgress 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Share, Download } from '@mui/icons-material';

interface PdfPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    fileName: string;
    isGenerating: boolean;
}

const PdfPreviewDialog = ({ open, onClose, pdfUrl, fileName, isGenerating }: PdfPreviewDialogProps) => {

    const handleShare = async () => {
        if (!pdfUrl) return;
        try {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.share) {
                await navigator.share({
                    title: 'Report Mensile',
                    text: 'Ecco il report mensile in formato PDF.',
                    files: [file]
                });
            } else {
                alert('La condivisione non è supportata su questo browser. Usa la funzione di download.');
            }
        } catch (error) {
            console.error('Errore nella condivisione:', error);
            alert('Errore durante la condivisione del file.');
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" sx={{ height: '90vh' }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Anteprima Report Mensile
                <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflow: 'hidden', height: 'calc(100% - 64px - 52px)' }}>
                {isGenerating ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : pdfUrl ? (
                    <iframe
                        src={pdfUrl}
                        title="Anteprima PDF"
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                         <p>Nessun PDF da visualizzare.</p>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button 
                    onClick={handleShare} 
                    startIcon={<Share />} 
                    disabled={!pdfUrl || isGenerating} 
                    variant="outlined"
                >
                    Condividi
                </Button>
                <Button 
                    onClick={handleDownload} 
                    startIcon={<Download />} 
                    disabled={!pdfUrl || isGenerating}
                    variant="contained"
                >
                    Download
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PdfPreviewDialog;
