
import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Box, Button, Typography, Paper, TextField, Grid } from '@mui/material';

interface SignaturePadProps {
  immagineFirma: string | null;
  setImmagineFirma: (image: string | null) => void;
  firmatarioNome: string | null;
  setFirmatarioNome: (name: string | null) => void;
  firmatarioSocieta: string | null;
  setFirmatarioSocieta: (company: string | null) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ 
    immagineFirma, setImmagineFirma,
    firmatarioNome, setFirmatarioNome,
    firmatarioSocieta, setFirmatarioSocieta
}) => {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    if (immagineFirma) {
      setIsSigned(true);
    }
  }, [immagineFirma]);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
    setImmagineFirma(null);
    setIsSigned(false);
  };

  const saveSignature = () => {
    if (sigCanvas.current) {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      setImmagineFirma(dataUrl);
      setIsSigned(true);
    }
  };

  return (
      <Paper variant="outlined" sx={{ p: 2 }}>
          <Grid container spacing={2}>
              <Grid
                  size={{
                      xs: 12,
                      md: 6
                  }}>
                  <TextField 
                      label="Nome Firmatario" 
                      value={firmatarioNome || ''} 
                      onChange={(e) => setFirmatarioNome(e.target.value)} 
                      fullWidth
                  />
              </Grid>
              <Grid
                  size={{
                      xs: 12,
                      md: 6
                  }}>
                  <TextField 
                      label="Società Firmatario" 
                      value={firmatarioSocieta || ''} 
                      onChange={(e) => setFirmatarioSocieta(e.target.value)} 
                      fullWidth
                  />
              </Grid>
          </Grid>
          <Typography variant="h6" sx={{ mt: 2 }}>Firma</Typography>
          <Box sx={{ border: '1px solid grey', mt: 1, position: 'relative' }}>
          {immagineFirma && isSigned ? (
              <img src={immagineFirma} alt="Firma" style={{ width: '100%', height: 'auto' }} />
          ) : (
              <SignatureCanvas 
                  ref={sigCanvas}
                  penColor='black'
                  canvasProps={{ 
                      style: { width: '100%', height: 200 }
                  }}
              />
          )}
          </Box>
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          {!isSigned ? (
              <Button onClick={saveSignature} variant="contained">Conferma Firma</Button>
          ) : (
              <Button onClick={clearSignature} variant="outlined" color="error">Cancella Firma</Button>
          )}
          </Box>
      </Paper>
  );
};

export default SignaturePad;
