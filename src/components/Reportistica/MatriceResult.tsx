import React, { useMemo } from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Tooltip, Chip, Grid, Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import * as XLSX from 'xlsx';

import { MatriceData, BloccoNaveData } from '@/hooks/useMatriceTecnici';
import { Ditta, TipoGiornata } from '@/models/definitions';
import { useAnagraficaData } from '@/contexts/DataContext';

dayjs.locale('it');

// --- INTERFACCE E PROPS ---
interface MatriceResultProps {
    isLoading: boolean;
    matriceData: MatriceData | null;
    selectedDate: Dayjs | null;
}

// --- FUNZIONI HELPER ---
const getCleanId = (id: any): string => (typeof id === 'string' ? id : id?.id) || '';

const getDayOfWeek = (day: number, month: number, year: number) => {
    return dayjs(`${year}-${month}-${day}`).day();
};

const parseValue = (val: string) => {
    if (!val || val === '-' || val.match(/^[A-Z]$/)) {
        return { ord: 0, str: 0, nott: 0, assenza: val };
    }
    let ord = 0, str = 0, nott = 0;
    const notturnoMatch = val.match(/(\d+)N/);
    if (notturnoMatch) {
        nott += parseInt(notturnoMatch[1], 10) || 0;
        val = val.replace(/(\d+)N/, '').trim();
    }
    if (val.includes('+')) {
        const parts = val.split('+');
        ord += parseInt(parts[0], 10) || 0;
        str += parseInt(parts[1], 10) || 0;
    } else if (val) {
        ord += parseInt(val, 10) || 0;
    }
    return { ord, str, nott, assenza: null };
};

// --- COMPONENTI SECONDARI ---

const TotaliBlocco: React.FC<{ blocco: BloccoNaveData, tipiGiornataMap: Map<string, TipoGiornata> }> = ({ blocco, tipiGiornataMap }) => {
    const totali = useMemo(() => {
        let oreOrdinarie = 0;
        let oreStraordinarie = 0;
        let oreNotturne = 0;
        const assenze: { [key: string]: number } = {};

        blocco.righe.forEach(riga => {
            Object.values(riga.giorni).forEach(cella => {
                const { ord, str, nott, assenza } = parseValue(cella.valore);
                oreOrdinarie += ord;
                oreStraordinarie += str;
                oreNotturne += nott;
                if (assenza) {
                    assenze[assenza] = (assenze[assenza] || 0) + 1;
                }
            });
        });

        const assenzeConteggiate = Object.entries(assenze).reduce((acc, [key, count]) => {
            const tipo = Array.from(tipiGiornataMap.values()).find(t => t.nome && t.nome.charAt(0) === key);
            if (tipo && tipo.nome) acc[tipo.nome] = count;
            return acc;
       }, {} as {[key: string]: number})

        return {
            "Ore Ordinarie": oreOrdinarie,
            "Ore Straordinarie": oreStraordinarie,
            "Ore Notturne": oreNotturne,
            ...assenzeConteggiate
        };
    }, [blocco, tipiGiornataMap]);

    return (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(totali).map(([key, value]) => (
                value > 0 && <Chip key={key} label={`${key}: ${value}`} color="primary" variant="outlined" />
            ))}
        </Box>
    );
};

const Legenda: React.FC<{tipiGiornata?: TipoGiornata[]}> = ({tipiGiornata}) => (
    <Paper elevation={2} sx={{ p: 2, mt: 3, background: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom>Legenda</Typography>
        <Grid container spacing={1}>
            <Grid item><Chip size="small" label="N = Ore Notturne" /></Grid>
            <Grid item><Chip size="small" label="+X = Ore Straordinarie" /></Grid>
            {tipiGiornata?.filter(tg => tg.nome && ['Ferie', 'Malattia', 'Permesso', 'Legge 104'].includes(tg.nome)).map(tg => (
                 <Grid item key={tg.id}><Chip size="small" label={`${tg.nome.charAt(0)} = ${tg.nome}`} /></Grid>
            ))}
        </Grid>
    </Paper>
);

const MatriceRender: React.FC<{ blocco: BloccoNaveData, ditteMap: Map<string, Ditta>, tipiGiornataMap: Map<string, TipoGiornata>, selectedDate: Dayjs | null }> = 
({ blocco, ditteMap, tipiGiornataMap, selectedDate }) => {
    
    const dateContext = selectedDate || dayjs();
    const year = dateContext.year();
    const month = dateContext.month() + 1;

    const totaliRiga = useMemo(() => {
        const totals: { [tecnicoId: string]: { ord: number; str: number; nott: number; assenze: {[key:string]: number} } } = {};
        blocco.righe.forEach(({ tecnico, giorni }) => {
            let ord = 0, str = 0, nott = 0;
            const assenze: {[key:string]: number} = {};
            Object.values(giorni).forEach(cella => {
                const parsed = parseValue(cella.valore);
                ord += parsed.ord;
                str += parsed.str;
                nott += parsed.nott;
                if(parsed.assenza) assenze[parsed.assenza] = (assenze[parsed.assenza] || 0) + 1;
            });
            totals[tecnico.id] = { ord, str, nott, assenze };
        });
        return totals;
    }, [blocco.righe]);

    const totaliColonna = useMemo(() => {
        const totals: { [giorno: number]: { ord: number; str: number; nott: number; } } = {};
        blocco.giorniDelMese.forEach(giorno => {
            let ord = 0, str = 0, nott = 0;
            blocco.righe.forEach(riga => {
                if (riga.giorni[giorno]) {
                    const parsed = parseValue(riga.giorni[giorno].valore);
                    ord += parsed.ord;
                    str += parsed.str;
                    nott += parsed.nott;
                }
            });
            totals[giorno] = { ord, str, nott };
        });
        return totals;
    }, [blocco.giorniDelMese, blocco.righe]);

    const handleExport = () => {
        const header = ["Tecnico", ...blocco.giorniDelMese.map(String), "TOT Ore Ordinarie", "TOT Ore Straordinarie", "TOT Ore Notturne"];
        const body = blocco.righe.map(({ tecnico, giorni }) => {
            const rowTotals = totaliRiga[tecnico.id];
            const row = [
                `${tecnico.cognome} ${tecnico.nome}`,
                ...blocco.giorniDelMese.map(g => giorni[g]?.valore || '-'),
                rowTotals.ord,
                rowTotals.str,
                rowTotals.nott,
            ];
            return row;
        });

        const footer = [
            "TOTALI",
            ...blocco.giorniDelMese.map(giorno => {
                const colTotals = totaliColonna[giorno];
                const val = `${colTotals.ord}${colTotals.str > 0 ? `+${colTotals.str}` : ''}${colTotals.nott > 0 ? colTotals.nott+'N' : ''}`;
                return val === '0' ? '-' : val;
            }),
            Object.values(totaliRiga).reduce((acc, t) => acc + t.ord, 0),
            Object.values(totaliRiga).reduce((acc, t) => acc + t.str, 0),
            Object.values(totaliRiga).reduce((acc, t) => acc + t.nott, 0),
        ];

        const ws = XLSX.utils.aoa_to_sheet([header, ...body, footer]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `Report_${blocco.naveNome.replace(/\s/g, '_')}_${dateContext.format('MMMM_YYYY')}.xlsx`);
    };

    return (
        <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 }, mb: 4, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, background: '#1976d2', color: 'white', borderRadius: '4px 4px 0 0' }}>
                <Typography variant="h5">{blocco.naveNome}</Typography>
                <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} onClick={handleExport}>Esporta in Excel</Button>
            </Box>
            <TableContainer>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 150, fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 10, background: 'white' }}>Tecnico</TableCell>
                            {blocco.giorniDelMese.map(giorno => {
                                const isWeekend = [0, 6].includes(getDayOfWeek(giorno, month, year));
                                return (
                                    <TableCell key={giorno} align="center" sx={{ fontWeight: 'bold', minWidth: 60, background: isWeekend ? '#f0f0f0' : 'white' }}>
                                        {giorno}<br/><Typography variant="caption">{dateContext.date(giorno).format('dd')}</Typography>
                                    </TableCell>
                                );
                            })}
                            <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e0e0e0' }}>TOT Ord.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e0e0e0' }}>TOT Str.</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', background: '#e0e0e0' }}>TOT Nott.</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {blocco.righe.map(({ tecnico, giorni }) => {
                            const ditta = ditteMap.get(getCleanId(tecnico.dittaId));
                            const dittaColor = ditta?.nome === 'TIN.it' ? '#e3f2fd' : ditta?.nome === 'G-TECH' ? '#e8f5e9' : 'white';
                            const rowTotals = totaliRiga[tecnico.id];

                            return (
                                <TableRow key={tecnico.id} hover>
                                    <TableCell sx={{ fontWeight: '500', position: 'sticky', left: 0, zIndex: 10, background: dittaColor }}>{tecnico.cognome} {tecnico.nome}</TableCell>
                                    {blocco.giorniDelMese.map(giorno => (
                                        <TableCell key={`${tecnico.id}-${giorno}`} align="center">
                                            {giorni[giorno] ? (
                                                <Tooltip title={giorni[giorno].tooltip} placement="top">
                                                    <span>{giorni[giorno].valore}</span>
                                                </Tooltip>
                                            ) : '-'}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>{rowTotals.ord > 0 ? rowTotals.ord : '-'}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>{rowTotals.str > 0 ? rowTotals.str : '-'}</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>{rowTotals.nott > 0 ? rowTotals.nott : '-'}</TableCell>
                                </TableRow>
                            );
                        })}
                        {/* Riga Totali Colonna */}
                        <TableRow>
                             <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 10, background: '#e0e0e0'}}>TOTALI</TableCell>
                             {blocco.giorniDelMese.map(giorno => {
                                 const colTotals = totaliColonna[giorno];
                                 const val = `${colTotals.ord}${colTotals.str > 0 ? `+${colTotals.str}` : ''}${colTotals.nott > 0 ? colTotals.nott+'N' : ''}`;
                                 return (
                                     <TableCell key={`total-${giorno}`} align="center" sx={{ fontWeight: 'bold', background: '#f0f0f0'}}>
                                        {val && val !== '0' ? val : '-'}
                                     </TableCell>
                                 );
                             })}
                             <TableCell sx={{background: '#bdbdbd'}}></TableCell>
                             <TableCell sx={{background: '#bdbdbd'}}></TableCell>
                             <TableCell sx={{background: '#bdbdbd'}}></TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ p: 2 }}>
                <TotaliBlocco blocco={blocco} tipiGiornataMap={tipiGiornataMap} />
            </Box>
        </Paper>
    );
}

// --- COMPONENTE PRINCIPALE ---
const MatriceResult: React.FC<MatriceResultProps> = ({ isLoading, matriceData, selectedDate }) => {
    const { ditte, tipiGiornata } = useAnagraficaData();
    const ditteMap = useMemo(() => new Map(ditte?.map(d => [getCleanId(d.id), d]) || []), [ditte]);
    const tipiGiornataMap = useMemo(() => new Map(tipiGiornata?.map(t => [t.id, t]) || []), [tipiGiornata]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress size={50} /></Box>;
    }

    if (!matriceData || Object.keys(matriceData).length === 0) {
        return (
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center', mt: 4 }}>
                <Typography variant="h6">Nessun dato da visualizzare.</Typography>
                <Typography color="textSecondary">Applica i filtri per generare la matrice.</Typography>
            </Paper>
        );
    }

    return (
        <Box>
            {Object.values(matriceData).map(blocco => (
                blocco && <MatriceRender key={blocco.naveNome} blocco={blocco} ditteMap={ditteMap} tipiGiornataMap={tipiGiornataMap} selectedDate={selectedDate} />
            ))}
             <Legenda tipiGiornata={tipiGiornata} />
        </Box>
    );
};

export default MatriceResult;
