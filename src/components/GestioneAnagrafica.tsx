import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database'; 
import { syncService } from '@/services/syncService'; // IMPORTA IL NUOVO SERVIZIO
import { Anagrafica } from '@/models/definitions';
import { logger } from '@/utils/logger';
import { 
    Box, Button, CircularProgress, Alert, Typography, Grid, Paper, 
    Tabs, Tab, TextField, Autocomplete
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import AnagraficaForm from './AnagraficaForm';
import AnagraficaTable from './AnagraficaTable';
import ConfirmationDialog from '@/components/ConfirmationDialog';

const ANAGRAFICA_TABS = [
    { label: 'Tecnici', collection: 'tecnici' },
    { label: 'Clienti', collection: 'clienti' },
    { label: 'Navi', collection: 'navi' },
    { label: 'Luoghi', collection: 'luoghi' },
    { label: 'Ditte', collection: 'ditte' },
    { label: 'Veicoli', collection: 'veicoli' },
    { label: 'Tipi Giornata', collection: 'tipiGiornata' },
];

const GestioneAnagrafica: React.FC = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Anagrafica | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Anagrafica | null>(null);
    const [error, setError] = useState<string | null>(null);

    const collectionName = ANAGRAFICA_TABS[currentTab].collection as keyof typeof db;

    // 1. Lettura reattiva da Dexie basata sulla tabella corrente
    const items = useLiveQuery(() => db.table(collectionName).toArray(), [collectionName], []);

    const handleOpenForm = (item: Anagrafica | null = null) => {
        setEditingItem(item);
        setFormOpen(true);
    };
    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingItem(null);
    };

    const handleOpenConfirm = (item: Anagrafica) => {
        setItemToDelete(item);
        setConfirmOpen(true);
    };
    const handleCloseConfirm = () => {
        setConfirmOpen(false);
        setItemToDelete(null);
    };

    // 2. SALVATAGGIO: Prima Dexie, poi chiama il syncService
    const handleSave = useCallback(async (formData: Partial<Anagrafica>) => {
        setError(null);
        const collection = ANAGRAFICA_TABS[currentTab].collection;
        try {
            if (editingItem?.id) {
                // Update
                const updatedData = { ...editingItem, ...formData };
                await db.table(collection).update(editingItem.id, updatedData);
                await syncService.sync('update', 'anagrafiche', { collection, id: editingItem.id, payload: formData });
            } else {
                // Create
                const id = crypto.randomUUID();
                const newItem = { ...formData, id } as Anagrafica;
                await db.table(collection).add(newItem);
                await syncService.sync('create', 'anagrafiche', { collection, payload: newItem });
            }
            handleCloseForm();
        } catch (err) {
            const msg = "Errore nel salvataggio.";
            logger.error(msg, err);
            setError(msg);
        }
    }, [editingItem, currentTab]);

    // 3. ELIMINAZIONE: Prima Dexie, poi chiama il syncService
    const handleDelete = useCallback(async () => {
        if (!itemToDelete) return;
        setError(null);
        const collection = ANAGRAFICA_TABS[currentTab].collection;
        try {
            await db.table(collection).delete(itemToDelete.id!);
            await syncService.sync('delete', 'anagrafiche', { collection, id: itemToDelete.id! });
        } catch (err) {
            const msg = "Errore nell'eliminazione.";
            logger.error(msg, err);
            setError(msg);
        } finally {
            handleCloseConfirm();
        }
    }, [itemToDelete, currentTab]);

    if (items === undefined) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} variant="scrollable" scrollButtons="auto">
                {ANAGRAFICA_TABS.map(tab => <Tab key={tab.collection} label={tab.label} />)}
            </Tabs>

            <Paper sx={{ p: 2, mt: 2 }} variant="outlined">
                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{ANAGRAFICA_TABS[currentTab].label}</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>
                        Nuovo
                    </Button>
                </Box>

                <AnagraficaTable 
                    items={items}
                    onEdit={handleOpenForm}
                    onDelete={handleOpenConfirm}
                />
            </Paper>

            <AnagraficaForm 
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                item={editingItem}
                collectionName={collectionName}
            />

            <ConfirmationDialog 
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title="Conferma Eliminazione"
                description={`Sei sicuro di voler eliminare "${itemToDelete?.nome}"? L\'azione è irreversibile.`}
            />
        </Box>
    );
};

export default GestioneAnagrafica;
