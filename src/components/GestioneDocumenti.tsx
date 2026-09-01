import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
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
import { logger } from '@/utils/logger';

const handleCloudSync = async (operation: 'create' | 'update' | 'delete', collectionName: string, data: any) => {
    logger.log(`[Cloud Sync] ${operation} su ${collectionName}:`, data);
    // Qui andrà la logica per chiamare la Cloud Function
    return Promise.resolve();
};

interface ItemToView {
    titolo: string;
    dettagli: { label: string; value: string | React.ReactNode }[];
}

const safeFormatDate = (date: any): string => {
    if (!date) return 'N/D';
    const dateObj = date instanceof Date ? date : new Date(date);
    const dayjsDate = dayjs(dateObj);
    return dayjsDate.isValid() ? dayjsDate.format('DD/MM/YYYY') : 'N/D';
};

const GestioneDocumenti: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
    const [itemToView, setItemToView] = useState<ItemToView | null>(null);
    const [documentoToDeleteId, setDocumentoToDeleteId] = useState<string | null>(null);

    // 1. Lettura reattiva da Dexie
    const documenti = useLiveQuery(() => db.documenti.toArray(), []);

    const handleOpenForm = (documento: Documento | null = null) => {
        setSelectedDocumento(documento);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setSelectedDocumento(null);
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
            { label: 'Tipo', value: documento.tipo },
            { label: 'Data Scadenza', value: safeFormatDate(documento.dataScadenza) },
            { label: 'Owner ID', value: documento.ownerId },
        ];
        setItemToView({ titolo: `Dettaglio ${documento.nome}`, dettagli });
        setDetailsOpen(true);
    };

    const handleSave = useCallback(async (formData: Partial<Documento>) => {
        try {
            setError(null);
            if (selectedDocumento?.id) {
                // UPDATE
                const updatedData = { ...selectedDocumento, ...formData };
                await db.documenti.update(selectedDocumento.id, updatedData);
                await handleCloudSync('update', 'documenti', updatedData);
            } else {
                // CREATE
                const id = crypto.randomUUID();
                const newDoc = { ...formData, id } as Documento;
                await db.documenti.add(newDoc);
                await handleCloudSync('create', 'documenti', newDoc);
            }
            handleCloseForm();
        } catch (err) {
            const msg = 'Errore nel salvataggio del documento.';
            logger.error(msg, err);
            setError(msg);
        }
    }, [selectedDocumento]);

    const handleDelete = useCallback(async () => {
        if (documentoToDeleteId) {
            try {
                setError(null);
                await db.documenti.delete(documentoToDeleteId);
                await handleCloudSync('delete', 'documenti', { id: documentoToDeleteId });
            } catch (err) {
                const msg = 'Errore nell'eliminazione del documento.';
                logger.error(msg, err);
                setError(msg);
            } finally {
                handleCloseConfirm();
            }
        }
    }, [documentoToDeleteId]);

    const documentoDaEliminare = documenti?.find(d => d.id === documentoToDeleteId);

    if (documenti === undefined) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()}>Aggiungi Documento</Button>
            </Box>

            <DocumentiList 
                documenti={documenti}
                onEdit={handleOpenForm}
                onDelete={handleOpenConfirm}
                onViewDetails={handleViewDetails}
            />

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
