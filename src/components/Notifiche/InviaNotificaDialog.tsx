
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Autocomplete, CircularProgress, Box, Typography, Divider, FormControl, 
  RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { collection, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Categoria } from '@/models/definitions';

interface InviaNotificaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

// Interfaccia allineata a NotificaRichiesta
interface NotificaDaInviare {
  title: string;
  body: string;
  createdAt: Timestamp;
  sendToAll?: boolean;
  to_ids?: string[];
  to_category_ids?: string[];
  to_names?: string[];
  to_category_names?: string[];
  mittente: string;
}

const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ open, onClose, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  // Dati caricati da Firestore
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);

  // Stato del form
  const [sendMode, setSendMode] = useState('tecnico'); // tecnico | categoria | tutti
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);

  // Stato UI
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const currentUser = { displayName: "Admin" };

  useEffect(() => {
    if (open) {
      setLoading(true);
      const fetchTecniciAndCategorie = async () => {
        try {
          const [tecniciSnapshot, categorieSnapshot] = await Promise.all([
            getDocs(collection(db, 'tecnici')),
            getDocs(collection(db, 'categorie')),
          ]);
          setTecnici(tecniciSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tecnico)));
          setCategorie(categorieSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Categoria)));
        } catch (error) {
          console.error("Errore nel caricamento: ", error);
          onError("Impossibile caricare i dati necessari.");
        }
        setLoading(false);
      };
      fetchTecniciAndCategorie();
    }
  }, [open, onError]);

  const handleSend = async () => {
    if (!title || !body) {
        onError('Titolo e corpo del messaggio sono obbligatori.');
        return;
    }

    setSending(true);
    
    const notifica: NotificaDaInviare = {
        title,
        body,
        createdAt: Timestamp.now(),
        mittente: currentUser.displayName || 'Sistema',
    };

    if (sendMode === 'tutti') {
        notifica.sendToAll = true;
    } else if (sendMode === 'tecnico') {
        if (!selectedTecnico) { onError('Seleziona un tecnico.'); setSending(false); return; }
        notifica.to_ids = [selectedTecnico.id];
        notifica.to_names = [`${selectedTecnico.nome} ${selectedTecnico.cognome || ''}`.trim()];
    } else if (sendMode === 'categoria') {
        if (!selectedCategoria) { onError('Seleziona una categoria.'); setSending(false); return; }
        notifica.to_category_ids = [selectedCategoria.id];
        notifica.to_category_names = [selectedCategoria.nome];
    }

    try {
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
    // Reset completo dello stato del form
    setTitle('');
    setBody('');
    setSendMode('tecnico');
    setSelectedTecnico(null);
    setSelectedCategoria(null);
    onClose();
  }

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
          <TextField label="Testo del Messaggio" value={body} onChange={(e) => setBody(e.target.value)} fullWidth multiline rows={4} required />

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
