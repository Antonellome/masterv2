
import React, { useMemo } from 'react';
import { Box, Alert } from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import { useRealtimeCheckins } from '@/hooks/useRealtimeCheckins';
import { CheckinData } from '@/models/definitions';
import CheckinFilters from './CheckinFilters';
import CheckinList from './CheckinList';
import CheckinVisivo from './CheckinVisivo'; // Importazione del componente visivo
import { useFilteredCheckins } from '@/hooks/useFilteredCheckins';

interface CheckinSectionProps {
  selectedDate: Dayjs | null;
}

const CheckinSection: React.FC<CheckinSectionProps> = ({ selectedDate }) => {
  const isToday = selectedDate ? dayjs().isSame(selectedDate, 'day') : false;

  // L'hook ora è l'unica fonte di verità per i dati in tempo reale
  const { checkins, loading, error } = useRealtimeCheckins(isToday ? selectedDate : null);
  const { filtri, setFiltri, checkinsFiltrati } = useFilteredCheckins(checkins);

  const checkinsAggregati = useMemo(() => {
    if (!checkinsFiltrati) return new Map<string, CheckinData[]>();

    return checkinsFiltrati.reduce((acc, checkin) => {
        // Usa l'ID dell'anagrafica come chiave, gestendo il caso in cui non sia definito
        const key = checkin.anagrafica?.id || 'anagrafica-sconosciuta';
        if (!acc.has(key)) {
          acc.set(key, []);
        }
        acc.get(key)!.push(checkin);
        return acc;
    }, new Map<string, CheckinData[]>());
  }, [checkinsFiltrati]);

  if (!isToday) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
        Il monitoraggio dei check-in in tempo reale è disponibile solo per la data odierna.
      </Alert>
    );
  }

  return (
      <Box>
          <CheckinFilters filtri={filtri} onFilterChange={setFiltri} />

          {/* Aggiunta del componente di riepilogo visivo */}
          <CheckinVisivo 
            checkins={checkinsFiltrati} 
            loading={loading} 
            error={error} 
          />

          {/* La lista dei check-in rimane invariata */}
          <CheckinList 
              aggregatedCheckins={checkinsAggregati} 
              loading={loading} 
              error={error}
          />
      </Box>
  );
};

export default CheckinSection;
