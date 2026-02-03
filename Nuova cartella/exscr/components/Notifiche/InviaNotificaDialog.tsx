import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Autocomplete, Chip, CircularProgress, Box, Typography
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

const InviaNotificaDialog: React.FC<InviaNotificaDialogProps> = ({ open, onClose, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [selectedTecnici, setSelectedTecnici] = useState<Tecnico[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<Categoria[]>([]);
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
    if ((!selectedTecnici.length && !selectedCategorie.length) || !title || !body) {
      onError('Compila titolo, corpo e seleziona almeno un destinatario o una categoria.');
      return;
    }

    setSending(true);
    
    const notificaRichiesta = {
        title,
        body,
        createdAt: Timestamp.now(),
        to_ids: selectedTecnici.map(t => t.id),
        to_names: selectedTecnici.map(t => `${t.nome} ${t.cognome}`),
        to_categories: selectedCategorie.map(c => c.nome),
        status: 'pending', // o 'sent' a seconda della logica del backend
    };

    try {
      await addDoc(collection(db, 'notificheRichieste'), notificaRichiesta);
      onSuccess();
      onClose();
      // Reset state
      setTitle('');
      setBody('');
      setSelectedTecnici([]);
      setSelectedCategorie([]);
    } catch (error) {
      console.error("Errore nell'invio della notifica: ", error);
      onError('Si è verificato un errore durante l\'invio.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Invia Nuova Notifica</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Destinatari</Typography>
          
          {loading ? <CircularProgress /> : (
            <>
              <Autocomplete
                multiple
                options={tecnici}
                getOptionLabel={(option) => `${option.nome} ${option.cognome || ''}`}
                value={selectedTecnici}
                onChange={(_, newValue) => setSelectedTecnici(newValue)}
                renderInput={(params) => <TextField {...params} label="Tecnici" />}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.id} label={`${option.nome} ${option.cognome || ''}`} {...getTagProps({ index })} />
                  ))
                }
              />
              <Typography color="text.secondary" textAlign="center">e/o</Typography>
              <Autocomplete
                multiple
                options={categorie}
                getOptionLabel={(option) => option.nome}
                value={selectedCategorie}
                onChange={(_, newValue) => setSelectedCategorie(newValue)}
                renderInput={(params) => <TextField {...params} label="Categorie" />}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option.id} label={option.nome} {...getTagProps({ index })} />
                  ))
                }
              />
            </>)}

          <TextField label="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
          <TextField label="Testo del Messaggio" value={body} onChange={(e) => setBody(e.target.value)} fullWidth multiline rows={4} required />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Annulla</Button>
        <Button onClick={handleSend} variant="contained" disabled={sending}>
          {sending ? <CircularProgress size={24} /> : 'Invia'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviaNotificaDialog;
