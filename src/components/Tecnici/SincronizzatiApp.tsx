import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Box, Typography, Alert, CircularProgress, Switch, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Chip
} from '@mui/material';
import {
    DataGrid, GridColDef, GridActionsCellItem,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { VpnKey, Edit, NoAccounts } from '@mui/icons-material';

function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Box sx={{ flexGrow: 1 }} />
            <GridToolbarQuickFilter
                sx={{ minWidth: 240, mr: 1 }}
                placeholder="Cerca..."
                variant="outlined"
                size="small"
            />
        </GridToolbarContainer>
    );
}

interface Tecnico {
    id: string;
    cognome: string;
    nome: string;
    email?: string;
    attivo: boolean;
    accessoApp?: boolean; // Corretto da sincronizzazioneAttiva
}

interface SincronizzatiAppProps {
    onDataChange: () => void;
}

const SincronizzatiApp: React.FC<SincronizzatiAppProps> = ({ onDataChange }) => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [currentEmail, setCurrentEmail] = useState('');

    const fetchTecniciAttivi = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collection(db, "tecnici"), where("attivo", "==", true));
            const querySnapshot = await getDocs(q);
            const tecniciData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Tecnico));
            setTecnici(tecniciData);
        } catch (err) {
            console.error("Errore nel caricamento dei tecnici attivi:", err);
            setError("Impossibile caricare l'elenco dei tecnici.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTecniciAttivi();
    }, [fetchTecniciAttivi]);

    const handleToggleAccessoApp = async (id: string, currentValue: boolean) => {
        const tecnicoRef = doc(db, 'tecnici', id);
        try {
            await updateDoc(tecnicoRef, { accessoApp: !currentValue }); // Corretto
            setTecnici(prev => prev.map(t => t.id === id ? { ...t, accessoApp: !currentValue } : t)); // Corretto
            setFeedback({ type: 'success', message: `Accesso App ${!currentValue ? 'abilitato' : 'disabilitato'}.` });
            onDataChange();
        } catch {
            setFeedback({ type: 'error', message: "Errore durante l'aggiornamento." });
        }
    };

    const handleOpenEmailDialog = (tecnico: Tecnico) => {
        setSelectedTecnico(tecnico);
        setCurrentEmail(tecnico.email || '');
        setEmailDialogOpen(true);
    };

    const handleCloseEmailDialog = () => {
        setEmailDialogOpen(false);
        setSelectedTecnico(null);
        setCurrentEmail('');
    };

    const handleSaveEmail = async () => {
        if (!selectedTecnico) return;
        const tecnicoRef = doc(db, 'tecnici', selectedTecnico.id);
        try {
            // Quando si salva un'email, ha senso inizializzare accessoApp a false se non è già definito
            await updateDoc(tecnicoRef, { email: currentEmail, accessoApp: selectedTecnico.accessoApp || false }); 
            setFeedback({ type: 'success', message: 'Email aggiornata con successo.' });
            fetchTecniciAttivi();
            onDataChange();
        } catch {
            setFeedback({ type: 'error', message: 'Errore durante il salvataggio dell\'email.' });
        } finally {
            handleCloseEmailDialog();
        }
    };

    const handlePasswordReset = (email?: string) => {
        if (!email) {
            setFeedback({ type: 'warning', message: 'Nessuna email associata per inviare il reset.' });
            return;
        }
        // Qui andrebbe la logica per Firebase Auth per inviare la mail di reset
        console.log(`Reset password per: ${email}`);
        setFeedback({ type: 'success', message: `Richiesta di reset password inviata a ${email}.` });
    };

    const columns: GridColDef[] = [
        {
            field: 'accessoApp', // Corretto
            headerName: 'Accesso App',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const hasEmail = !!params.row.email;
                const tooltipText = !hasEmail ? "Aggiungi un'email per abilitare l'accesso" : (params.value ? 'Accesso attivo' : 'Accesso disattivato');
                return (
                    <Tooltip title={tooltipText}>
                        <span>
                            <Switch
                                checked={Boolean(params.value)}
                                onChange={() => handleToggleAccessoApp(params.row.id, params.row.accessoApp)} // Corretto
                                disabled={!hasEmail}
                            />
                        </span>
                    </Tooltip>
                );
            }
        },
        { field: 'cognome', headerName: 'Cognome', flex: 1 },
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'email',
            headerName: 'Email',
            flex: 1.5,
            renderCell: (params) => (
                params.value ? 
                <Typography variant="body2">{params.value}</Typography> : 
                <Chip icon={<NoAccounts />} label="Email mancante" size="small" variant="outlined" color="warning" onClick={() => handleOpenEmailDialog(params.row)} />
            )
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ row }) => [
                <GridActionsCellItem
                    key={`edit-${row.id}`}
                    icon={<Tooltip title="Modifica Email"><Edit /></Tooltip>}
                    label="Modifica Email"
                    onClick={() => handleOpenEmailDialog(row)}
                />,
                <GridActionsCellItem
                    key={`reset-${row.id}`}
                    icon={<Tooltip title="Invia/Reset Password"><VpnKey /></Tooltip>}
                    label="Reset Password"
                    onClick={() => handlePasswordReset(row.email)}
                    disabled={!row.email || !row.accessoApp} // Disabilitato se non ha accesso
                />,
            ],
        },
    ];

    return (
        <Box>
            <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                In questa sezione puoi gestire quali tecnici (con contratto attivo) possono accedere all&apos;applicazione mobile. L&apos;accesso è consentito solo ai tecnici con un&apos;email associata.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            {loading ? <CircularProgress /> : 
                <Box sx={{ height: 'auto', width: '100%' }}>
                    <DataGrid
                        rows={tecnici || []}
                        columns={columns}
                        autoHeight
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        initialState={{
                            pagination: { paginationModel: { page: 0, pageSize: 25 } },
                            sorting: { sortModel: [{ field: 'cognome', sort: 'asc' }] }
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        slots={{ toolbar: CustomToolbar }}
                        disableRowSelectionOnClick
                    />
                </Box>
            }

            <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog}>
                <DialogTitle>Modifica Email per {selectedTecnico?.nome} {selectedTecnico?.cognome}</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Indirizzo Email"
                        type="email"
                        fullWidth
                        variant="standard"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEmailDialog}>Annulla</Button>
                    <Button onClick={handleSaveEmail}>Salva</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SincronizzatiApp;
