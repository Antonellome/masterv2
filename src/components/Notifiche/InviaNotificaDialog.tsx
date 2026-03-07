import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Autocomplete, Chip, CircularProgress, Box, Typography, 
  FormControlLabel, Checkbox, Divider
} from '@mui/material';
import { collection, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Categoria } from '@/types/definitions';

interface InviaNotificaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ open, onClose, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<Categoria[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchTecniciAndCategorie = async () => {
        setLoading(true);
        try {
          const [tecniciSnapshot, categorieSnapshot] = await Promise.all([
            getDocs(collection(db, 'tecnici')),
            getDocs(collection(db, 'categorie')),
          ]);
          const tecniciList = tecniciSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tecnico));
          const categorieList = categorieSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Categoria));
          setTecnici(tecniciList);
          setCategorie(categorieList);
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
    if (!sendToAll && !selectedTecnici.length && !selectedCategorie.length) {
        onError('Seleziona almeno un destinatario, una categoria, o spunta "Invia a tutti".');
        return;
    }
    if (!title || !body) {
        onError('Titolo e corpo del messaggio sono obbligatori.');
        return;
    }

    setSending(true);
    
    const notificaRichiesta = {
        title,
        body,
        createdAt: Timestamp.now(),
        sendToAll: sendToAll,
        to_ids: sendToAll ? [] : selectedTecnici.map(t => t.id),
        to_names: sendToAll ? [] : selectedTecnici.map(t => `${t.nome} ${t.cognome}`),
        to_categories: sendToAll ? [] : selectedCategorie.map(c => c.id),
        to_category_names: sendToAll ? [] : selectedCategorie.map(c => c.nome),
        status: 'pending',
    };

    try {
      await addDoc(collection(db, 'notificheRichieste'), notificaRichiesta);
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
    setBody('');
    setSelectedTecnici([]);
    setSelectedCategorie([]);
    setSendToAll(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Invia Nuova Notifica</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>1. Scegli i Destinatari</Typography>
          
          <FormControlLabel
            control={<Checkbox checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} />}
            label="Invia a tutti i tecnici"
          />

          {loading ? <CircularProgress /> : (
            <>
              <Autocomplete
                multiple
                disabled={sendToAll}
                options={tecnici}
                getOptionLabel={(option) => `${option.nome} ${option.cognome || ''}`}
                value={selectedTecnici}
                onChange={(_, newValue) => setSelectedTecnici(newValue)}
                renderInput={(params) => <TextField {...params} label="Seleziona Tecnici" />}
              />
              <Typography color="text.secondary" textAlign="center" sx={{m: 0, p: 0, fontStyle: 'italic' }}>o</Typography>
              <Autocomplete
                multiple
                disabled={sendToAll}
                options={categorie}
                getOptionLabel={(option) => option.nome}
                value={selectedCategorie}
                onChange={(_, newValue) => setSelectedCategorie(newValue)}
                renderInput={(params) => <TextField {...params} label="Seleziona Categorie" />}
              />
            </>
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
