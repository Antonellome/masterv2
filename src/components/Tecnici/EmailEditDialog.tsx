import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

interface EmailEditDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (email: string) => void;
    email: string;
}

const EmailEditDialog: React.FC<EmailEditDialogProps> = ({ open, onClose, onSave, email }) => {
    // Stato per tracciare solo il valore modificato dall'utente.
    const [editedEmail, setEditedEmail] = useState<string | null>(null);

    // Il valore visualizzato è quello modificato, altrimenti la prop iniziale.
    const displayEmail = editedEmail ?? email;

    const handleSave = () => {
        onSave(displayEmail);
        setEditedEmail(null); // Resetta lo stato interno dopo il salvataggio
    };

    const handleClose = () => {
        setEditedEmail(null); // Resetta lo stato interno alla chiusura
        onClose();
    };

    // Alla prima apertura, impostiamo lo stato iniziale
    // Questo previene che il valore persista tra diverse aperture
    if (open && editedEmail === null) {
        setEditedEmail(email);
    }

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle>Modifica Email Tecnico</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Indirizzo Email"
                    type="email"
                    fullWidth
                    variant="standard"
                    value={displayEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Annulla</Button>
                <Button onClick={handleSave}>Salva</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmailEditDialog;
