import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs, Paper, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RicercaAvanzata from '@/components/Reportistica/RicercaAvanzata';
import AnalisiOre from '@/components/Reportistica/AnalisiOre';
import ReportMensili from '@/components/Reportistica/ReportMensili';

// Pannello semplificato: un semplice contenitore condizionale
function CustomTabPanel(props: { children?: React.ReactNode; index: number; value: number; }) {
    const { children, value, index } = props;
    return value === index ? <>{children}</> : null;
}

const ReportisticaPage = () => {
  const [value, setValue] = useState(0); // Default a Ricerca Avanzata
  const navigate = useNavigate();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    // Contenitore principale che definisce un layout a colonna e occupa l'altezza della viewport
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Barra delle Tab - non cresce, non si restringe */}
      <Box sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider', p: 1, display: 'flex', alignItems: 'center' }}>
        <Tabs value={value} onChange={handleChange} variant="scrollable" scrollButtons="auto" sx={{ flexGrow: 1 }}>
          <Tab label="Ricerca Avanzata" />
          <Tab label="Report Mensili" />
          <Tab label="Analisi Ore Lavorate" />
        </Tabs>
        <Tooltip title="Nuovo Rapportino">
          <IconButton onClick={() => navigate('/rapportini/nuovo')} sx={{ ml: 2, backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Contenitore del contenuto della Tab - CRESCE e ha il PADDING */}
      {/* Il Paper interno gestirà lo SCORRIMENTO */}
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        <Paper elevation={3} sx={{ height: '100%', width: '100%', overflow: 'auto', borderRadius: 2 }}>
            <CustomTabPanel value={value} index={0}>
                <RicercaAvanzata />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <ReportMensili />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
                {/* AnalisiOre riceve il padding dal genitore e non ha bisogno di stili di layout complessi */}
                <AnalisiOre />
            </CustomTabPanel>
        </Paper>
      </Box>
    </Box>
  );
};

export default ReportisticaPage;
