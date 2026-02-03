import { useMemo } from 'react';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useCollectionData } from '@/hooks/useCollectionData';
import dayjs from 'dayjs';
import { Box, CircularProgress, Typography, Alert, useTheme } from '@mui/material';
// Removing ResponsiveContainer and using fixed dimensions.
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import StyledCard from '@/components/StyledCard';
import type { Rapportino } from '@/models/definitions';

interface ChartData {
    name: string;
    ore: number;
}

const ClientiChartWidget = () => {
  const theme = useTheme();

  const lastMonthQuery = useMemo(() => {
      const lastMonth = Timestamp.fromDate(dayjs().subtract(30, 'days').startOf('day').toDate());
      return query(collection(db, 'rapportini'), where('data', '>=', lastMonth));
  }, []);
  
  const { data: rapportini, loading, error } = useCollectionData<Rapportino>(lastMonthQuery);

  const chartData: ChartData[] = useMemo(() => {
    if (!rapportini) return [];

    const hoursByClient = new Map<string, number>();

    rapportini.forEach(rapportino => {
      const clientName = rapportino.nave || 'N/A';
      const totalHours = (rapportino.oreLavoro || 0) + (rapportino.oreViaggio || 0);
      
      if (totalHours > 0) {
        hoursByClient.set(clientName, (hoursByClient.get(clientName) || 0) + totalHours);
      }
    });

    const sortedClients = Array.from(hoursByClient.entries())
      .map(([name, ore]) => ({ name, ore }))
      .sort((a, b) => b.ore - a.ore);

    return sortedClients.slice(0, 5).reverse();

  }, [rapportini]);

  return (
      <StyledCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ p: 2, pb: 0 }}>Top Clienti (Ultimi 30gg)</Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          {loading && <CircularProgress />}
          {error && <Alert severity="error">{error.message}</Alert>}
          {!loading && !error && (
              <BarChart 
                width={350} 
                height={200} 
                data={chartData} 
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80} 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} formatter={(value: number) => [value.toFixed(1), 'Ore']} />
                  <Bar dataKey="ore" fill={theme.palette.primary.main} barSize={15} />
              </BarChart>
          )}
        </Box>
      </StyledCard>
  );
};

export default ClientiChartWidget;
