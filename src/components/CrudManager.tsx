import { useState, useEffect } from 'react';
import {
    Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, 
    IconButton, TextField, Button, Paper, CircularProgress, Alert, Dialog, 
    DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery,
    DialogContentText
} from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';
import Add from '@mui/icons-material/Add';
// Importa 'query' e 'orderBy' da firestore
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BaseEntity } from '@/models/definitions';

interface CrudManagerProps {
    collectionName: string;
    title: string;
    itemLabel: string;
    description?: string;
    nameField?: string;
}

const CrudManager = ({ collectionName, title, itemLabel, description, nameField = 'name' }: CrudManagerProps) => {
    const [items, setItems] = useState<BaseEntity[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState<BaseEntity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<BaseEntity | null>(null);

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    useEffect(() => {
        // Costruisce la query per ordinare i dati in base al campo 'nameField'
        const q = query(collection(db, collectionName), orderBy(nameField));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const itemsData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data()[nameField] as string })) as BaseEntity[];
                setItems(itemsData);
                setLoading(false);
            },
            (err) => {
                setError(`Failed to fetch ${collectionName}: ${err.message}`);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [collectionName, nameField]);

    const handleOpen = (item: BaseEntity | null = null) => {
        setEditingItem(item);
        setNewItemName(item ? item.name : '');
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setEditingItem(null);
        setNewItemName('');
        setError('');
    };

    const handleSave = async () => {
        if (!newItemName.trim()) {
            setError('Il nome non può essere vuoto.');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = { [nameField]: newItemName };
            if (editingItem) {
                const itemDoc = doc(db, collectionName, editingItem.id);
                await updateDoc(itemDoc, dataToSave);
            } else {
                await addDoc(collection(db, collectionName), dataToSave);
            }
            handleClose();
        } catch (err: unknown) {
             if (err instanceof Error) {
                setError(`Salvataggio fallito: ${err.message}`);
            } else {
                setError('Si è verificato un errore sconosciuto durante il salvataggio.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRequest = (item: BaseEntity) => {
        setItemToDelete(item);
        setConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setItemToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            await deleteDoc(doc(db, collectionName, itemToDelete.id));
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(`Eliminazione fallita: ${err.message}`);
            } else {
                setError('Si è verificato un errore sconosciuto durante l\'eliminazione.');
            }
        } finally {
            handleCloseConfirmDialog();
        }
    };

    return (
        <>
            <Paper sx={{ p: 2, borderRadius: '12px', boxShadow: 3, width: '100%' }}>
                <Typography variant='h6' component='h3' sx={{ fontWeight: 'bold' }}>{title}</Typography>
                {description && <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>{description}</Typography>}
                
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant='contained'
                        startIcon={<Add />}
                        onClick={() => handleOpen()}
                    >
                        Aggiungi {itemLabel}
                    </Button>
                </Box>

                {loading && <CircularProgress />}
                {error && <Alert severity='error' sx={{ my: 1 }}>{error}</Alert>}
                
                {!loading && items.length === 0 && (
                    <Typography variant='body1' color='text.secondary' sx={{ mt: 2, fontStyle: 'italic' }}>
                        Nessun {itemLabel.toLowerCase()} trovato.
                    </Typography>
                )}
                
                <List dense>
                    {items.map(item => (
                        <ListItem 
                            key={item.id}
                            sx={{ 
                                my: 0.5,
                                borderRadius: '8px', 
                                backgroundColor: 'background.paper',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                        >
                            <ListItemText primary={item.name} />
                            <ListItemSecondaryAction>
                                <IconButton edge='end' aria-label='edit' onClick={() => handleOpen(item)}>
                                    <Edit />
                                </IconButton>
                                <IconButton edge='end' aria-label='delete' onClick={() => handleDeleteRequest(item)} sx={{ ml: 1 }}>
                                    <Delete />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>

                <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} maxWidth='sm' fullWidth>
                    <DialogTitle>{editingItem ? `Modifica ${itemLabel}` : `Aggiungi ${itemLabel}`}</DialogTitle>
                    <DialogContent>
                        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
                        <TextField
                            margin='dense'
                            label={`Nome ${itemLabel}`}
                            type='text'
                            fullWidth
                            variant='standard'
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Annulla</Button>
                        <Button onClick={handleSave} variant='contained' disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Salva'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper>

            <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog}>
                <DialogTitle>Conferma Eliminazione</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Sei sicuro di voler eliminare l&apos;elemento <Typography component="span" fontWeight="bold">{itemToDelete?.name}</Typography>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog}>Annulla</Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Elimina
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default CrudManager;
