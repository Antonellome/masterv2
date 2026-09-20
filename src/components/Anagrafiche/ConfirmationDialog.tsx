import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress } from '@mui/material';

interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isSaving?: boolean;
}

const ConfirmationDialog = ({ open, onClose, onConfirm, title, message, isSaving = false }: ConfirmationDialogProps) => {
    return (
        <Dialog
            open={open}
            onClose={!isSaving ? onClose : () => {}}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
        >
            <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description">
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Annulla</Button>
                <Button onClick={onConfirm} variant="contained" color="error" disabled={isSaving} startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}>
                    {isSaving ? 'Conferma...' : 'Conferma'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
