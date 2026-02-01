
import { useState } from 'react';
import { Button, TextField, Box, Typography, Container, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // --- CORREZIONE: Utilizza il nome corretto della funzione: `login` invece di `signIn` ---
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // --- CORREZIONE: Chiama la funzione corretta `login` ---
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            // Questo blocco ora catturerà errori reali dal contesto se l'accesso fallisce
            setError('Credenziali non valide. Riprova.');
            console.error(err);
        } finally {
            setLoading(false);
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
                }}
            >
                <Typography component="h1" variant="h3" sx={{ fontWeight: 'bold' }}>
                    R.I.S.O.
                </Typography>
                <Typography component="h2" variant="h5">
                    Master Office
                </Typography>
                <Typography variant="caption" sx={{ mb: 3 }}>
                    Report Individuali Sincronizzati Online
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
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
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Accedi'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default LoginPage;
