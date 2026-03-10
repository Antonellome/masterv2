import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, app } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import {
    Box, Typography, Alert, CircularProgress, Switch, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Chip
} from '@mui/material';
import {
    DataGrid, GridColDef, GridActionsCellItem,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import VpnKey from '@mui/icons-material/VpnKey';
import Edit from '@mui/icons-material/Edit';
import NoAccounts from '@mui/icons-material/NoAccounts';

const functions = getFunctions(app, 'europe-west1');
const auth = getAuth(app);

function CustomToolbar() {
    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Box sx={{ flexGrow: 1 }} />
            <GridToolbarQuickFilter sx={{ minWidth: 240, mr: 1 }} placeholder="Cerca..." variant="outlined" size="small" />
        </GridToolbarContainer>
    );
}

interface Tecnico {
    id: string;
    cognome: string;
    nome: string;
    email?: string;
    attivo: boolean;
    accessoApp?: boolean;
    uid?: string;
}

interface SincronizzatiAppProps {
    onDataChange: () => void;
}

const SincronizzatiApp: React.FC<SincronizzatiAppProps> = ({ onDataChange }) => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
    const [currentEmail, setCurrentEmail] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchTecniciAttivi = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "tecnici"), where("attivo", "==", true));
            const querySnapshot = await getDocs(q);
            setTecnici(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tecnico)));
        } catch {
            setError("Impossibile caricare l'elenco dei tecnici.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTecniciAttivi(); }, [fetchTecniciAttivi]);

    const handleProvisionAndShare = async (tecnico: Tecnico) => {
        if (!tecnico.email) {
            setFeedback({ type: 'warning', message: 'Aggiungi un\'email prima di poter inviare un link di accesso.' });
            return;
        }

        setActionLoading(prev => ({ ...prev, [tecnico.id]: true }));
        setFeedback(null);

        try {
            const provisionTecnico = httpsCallable(functions, 'provisionTecnico');
            await provisionTecnico({ 
                email: tecnico.email, 
                profileData: { nome: tecnico.nome, cognome: tecnico.cognome },
                tecnicoId: tecnico.id
            });
            
            await sendPasswordResetEmail(auth, tecnico.email);
            setFeedback({ type: 'success', message: `Provisioning completato. Email di accesso inviata a ${tecnico.email}.` });

            if (!tecnico.accessoApp) {
                 setTecnici(prev => prev.map(t => t.id === tecnico.id ? { ...t, accessoApp: true } : t));
            }

        } catch (error: unknown) {
            console.error("Errore dettagliato dalla chiamata alla funzione o dall'invio email:", error);
            const message = error instanceof Error ? error.message : 'Si è verificato un errore sconosciuto.';
            setFeedback({ type: 'error', message: `Errore: ${message}` });
        } finally {
            setActionLoading(prev => ({ ...prev, [tecnico.id]: false }));
            onDataChange();
        }
    };
    
    const handleToggleAccessoApp = async (id: string, currentValue: boolean) => {
        const tecnico = tecnici.find(t => t.id === id);
        if (!tecnico) return;

        if (!currentValue) {
            if (!tecnico.email) {
                setFeedback({ type: 'warning', message: "Aggiungi un'email per abilitare l'accesso" });
                return;
            }
            await handleProvisionAndShare(tecnico);
        } else {
            setActionLoading(prev => ({ ...prev, [id]: true }));
            try {
                await updateDoc(doc(db, 'tecnici', id), { accessoApp: false, uid: null });
                setTecnici(prev => prev.map(t => t.id === id ? { ...t, accessoApp: false, uid: undefined } : t));
                setFeedback({ type: 'success', message: 'Accesso App disabilitato.' });
            } catch (error: unknown) {
                 const message = error instanceof Error ? error.message : 'Errore durante la disabilitazione.';
                 setFeedback({ type: 'error', message });
            } finally {
                 setActionLoading(prev => ({ ...prev, [id]: false }));
                 onDataChange();
            }
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

        setActionLoading(prev => ({ ...prev, [selectedTecnico.id]: true }));
        try {
            const tecnicoRef = doc(db, 'tecnici', selectedTecnico.id);
            await updateDoc(tecnicoRef, { email: currentEmail });
            setTecnici(prev => prev.map(t => t.id === selectedTecnico.id ? { ...t, email: currentEmail } : t));
            setFeedback({ type: 'success', message: 'Email aggiornata con successo.' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Errore durante l\'aggiornamento.';
            setFeedback({ type: 'error', message });
        } finally {
            setActionLoading(prev => ({ ...prev, [selectedTecnico.id]: false }));
            handleCloseEmailDialog();
            onDataChange();
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'accessoApp',
            headerName: 'Accesso App',
            width: 120, align: 'center', headerAlign: 'center',
            renderCell: (params) => (
                 <Tooltip title={!params.row.email ? "Aggiungi un'email per abilitare l'accesso" : (params.value ? 'Accesso attivo, clicca per disabilitare' : 'Accesso disattivato, clicca per abilitare e inviare il link')}>
                    <span>
                        <Switch 
                            checked={!!params.value} 
                            onChange={() => handleToggleAccessoApp(params.row.id, params.row.accessoApp)} 
                            disabled={!params.row.email || actionLoading[params.row.id]}
                        />
                    </span>
                </Tooltip>
            )
        },
        { field: 'cognome', headerName: 'Cognome', flex: 1 },
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'email',
            headerName: 'Email',
            flex: 1.5,
            renderCell: (params) => params.value ? <Typography variant="body2">{params.value}</Typography> : <Chip icon={<NoAccounts />} label="Email mancante" size="small" variant="outlined" color="warning" onClick={() => handleOpenEmailDialog(params.row)} />
        },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 100,
            getActions: ({ row }) => [
                <GridActionsCellItem key={`edit-${row.id}`} icon={<Tooltip title="Modifica Email"><Edit /></Tooltip>} label="Modifica Email" onClick={() => handleOpenEmailDialog(row)} />,
                <GridActionsCellItem
                    key={`share-${row.id}`}
                    icon={actionLoading[row.id] ? <CircularProgress size={20} /> : <Tooltip title="Invia / Condividi Link di Accesso"><VpnKey /></Tooltip>}
                    label="Condividi Link"
                    onClick={() => handleProvisionAndShare(row)}
                    disabled={!row.email || actionLoading[row.id]}
                />,
            ],
        },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary', px: 2, pt: 2 }}>
                 In questa sezione puoi gestire quali tecnici (con contratto attivo) possono accedere all&apos;applicazione mobile. L&apos;accesso è consentito solo ai tecnici con un&apos;email associata.
            </Typography>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ m: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            {loading ? <CircularProgress sx={{ mx: 'auto', mt: 4 }} /> : 
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                     <DataGrid rows={tecnici || []} columns={columns} localeText={itIT.components.MuiDataGrid.defaultProps.localeText} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } }, sorting: { sortModel: [{ field: 'cognome', sort: 'asc' }] } }} pageSizeOptions={[10, 25, 50]} slots={{ toolbar: CustomToolbar }} disableRowSelectionOnClick />
                </Box>
            }

            <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog}>
                <DialogTitle>Modifica Email per {selectedTecnico?.nome} {selectedTecnico?.cognome}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
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
