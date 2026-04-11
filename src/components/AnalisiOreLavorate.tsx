
import React, { useState, useEffect } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Rapportino } from '@/models/definitions';
import { Dayjs } from 'dayjs';
import { Typography, Box, Paper, CircularProgress, Alert } from '@mui/material';

interface AnalisiOreLavorateProps {
    selectedDate: Dayjs | null;
}

const AnalisiOreLavorate: React.FC<AnalisiOreLavorateProps> = ({ selectedDate }) => {
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedDate) {
            setLoading(false);
            setRapportini([]);
            return;
        }

        setLoading(true);
        setError(null);
        const startOfDay = selectedDate.startOf('day').toDate();
        const endOfDay = selectedDate.endOf('day').toDate();

        const q = query(
            collection(db, 'rapportini'),
            where('data', '>=', Timestamp.fromDate(startOfDay)),
            where('data', '<=', Timestamp.fromDate(endOfDay))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
            setRapportini(data);
            setLoading(false);
        }, (err) => {
            console.error("DIAGNOSTIC_ERROR: ", err);
            setError(`Errore Firestore: ${err.message}. Potrebbe mancare un indice. Controlla la console del browser (F12) per un link per crearlo.`);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedDate]);

    const chartData = rapportini.reduce((acc, curr) => {
        acc.oreLavorate += parseFloat(String(curr.ore_lavorate || '0'));
        acc.oreStraordinario += parseFloat(String(curr.ore_straordinario || '0'));
        acc.oreViaggio += parseFloat(String(curr.ore_viaggio || '0'));
        return acc;
    }, {
        oreLavorate: 0,
        oreStraordinario: 0,
        oreViaggio: 0,
    });

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper elevation={3} sx={{ p: 2, borderColor: '#f00', borderWidth: 1, borderStyle: 'dashed' }}>
            <Typography variant="h6" gutterBottom>Analisi Ore Lavorate (Diagnostica)</Typography>
            
            <Box sx={{ p: 2, border: '1px solid #ccc', mb: 2 }}>
                <Typography variant="subtitle1">Dati Diagnostici:</Typography>
                <Typography>Data Selezionata: {selectedDate?.format('YYYY-MM-DD')}</Typography>
                <Typography>Documenti Trovati: <strong>{rapportini.length}</strong></Typography>
                <Typography>Dati Aggregati: <strong>{JSON.stringify(chartData)}</strong></Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {rapportini.length === 0 && !error && (
                <Alert severity="warning">Nessun rapportino trovato per la data selezionata. La query non ha prodotto risultati.</Alert>
            )}

            {rapportini.length > 0 && (
                <Box sx={{ width: '100%', height: 400 }}>
                    <BarChart
                        series={[
                            { data: [chartData.oreLavorate], label: 'Ore Lavorate', id: 'oreLavorateId' },
                            { data: [chartData.oreStraordinario], label: 'Ore Straordinario', id: 'oreStraordinarioId' },
                            { data: [chartData.oreViaggio], label: 'Ore Viaggio', id: 'oreViaggioId' },
                        ]}
                        xAxis={[{ data: [selectedDate?.format('DD/MM/YYYY') || ''], scaleType: 'band' }]}
                        height={400}
                    />
                </Box>
            )}
        </Paper>
    );
};

export default AnalisiOreLavorate;
