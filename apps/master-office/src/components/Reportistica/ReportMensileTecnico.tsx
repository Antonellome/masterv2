import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Icon,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { collection } from 'firebase/firestore';
import { useCollectionData } from '../../hooks/useCollectionData';
import { db } from '../../firebase';
import type { Tecnico } from '../../types/definitions';
import { Assessment, Email } from '@mui/icons-material';

interface ReportMensileTecnicoProps {
  onGenerateReport: (tecnico: Tecnico) => void;
}

const ReportMensileTecnico: React.FC<ReportMensileTecnicoProps> = ({ onGenerateReport }) => {
  const theme = useTheme();
  const { data: tecnici, loading } = useCollectionData<Tecnico>(
    collection(db, 'tecnici')
  );

  // Stile della card, copiato da TecniciList.tsx
  const getCardStyle = () => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeft: `5px solid ${theme.palette.divider}`,
    p: 2,
    mb: 2,
  });

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 2, background: theme.palette.background.paper, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
            <Icon component={Assessment} sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
                <Typography variant="h5" component="div" fontWeight="bold">
                    Selezione Tecnico per Report
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Scegli un tecnico dalla lista per generare il report mensile.
                </Typography>
            </Box>
        </Box>

        {tecnici && tecnici.map(tecnico => (
            <Paper key={tecnico.id} elevation={2} sx={getCardStyle()}>
                {/* Sezione Informazioni Principali */}
                <Box sx={{ flexGrow: 1, pr: 2 }}>
                    <Typography variant="h6">{tecnico.cognome} {tecnico.nome}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        {tecnico.email 
                            ? <><Email sx={{ fontSize: '1rem', mr: 0.5 }} /> {tecnico.email}</>
                            : 'Email non disponibile'}
                    </Typography>
                </Box>

                {/* Sezione Azioni */}
                <Box sx={{ flexShrink: 0 }}>
                    <Button 
                        variant="contained" 
                        onClick={() => onGenerateReport(tecnico)}
                    >
                        Genera Report
                    </Button>
                </Box>
            </Paper>
        ))}
    </Box>
  );
};

export default ReportMensileTecnico;
