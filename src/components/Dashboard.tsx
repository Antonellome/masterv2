
import { useMemo, useState, useEffect } from 'react';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import { logger } from '@/utils/logger';
import dayjs from 'dayjs';
import { parseToDayjs } from '@/utils/dateUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

// Wrapper per forzare il rendering solo sul client
const ClientOnly = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Mostra un loader o null durante il rendering iniziale del server
    return <div style={{ height: '350px'}}><p>Caricamento grafici...</p></div>;
  }

  return <>{children}</>;
};

const MonthPicker = ({ selectedMonth, onChange }) => {
    const handleMonthChange = (e) => {
        onChange(e.target.value);
    };
    return (
        <div className="flex items-center space-x-2">
            <label htmlFor="month-select" className="text-sm font-medium">Mese:</label>
            <input 
                type="month" 
                id="month-select" 
                value={selectedMonth} 
                onChange={handleMonthChange} 
                className="p-2 border rounded-md"
            />
        </div>
    );
};

const Dashboard = () => {
    const rapportini = useRapportiniStore(state => state.rapportini);
    const naviMap = useRapportiniStore(state => state.naviMap);
    const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

    const filteredData = useMemo(() => {
        if (!selectedMonth || rapportini.length === 0) return [];
        const startOfMonth = dayjs(selectedMonth).startOf('month');
        const endOfMonth = dayjs(selectedMonth).endOf('month');
        return rapportini.filter(r => {
            const rapportinoDate = parseToDayjs(r.data);
            if (!rapportinoDate || !rapportinoDate.isValid()) return false;
            return !rapportinoDate.isBefore(startOfMonth) && !rapportinoDate.isAfter(endOfMonth);
        });
    }, [rapportini, selectedMonth]);

    const totalOreLavorate = useMemo(() => 
        filteredData.reduce((acc, curr) => acc + (curr.oreLavoro || 0), 0),
    [filteredData]);

    const totalRapportiniCreati = filteredData.length;

    const orePerNave = useMemo(() => {
        const data = filteredData.reduce((acc, curr) => {
            const naveNome = naviMap.get(curr.naveId!)?.nome || 'Non specificata';
            if (!acc[naveNome]) acc[naveNome] = 0;
            acc[naveNome] += curr.oreLavoro || 0;
            return acc;
        }, {} as { [key: string]: number });
        return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredData, naviMap]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <MonthPicker selectedMonth={selectedMonth} onChange={setSelectedMonth} />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ore Lavorate nel periodo</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOreLavorate.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">Totale ore dichiarate nel mese selezionato</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rapportini Creati nel periodo</CardTitle>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRapportiniCreati}</div>
                        <p className="text-xs text-muted-foreground">Numero di rapportini nel mese selezionato</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <ClientOnly>
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Ore Lavorate per Nave nel mese</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={orePerNave.slice(0, 15)} layout="vertical">
                                <XAxis type="number" stroke="#888888" fontSize={12} />
                                <YAxis type="category" dataKey="name" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <Tooltip cursor={{ fill: 'transparent' }}/>
                                <Bar dataKey="value" fill="#adfa1d" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Ore lavorate per Nave (Top 6)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie data={orePerNave.slice(0, 6)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {orePerNave.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
              </ClientOnly>
            </div>
        </div>
    );
};

export default Dashboard;
