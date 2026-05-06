
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Autocomplete, CircularProgress, Box, Typography, Divider, FormControl, 
  RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Categoria } from '@/models/definitions';

// Definisco la struttura del documento come da specifiche R.I.S.O.
interface NotificaRichiesta {
  title: string;
  message: string;
  createdAt: any; // Verrà usato serverTimestamp()
  to_ids?: string[];
  target?: 'all';
  to_category_ids?: string[];
}

interface InviaNotificaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  tecnici: Tecnico[]; // Dati passati come props
  categorie: Categoria[]; // Dati passati come props
  loading: boolean; // Stato di caricamento globale
}

const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ 
    open, 
    onClose, 
    onSuccess, 
    onError, 
    tecnici, 
    categorie, 
    loading 
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState(''); // Rinominato da body a message per coerenza
  
  // Stato del form, invariato
  const [sendMode, setSendMode] = useState('tecnico'); // tecnico | categoria | tutti
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);

  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title || !message) {
        onError('Titolo e corpo del messaggio sono obbligatori.');
        return;
    }

    setSending(true);
    
    // Costruisco il documento secondo le specifiche R.I.S.O.
    const notifica: NotificaRichiesta = {
        title,
        message,
        createdAt: serverTimestamp(),
    };

    if (sendMode === 'tutti') {
        notifica.target = 'all';
    } else if (sendMode === 'tecnico') {
        if (!selectedTecnico) { onError('Seleziona un tecnico.'); setSending(false); return; }
        notifica.to_ids = [selectedTecnico.id];
    } else if (sendMode === 'categoria') {
        if (!selectedCategoria) { onError('Seleziona una categoria.'); setSending(false); return; }
        notifica.to_category_ids = [selectedCategoria.id];
    }

    try {
      // Scrivo nella collezione corretta: `notificheRichieste`
      await addDoc(collection(db, 'notificheRichieste'), notifica);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Errore nell'invio della notifica: ", error);
      onError('Si è verificato un errore durante l\'invio.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setMessage('');
    setSendMode('tecnico');
    setSelectedTecnico(null);
    setSelectedCategoria(null);
    onClose();
  }

  // L'estetica del componente rimane IDENTICA
  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Invia Nuova Notifica</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>1. Scegli Destinatario</Typography>

          <FormControl component="fieldset">
            <RadioGroup row value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
              <FormControlLabel value="tecnico" control={<Radio />} label="Tecnico" />
              <FormControlLabel value="categoria" control={<Radio />} label="Categoria" />
              <FormControlLabel value="tutti" control={<Radio />} label="Tutti" />
            </RadioGroup>
          </FormControl>

          {loading ? <CircularProgress /> : (
            <Box sx={{ minHeight: '60px' }}>
              {sendMode === 'tecnico' && (
                <Autocomplete
                  options={tecnici}
                  getOptionLabel={(option) => `${option.nome} ${option.cognome || ''}`.trim()}
                  value={selectedTecnico}
                  onChange={(_, newValue) => setSelectedTecnico(newValue)}
                  renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" />}
                />
              )}
              {sendMode === 'categoria' && (
                <Autocomplete
                  options={categorie}
                  getOptionLabel={(option) => option.nome}
                  value={selectedCategoria}
                  onChange={(_, newValue) => setSelectedCategoria(newValue)}
                  renderInput={(params) => <TextField {...params} label="Seleziona Categoria" />}
                />
              )}
            </Box>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>2. Scrivi il Messaggio</Typography>
          <TextField label="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
          <TextField label="Testo del Messaggio" value={message} onChange={(e) => setMessage(e.target.value)} fullWidth multiline rows={4} required />

        </Box>
      </DialogContent>
      <DialogActions sx={{p: '16px 24px'}}>
        <Button onClick={handleClose} disabled={sending}>Annulla</Button>
        <Button onClick={handleSend} variant="contained" disabled={sending}>
          {sending ? <CircularProgress size={24} color="inherit" /> : 'Invia'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviaNotificaDialog;
