import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico } from '@/models/definitions';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE

import { Box, Button, Typography, CircularProgress } from '@mui/material';
import TecniciList from '@/components/Anagrafiche/TecniciList';
import TecnicoForm from '@/components/Anagrafiche/TecnicoForm';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface GestioneAnagraficaProps {
    collectionName: 'tecnici' | 'ditte' | 'categorieTecnici'; 
    ItemComponent: React.FC<unknown>; 
    FormComponent: React.FC<unknown>;
    columns: unknown[];
    label: string;
}

const GestioneAnagrafica: React.FC<GestioneAnagraficaProps> = ({ label }) => {
    const { tecnici, ditte, categorie, loading, refreshData } = useData();
    
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Tecnico | null>(null);

    const handleOpenForm = (item: Tecnico | null = null) => {
        setSelectedItem(item);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setSelectedItem(null);
        setFormOpen(false);
        refreshData();
    };

    const handleOpenConfirm = (item: Tecnico) => {
        setSelectedItem(item);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setSelectedItem(null);
        setConfirmOpen(false);
    };

    const handleSave = async (itemData: Partial<Tecnico>) => {
        try {
            if (selectedItem?.id) {
                await updateDoc(doc(db, 'tecnici', selectedItem.id), itemData);
            } else {
                await addDoc(collection(db, 'tecnici'), itemData);
            }
            handleCloseForm();
        } catch (error) {
            console.error("Errore nel salvataggio: ", error);
        }
    };

    const handleDelete = async () => {
        if (selectedItem?.id) {
            try {
                await deleteDoc(doc(db, 'tecnici', selectedItem.id));
                handleCloseConfirm();
                refreshData();
            } catch (error) {
                console.error("Errore nell'eliminazione: ", error);
            }
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{label}</Typography>
                <Button variant="contained" onClick={() => handleOpenForm()}>Aggiungi</Button>
            </Box>

            {loading ? <CircularProgress /> : 
                <TecniciList 
                    tecnici={tecnici}
                    ditte={ditte}
                    categorie={categorie}
                    onRowClick={handleOpenForm}
                    onEdit={handleOpenForm} 
                    onDelete={handleOpenConfirm}
                />
            }

            <TecnicoForm
                open={formOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                tecnico={selectedItem}
                categorie={categorie}
                ditte={ditte}
                loading={loading}
            />

            <ConfirmationDialog
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title={`Conferma Eliminazione`}
                description={`Sei sicuro di voler eliminare ${selectedItem?.nome}? L'azione è irreversibile.`}
            />
        </Box>
    );
};

export default GestioneAnagrafica;
