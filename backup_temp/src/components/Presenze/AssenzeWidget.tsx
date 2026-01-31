import React, { useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { collection, getFirestore, query, where, Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { useCollection } from 'react-firebase-hooks/firestore';
import type { Tecnico, Rapportino } from '@/models/definitions';
import StyledCard from '@/components/StyledCard';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

dayjs.extend(isSameOrAfter);

const AssenzeWidget = () => {
  const firestore = getFirestore();

  // Fetch all active technicians
  const [tecniciSnapshot, loadingTecnici, errorTecnici] = useCollection(
    query(collection(firestore, 'tecnici'), where('attivo', '==', true))
  );
  const tecniciAttivi = useMemo(() => 
    tecniciSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico)) || [],
  [tecniciSnapshot]);

  // Fetch rapportini from the last 7 days to check for missing ones
  const lastWeekStart = dayjs().subtract(7, 'days').startOf('day');
  const yesterdayEnd = dayjs().subtract(1, 'day').endOf('day');

  const [rapportiniSnapshot, loadingRapportini, errorRapportini] = useCollection(
    query(
      collection(firestore, 'rapportini'),
      where('data', '>=', Timestamp.fromDate(lastWeekStart.toDate())),
      where('data', '<=', Timestamp.fromDate(yesterdayEnd.toDate()))
    )
  );

  const rapportiniMancanti = useMemo(() => {
    if (loadingTecnici || loadingRapportini || !tecniciAttivi.length) {
      return 0;
    }

    let totalMissing = 0;
    const datesToCheck = [];

    // Create a list of the last 7 weekdays (Mon-Fri), excluding today
    for (let i = 1; i <= 7; i++) {
      const date = dayjs().subtract(i, 'day');
      const dayOfWeek = date.day(); // Sunday = 0, Saturday = 6
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        datesToCheck.push(date.format('YYYY-MM-DD'));
      }
    }
    
    const rapportiniByDate = new Map<string, Set<string>>();
    rapportiniSnapshot?.docs.forEach(doc => {
        const r = doc.data() as Rapportino;
        const dateStr = dayjs((r.data as Timestamp).toDate()).format('YYYY-MM-DD');
        const tecnicoId = r.tecnicoScrivente?.id;
        if (tecnicoId) {
            if (!rapportiniByDate.has(dateStr)) {
                rapportiniByDate.set(dateStr, new Set());
            }
            rapportiniByDate.get(dateStr)!.add(tecnicoId);
        }
    });

    for (const dateStr of datesToCheck) {
        const presentiDelGiorno = rapportiniByDate.get(dateStr) || new Set();
        const mancantiDelGiorno = tecniciAttivi.length - presentiDelGiorno.size;
        if (mancantiDelGiorno > 0) {
            totalMissing += mancantiDelGiorno;
        }
    }
    
    return totalMissing;

  }, [tecniciAttivi, rapportiniSnapshot, loadingTecnici, loadingRapportini]);

  const loading = loadingTecnici || loadingRapportini;
  const error = errorTecnici || errorRapportini;

  return (
    <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            Rapportini Mancanti
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', p: 2 }}>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">Si è verificato un errore.</Alert>}
            {!loading && !error && (
                <>
                    <ErrorOutlineIcon color="error" sx={{ fontSize: 40 }}/>
                    <Typography variant="h2" component="p" sx={{ fontWeight: 'bold' }}>
                        {rapportiniMancanti}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Nell'ultima settimana lavorativa
                    </Typography>
                </>
            )}
        </Box>
    </StyledCard>
  );
};

export default AssenzeWidget;
