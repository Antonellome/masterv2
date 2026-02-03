import { useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
import dayjs from 'dayjs';
import { Box, CircularProgress, Typography, Alert, useTheme } from '@mui/material';
// Removing ResponsiveContainer and related imports that caused the error.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import StyledCard from '@/components/StyledCard';
import type { Rapportino } from '@/models/definitions';

interface ChartData {
    name: string;
    ore: number;
}

const RapportiniChartWidget = () => {
  const theme = useTheme();

  const lastWeekQuery = useMemo(() => {
      const lastWeek = Timestamp.fromDate(dayjs().subtract(7, 'days').startOf('day').toDate());
      return query(collection(db, 'rapportini'), where('data', '>=', lastWeek));
  }, []);
  
  const { data: rapportini, loading, error } = useCollectionData<Rapportino>(lastWeekQuery);

  const chartData: ChartData[] = useMemo(() => {
    if (!rapportini) return [];
    const weekData = Array.from({ length: 7 }, (_, i) => {
        const date = dayjs().subtract(6 - i, 'day');
        return { name: date.format('ddd'), ore: 0 };
    });
    rapportini.forEach(rapportino => {
      const rapportinoDate = dayjs((rapportino.data as Timestamp).toDate());
      const dayName = rapportinoDate.format('ddd');
      const targetDay = weekData.find(d => d.name === dayName);
      if(targetDay) {
          targetDay.ore += (rapportino.oreLavoro || 0) + (rapportino.oreViaggio || 0);
      }
    });
    return weekData;
  }, [rapportini]);

  return (
      <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ p: 2, pb: 0 }}>Rapportini Settimanali</Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              {loading && <CircularProgress />}
              {error && <Alert severity="error">{error.message}</Alert>}
              {!loading && !error && (
                  // Using fixed width and height to prevent rendering errors.
                  <BarChart width={700} height={200} data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} dy={5}/>
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false}/>
                      <Tooltip 
                          formatter={(value: number) => [value, 'Ore']}
                          wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="ore" fill={theme.palette.primary.main} />
                  </BarChart>
              )}
          </Box>
      </StyledCard>
  );
};

export default RapportiniChartWidget;
