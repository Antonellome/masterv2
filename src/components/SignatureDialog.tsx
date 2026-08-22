
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface SignatureDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

const SignatureDialog: React.FC<SignatureDialogProps> = ({ open, onClose, onSave }) => {
  // Per ora, è un segnaposto. Simula il salvataggio di una firma fittizia.
  const handleSave = () => {
    onSave('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxwYXRoIGQ9Ik0gMCAwIEwgMTAwIDEwMCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Aggiungi Firma Cliente</DialogTitle>
      <DialogContent>
        <p>Qui verrà visualizzato il pad per la firma.</p>
        <p>(Componente segnaposto)</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} variant="contained">Salva Firma</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignatureDialog;
