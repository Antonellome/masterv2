import { useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
import dayjs from 'dayjs';
import { Box, CircularProgress, Typography, Alert, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import StyledCard from '@/components/StyledCard';
import type { Presenza, Rapportino } from '@/models/definitions';

interface ChartData {
    name: string;
    presenti: number;
    assenti: number;
}

const generateChartData = (presenze: Presenza[] | undefined, rapportini: Rapportino[] | undefined): ChartData[] => {
    if (!presenze || !rapportini) return [];
    const today = dayjs();
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const chartData: ChartData[] = [];
    const allTecnici = new Set(presenze.map(p => p.tecnicoId));
    rapportini.forEach(r => r.tecnicoScrivente?.id && allTecnici.add(r.tecnicoScrivente.id));
    const totaleTecnici = allTecnici.size;

    for (let i = 6; i >= 0; i--) {
        const date = today.subtract(i, 'day');
        const dayName = days[date.day()];
        const tecniciConRapportino = new Set(
            rapportini
                .filter(r => dayjs((r.data as Timestamp).toDate()).isSame(date, 'day'))
                .map(r => r.tecnicoScrivente?.id)
                .filter(Boolean) as string[]
        );
        const presenti = tecniciConRapportino.size;
        const assenti = Math.max(0, totaleTecnici - presenti);
        chartData.push({ name: dayName, presenti, assenti });
    }
    return chartData;
};

const RapportiniPresenzeWidget = () => {
  const theme = useTheme();
  const lastWeekQuery = useMemo(() => {
      const lastWeek = Timestamp.fromDate(dayjs().subtract(7, 'days').toDate());
      return query(collection(db, 'rapportini'), where('data', '>=', lastWeek));
  }, []);
  const { data: rapportini, loading: loadingRapportini, error: errorRapportini } = useCollectionData<Rapportino>(lastWeekQuery);
  const presenzeQuery = useMemo(() => query(collection(db, 'presenze')), []);
  const { data: presenze, loading: loadingPresenze, error: errorPresenze } = useCollectionData<Presenza>(presenzeQuery);
  const chartData = useMemo(() => generateChartData(presenze, rapportini), [presenze, rapportini]);
  const loading = loadingRapportini || loadingPresenze;
  const error = errorRapportini || errorPresenze;

  return (
      <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>Presenze Settimanali</Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          {loading && <CircularProgress />}
          {error && <Alert severity="error">{error.message}</Alert>}
          {!loading && !error && (
              <BarChart width={350} height={200} data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} dy={5} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} verticalAlign="top" align="center" />
                  <Bar dataKey="presenti" stackId="a" fill={theme.palette.success.main} name="Presenti" />
                  <Bar dataKey="assenti" stackId="a" fill={theme.palette.error.main} name="Assenti" />
              </BarChart>
          )}
        </Box>
      </StyledCard>
  );
};

export default RapportiniPresenzeWidget;
