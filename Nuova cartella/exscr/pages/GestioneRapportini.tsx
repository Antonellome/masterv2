import React, { useState, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useCollection } from '@/hooks/useCollection';
import type { Rapportino, Tecnico, Nave, Luogo } from '@/models/definitions';
import RapportiniList from '@/components/Rapportini/RapportiniList';
import { RapportinoFormController } from '@/components/Rapportini/RapportinoFormController';

const GestioneRapportini = () => {
    // 1. Carica tutte le collezioni necessarie
    const { data: tecnici, loading: loadingTecnici } = useCollection<Tecnico>('tecnici');
    const { data: rapportini, loading: loadingRapportini } = useCollection<Rapportino>('rapportini');
    const { data: navi, loading: loadingNavi } = useCollection<Nave>('navi');
    const { data: luoghi, loading: loadingLuoghi } = useCollection<Luogo>('luoghi');

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

    // 2. Crea le "mappe" per risolvere gli ID in nomi leggibili.
    // La mappa dei tecnici ora contiene l'intero oggetto per accedere a nome e cognome.
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

    const isLoading = loadingTecnici || loadingRapportini || loadingNavi || loadingLuoghi;

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
                Gestione Rapportini
            </Typography>
            <Paper elevation={3} sx={{ p: 2 }}>
                <RapportiniList 
                    rapportini={rapportini || []}
                    tecniciMap={tecniciMap}
                    naviMap={naviMap}
                    luoghiMap={luoghiMap}
                    loading={isLoading}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={(id) => console.log("Elimina", id)} // Logica di eliminazione da implementare
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
