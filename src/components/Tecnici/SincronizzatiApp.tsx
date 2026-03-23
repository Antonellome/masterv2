import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, app } from '@/firebase';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import {
    Box, Typography, Alert, CircularProgress, Switch, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Chip
} from '@mui/material';
import {
    DataGrid, GridColDef, GridActionsCellItem,
    GridToolbarContainer, GridToolbarColumnsButton, GridToolbarFilterButton, GridToolbarDensitySelector, GridToolbarExport, GridToolbarQuickFilter
} from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import Edit from '@mui/icons-material/Edit';
import NoAccounts from '@mui/icons-material/NoAccounts';

const functions = getFunctions(app, 'europe-west1');
const manageUsers = httpsCallable(functions, 'manageUsers');

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

interface MergedTecnico {
    id: string;
    cognome: string;
    nome: string;
    email?: string;
    attivo: boolean;
    uid?: string;
    role?: 'admin' | 'tecnico' | 'Nessuno';
}

interface SincronizzatiAppProps {
    onDataChange: () => void;
}

const SincronizzatiApp: React.FC<SincronizzatiAppProps> = ({ onDataChange }) => {
    const [tecnici, setTecnici] = useState<MergedTecnico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedTecnico, setSelectedTecnico] = useState<MergedTecnico | null>(null);
    const [currentEmail, setCurrentEmail] = useState('');
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const authUsersResult: HttpsCallableResult<{users: any[]}> = await manageUsers({ action: 'list', payload: {} });
            const authUsersMap = new Map(authUsersResult.data.users.map(u => [u.email?.toLowerCase(), { uid: u.uid, role: u.role || 'Nessuno' }]));

            const q = query(collection(db, "tecnici"), where("attivo", "==", true));
            const anagraficaSnapshot = await getDocs(q);
            const anagraficaTecnici = anagraficaSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MergedTecnico));

            const mergedList = anagraficaTecnici.map(tecnico => {
                const authInfo = authUsersMap.get(tecnico.email?.toLowerCase() || '');
                return { ...tecnico, uid: authInfo?.uid, role: authInfo?.role };
            });

            setTecnici(mergedList);
        } catch (err: any) {
            console.error("ERRORE DETTAGLIATO FETCH DATI:", err);
            const code = err.code || 'sconosciuto';
            const message = err.message || 'Errore sconosciuto.';
            setError(`Errore nel caricamento dei dati. Dettaglio: ${message} [Codice: ${code}]`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleChange = async (uid: string, newRole: 'tecnico' | 'Nessuno') => {
        setActionLoading(prev => ({ ...prev, [uid]: true }));
        setFeedback(null);
        try {
            await manageUsers({ action: 'setRole', payload: { uid, newRole } });
            setFeedback({ type: 'success', message: `Accesso per il tecnico ${newRole === 'tecnico' ? 'ABILITATO' : 'DISABILITATO'}.` });
            await fetchData();
        } catch (error: any) {
            console.error("Errore durante il cambio ruolo:", error);
            const message = error.message || 'Errore sconosciuto.';
            setFeedback({ type: 'error', message: `Errore: ${message}` });
        } finally {
            setActionLoading(prev => ({ ...prev, [uid]: false }));
        }
    };
    
    const handleOpenEmailDialog = (tecnico: MergedTecnico) => {
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
            await updateDoc(doc(db, 'tecnici', selectedTecnico.id), { email: currentEmail });
            setFeedback({ type: 'success', message: 'Email anagrafica aggiornata. Ricarico dati...' });
            await fetchData();
        } catch (error: any) {
            console.error("Errore durante il salvataggio email:", error);
            const message = error.message || "Errore durante l'aggiornamento.";
            setFeedback({ type: 'error', message });
        } finally {
            setActionLoading(prev => ({ ...prev, [selectedTecnico.id]: false }));
            handleCloseEmailDialog();
            onDataChange();
        }
    };

    const columns: GridColDef<MergedTecnico>[] = [
        {
            field: 'role', headerName: 'Accesso App', width: 120, align: 'center', headerAlign: 'center',
            renderCell: (params) => {
                const isLoading = actionLoading[params.row.uid || params.row.id];
                const hasAccount = !!params.row.uid;
                const canEnable = hasAccount && !isLoading;

                return (
                    <Tooltip title={!hasAccount ? "Nessun account utente per questa email." : (params.row.role === 'tecnico' ? 'Accesso attivo, clicca per disabilitare' : 'Accesso disattivato, clicca per abilitare')}>
                        <span>
                            <Switch checked={params.row.role === 'tecnico'} onChange={() => handleRoleChange(params.row.uid!, params.row.role === 'tecnico' ? 'Nessuno' : 'tecnico')} disabled={!canEnable} />
                        </span>
                    </Tooltip>
                );
            }
        },
        { field: 'cognome', headerName: 'Cognome', flex: 1 },
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'email', headerName: 'Email', flex: 1.5,
            renderCell: (params) => params.row.uid ? <Typography variant="body2">{params.value}</Typography> : <Chip icon={<NoAccounts />} label="Account non trovato" size="small" variant="outlined" color="warning" onClick={() => handleOpenEmailDialog(params.row)} />
        },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 100,
            getActions: ({ row }) => [<GridActionsCellItem key={`edit-${row.id}`} icon={<Tooltip title="Modifica Email Anagrafica"><Edit /></Tooltip>} label="Modifica Email" onClick={() => handleOpenEmailDialog(row)} />],
        },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary', px: 2, pt: 2 }}>
                 Da qui puoi abilitare o disabilitare l'accesso all'app per i tecnici con contratto attivo. L'utente deve esistere nel sistema di autenticazione.
            </Typography>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {feedback && <Alert severity={feedback.type} sx={{ m: 2 }} onClose={() => setFeedback(null)}>{feedback.message}</Alert>}
            
            {loading ? <CircularProgress sx={{ mx: 'auto', mt: 4 }} /> : 
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                     <DataGrid rows={tecnici} columns={columns} localeText={itIT.components.MuiDataGrid.defaultProps.localeText} initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } }, sorting: { sortModel: [{ field: 'cognome', sort: 'asc' }] } }} pageSizeOptions={[10, 25, 50]} slots={{ toolbar: CustomToolbar }} disableRowSelectionOnClick />
                </Box>
            }

            <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog}>
                <DialogTitle>Modifica Email per {selectedTecnico?.nome} {selectedTecnico?.cognome}</DialogTitle>
                <DialogContent><TextField autoFocus margin="dense" label="Indirizzo Email" type="email" fullWidth variant="standard" value={currentEmail} onChange={(e) => setCurrentEmail(e.target.value)}/></DialogContent>
                <DialogActions><Button onClick={handleCloseEmailDialog}>Annulla</Button><Button onClick={handleSaveEmail}>Salva</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default SincronizzatiApp;
