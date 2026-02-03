// src/pages/LoginPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, TextField, Button, Typography, Container, Grid, CircularProgress } from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // L'errore e lo stato di caricamento vengono dal contesto, così come la funzione di login
  const { login, user, error, setError, loading } = useAuth();
  const navigate = useNavigate();

  // Questo Effect gestisce il reindirizzamento DOPO che il contesto è stato aggiornato
  useEffect(() => {
    // Se l'oggetto utente esiste, il login è confermato a livello di app
    if (user) {
      navigate('/'); // Ora possiamo navigare in sicurezza
    }
  }, [user, navigate]); // Si attiva solo quando `user` o `navigate` cambiano

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Chiama la funzione di login centralizzata del contesto
    await login(email, password);
  };

  // Pulisce il messaggio di errore quando l'utente inizia a digitare di nuovo
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [email, password]);

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Accedi</Typography>
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Indirizzo Email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
          <Box sx={{ position: 'relative' }}>
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              sx={{ mt: 3, mb: 2 }} 
              disabled={loading}
            >
              Accedi
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
          <Grid container justifyContent="flex-end">
            <Grid>
                <Typography variant="body2">Non hai un account? Contatta l'amministratore.</Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
