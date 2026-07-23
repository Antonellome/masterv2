
import React, { useRef, useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Typography, Tooltip, CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon, Share as ShareIcon, Print as PrintIcon } from '@mui/icons-material';

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  fileName: string;
  canShare: boolean;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({
  open,
  onClose,
  pdfBlob,
  fileName,
  canShare,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pdfBlob && open) {
      setIsLoading(true);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsLoading(false);
    } else {
      setIsLoading(true); 
    }

    // Cleanup
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl('');
      }
    };
  }, [pdfBlob, open]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      alert("Impossibile avviare la stampa. Il contenuto del PDF non è stato caricato correttamente.");
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
      if (!pdfBlob || !navigator.share) return;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      try {
          await navigator.share({
              files: [file],
              title: fileName.replace('.pdf', ''),
          });
      } catch (error) {
          console.error("Error sharing:", error);
      }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Anteprima PDF
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isLoading || !pdfUrl ? (
                <Box sx={{textAlign: 'center'}}>
                    <CircularProgress />
                    <Typography sx={{mt: 2}}>Generazione del PDF in corso...</Typography>
                </Box>
            ) : (
                <iframe
                    ref={iframeRef}
                    src={pdfUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="Anteprima PDF"
                />
            )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Tooltip title="Stampa il PDF">
          <span>
            <Button startIcon={<PrintIcon />} onClick={handlePrint} variant="outlined" disabled={isLoading}>
              Stampa
            </Button>
          </span>
        </Tooltip>
        <Box>
            <Tooltip title="Scarica il PDF sul tuo dispositivo">
              <span>
                <Button startIcon={<DownloadIcon />} onClick={handleDownload} variant="outlined" sx={{ mr: 1 }} disabled={isLoading}>
                  Download
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={canShare ? "Condividi il PDF" : "Condivisione non supportata su questo browser."}>
              <span>
                <Button
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  variant="contained"
                  disabled={!canShare || isLoading}
                >
                  Condividi
                </Button>
              </span>
            </Tooltip>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PdfPreviewDialog;
