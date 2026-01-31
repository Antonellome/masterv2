import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Grid
} from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');

  // Dobbiamo importare la nuova funzione `signup`
  const { user, signup, error, loading } = useAuth(); 
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/'); // Se l'utente è già loggato o si registra con successo, vai alla dashboard
    }
  }, [user, navigate]);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPassError('Le password non coincidono');
      return;
    }
    setPassError('');
    if (email && password) {
      signup(email, password);
    }
  };

  return (
    <Container component='main' maxWidth='xs'>
      <Paper elevation={6} sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4, borderRadius: '16px' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockPersonIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Registra Nuovo Utente
        </Typography>
        
        {/* Mostra errore di registrazione da Firebase o di password non coincidenti */}
        {(error || passError) && <Alert severity='error' sx={{ width: '100%', mt: 2 }}>{error || passError}</Alert>}
        
        <Box component='form' onSubmit={handleSignup} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin='normal'
            required
            fullWidth
            id='email'
            label='Indirizzo Email'
            name='email'
            autoComplete='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password'
            type='password'
            id='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='confirmPassword'
            label='Conferma Password'
            type='password'
            id='confirmPassword'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '8px' }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Registrati'}
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                        Hai già un account? Accedi
                    </Typography>
                </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignupPage;
