
import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
// No longer need direct firebase imports here, the store handles it.
import { functions } from '@/config/firebase'; 
import { httpsCallable } from 'firebase/functions'; 
import type { Rapportino } from '@/models/definitions';
import RapportiniList from '@/components/Rapportini/RapportiniList';
import RapportinoFormController from '@/components/Rapportini/RapportinoFormController';
import { useAlert } from '@/contexts/AlertContext';
// Import the Zustand store
import { useRapportiniStore } from '@/store/useRapportiniStore';

const GestioneRapportini = () => {
    const { showAlert } = useAlert();

    // Get all data and state from the Zustand store
    const {
        rapportini,
        tecniciMap,
        naviMap,
        luoghiMap,
        loading: isLoading, // Directly use the loading state from the store
    } = useRapportiniStore(state => ({
        rapportini: state.rapportini,
        tecniciMap: state.tecniciMap,
        naviMap: state.naviMap,
        luoghiMap: state.luoghiMap,
        loading: state.loading,
    }));

    // The logic for handling the form stays the same
    const [formOpen, setFormOpen] = useState(false);
    const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);

    const handleAdd = () => {
        setSelectedRapportino(null);
        setFormOpen(true);
    };

    const handleEdit = (rapportino: Rapportino) => {
        setSelectedRapportino(rapportino);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setSelectedRapportino(null);
    };

    // The delete logic is correct and uses a Cloud Function, so it stays.
    const handleDelete = async (reportId: string) => {
        if (!window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo rapportino? L'operazione è irreversibile.")) {
            return;
        }
        
        const deleteRapportino = httpsCallable(functions, 'deleteRapportino');

        try {
            await deleteRapportino({ rapportinoId: reportId });
            showAlert('Rapportino eliminato con successo!', 'success');
        } catch (error: any) {
            console.error("Errore eliminazione via Cloud Function:", error);
            showAlert(`Errore [${error.code}]: ${error.message}`, 'error');
        }
    };
    
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
                Gestione Rapportini
            </Typography>
            <Paper elevation={3} sx={{ p: 2 }}>
                <RapportiniList 
                    rapportini={rapportini}
                    tecniciMap={tecniciMap}
                    naviMap={naviMap}
                    luoghiMap={luoghiMap}
                    loading={isLoading}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Paper>

            {formOpen && (
                 <RapportinoFormController
                    open={formOpen}
                    onClose={handleCloseForm}
                    rapportino={selectedRapportino}
                 />
            )}
        </Box>
    );
};

export default GestioneRapportini;
