import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';

interface EmailEditDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (email: string) => void;
    email: string;
}

const EmailEditDialog: React.FC<EmailEditDialogProps> = ({ open, onClose, onSave, email }) => {
    const [currentEmail, setCurrentEmail] = useState(email);

    useEffect(() => {
        setCurrentEmail(email);
    }, [email, open]);

    const handleSave = () => {
        onSave(currentEmail);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Modifica Email Tecnico</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    label="Indirizzo Email"
                    type="email"
                    fullWidth
                    variant="standard"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Annulla</Button>
                <Button onClick={handleSave}>Salva</Button>
            </DialogActions>
        </Dialog>
    );
};

export default EmailEditDialog;
