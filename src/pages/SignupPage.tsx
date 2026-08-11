
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalStore } from '@/stores/globalStore';
import { api } from '@/services/api';
import { Container, Box, Typography, TextField, Button, Grid, Alert } from '@mui/material';

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const showNotification = useGlobalStore((state) => state.showNotification);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nome || !cognome) {
      setError('Tutti i campi sono obbligatori.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.auth.signup(email, password, nome, cognome);
      showNotification('Registrazione avvenuta con successo! Benvenuto.', 'success');
      // Il redirect alla dashboard verrà gestito globalmente
    } catch (err: any) {
      console.error('Errore durante la registrazione:', err);
      setError(err.message || 'Si è verificato un errore durante la registrazione.');
      showNotification('Errore durante la registrazione.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Registra Nuovo Utente
        </Typography>
        <Box component="form" noValidate onSubmit={handleSignup} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="firstName"
                required
                fullWidth
                id="firstName"
                label="Nome"
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                id="lastName"
                label="Cognome"
                name="lastName"
                autoComplete="family-name"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="email"
                label="Indirizzo Email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </Grid>
          </Grid>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Registrazione...' : 'Registrati'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link to="/login">
                <Typography variant="body2">
                  Hai già un account? Accedi
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default SignupPage;
