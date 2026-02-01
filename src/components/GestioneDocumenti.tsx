import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';
import type { Documento } from '@/models/definitions';
import DocumentoForm from '@/components/Documenti/DocumentoForm';
import DocumentiList from '@/components/Documenti/DocumentiList';
import {
    Box,
    Button,
    CircularProgress,
    Alert,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import DettaglioItemDialog from '@/components/common/DettaglioItemDialog';
import { useRefresh } from '@/hooks/useRefresh';

// Definizione di un tipo per l'oggetto dei dettagli
interface ItemToView {
    titolo: string;
    dettagli: { label: string; value: string | React.ReactNode }[];
}

// Funzione helper per formattare le date in modo sicuro
const safeFormatDate = (date: any) => {
    if (!date) return 'N/D';
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return dayjs(dateObj).isValid() ? dayjs(dateObj).format('DD/MM/YYYY') : 'N/D';
};

const GestioneDocumenti: React.FC = () => {
    const [documenti, setDocumenti] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
    const [itemToView, setItemToView] = useState<ItemToView | null>(null); // Utilizzo il tipo corretto
    const [documentoToDeleteId, setDocumentoToDeleteId] = useState<string | null>(null);
    const { refreshKey } = useRefresh();

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, "documenti"));
            const documentiData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Documento));
            setDocumenti(documentiData);
        } catch (err) {
            console.error("Errore nel caricamento dei documenti:", err);
            setError("Impossibile caricare l'elenco dei documenti.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, refreshKey]);

    const handleOpenForm = (documento: Documento | null = null) => {
        setSelectedDocumento(documento);
        setFormOpen(true);
    };

    const handleCloseForm = (shouldRefresh: boolean) => {
        setFormOpen(false);
        setSelectedDocumento(null);
        if (shouldRefresh) fetchData();
    };

    const handleOpenConfirm = (id: string) => {
        setDocumentoToDeleteId(id);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setDocumentoToDeleteId(null);
        setConfirmOpen(false);
    };

    const handleViewDetails = (documento: Documento) => {
        const dettagli = [
            { label: 'Nome', value: documento.nome },
            { label: 'Descrizione', value: documento.descrizione },
            { label: 'Scadenza 1', value: safeFormatDate(documento.scadenza1) },
            { label: 'Scadenza 2', value: safeFormatDate(documento.scadenza2) },
        ];
        setItemToView({ titolo: `Dettaglio ${documento.nome}`, dettagli });
        setDetailsOpen(true);
    };

    const handleSave = async (documentoData: Partial<Documento>) => {
        try {
            if (selectedDocumento?.id) {
                await updateDoc(doc(db, 'documenti', selectedDocumento.id), documentoData);
            } else {
                await addDoc(collection(db, 'documenti'), documentoData);
            }
            handleCloseForm(true);
        } catch (error) {
            console.error("Errore nel salvataggio del documento: ", error);
        }
    };

    const handleDelete = async () => {
        if (documentoToDeleteId) {
            try {
                await deleteDoc(doc(db, 'documenti', documentoToDeleteId));
                fetchData();
            } catch (error) {
                console.error("Errore nell'eliminazione del documento: ", error);
            } finally {
                handleCloseConfirm();
            }
        }
    };

    const documentoDaEliminare = documenti.find(d => d.id === documentoToDeleteId);

    if (loading && !documenti.length) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>Aggiungi Documento</Button>
            </Box>

            {loading ? <CircularProgress /> : 
                <DocumentiList 
                    documenti={documenti}
                    onEdit={handleOpenForm}
                    onDelete={handleOpenConfirm}
                    onViewDetails={handleViewDetails}
                />
            }

            <DocumentoForm
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                documento={selectedDocumento}
            />

            <ConfirmationDialog
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title={`Conferma Eliminazione`}
                description={`Sei sicuro di voler eliminare il documento ${documentoDaEliminare?.nome}? L'azione è irreversibile.`}
            />

            {itemToView && <DettaglioItemDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} items={itemToView.dettagli} title={itemToView.titolo} />}
        </Box>
    );
};

export default GestioneDocumenti;
