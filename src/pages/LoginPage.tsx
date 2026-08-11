
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Rimuoviamo il vecchio hook e importiamo quello nuovo e il servizio api
import { useGlobalStore } from '@/stores/globalStore';
import { api } from '@/services/api';
import { Container, Box, TextField, Button, Typography, Alert, Avatar, Link, Grid } from '@mui/material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/firebase';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 2. Usiamo uno stato locale per l'UI della pagina di login
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // 3. Prendiamo la funzione per mostrare notifiche globali, se necessario
  const showNotification = useGlobalStore((state) => state.showNotification);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Email e password sono obbligatori.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 4. Usiamo il nostro nuovo servizio API per il login
      await api.auth.login(email, password);
      // Il redirect è gestito globalmente da App.tsx, quindi non serve più navigate('/')
      showNotification('Accesso effettuato con successo!', 'success');
    } catch (err: any) {
      console.error("Tentativo di login fallito:", err.message);
      setError(err.message || "Si è verificato un errore durante il login.");
      showNotification('Credenziali non valide o utente non trovato.', 'error');
    } finally {
      setLoading(false);
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
      showNotification('Email di reset inviata! Controlla la tua posta.', 'success');
    } catch (error: any) {
      console.error("Errore invio email di reset:", error);
      setResetError("Impossibile inviare l'email di reset. Controlla l'indirizzo email e riprova.");
      showNotification('Impossibile inviare l\'email di reset.', 'error');
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
            disabled={loading}
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
            disabled={loading}
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
