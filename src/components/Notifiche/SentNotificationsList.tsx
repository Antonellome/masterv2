
import { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase'; // DEFINITIVE FIX ALIGNED WITH BLUEPRINT
import { deleteNotificationBatch } from '@/services/notificationService';
import {
    Box, 
    CircularProgress, 
    Typography, 
    Alert,
    Button,
    Paper,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { logger } from '@/utils/logger';

const SentNotificationsList = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const tecnici = useRapportiniStore(state => state.tecnici);
    const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, `${t.cognome} ${t.nome}`])), [tecnici]);

    const notificheQuery = query(
        collection(db, 'notifiche'), 
        orderBy('createdAt', 'desc')
    );

    const [value, loading, error] = useCollection(notificheQuery);

    // ALIGNED WITH BLUEPRINT: This function now calls the backend service.
    const handleDeleteAll = async () => {
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteNotificationBatch(); 
            logger.log('Batch deletion triggered through notificationService.');
        } catch (err: any) {
            logger.error('Error during mass notification deletion:', err);
            setDeleteError(err.message || 'An unknown error occurred during batch deletion.');
        } finally {
            setIsDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };
    
    const rows = useMemo(() => {
        if (!value) return [];
        return value.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userName: tecniciMap.get(data.userId) || data.userId || 'N/D',
                title: data.title,
                message: data.message,
                createdAt: data.createdAt.toDate(),
                isRead: data.isRead,
            };
        });
    }, [value, tecniciMap]);

    const columns: GridColDef[] = [
        { field: 'userName', headerName: 'Destinatario', flex: 1.5 },
        { field: 'title', headerName: 'Titolo', flex: 1.5 },
        { field: 'message', headerName: 'Messaggio', flex: 2 },
        {
            field: 'createdAt',
            headerName: 'Data Invio',
            type: 'dateTime',
            flex: 1,
        },
        {
            field: 'isRead',
            headerName: 'Letto',
            type: 'boolean',
            flex: 0.5,
        },
    ];

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">Errore nel caricamento delle notifiche: {error.message}</Alert>;
    }

    return (
        <Paper sx={{ p: 2, height: 700, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Notifiche Inviate</Typography>
                <Button 
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={isDeleting || rows.length === 0}
                >
                    {isDeleting ? <CircularProgress size={24} /> : 'Svuota Cronologia'}
                </Button>
            </Box>
            {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
            <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                    },
                }}
                disableRowSelectionOnClick
            />
            <Dialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
            >
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare TUTTE le notifiche inviate? Questa azione è irreversibile e utilizzerà la funzione di backend sicura.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)}>Annulla</Button>
                    <Button onClick={handleDeleteAll} color="error" autoFocus>
                        {isDeleting ? <CircularProgress size={24}/> : 'Elimina Tutto'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default SentNotificationsList;
