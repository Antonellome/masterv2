
import { useState } from 'react';
import {
    Typography,
    Divider,
    Button,
    Stack,
    CircularProgress,
    Snackbar,
    Alert,
    Box,
} from '@mui/material';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import StyledCard from '@/components/StyledCard';
import { syncCompleta } from '@/services/SyncService'; // 1. IMPORTIAMO LA FUNZIONE

const BackupTab = () => {
    const [loadingExport, setLoadingExport] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const [loadingSync, setLoadingSync] = useState(false); // Stato di caricamento per la sync completa
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

    const handleExportAndSave = async () => {
        setLoadingExport(true);
        try {
            const collectionsToExport = ["RISO", "ditte", "tipiGiornata", "configurazione", "categorie"];
            const allData: { [key: string]: Record<string, unknown>[] } = {};

            const db = getFirestore();
            for (const coll of collectionsToExport) {
                const querySnapshot = await getDocs(collection(db, coll));
                allData[coll] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
            const jsonString = JSON.stringify(allData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);

            setSnackbar({ open: true, message: 'Backup completo esportato con successo!', severity: 'success' });

        } catch (error: unknown) {
            console.error("Errore durante l'esportazione dei dati:", error);
            if (error instanceof Error) {
                setSnackbar({ open: true, message: error.message || "Errore durante l'esportazione dei dati.", severity: 'error' });
            }
        }
        setLoadingExport(false);
    };

    const handleRestore = () => {
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = '.json';
        inputFile.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            if (!window.confirm("ATTENZIONE: Stai per sovrascrivere TUTTI i dati (Report, Ditte, Tipi Giornata, Orari, Categorie) con quelli del file di backup. L'azione è irreversibile. Sei sicuro di voler procedere?")) {
                return;
            }

            setLoadingImport(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result as string;
                    const allData = JSON.parse(content) as { [key: string]: Record<string, unknown>[] };
                    const db = getFirestore();
                    const batch = writeBatch(db);
                    
                    const collectionsToImport = ["RISO", "ditte", "tipiGiornata", "configurazione", "categorie"];
                    for (const coll of collectionsToImport) {
                        if (!allData[coll]) throw new Error(`Il file di backup è incompleto. Manca la collezione: ${coll}`);
                    }

                    for (const coll of collectionsToImport) {
                        const querySnapshot = await getDocs(collection(db, coll));
                        querySnapshot.forEach(doc => {
                            batch.delete(doc.ref);
                        });
                    }
                    await batch.commit();

                    const secondBatch = writeBatch(db);
                    for (const collName in allData) {
                         if (Object.prototype.hasOwnProperty.call(allData, collName)) {
                            const collData = allData[collName];
                             if (Array.isArray(collData)) {
                                collData.forEach(item => {
                                    const id = item.id as string;
                                    if (id) {
                                        const docRef = doc(db, collName, id);
                                        const itemData = { ...item };
                                        delete (itemData as { id?: unknown }).id;
                                        secondBatch.set(docRef, itemData);
                                    }
                                });
                            }
                        }
                    }

                    await secondBatch.commit();
                    setSnackbar({ open: true, message: 'Ripristino completato con successo!', severity: 'success' });
                    window.location.reload();

                } catch (error: unknown) {
                    console.error('Errore durante il ripristino:', error);
                    if (error instanceof Error) {
                        setSnackbar({ open: true, message: error.message || 'Errore durante il ripristino del backup.', severity: 'error' });
                    }
                }
                setLoadingImport(false);
            };
            reader.readAsText(file);
        };
        inputFile.click();
    };

    // 2. FUNZIONE PER GESTIRE LA SYNC COMPLETA
    const handleSyncCompleta = async () => {
        setLoadingSync(true);
        try {
            await syncCompleta();
            setSnackbar({ open: true, message: 'Sincronizzazione completa terminata con successo!', severity: 'success' });
        } catch (error) {
            console.error("Errore durante la sincronizzazione completa:", error);
            if (error instanceof Error) {
                setSnackbar({ open: true, message: error.message || 'Errore durante la sincronizzazione completa.', severity: 'error' });
            }
        }
        setLoadingSync(false);
    };
    
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const buttonSx = {
        minWidth: '250px',
    };

    return (
        <>
            <StyledCard>
                <Typography variant='h6' gutterBottom>
                    Backup e Ripristino
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="center">
                    <Button variant="contained" onClick={handleExportAndSave} disabled={loadingExport || loadingImport || loadingSync} sx={buttonSx}>
                        {loadingExport ? <CircularProgress size={24} /> : 'Esporta Backup Completo'}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleRestore} disabled={loadingExport || loadingImport || loadingSync} sx={buttonSx}>
                        {loadingImport ? <CircularProgress size={24} /> : 'Ripristina da Backup'}
                    </Button>
                </Stack>
                 <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                    Attenzione: Il ripristino sovrascrive tutti i dati correnti (report, ditte, tipi giornata, orari, categorie).
                </Typography>
            </StyledCard>

            {/* 3. NUOVA SEZIONE PER LA SINCRONIZZAZIONE AVANZATA */}
            <StyledCard sx={{ mt: 3 }}>
                <Typography variant='h6' gutterBottom>
                    Sincronizzazione Avanzata
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ p: 2 }}>
                    <Typography variant="body2" paragraph>
                        La sincronizzazione standard (all'avvio o con il tasto di aggiornamento) è ottimizzata per scaricare solo i dati recenti e le anagrafiche, rendendo l'app veloce nell'uso quotidiano.
                    </Typography>
                    <Typography variant="body2" paragraph>
                        La **Sincronizzazione Completa** è un'operazione più intensiva che scarica l'intero database da Firestore, inclusi tutti i rapportini storici. Usala se credi che manchino dati vecchi o se hai bisogno di un allineamento totale con il server.
                    </Typography>
                </Box>
                <Stack direction="column" spacing={2} alignItems="center" justifyContent="center" sx={{ p: 2 }}>
                    <Button variant="contained" color="secondary" onClick={handleSyncCompleta} disabled={loadingExport || loadingImport || loadingSync} sx={buttonSx}>
                        {loadingSync ? <CircularProgress size={24} /> : 'Esegui Sincronizzazione Completa'}
                    </Button>
                </Stack>
            </StyledCard>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default BackupTab;
