
import { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Box,
    Typography,
    Button,
    TextField,
    CircularProgress,
    Paper,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    IconButton,
    Autocomplete,
    Alert
} from '@mui/material';
import SectionLayout from '@/components/common/SectionLayout';
import InviaNotificaDialog from '@/components/Notifiche/InviaNotificaDialog';
import SentNotificationsList from '@/components/Notifiche/SentNotificationsList';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';

import type { Tecnico, NotificationTarget } from '@/models/definitions';

// --- VISTA PER L'INVIO --- //
const SendNotificationView = ({ onCancel, allTecnici, categories, loading }) => {
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<NotificationTarget | null>(null);
    const [targetType, setTargetType] = useState<'user' | 'category' | 'all'>('user');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const handleOpenDialog = (target: NotificationTarget) => {
        setSelectedTarget(target);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTarget(null);
    };

    const handleSendToTecnico = () => {
        if (selectedTecnico) {
            handleOpenDialog({
                type: 'user',
                id: selectedTecnico.id,
                name: `${selectedTecnico.cognome} ${selectedTecnico.nome}`,
            });
        }
    };
    
    const handleClearSelection = () => {
        setSelectedTecnico(null);
        setSelectedCategory(null);
    };

    const hasNoEnabledTechnicians = !loading && allTecnici.length === 0;
    const hasNoCategories = !loading && categories.length === 0;

    return (
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Typography variant="h4" component="h1" gutterBottom>Invia Nuova Notifica</Typography>
                    <Typography color="text.secondary">Seleziona un destinatario per inviare una comunicazione.</Typography>
                </div>
                <Button variant="outlined" onClick={onCancel}>Annulla</Button>
            </Box>

            {hasNoEnabledTechnicians && (
                 <Alert severity="warning" sx={{ mb: 2 }}>
                    Nessun tecnico abilitato trovato. Per inviare notifiche, abilita almeno un tecnico dall'anagrafica.
                 </Alert>
            )}

            <FormControl component="fieldset" sx={{ mb: 2 }} disabled={hasNoEnabledTechnicians}>
                <RadioGroup row value={targetType} onChange={(e) => setTargetType(e.target.value as any)}>
                    <FormControlLabel value="user" control={<Radio />} label="Singolo Tecnico" />
                    <FormControlLabel value="category" control={<Radio />} label="Categoria" />
                    <FormControlLabel value="all" control={<Radio />} label="Tutti" />
                </RadioGroup>
            </FormControl>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {targetType === 'user' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Autocomplete
                            fullWidth
                            options={allTecnici}
                            getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                            value={selectedTecnico}
                            onChange={(_, newValue) => setSelectedTecnico(newValue)}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => <TextField {...params} label="Cerca Tecnico..." />}
                            loading={loading}
                            noOptionsText="Nessun tecnico trovato"
                            disabled={hasNoEnabledTechnicians}
                        />
                        {selectedTecnico && <IconButton onClick={handleClearSelection} size="small"><ClearIcon /></IconButton>}
                        <IconButton color="primary" disabled={!selectedTecnico || loading} onClick={handleSendToTecnico}><SendIcon /></IconButton>
                    </Box>
                )}

                {targetType === 'category' && (
                    <>
                        {hasNoCategories && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <strong>Nessuna categoria trovata.</strong>
                            </Alert>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Autocomplete
                                fullWidth
                                options={categories}
                                getOptionLabel={(option) => option}
                                value={selectedCategory}
                                onChange={(_, val) => setSelectedCategory(val)}
                                renderInput={(params) => <TextField {...params} label="Seleziona Categoria" />}
                                disabled={loading || hasNoCategories}
                                noOptionsText="Nessuna categoria disponibile"
                            />
                            {selectedCategory && <IconButton onClick={handleClearSelection} size="small"><ClearIcon /></IconButton>}
                            <IconButton color="primary" disabled={!selectedCategory || loading} onClick={() => handleOpenDialog({ type: 'category', id: selectedCategory!, name: `Categoria: ${selectedCategory}` })}><SendIcon /></IconButton>
                        </Box>
                    </>
                )}

                {targetType === 'all' && (
                    <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2, mt: 2 }}>
                        <Typography sx={{ mb: 2 }}>Invia una notifica a tutti i tecnici abilitati.</Typography>
                        <Button variant="contained" size="large" endIcon={<SendIcon />} disabled={loading || hasNoEnabledTechnicians} onClick={() => handleOpenDialog({ type: 'all', id: 'all', name: 'Tutti i Tecnici Abilitati' })}>
                            Invia a Tutti
                        </Button>
                    </Box>
                )}
            </Box>
            {selectedTarget && <InviaNotificaDialog open={isDialogOpen} onClose={handleCloseDialog} target={selectedTarget} />}
        </Paper>
    );
};


// --- VISTA DELLO STORICO --- //
const HistoryView = ({ onNewNotification }) => (
    <Paper variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
            <div>
                <Typography variant="h4" component="h1">Cronologia Notifiche</Typography>
                <Typography color="text.secondary">Elenco delle ultime comunicazioni inviate.</Typography>
            </div>
            <Button variant="contained" startIcon={<AddIcon />} onClick={onNewNotification}>Invia Nuova Notifica</Button>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            <SentNotificationsList />
        </Box>
    </Paper>
);

// --- COMPONENTE PRINCIPALE --- //
const NotificationsPage = () => {
    const [view, setView] = useState<'history' | 'send'>('history');

    const tecniciQuery = query(collection(db, 'tecnici'), where('appAccess', '==', true));
    const [tecniciSnapshot, loadingTecnici, errorTecnici] = useCollection(tecniciQuery);

    const categoriesQuery = query(collection(db, 'categorie'), orderBy('nome'));
    const [categoriesSnapshot, loadingCategories, errorCategories] = useCollection(categoriesQuery);

    const allTecnici = useMemo(() => {
        if (!tecniciSnapshot) return [];
        const tecniciList = tecniciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tecnico[];
        return tecniciList.sort((a, b) => (a.cognome || '').localeCompare(b.cognome || ''));
    }, [tecniciSnapshot]);

    const categories = useMemo(() => {
        if (!categoriesSnapshot) return [];
        return categoriesSnapshot.docs.map(doc => doc.data().nome as string);
    }, [categoriesSnapshot]);

    const loading = loadingTecnici || loadingCategories;
    const error = errorTecnici || errorCategories;

    if (error) return <Alert severity="error">Errore nel caricamento dei dati: {error.message}</Alert>;

    return (
        <SectionLayout>
             <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    view === 'history' ? (
                        <HistoryView onNewNotification={() => setView('send')} />
                    ) : (
                        <SendNotificationView 
                            onCancel={() => setView('history')} 
                            allTecnici={allTecnici}
                            categories={categories}
                            loading={loading}
                        />
                    )
                )}
            </Box>
        </SectionLayout>
    );
};

export default NotificationsPage;
