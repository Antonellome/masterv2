
import React, { useState, useMemo, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { Rapportino, Tecnico, Nave, Luogo } from '@/models/definitions';
import RapportiniList from '@/components/Rapportini/RapportiniList';
import RapportinoFormController from '@/components/Rapportini/RapportinoFormController';

const GestioneRapportini = () => {
    // 1. Usa l'hook centralizzato useData per i dati "master"
    const { 
        tecnici, 
        navi, 
        luoghi, 
        loading: loadingData, // Stato di caricamento per i dati master
    } = useData();

    // 2. Stato specifico per i rapportini
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [loadingRapportini, setLoadingRapportini] = useState(true);

    // 3. Carica i rapportini in modo separato con un useEffect
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'rapportini'), 
            (snapshot) => {
                const rapportiniData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
                setRapportini(rapportiniData);
                setLoadingRapportini(false);
            },
            (error) => {
                console.error("Errore nel caricamento dei rapportini: ", error);
                setLoadingRapportini(false);
            }
        );

        // Funzione di pulizia per annullare la sottoscrizione
        return () => unsubscribe();
    }, []); // L'array vuoto assicura che l'effetto venga eseguito solo una volta

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

    // 4. Mappe per la risoluzione degli ID, come prima
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

    // 5. Stato di caricamento combinato
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
                    onDelete={(id) => console.log("Elimina", id)}
                />
            </Paper>

            {/* Il controller del form rimane invariato */}
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
