
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { Rapportino, Tecnico, Nave, Luogo } from '@/models/definitions';
import RapportiniList from '@/components/Rapportini/RapportiniList';
import RapportinoFormController from '@/components/Rapportini/RapportinoFormController';
import { useAlert } from '@/contexts/AlertContext';

const GestioneRapportini = () => {
    const { showAlert } = useAlert();
    const { 
        tecnici, 
        navi, 
        luoghi, 
        loading: loadingData,
    } = useData();

    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [loadingRapportini, setLoadingRapportini] = useState(true);

    useEffect(() => {
        // Modifica la query per escludere i documenti con isDeleted: true
        const q = query(collection(db, 'rapportini'), where('isDeleted', '!=', true));
        
        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const rapportiniData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
                setRapportini(rapportiniData);
                setLoadingRapportini(false);
            },
            (error) => {
                console.error("Errore nel caricamento dei rapportini: ", error);
                showAlert(`Errore nel caricamento dei rapportini: ${error.message}`, 'error');
                setLoadingRapportini(false);
            }
        );

        return () => unsubscribe();
    }, [showAlert]);

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

    // NUOVA FUNZIONE PER LA CANCELLAZIONE LOGICA (SOFT DELETE)
    const handleDelete = async (reportId: string) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo rapportino? L'azione è reversibile solo dal database.")) {
            return;
        }

        const reportRef = doc(db, "rapportini", reportId);
        try {
            await updateDoc(reportRef, {
                isDeleted: true,
                updatedAt: serverTimestamp() // Fondamentale per la sincronizzazione
            });
            showAlert(`Rapportino marcato come cancellato.`, 'success');
        } catch (error) {
            console.error("Errore durante la cancellazione (soft delete) del rapportino:", error);
            if (error instanceof Error) {
                showAlert(`Errore durante l'eliminazione: ${error.message}`, 'error');
            } else {
                showAlert("Si è verificato un errore sconosciuto durante l'eliminazione.", 'error');
            }
        }
    };

    const tecniciMap = useMemo(() => {
        if (!tecnici) return new Map<string, Tecnico>();
        return new Map(tecnici.map(t => [t.id, t]));
    }, [tecnici]);

    const naviMap = useMemo(() => {
        if (!navi) return new Map<string, string>();
        return new Map(navi.map(n => [n.id, n.nome]));
    }, [navi]);

    const luoghiMap = useMemo(() => {
        if (!luoghi) return new Map<string, string>();
        return new Map(luoghi.map(l => [l.id, l.nome]));
    }, [luoghi]);

    const isLoading = loadingData || loadingRapportini;

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
                    onDelete={handleDelete} // Passa la nuova funzione
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
