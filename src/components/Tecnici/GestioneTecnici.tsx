import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Tecnico, Ditta, Categoria } from '../../models/definitions';
import TecniciList from './TecniciList';
import { Box, CircularProgress, Typography } from '@mui/material';

const GestioneTecnici = () => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [ditteMap, setDitteMap] = useState(new Map<string, string>());
    const [categorieMap, setCategorieMap] = useState(new Map<string, string>());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Carica Tecnici
                const tecniciSnapshot = await getDocs(collection(db, 'tecnici'));
                const tecniciData = tecniciSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Tecnico[];
                setTecnici(tecniciData);

                // Carica Ditte
                const ditteSnapshot = await getDocs(collection(db, 'ditte'));
                const ditteData = new Map(ditteSnapshot.docs.map(doc => [doc.id, (doc.data() as Ditta).nome]));
                setDitteMap(ditteData);

                // Carica Categorie
                const categorieSnapshot = await getDocs(collection(db, 'categorie'));
                const categorieData = new Map(categorieSnapshot.docs.map(doc => [doc.id, (doc.data() as Categoria).nome]));
                setCategorieMap(categorieData);

            } catch (err) {
                console.error("Errore nel caricamento dati per Gestione Tecnici:", err);
                setError("Impossibile caricare i dati dei tecnici. Si è verificato un errore.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    // Queste funzioni andranno implementate per gestire l'interazione
    const handleAction = (action: string, data?: Tecnico | { id: string; checked: boolean } | string) => {
        console.log(`Azione: ${action}`, data);
        // Qui andrà la logica per aggiungere, modificare, eliminare, etc.
    };

    return (
        <TecniciList 
            tecnici={tecnici}
            ditteMap={ditteMap}
            categorieMap={categorieMap}
            onViewDetails={(tecnico) => handleAction('view', tecnico)}
            onStatusChange={(e, tecnico) => handleAction('statusChange', { id: tecnico.id, checked: e.target.checked })}
            onSyncChange={(e, tecnico) => handleAction('syncChange', { id: tecnico.id, checked: e.target.checked })}
            onEdit={(tecnico) => handleAction('edit', tecnico)}
            onDelete={(e, id) => handleAction('delete', id)}
            onAdd={() => handleAction('add')}
        />
    );
};

export default GestioneTecnici;
