import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import {
    Box, 
    TextField, 
    Button, 
    Typography, 
    Container, 
    Grid, 
    CircularProgress 
} from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, user, error, setError, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  useEffect(() => {
      if (error && (email || password)) {
          setError('');
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box 
            component="img"
            sx={{ 
                height: 100, 
                mb: 2 
            }}
            alt="Logo"
            src="/logo png trasp.png"
        />
        <Typography component="h1" variant="h4" align="center" sx={{ fontWeight: 'bold' }}>
          R.I.S.O.
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary">
            Master Office
        </Typography>
        <Typography variant="subtitle2" align="center" color="text.secondary" gutterBottom>
            Report Individuali Sincronizzati Online
        </Typography>

        <Box component="form" onSubmit={handleLogin} sx={{ mt: 3, width: '100%' }}>
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
          {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                  {error}
              </Typography>
          )}
          <Box sx={{ position: 'relative', mt: 2, mb: 2 }}>
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
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
                <Typography variant="body2" color="text.secondary">
                    Non hai un account? Contatta l'amministratore.
                </Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
