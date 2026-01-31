import { Modal, Box, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintableTechnicianList from './PrintableTechnicianList';
import type { Tecnico, FormField } from '@/models/definitions';

interface PrintModalProps {
    open: boolean;
    onClose: () => void;
    data: Tecnico[];
    fields: FormField[];
}

const style = {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    maxHeight: '90vh',
    overflowY: 'auto',
};

const PrintModal = ({ open, onClose, data, fields }: PrintModalProps) => {

    const handlePrint = () => {
        const printContents = document.getElementById("printable-content")!.innerHTML;
        const originalContents = document.body.innerHTML;
        
        // Aggiungiamo uno stile globale per la stampa
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body {
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                }
                .no-print {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        
        // Rimuoviamo lo stile dopo la stampa per non interferire con l'applicazione
        document.head.removeChild(style);
        window.location.reload(); // Ricarica per ripristinare lo stato e gli event listener
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={style}>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    className="no-print"
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
                <Typography variant="h6" component="h2" className="no-print">
                    Anteprima di Stampa
                </Typography>
                
                <Box id="printable-content" sx={{ mt: 2, mb: 2 }}>
                    <PrintableTechnicianList data={data} fields={fields} />
                </Box>

                <Box sx={{ mt: 3, textAlign: 'right' }} className="no-print">
                    <Button onClick={handlePrint} variant="contained">
                        Stampa Schede
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default PrintModal;
