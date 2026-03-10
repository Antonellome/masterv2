import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';
import type { Veicolo } from '@/models/definitions';
import VeicoloForm from '@/components/Veicoli/VeicoloForm';
import VeicoliList from '@/components/Veicoli/VeicoliList'; 
import {
    Box, 
    Button, 
    CircularProgress, 
    Alert,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import DettaglioItemDialog from '@/components/common/DettaglioItemDialog';
import { useRefresh } from '@/contexts/RefreshContext';

// Definizione di un tipo per l'oggetto dei dettagli
interface ItemToView {
    titolo: string;
    dettagli: { label: string; value: string | undefined }[];
}

// Definizione di un tipo per l'input della data
type DateInput = string | Date | Timestamp | null | undefined;

const GestioneVeicoli: React.FC = () => {
    const [veicoli, setVeicoli] = useState<Veicolo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedVeicolo, setSelectedVeicolo] = useState<Veicolo | null>(null);
    const [itemToView, setItemToView] = useState<ItemToView | null>(null); // Corretto
    const [veicoloToDeleteId, setVeicoloToDeleteId] = useState<string | null>(null);
    const { refreshKey } = useRefresh();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "veicoli"));
            const veicoliData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Veicolo));
            setVeicoli(veicoliData);
        } catch (err) {
            console.error("Errore nel caricamento dei veicoli:", err);
            setError("Impossibile caricare l'elenco dei veicoli.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshKey]);

    const handleOpenForm = (veicolo: Veicolo | null = null) => {
        setSelectedVeicolo(veicolo);
        setFormOpen(true);
    };

    const handleCloseForm = (shouldRefresh: boolean) => {
        setFormOpen(false);
        setSelectedVeicolo(null);
        if (shouldRefresh) fetchData();
    };

    const handleOpenConfirm = (id: string) => {
        setVeicoloToDeleteId(id);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setVeicoloToDeleteId(null);
        setConfirmOpen(false);
    };
    
    // Corretto per gestire Timestamp e altri tipi in modo sicuro
    const safeFormat = (date: DateInput): string => {
        if (!date) return 'N/D';
        const dateObj = date instanceof Timestamp ? date.toDate() : date;
        return dayjs(dateObj).isValid() ? dayjs(dateObj).format('DD/MM/YYYY') : 'N/D';
    };

    const handleViewDetails = (veicolo: Veicolo) => {
        const dettagli = [
            { label: 'Targa', value: veicolo.targa },
            { label: 'Marca', value: veicolo.marca },
            { label: 'Modello', value: veicolo.modello },
            { label: 'Tipo', value: veicolo.tipo },
            { label: 'Anno', value: veicolo.anno?.toString() },
            { label: 'Proprietà', value: veicolo.proprieta },
            { label: 'Sc. Assicurazione', value: safeFormat(veicolo.scadenzaAssicurazione) },
            { label: 'Sc. Bollo', value: safeFormat(veicolo.scadenzaBollo) },
            { label: 'Sc. Revisione', value: safeFormat(veicolo.scadenzaRevisione) },
            { label: 'Sc. Tachigrafo', value: safeFormat(veicolo.scadenzaTachimetro) },
            { label: 'Sc. Tagliando', value: safeFormat(veicolo.scadenzaTagliando) },
            { label: 'Note', value: veicolo.note },
        ];
        setItemToView({ titolo: `Dettaglio Veicolo`, dettagli });
        setDetailsOpen(true);
    };

    const handleSave = async (veicoloData: Partial<Veicolo>) => {
        try {
            if (selectedVeicolo?.id) {
                await updateDoc(doc(db, 'veicoli', selectedVeicolo.id), veicoloData);
            } else {
                await addDoc(collection(db, 'veicoli'), veicoloData);
            }
            handleCloseForm(true);
        } catch (error) {
            console.error("Errore nel salvataggio del veicolo: ", error);
        }
    };

    const handleDelete = async () => {
        if (veicoloToDeleteId) {
            try {
                await deleteDoc(doc(db, 'veicoli', veicoloToDeleteId));
                fetchData();
            } catch (error) {
                console.error("Errore nell'eliminazione del veicolo: ", error);
            } finally {
                handleCloseConfirm();
            }
        }
    };

    const veicoloDaEliminare = veicoli.find(v => v.id === veicoloToDeleteId);

    if (loading && !veicoli.length) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>Aggiungi Veicolo</Button>
            </Box>

            {loading ? <CircularProgress /> : 
                <VeicoliList 
                    veicoli={veicoli}
                    onEdit={handleOpenForm}
                    onDelete={handleOpenConfirm}
                    onViewDetails={handleViewDetails}
                />
            }

            <VeicoloForm
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                veicolo={selectedVeicolo}
            />

            <ConfirmationDialog
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title={`Conferma Eliminazione`}
                description={`Sei sicuro di voler eliminare il veicolo ${veicoloDaEliminare?.marca} ${veicoloDaEliminare?.modello} (${veicoloDaEliminare?.targa})? L'azione è irreversibile.`}
            />

            {itemToView && <DettaglioItemDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} items={itemToView.dettagli} title={itemToView.titolo} />}
        </Box>
    );
};

export default GestioneVeicoli;