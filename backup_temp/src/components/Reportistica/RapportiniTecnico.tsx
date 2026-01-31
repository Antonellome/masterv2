import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc } from 'firebase/firestore';
import { List, ListItemButton, ListItemText, Typography, Box, CircularProgress, Paper, Collapse, TextField } from '@mui/material';
import RisultatiRicerca from './RisultatiRicerca';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import type { Tecnico, Rapportino } from '../../models/definitions'; // <-- USA I TIPI CORRETTI

const RapportiniTecnico = () => {
  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<string | null>(null);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]); // <-- Tipizza lo stato
  const [loadingTecnici, setLoadingTecnici] = useState(true);
  const [loadingRapportini, setLoadingRapportini] = useState(false);

  useEffect(() => {
    const fetchTecnici = async () => {
      setLoadingTecnici(true);
      try {
        const tecniciSnap = await getDocs(collection(db, 'tecnici'));
        const tecniciList = tecniciSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Tecnico))
          .sort((a, b) => (a.cognome + a.nome).localeCompare(b.cognome + b.nome));
        setTecnici(tecniciList);
      } catch (error) {
        console.error("Errore nel caricamento dei tecnici:", error);
      }
      setLoadingTecnici(false);
    };
    fetchTecnici();
  }, []);

  const handleTecnicoClick = async (tecnicoId: string) => {
    if (selectedTecnicoId === tecnicoId) {
      setSelectedTecnicoId(null);
      setRapportini([]);
    } else {
      setSelectedTecnicoId(tecnicoId);
      setLoadingRapportini(true);
      try {
        // <-- QUERY CORRETTA: Cerca per riferimento, non per stringa ID
        const tecnicoRef = doc(db, 'tecnici', tecnicoId);
        const q = query(
          collection(db, "rapportini"), 
          where("tecnicoScrivente", "==", tecnicoRef),
          orderBy("data", "desc")
        );
        const querySnapshot = await getDocs(q);
        // <-- MAPPA I DATI AL TIPO CORRETTO
        const rapportiniList = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Rapportino));
        setRapportini(rapportiniList);
      } catch (error) {
        console.error(`Errore nel caricamento dei rapportini per il tecnico ${tecnicoId}:`, error);
        setRapportini([]);
      }
      setLoadingRapportini(false);
    }
  };

  const filteredTecnici = useMemo(() => 
    tecnici.filter(tecnico => 
      `${tecnico.nome} ${tecnico.cognome}`.toLowerCase().includes(searchTerm.toLowerCase())
    ), [tecnici, searchTerm]);

  if (loadingTecnici) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Cerca un tecnico per nome o cognome</Typography>
        <TextField
            fullWidth
            label="Cerca tecnico..."
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
        />
        <List component="nav" sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
            {filteredTecnici.map((tecnico) => (
                <React.Fragment key={tecnico.id}>
                    <ListItemButton onClick={() => handleTecnicoClick(tecnico.id)}>
                        <ListItemText primary={`${tecnico.cognome} ${tecnico.nome}`} />
                        {selectedTecnicoId === tecnico.id ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                </React.Fragment>
            ))}
        </List>

        <Collapse in={!!selectedTecnicoId} timeout="auto" unmountOnExit>
            <Box sx={{ pt: 2 }}>
                <Typography variant="h6" gutterBottom>Rapportini trovati</Typography>
                <RisultatiRicerca risultati={rapportini} loading={loadingRapportini} />
            </Box>
        </Collapse>
    </Paper>
  );
};

export default RapportiniTecnico;
