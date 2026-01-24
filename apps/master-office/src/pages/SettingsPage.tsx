import { useState } from 'react';
import {
    Box,
    Typography,
    Divider,
    Button,
    Stack,
    CircularProgress,
    Snackbar,
    Alert,
    Tabs,
    Tab
} from '@mui/material';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import OrariDefault from '@/components/OrariDefault';
import StyledCard from '@/components/StyledCard';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import GestioneUtentiTab from '@/components/Settings/GestioneUtentiTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// CORREZIONE: Modifico il TabPanel per permettergli di crescere in altezza.
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`settings-tabpanel-${index}`}
        aria-labelledby={`settings-tab-${index}`}
        style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }} // Proprietà per la crescita
        {...other}
      >
          {value === index && (
            // Anche il contenitore interno deve passare le proprietà flex
            (<Box sx={{ pt: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>)
          )}
      </div>
  );
}

const SettingsPage = () => {
    const [loadingExport, setLoadingExport] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
    const [currentTab, setCurrentTab] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

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

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const buttonSx = {
        minWidth: '250px',
    };

    return (
        // CORREZIONE: Rimuovo la larghezza massima e imposto un layout flex verticale.
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs value={currentTab} onChange={handleTabChange} aria-label="settings tabs">
                    <Tab label="Aspetto" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
                    <Tab label="Utenti" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
                    <Tab label="Dati" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
                </Tabs>
            </Box>
            {/* Pannello Aspetto */}
            <TabPanel value={currentTab} index={0}>
                <StyledCard>
                  <ThemeSwitcher />
                </StyledCard>
            </TabPanel>
            {/* Pannello Utenti */}
            <TabPanel value={currentTab} index={1}>
                <GestioneUtentiTab />
            </TabPanel>
            {/* Pannello Dati (Backup/Restore, Orari) */}
            <TabPanel value={currentTab} index={2}>
                <StyledCard sx={{ mb: 4 }}>
                    <Typography variant='h6' gutterBottom>
                        Backup e Ripristino
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                        <Button variant="contained" onClick={handleExportAndSave} disabled={loadingExport || loadingImport} sx={buttonSx}>
                            {loadingExport ? <CircularProgress size={24} /> : 'Esporta Backup Completo'}
                        </Button>
                        <Button variant="contained" color="error" onClick={handleRestore} disabled={loadingExport || loadingImport} sx={buttonSx}>
                            {loadingImport ? <CircularProgress size={24} /> : 'Ripristina da Backup'}
                        </Button>
                    </Stack>
                     <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                        Attenzione: Il ripristino sovrascrive tutti i dati correnti (report, ditte, tipi giornata, orari, categorie).
                    </Typography>
                </StyledCard>

                <StyledCard sx={{ mb: 4 }}>
                    <OrariDefault />
                </StyledCard>
            </TabPanel>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default SettingsPage;
