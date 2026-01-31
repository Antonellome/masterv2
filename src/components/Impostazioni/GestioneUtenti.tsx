import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Box, Typography, Alert, CircularProgress, Switch, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { VpnKey } from '@mui/icons-material';

// Definiamo l'interfaccia per l'utente, basandoci sui dati osservati
interface Utente {
    id: string; // L'ID del documento
    nome: string;
    email: string;
    disabled: boolean;
    ruolo?: string; // Campo opzionale
}

const GestioneUtenti: React.FC = () => {
    const [utenti, setUtenti] = useState<Utente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const fetchUtenti = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "utenti_master"));
            const utentiData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as Utente));
            setUtenti(utentiData);
        } catch (err) {
            console.error("Errore nel caricamento degli utenti:", err);
            setError("Impossibile caricare l'elenco degli utenti.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUtenti();
    }, [fetchUtenti]);

    const handleToggleDisabled = async (id: string, isDisabled: boolean) => {
        const userRef = doc(db, 'utenti_master', id);
        try {
            await updateDoc(userRef, { disabled: !isDisabled });
            setUtenti(prev => prev.map(u => u.id === id ? { ...u, disabled: !isDisabled } : u));
            setFeedback({ type: 'success', message: `Utente ${!isDisabled ? 'disabilitato' : 'abilitato'} con successo.` });
        } catch (error) {
            console.error("Errore durante l'aggiornamento dell'utente:", error);
            setFeedback({ type: 'error', message: "Errore durante l'aggiornamento dell'utente." });
        }
    };

    const handlePasswordReset = async (email: string) => {
        // La logica effettiva per l'invio della mail di reset password andrebbe qui.
        // Potrebbe essere una funzione Firebase Auth o un endpoint custom.
        console.log(`Invio reset password a: ${email}`);
        setFeedback({ type: 'success', message: `Richiesta di reset password inviata a ${email}.` });
        // Simulazione di un'operazione asincrona
        await new Promise(resolve => setTimeout(resolve, 1000));
    };

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'email', headerName: 'Email', flex: 1.5 },
        {
            field: 'stato',
            headerName: 'Stato',
            width: 120,
            renderCell: (params) => (
                <Typography color={!params.row.disabled ? 'success.main' : 'error.main'}>
                    {!params.row.disabled ? 'Attivo' : 'Disabilitato'}
                </Typography>
            ),
        },
        { field: 'ruolo', headerName: 'Ruolo', flex: 1, description: 'Ruolo dell\'utente (es. Admin, User)' },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 150,
            cellClassName: 'actions',
            getActions: ({ id, row }) => {
                return [
                    <GridActionsCellItem
                        key={`toggle-${id}`}
                        icon={
                            <Tooltip title={!row.disabled ? 'Disabilita Utente' : 'Abilita Utente'}>
                                <Switch
                                    checked={!row.disabled}
                                    onChange={() => handleToggleDisabled(id as string, row.disabled)}
                                    color="primary"
                                />
                             </Tooltip>
                        }
                        label={!row.disabled ? 'Disabilita' : 'Abilita'}
                    />,
                    <GridActionsCellItem
                        key={`reset-${id}`}
                        icon={<Tooltip title="Invia/Reset Password"><VpnKey /></Tooltip>}
                        label="Reset Password"
                        onClick={() => handlePasswordReset(row.email)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Gestione Utenti Applicazione</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {feedback && 
                <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
                    {feedback.message}
                </Alert>
            }
            {loading && <CircularProgress />}
            {!loading && 
                <Box sx={{ height: 'auto', width: '100%' }}>
                    <DataGrid
                        rows={utenti || []}
                        columns={columns}
                        autoHeight
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 10 },
                            },
                            sorting: {
                                sortModel: [{ field: 'nome', sort: 'asc' }],
                            }
                        }}
                        pageSizeOptions={[5, 10, 25]}
                        slots={{ toolbar: GridToolbar }}
                        disableRowSelectionOnClick
                    />
                </Box>
            }
        </Box>
    );
};

export default GestioneUtenti;
