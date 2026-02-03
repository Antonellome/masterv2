import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useData } from '@/hooks/useData';
import type { Tecnico } from '@/models/definitions';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';

const TIPI_GIORNATA_GIUSTIFICATIVI = ['ferie', 'permesso', '104', 'malattia'];

const Presenze = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const navigate = useNavigate();
  const { tecnici, rapportini, loading } = useData();

  const rapportiniDelGiorno = useMemo(() => {
      if (!selectedDate) return [];
      return rapportini.filter(r => r.data && dayjs(r.data.toDate()).isSame(selectedDate, 'day'));
  }, [rapportini, selectedDate]);

  const { operativi, assentiGiustificati, mancantiAttivi, assentiNonAttivi } = useMemo(() => {
    if (loading) {
        return { operativi: [], assentiGiustificati: [], mancantiAttivi: [], assentiNonAttivi: [] };
    }

    const presentiMap = new Map<string, { tecnico: Tecnico, giornata: string, tipo: 'operativo' | 'giustificato' }>();

    for (const rapportino of rapportiniDelGiorno) {
        const tecniciNelRapportinoRefs = [
            rapportino.tecnicoScrivente,
            ...(rapportino.tecniciAggiunti || [])
        ].filter(Boolean);

        for (const tecnicoRef of tecniciNelRapportinoRefs) {
            if (!tecnicoRef?.id || presentiMap.has(tecnicoRef.id)) {
                continue; 
            }
            
            const giornataLower = rapportino.giornata.toString().toLowerCase();
            const tipo = TIPI_GIORNATA_GIUSTIFICATIVI.includes(giornataLower) ? 'giustificato' : 'operativo';
            
            const tecnicoCompleto = tecnici.find(t => t.id === tecnicoRef.id);
            if (tecnicoCompleto) {
                presentiMap.set(tecnicoRef.id, { tecnico: tecnicoCompleto, giornata: rapportino.giornata.toString(), tipo });
            }
        }
    }

    const operativi: { tecnico: Tecnico, giornata: string }[] = [];
    const assentiGiustificati: { tecnico: Tecnico, giornata: string }[] = [];
    presentiMap.forEach(value => {
        if (value.tipo === 'operativo') operativi.push(value);
        else assentiGiustificati.push(value);
    });

    const mancantiAttivi: Tecnico[] = [];
    const assentiNonAttivi: Tecnico[] = [];

    for (const tecnico of tecnici) {
        if (tecnico.id && !presentiMap.has(tecnico.id)) {
            if (tecnico.attivo) {
                mancantiAttivi.push(tecnico);
            } else {
                assentiNonAttivi.push(tecnico);
            }
        }
    }

    return { operativi, assentiGiustificati, mancantiAttivi, assentiNonAttivi };

  }, [tecnici, rapportiniDelGiorno, loading]);
  
  const handleCreaRapportino = (tecnico: Tecnico) => {
      if (!selectedDate) return;
      navigate('/rapportini/nuovo', {
          state: {
              initialTecnicoId: tecnico.id,
              initialDate: selectedDate.toISOString(),
          }
      });
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <DatePicker
          label="Seleziona Data"
          value={selectedDate}
          onChange={setSelectedDate}
          sx={{ width: '100%' }}
        />
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
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

                 <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Operativi ({operativi.length})</Typography>
                     <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflowY: 'auto' }}>
                        <List dense>
                            {operativi.map(({ tecnico, giornata }) => (
                                <ListItem key={tecnico.id}>
                                     <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><CheckCircleOutlineIcon color="success"/></Avatar></ListItemAvatar>
                                    <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} />
                                    <Chip label={giornata} color="success" size="small" variant="outlined"/>
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
                            {assentiGiustificati.map(({ tecnico, giornata }) => (
                                <ListItem key={tecnico.id}>
                                    <ListItemAvatar><Avatar sx={{ width: 32, height: 32 }}><HelpOutlineIcon color="info"/></Avatar></ListItemAvatar>
                                    <ListItemText primary={`${tecnico.nome} ${tecnico.cognome}`} />
                                    <Chip label={giornata} color="info" size="small" variant="outlined"/>
                                </ListItem>
                            ))}
                            {assentiGiustificati.length === 0 && <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Nessuna assenza giustificata.</Typography>}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </>
      )}
    </Box>
  );
};

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
