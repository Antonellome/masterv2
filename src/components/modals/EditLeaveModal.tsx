
import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Grid } from '@mui/material';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#1e1e1e',
  border: '2px solid #007FFF',
  boxShadow: 24,
  p: 4,
  color: 'white',
};

interface EditLeaveModalProps {
  open: boolean;
  onClose: () => void;
  initialBalances: {
    permessiResiduo: number;
    ferieResiduo: number;
    rolResiduo: number;
    malattiaResiduo: number; // <-- AGGIUNTO
  };
  onSave: (newBalances: any) => void;
}

const EditLeaveModal: React.FC<EditLeaveModalProps> = ({ open, onClose, initialBalances, onSave }) => {
  const [balances, setBalances] = useState(initialBalances);

  useEffect(() => {
    setBalances(initialBalances);
  }, [initialBalances, open]);

  const handleChange = (field: keyof typeof balances, value: string) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue)) {
      setBalances(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  const handleSave = () => {
    onSave(balances);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" component="h2" sx={{ color: 'white', mb: 2 }}>
          Modifica Saldi Assenze
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Residuo Permessi"
              type="number"
              value={balances.permessiResiduo}
              onChange={(e) => handleChange('permessiResiduo', e.target.value)}
              variant="outlined"
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#007FFF' } } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Residuo Ferie"
              type="number"
              value={balances.ferieResiduo}
              onChange={(e) => handleChange('ferieResiduo', e.target.value)}
              variant="outlined"
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#007FFF' } } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Residuo ROL"
              type="number"
              value={balances.rolResiduo}
              onChange={(e) => handleChange('rolResiduo', e.target.value)}
              variant="outlined"
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#007FFF' } } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Residuo Malattia"
              type="number"
              value={balances.malattiaResiduo}
              onChange={(e) => handleChange('malattiaResiduo', e.target.value)}
              variant="outlined"
              InputLabelProps={{ style: { color: 'white' } }}
              sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#007FFF' } } }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} sx={{ color: 'white', borderColor: 'white', mr: 1 }} variant="outlined">
                Annulla
            </Button>
            <Button variant="contained" onClick={handleSave} sx={{ backgroundColor: '#007FFF' }}>
                Salva
            </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditLeaveModal;
