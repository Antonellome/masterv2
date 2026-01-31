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
    Grid,
    TextField, // Aggiunto
    InputAdornment // Aggiunto
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import type { Tecnico, Rapportino, TipoGiornata } from '@/models/definitions';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import SearchIcon from '@mui/icons-material/Search'; // Aggiunto

// --- HELPERS ---
async function fetchCollection<T>(collectionName: string): Promise<T[]> {
    const q = query(collection(db, collectionName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
}

const GIORNATE_ASSENZA_GIUSTIFICATA = ['ferie', 'malattia', 'permesso', 'legge 104', '104'];

// --- COMPONENTE --- 
const Presenze = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const navigate = useNavigate();

  const [tecnici, setTecnici] = useState<Tecnico[]>([]);
  const [tipiGiornata, setTipiGiornata] = useState<TipoGiornata[]>([]);
  const [rapportiniDelGiorno, setRapportiniDelGiorno] = useState<Rapportino[]>([]);
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetchingRapportini, setIsFetchingRapportini] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // NUOVO STATO PER LA RICERCA

  // 1. CARICAMENTO DATI STATICI
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [tecniciData, tipiGiornataData] = await Promise.all([
          fetchCollection<Tecnico>('tecnici'),
          fetchCollection<TipoGiornata>('tipiGiornata'),
        ]);
        // ORDINAMENTO PER COGNOME E NOME
        const sortedTecnici = tecniciData.sort((a, b) => {
          const cognomeCompare = a.cognome.localeCompare(b.cognome);
          if (cognomeCompare !== 0) return cognomeCompare;
          return a.nome.localeCompare(b.nome);
        });
        setTecnici(sortedTecnici);
        setTipiGiornata(tipiGiornataData);
      } catch (error) {
        console.error("Errore caricamento dati statici:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchStaticData();
  }, []);

  // 2. CARICAMENTO RAPPORTINI
  useEffect(() => {
    if (initialLoading) return;
    // ... (la logica di fetch rimane invariata)
        const fetchRapportini = async () => {
      if (!selectedDate) {
        setRapportiniDelGiorno([]);
        return;
      }
      setIsFetchingRapportini(true);
      try {
        const startOfDay = selectedDate.startOf('day').toDate();
        const endOfDay = selectedDate.endOf('day').toDate();

        const rapportiniRef = collection(db, 'rapportini');
        const q = query(rapportiniRef, where('data', '>=', startOfDay), where('data', '<=', endOfDay));

        const querySnapshot = await getDocs(q);
        const fetchedRapportini = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Rapportino[];
        setRapportiniDelGiorno(fetchedRapportini);

      } catch (error) {
        console.error("Errore caricamento rapportini:", error);
        setRapportiniDelGiorno([]);
      } finally {
        setIsFetchingRapportini(false);
      }
    };

    fetchRapportini();
  }, [selectedDate, initialLoading]);


  // 3. LOGICA DI FILTRAGGIO E CLASSIFICAZIONE
  const { operativi, assentiGiustificati, mancantiAttivi, assentiNonAttivi } = useMemo(() => {
    if (initialLoading) {
        return { operativi: [], assentiGiustificati: [], mancantiAttivi: [], assentiNonAttivi: [] };
    }

    // Filtra i tecnici in base alla ricerca
    const filteredTecnici = tecnici.filter(t => 
        `${t.nome} ${t.cognome}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tipiGiornataMap = new Map(tipiGiornata.map(tg => [tg.id, tg]));
    const presentiMap = new Map<string, { tecnico: Tecnico, giornata: string, tipo: 'operativo' | 'giustificato' }>();

    for (const rapportino of rapportiniDelGiorno) {
      const tuttiITecniciIds = [rapportino.tecnicoScriventeId, ...(rapportino.tecniciAggiuntiIds || [])].filter(Boolean) as string[];
      const giornataInfo = tipiGiornataMap.get(rapportino.giornataId);
      if (!giornataInfo) continue;

      const nomeGiornataLower = giornataInfo.nome.toLowerCase();
      const tipo = GIORNATE_ASSENZA_GIUSTIFICATA.includes(nomeGiornataLower) ? 'giustificato' : 'operativo';

      for (const tecnicoId of tuttiITecniciIds) {
          if (presentiMap.has(tecnicoId)) continue;
          const tecnicoCompleto = tecnici.find(t => t.id === tecnicoId); // Cerca nella lista completa
          if (tecnicoCompleto) {
              presentiMap.set(tecnicoId, { tecnico: tecnicoCompleto, giornata: giornataInfo.nome, tipo });
          }
      }
    }

    const op: any[] = [], assG: any[] = [], mancAtt: any[] = [], assNA: any[] = [];
    // Itera sulla lista GIA FILTRATA
    for (const tecnico of filteredTecnici) {
        const presenza = tecnico.id ? presentiMap.get(tecnico.id) : undefined;
        if (presenza) {
            if (presenza.tipo === 'operativo') op.push(presenza);
            else assG.push(presenza);
        } else {
            if (tecnico.attivo) mancAtt.push(tecnico);
            else assNA.push(tecnico);
        }
    }
    return { operativi: op, assentiGiustificati: assG, mancantiAttivi: mancAtt, assentiNonAttivi: assNA };

  }, [tecnici, tipiGiornata, rapportiniDelGiorno, initialLoading, searchTerm]); // Aggiunto searchTerm
  
  const handleCreaRapportino = (tecnico: Tecnico) => {
      if (!selectedDate) return;
      navigate('/rapportini/nuovo', { state: { initialTecnicoId: tecnico.id, initialDate: selectedDate.toISOString() } });
  };

  // --- RENDER --- 
  if (initialLoading) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
      <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <DatePicker label="Seleziona Data" value={selectedDate} onChange={setSelectedDate} sx={{ width: '100%' }} />
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
              <KPIBox title="Operativi" count={operativi.length} icon={<CheckCircleOutlineIcon color="success" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Assenti Giustificati" count={assentiGiustificati.length} icon={<HelpOutlineIcon color="info" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Mancanti (Attivi)" count={mancantiAttivi.length} icon={<ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />} />
              <KPIBox title="Assenti (Non Attivi)" count={assentiNonAttivi.length} icon={<NoAccountsIcon color="disabled" sx={{ fontSize: 40 }} />} />
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Cerca per nome o cognome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />
          </Paper>

          {isFetchingRapportini ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
          ) : (
              <Grid container spacing={3}>
                  <ListaTecnici titolo="Operativi" tecnici={operativi} tipo="operativo" />
                  <ListaTecnici titolo="Mancanti (Attivi)" tecnici={mancantiAttivi} tipo="mancante" onCreaRapportino={handleCreaRapportino} />
                  <ListaTecnici titolo="Assenti Giustificati" tecnici={assentiGiustificati} tipo="giustificato" />
                  <ListaTecnici titolo="Assenti (Non Attivi)" tecnici={assentiNonAttivi} tipo="non-attivo" />
              </Grid>
          )}
      </Box>
  );
};

// Componente riutilizzabile per le liste
const ListaTecnici = ({ titolo, tecnici, tipo, onCreaRapportino }: any) => {
  const getIcon = () => {
      switch(tipo) {
          case 'operativo': return <CheckCircleOutlineIcon color="success"/>;
          case 'giustificato': return <HelpOutlineIcon color="info"/>;
          case 'mancante': return <PersonIcon />;
          case 'non-attivo': return <NoAccountsIcon />;
          default: return <PersonIcon />;
      }
  };

  const getAvatar = (item: any) => {
    switch(tipo) {
        case 'operativo': return <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>{getIcon()}</Avatar>;
        case 'giustificato': return <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light' }}>{getIcon()}</Avatar>;
        default: return <Avatar sx={{ width: 32, height: 32 }}>{getIcon()}</Avatar>;
    }
  }

  return (
      <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>{`${titolo} (${tecnici.length})`}</Typography>
          <Paper variant="outlined" sx={{ p: 1, height: 400, overflowY: 'auto' }}>
              <List dense>
                  {tecnici.map((item: any) => (
                      <ListItem key={item.tecnico?.id || item.id}>
                          <ListItemAvatar>{getAvatar(item)}</ListItemAvatar>
                          <ListItemText 
                              primary={`${item.tecnico?.cognome || item.cognome} ${item.tecnico?.nome || item.nome}`}
                              secondary={tipo === 'non-attivo' ? 'Non attivo' : null}
                          />
                          {tipo === 'operativo' && <Chip label={item.giornata} color="success" size="small" variant="outlined"/>}
                          {tipo === 'giustificato' && <Chip label={item.giornata} color="info" size="small" variant="outlined"/>}
                          {tipo === 'mancante' && onCreaRapportino && 
                              <Button size="small" variant="outlined" onClick={() => onCreaRapportino(item)}>Crea R.</Button>
                          }
                      </ListItem>
                  ))}
                  {tecnici.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessun tecnico in questa lista.</Typography>}
              </List>
          </Paper>
      </Grid>
  )
}

const KPIBox = ({ title, count, icon }: { title: string, count: number, icon: React.ReactNode }) => (
    <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            {icon}
            <Typography variant="h4">{count}</Typography>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
        </Paper>
    </Grid>
);

export default Presenze;
