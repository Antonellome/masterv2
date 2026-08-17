
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs, Paper, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RicercaAvanzata from '@/components/Reportistica/RicercaAvanzata';
import ReportMensili from '@/components/Reportistica/ReportMensili';
import CumulativiTecnici from '@/components/Reportistica/CumulativiTecnici';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ReportisticaPage = () => {
  const [value, setValue] = useState(0);
  const navigate = useNavigate();

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };


  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs value={value} onChange={handleChange} aria-label="reportistica tabs">
          <Tab label="Ricerca Avanzata" />
          <Tab label="Report Mensili" />
          <Tab label="Cumulativi Tecnici" />
        </Tabs>
        <Tooltip title="Nuovo Rapportino">
            <IconButton onClick={() => handleNavigation('/rapportino/edit/new')} sx={{ ml: 2, backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }}>
                <AddIcon />
            </IconButton>
        </Tooltip>
      </Box>
      {/* FIX: Cambiato da overflow: hidden a overflow: auto per abilitare lo scroll V & H */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <CustomTabPanel value={value} index={0}>
            <RicercaAvanzata />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
            <ReportMensili />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
            <CumulativiTecnici />
        </CustomTabPanel>
      </Box>
    </Paper>
  );
};

export default ReportisticaPage;
