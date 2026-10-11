
import { useRef, useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    CircularProgress,
    Tooltip,
    Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Share, Print, Download } from '@mui/icons-material';

interface PdfPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    pdfBlob: Blob | null;
    fileName: string;
    isGenerating: boolean;
}

const PdfPreviewDialog = ({ open, onClose, pdfBlob, fileName, isGenerating }: PdfPreviewDialogProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            return () => {
                URL.revokeObjectURL(url);
                setPdfUrl(null);
            };
        } else {
            setPdfUrl(null);
        }
    }, [pdfBlob]);

    const handleShare = async () => {
        if (!pdfBlob) return;
        try {
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: fileName,
                    text: `In allegato: ${fileName}`,
                    files: [file]
                });
            } else {
                alert('La condivisione non è supportata su questo browser.');
            }
        } catch (error) {
            console.error('Errore nella condivisione:', error);
            alert('Errore durante la condivisione del file.');
        }
    };

    const handlePrint = () => {
        if (!iframeRef.current?.contentWindow) return;
        try {
            iframeRef.current.contentWindow.focus();
            iframeRef.current.contentWindow.print();
        } catch (error) {
            console.error("Errore durante la stampa:", error);
            alert("Impossibile avviare la stampa.");
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
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" PaperProps={{ sx: { height: '90vh' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Anteprima PDF
                <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, overflow: 'hidden', flex: 1 }}>
                {isGenerating ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Generazione PDF in corso...</Typography>
                    </Box>
                ) : pdfUrl ? (
                    <iframe
                        ref={iframeRef}
                        src={pdfUrl}
                        title="Anteprima PDF"
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                    />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                         <Typography>Nessun PDF da visualizzare.</Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Box>
                    <Tooltip title="Stampa il PDF">
                        <span>
                            <Button 
                                onClick={handlePrint} 
                                startIcon={<Print />} 
                                disabled={!pdfUrl || isGenerating}
                                variant="outlined"
                            >
                                Stampa
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
                <Box>
                    <Tooltip title="Condividi il file PDF">
                        <span>
                            <Button 
                                onClick={handleShare} 
                                startIcon={<Share />} 
                                disabled={!pdfUrl || isGenerating || !navigator.share}
                                variant="outlined"
                                sx={{ mr: 1 }}
                            >
                                Condividi
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Scarica il file PDF">
                         <span>
                            <Button 
                                onClick={handleDownload} 
                                startIcon={<Download />} 
                                disabled={!pdfUrl || isGenerating}
                                variant="contained"
                            >
                                Download
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default PdfPreviewDialog;
