
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Paper,
    Button,
    Chip,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { type Dayjs } from 'dayjs';
import { useData } from '@/hooks/useData';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase'; 
import type { Tecnico, Rapportino, TipoGiornata } from '@/models/definitions';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import FunctionsIcon from '@mui/icons-material/Functions';
import PeopleIcon from '@mui/icons-material/People';
import EuroSymbolIcon from '@mui/icons-material/EuroSymbol';

const TIPI_GIORNATA_GIUSTIFICATIVI = ['ferie', 'permesso', '104', 'malattia'];

interface StoricoPresenzeProps {
    selectedDate: Dayjs | null;
}

const StoricoPresenze: React.FC<StoricoPresenzeProps> = ({ selectedDate }) => {
  const [rapportiniDelGiorno, setRapportiniDelGiorno] = useState<Rapportino[]>([]);
  const [loadingRapportini, setLoadingRapportini] = useState<boolean>(true);
  const [errorRapportini, setErrorRapportini] = useState<string | null>(null);
  const navigate = useNavigate();

  const { tecnici, tipiGiornata, loading: loadingAnagrafiche, error: errorAnagrafiche } = useData();
  
  const tipiGiornataMap = useMemo(() => new Map(tipiGiornata.map(t => [t.id, t])), [tipiGiornata]);

  useEffect(() => {
    if (!selectedDate) return;

    setLoadingRapportini(true);
    setErrorRapportini(null);

    const startOfDay = selectedDate.startOf('day').toDate();
    const endOfDay = selectedDate.endOf('day').toDate();

    const q = query(
      collection(db, 'rapportini'),
      where('data', '>=', Timestamp.fromDate(startOfDay)),
      where('data', '<=', Timestamp.fromDate(endOfDay))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
        setRapportiniDelGiorno(data);
        setLoadingRapportini(false);
    }, (error) => {
        console.error("Error fetching rapportini: ", error);
        setErrorRapportini("Errore nel caricamento dei rapportini.");
        setLoadingRapportini(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  // --- NUOVA LOGICA DI AGGREGAZIONE ---
  const aggregateData = useMemo(() => {
    if (rapportiniDelGiorno.length === 0) {
        return { oreTotali: 0, tecniciCoinvolti: 0, costoTotale: 'N/D' };
    }

    const oreTotali = rapportiniDelGiorno.reduce((acc, curr) => {
        const oreLavorate = parseFloat(String(curr.ore_lavorate || '0'));
        const oreStraordinario = parseFloat(String(curr.ore_straordinario || '0'));
        return acc + oreLavorate + oreStraordinario;
    }, 0);

    const tecniciUnici = new Set(rapportiniDelGiorno.flatMap(r => r.presenze || []));

    return {
        oreTotali,
        tecniciCoinvolti: tecniciUnici.size,
        costoTotale: 'N/D' // Logica da implementare
    };
  }, [rapportiniDelGiorno]);

  const { operativi, assentiGiustificati, mancantiAttivi, assentiNonAttivi } = useMemo(() => {
    const presentiSet = new Set<string>();
    const operativi: { tecnico: Tecnico, tipoGiornata: TipoGiornata }[] = [];
    const assentiGiustificati: { tecnico: Tecnico, tipoGiornata: TipoGiornata }[] = [];

    for (const rapportino of rapportiniDelGiorno) {
        const allTecniciInRapportino = rapportino.presenze || [];

        for (const tecnicoId of allTecniciInRapportino) {
            if (presentiSet.has(tecnicoId)) continue;
            presentiSet.add(tecnicoId);

            const tecnico = tecnici.find(t => t.id === tecnicoId);
            const tipoGiornata = tipiGiornataMap.get(rapportino.tipoGiornataId);

            if (tecnico && tipoGiornata) {
                const tipoGiornataLower = tipoGiornata.nome.toLowerCase();
                if (TIPI_GIORNATA_GIUSTIFICATIVI.includes(tipoGiornataLower)) {
                    assentiGiustificati.push({ tecnico, tipoGiornata });
                } else {
                    operativi.push({ tecnico, tipoGiornata });
                }
            }
        }
    }

    const mancantiAttivi = tecnici.filter(t => t.attivo && !presentiSet.has(t.id));
    const assentiNonAttivi = tecnici.filter(t => !t.attivo && !presentiSet.has(t.id));

    return { operativi, assentiGiustificati, mancantiAttivi, assentiNonAttivi };
  }, [rapportiniDelGiorno, tecnici, tipiGiornataMap]);

  const handleCreaRapportino = (tecnico: Tecnico) => {
      if (!selectedDate) return;
      navigate('/rapportino/edit/new', {
          state: {
              initialTecnicoId: tecnico.id,
              initialDate: selectedDate.toISOString(),
          }
      });
  };

  const loading = loadingAnagrafiche || loadingRapportini;
  const error = errorAnagrafiche || errorRapportini;

  if (loading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }
  if (error) {
      return <Alert severity="error">{error}</Alert>;
  }

  return (
      <Box>
            {/* --- NUOVA SEZIONE KPI DI ANALISI --- */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <AnalysisKPIBox title="Ore Totali Lavorate" value={aggregateData.oreTotali.toFixed(2)} icon={<FunctionsIcon color="primary" />} />
                <AnalysisKPIBox title="N. Tecnici Coinvolti" value={aggregateData.tecniciCoinvolti} icon={<PeopleIcon color="primary" />} />
                <AnalysisKPIBox title="Costo Totale" value={aggregateData.costoTotale} icon={<EuroSymbolIcon color="primary" />} />
            </Grid>

          <Grid container spacing={2} sx={{ mb: 4 }}>
              <KPIBox title="Operativi" count={operativi.length} icon={<CheckCircleOutlineIcon color="success" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Assenti Giustificati" count={assentiGiustificati.length} icon={<HelpOutlineIcon color="info" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Mancanti (Attivi)" count={mancantiAttivi.length} icon={<ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Assenti (Non Attivi)" count={assentiNonAttivi.length} icon={<NoAccountsIcon color="disabled" sx={{ fontSize: 40 }} />} />
          </Grid>

          <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Mancanti (Attivi) ({mancantiAttivi.length})</Typography>
                  <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto' }}>
                      <List dense>
                          {mancantiAttivi.map(tecnico => (
                              <ListItem key={tecnico.id}>
                                  <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><PersonIcon /></Avatar></ListItemAvatar>
                                  <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} />
                                  <Button size="small" variant="outlined" onClick={() => handleCreaRapportino(tecnico)}>Crea R.</Button>
                              </ListItem>
                          ))}
                          {mancantiAttivi.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Tutti gli attivi sono presenti.</Typography>}
                      </List>
                  </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Operativi ({operativi.length})</Typography>
                   <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto' }}>
                      <List dense>
                          {operativi.map(({ tecnico, tipoGiornata }) => (
                              <ListItem key={tecnico.id}>
                                   <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><CheckCircleOutlineIcon color="success"/></Avatar></ListItemAvatar>
                                  <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} />
                                  <Chip label={tipoGiornata.nome} color="success" size="small" variant="outlined"/>
                              </ListItem>
                          ))}
                           {operativi.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessun tecnico operativo.</Typography>}
                      </List>
                  </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Assenti Giustificati ({assentiGiustificati.length})</Typography>
                   <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto' }}>
                      <List dense>
                          {assentiGiustificati.map(({ tecnico, tipoGiornata }) => (
                              <ListItem key={tecnico.id}>
                                  <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><HelpOutlineIcon color="info"/></Avatar></ListItemAvatar>
                                  <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} />
                                  <Chip label={tipoGiornata.nome} color="info" size="small" variant="outlined"/>
                              </ListItem>
                          ))}
                          {assentiGiustificati.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessuna assenza giustificata.</Typography>}
                      </List>
                  </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Assenti (Non Attivi) ({assentiNonAttivi.length})</Typography>
                   <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto' }}>
                      <List dense>
                          {assentiNonAttivi.map(tecnico => (
                              <ListItem key={tecnico.id}>
                                   <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><NoAccountsIcon /></Avatar></ListItemAvatar>
                                  <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} secondary="Non attivo"/>
                              </ListItem>
                          ))}
                           {assentiNonAttivi.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessun tecnico non attivo.</Typography>}
                      </List>
                  </Paper>
              </Grid>
          </Grid>
      </Box>
  );
};

const KPIBox: React.FC<{ title: string; count: number; icon: React.ReactNode }> = ({ title, count, icon }) => (
    <Grid item xs={12} sm={6} md={3}>
        <Paper elevation={2} sx={{ p: 2, textAlign: 'center', height: '100%', borderRadius: '12px' }}>
            {icon}
            <Typography variant="h4">{count}</Typography>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
        </Paper>
    </Grid>
);

// --- NUOVO COMPONENTE KPI PER ANALISI ---
const AnalysisKPIBox: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Grid item xs={12} sm={4}>
        <Card elevation={3} sx={{ textAlign: 'center' }}>
            <CardContent>
                {icon}
                <Typography variant="h4" sx={{ mt: 1 }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{title}</Typography>
            </CardContent>
        </Card>
    </Grid>
);

export default StoricoPresenze;
