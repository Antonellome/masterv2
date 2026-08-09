import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Container, CircularProgress, TextField } from '@mui/material';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useGlobalStore } from '@/stores/globalStore';

const NuovoRapportinoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showAlert } = useGlobalStore();
  const [loading, setLoading] = useState(false);
  const [rapportino, setRapportino] = useState<any>({ nome: '', descrizioneBreve: '' }); // Simplified model

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      // In a real scenario, you'd fetch the existing rapportino data
      // For now, we'll just simulate it.
      console.log(`Modalità modifica per rapportino ID: ${id}`);
      setRapportino({ nome: `Rapportino ${id}`, descrizioneBreve: 'Caricamento...' });
      setTimeout(() => setLoading(false), 1000);
    }
  }, [id, isEditing]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isEditing) {
        await rapportinoCloudService.update({ ...rapportino, id });
        showAlert('Rapportino aggiornato con successo!', 'success');
      } else {
        await rapportinoCloudService.create(rapportino);
        showAlert('Rapportino creato con successo!', 'success');
      }
      navigate('/rapportini');
    } catch (error) {
      console.error("Errore durante il salvataggio del rapportino:", error);
      showAlert('Errore nel salvataggio del rapportino.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditing ? 'Modifica Rapportino' : 'Nuovo Rapportino'}
        </Typography>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Nome / Titolo Rapportino"
            value={rapportino.nome}
            onChange={(e) => setRapportino({ ...rapportino, nome: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Descrizione Breve"
            value={rapportino.descrizioneBreve}
            onChange={(e) => setRapportino({ ...rapportino, descrizioneBreve: e.target.value })}
            margin="normal"
            multiline
            rows={4}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => navigate('/rapportini')} sx={{ mr: 1 }}>
              Annulla
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading}>
              {isEditing ? 'Salva Modifiche' : 'Crea Rapportino'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default NuovoRapportinoPage;
