import { useState, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
// Correzione Percorsi
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
    Box,
    Button,
    Typography,
    Card,
    CardContent,
    CardActions,
    IconButton,
    CircularProgress,
    Alert,
    Grid,
    Paper
} from '@mui/material';
import DittaForm from './DittaForm';
// Correzione Percorsi
import type { Ditta } from '@/models/definitions';

const DitteList = () => {
    const [formOpen, setFormOpen] = useState(false);
    const [selectedDitta, setSelectedDitta] = useState<Ditta | null>(null);
    const [error, setError] = useState<string | null>(null);

    const ditteQuery = useMemo(() => collection(db, 'ditte'), []);
    const { data: ditte, loading, error: dataError } = useCollectionData<Ditta>(ditteQuery);

    const handleOpenForm = (ditta: Ditta | null = null) => {
        setSelectedDitta(ditta);
        setFormOpen(true);
        setError(null);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setSelectedDitta(null);
    };

    const handleSave = async (formData: Ditta) => {
        try {
            if (formData.id) {
                // Update existing ditta
                const dittaRef = doc(db, 'ditte', formData.id);
                await updateDoc(dittaRef, { ...formData });
            } else {
                // Add new ditta
                await addDoc(collection(db, 'ditte'), {
                    ...formData,
                });
            }
            handleCloseForm();
        } catch (err) {
            console.error("Errore nel salvataggio della ditta: ", err);
            setError("Si è verificato un errore durante il salvataggio.");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questa ditta?')) {
            try {
                await deleteDoc(doc(db, 'ditte', id));
            } catch (err) {
                console.error("Errore nell'eliminazione della ditta:", err);
                setError("Si è verificato un errore durante l'eliminazione.");
            }
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 3, backgroundColor: 'transparent' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gestione Ditte
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Plus />}
                    onClick={() => handleOpenForm()}
                >
                    Nuova Ditta
                </Button>
            </Box>

            {loading && <CircularProgress />}
            {dataError && <Alert severity="error">{dataError.message}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {ditte && ditte.map((ditta) => (
                    <Grid xs={12} sm={6} md={4} key={ditta.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" component="h2">
                                    {/* Correzione: nome -> name */}
                                    {ditta.name}
                                </Typography>
                                <Typography color="text.secondary">
                                    {ditta.indirizzo}
                                </Typography>
                                <Typography color="text.secondary">
                                    {ditta.piva || 'N/D'}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'flex-end' }}>
                                <IconButton onClick={() => handleOpenForm(ditta)} color="primary">
                                    <Edit />
                                </IconButton>
                                <IconButton onClick={() => handleDelete(ditta.id)} color="error">
                                    <Trash2 />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <DittaForm
                open={formOpen}
                onClose={handleCloseForm}
                ditta={selectedDitta}
                onSave={handleSave}
            />
        </Paper>
    );
};

export default DitteList;
