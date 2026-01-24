import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from "react-icons/fc";
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // CORREZIONE: Usiamo `user` come definito nel nostro AuthProvider
  const { user, login, loginWithGoogle, error, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Se l'utente è loggato, reindirizza alla dashboard
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      login(email, password);
    }
  };

  const handleGoogleSignIn = () => {
    loginWithGoogle();
  };

  return (
    <Container component='main' maxWidth='xs'>
      <Paper elevation={6} sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4, borderRadius: '16px' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h5'>
          Accesso R.I.S.O.
        </Typography>
        
        {/* Mostra l'errore di login se presente */}
        {error && <Alert severity='error' sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
        
        <Box component='form' onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
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
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: '8px' }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Accedi'}
          </Button>
          <Button
            fullWidth
            variant='outlined'
            sx={{ mt: 1, mb: 2, py: 1.5, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle size={24} />
            Accedi con Google
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid>
                <Link to="/signup" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                        Non hai un account? Registrati
                    </Typography>
                </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
