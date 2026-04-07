
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Container, Box, TextField, Button, Typography, Alert, Avatar, Link, Grid } from '@mui/material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('scuderiantonio@proton.me');
  const [password, setPassword] = useState('');
  const { login, error, setError, loading } = useAuth();
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Email e password sono obbligatori.");
      return;
    }
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error("Tentativo di login fallito:", err.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setResetError("Per favore, inserisci prima il tuo indirizzo email.");
      return;
    }
    setResetError(null);
    setResetSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error: any) {
      console.error("Errore invio email di reset:", error);
      setResetError("Impossibile inviare l'email di reset. Controlla l'indirizzo email e riprova.");
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <Avatar
            src='/logo png trasp.png'
            sx={{ width: 150, height: 150, m: 1, bgcolor: 'transparent' }}
            variant="square"
        />

        <Typography component="h1" variant="h4" sx={{ mt: 2, fontWeight: 'bold' }}>
            R.I.S.O. Master Office
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
            Report Individuali Sincronizzati Online
        </Typography>

        <Typography component="h2" variant="h6" sx={{ mt: 4 }}>
          Accedi
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Indirizzo Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
          {resetSent && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>Email di reset inviata! Controlla la tua casella di posta.</Alert>}
          {resetError && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{resetError}</Alert>}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Caricamento...' : 'Accedi'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link href="#" variant="body2" onClick={handlePasswordReset}>
                Password dimenticata?
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
