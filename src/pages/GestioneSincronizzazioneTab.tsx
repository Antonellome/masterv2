import { useState, useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { 
    Box, 
    Typography, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    TextField, 
    InputAdornment,
    Switch,
    FormControlLabel,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDebounce } from '@/hooks/useDebounce';
import type { Tecnico } from '@/models/definitions';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, getFirestore } from 'firebase/firestore';
import { useAlert } from '@/hooks/useAlert';

const GestioneSincronizzazioneTab = () => {
    const { tecnici, refreshData } = useData();
    const { showAlert } = useAlert();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const auth = getAuth();
    const db = getFirestore();

    // State per il dialog di conferma
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [newStatus, setNewStatus] = useState(false);

    const handleSwitchChange = (tecnico: Tecnico, status: boolean) => {
        setSelectedTecnico(tecnico);
        setNewStatus(status);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedTecnico(null);
    };

    const handleConfirmAction = async () => {
        if (!selectedTecnico) return;

        const action = newStatus ? 'attivare' : 'disattivare';

        try {
            if (newStatus) {
                // Attivazione
                await sendPasswordResetEmail(auth, selectedTecnico.email!);
                await updateDoc(doc(db, 'tecnici', selectedTecnico.id), { accessoApp: true });
                showAlert(`Email di attivazione inviata a ${selectedTecnico.email}. L'utente potrà impostare la sua password.`, 'success');
            } else {
                // Disattivazione
                await updateDoc(doc(db, 'tecnici', selectedTecnico.id), { accessoApp: false });
                showAlert('Accesso disattivato con successo.', 'success');
            }
            if (refreshData) refreshData(['tecnici']);
        } catch (error: unknown) {
            console.error(`Errore durante l'${action} dell'accesso:`, error);
            const message = error instanceof Error ? error.message : 'Errore sconosciuto';
            showAlert(`Errore durante l'operazione: ${message}`, 'error');
        } finally {
            handleCloseDialog();
        }
    };

    const filteredTecnici = useMemo(() => {
        return (tecnici || []).filter(t => 
            `${t.cognome} ${t.nome}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [tecnici, debouncedSearchTerm]);

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                Gestione Accesso Tecnici
            </Typography>
            
            <Box sx={{ mb: 3, maxWidth: '400px' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Cerca per nome o cognome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <TableContainer component={Paper} sx={{ flexGrow: 1 }}>
                <Table stickyHeader aria-label="tabella sincronizzazione tecnici">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cognome</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Accesso App Mobile</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTecnici.map((tecnico) => (
                            <TableRow key={tecnico.id} hover>
                                <TableCell>{tecnico.cognome}</TableCell>
                                <TableCell>{tecnico.nome}</TableCell>
                                <TableCell>{tecnico.email}</TableCell>
                                <TableCell align="center">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={!!tecnico.accessoApp}
                                                onChange={(e) => handleSwitchChange(tecnico, e.target.checked)}
                                                color="primary"
                                            />
                                        }
                                        label={tecnico.accessoApp ? "Accesso Attivato" : "Accesso Disattivato"}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog di Conferma */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
            >
                <DialogTitle>Conferma Azione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`Sei sicuro di voler ${newStatus ? 'attivare' : 'disattivare'} l'accesso per ${selectedTecnico?.nome} ${selectedTecnico?.cognome}?`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Annulla</Button>
                    <Button onClick={handleConfirmAction}>
                        Conferma
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestioneSincronizzazioneTab;
