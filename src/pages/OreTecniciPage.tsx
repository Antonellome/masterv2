import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Typography, Paper, Button, IconButton, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, InputLabel, 
    TableFooter, CircularProgress, Grid, Modal, TextField, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { ArrowBack, ArrowForward, Print, Receipt } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { getWeeksInMonth } from '@/utils/dateUtils';
import { db } from '@/db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { processaMese, RisultatoGiornoCCNL } from '@/services/BustaPagaService';
import { Dipendente, SaldiContatori } from '@/models/definitions';
import PrintModal from '@/components/PrintModal';
import BustaPagaPDF from '@/components/BustaPaga/BustaPagaPDF';

dayjs.locale('it');

const darkThemeStyles = {
    pageContainer: { p: 3, backgroundColor: '#121212', color: 'white', minHeight: 'calc(100vh - 80px)' },
    paper: { p: 2, mb: 3, backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #007FFF' },
    headerText: { color: 'white' },
    tableCell: { color: 'white', borderColor: '#444', padding: '8px' },
    tableCellHeader: { color: 'white', fontWeight: 'bold', borderColor: '#444', padding: '8px' },
    select: { color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#007FFF' }, '& .MuiSvgIcon-root': { color: 'white' } },
    loaderBox: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' },
    modalBox: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: '#1e1e1e', border: '2px solid #007FFF', boxShadow: 24, p: 4, color: 'white' },
    totalRow: { backgroundColor: '#333' },
    anomalyCell: { color: '#ff4d4d', fontWeight: 'bold' },
    sectionTitleCell: {
        color: '#64b5f6', 
        fontWeight: 'bold',
        backgroundColor: '#2a2a2a',
        borderBottom: '2px solid #007FFF'
    }
};


const SaldiContatoriUI: React.FC<{ saldiIniziali: SaldiContatori, totaliMensili: any }> = ({ saldiIniziali, totaliMensili }) => {
    const contatori = [
        { label: 'Ferie', id: 'ferie', saldoInizialeKey: 'saldoFerieOre', utilizzatoKey: 'ferieScalate' },
        { label: 'ROL', id: 'rol', saldoInizialeKey: 'saldoRolOre', utilizzatoKey: 'rolScalati' },
        { label: 'Ex Festività', id: 'exfest', saldoInizialeKey: 'saldoExFestivitaOre', utilizzatoKey: 'exFestivitaScalate' },
        { label: 'Permessi L. 104', id: 'l104', saldoInizialeKey: 'permesso104ResiduoOre', utilizzatoKey: 'legge104Scalate' },
    ];

    return (
        <Paper sx={darkThemeStyles.paper}>
            <Typography variant="h6" gutterBottom sx={{ color: '#64b5f6' }}>Contatori e Saldi Residui</Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={darkThemeStyles.tableCellHeader}>Contatore</TableCell>
                            <TableCell align="right" sx={darkThemeStyles.tableCellHeader}>Saldo Iniziale</TableCell>
                            <TableCell align="right" sx={darkThemeStyles.tableCellHeader}>Utilizzato nel Mese</TableCell>
                            <TableCell align="right" sx={darkThemeStyles.tableCellHeader}>Saldo Finale</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {contatori.map(c => {
                            const saldoIniziale = saldiIniziali[c.saldoInizialeKey as keyof SaldiContatori] as number || 0;
                            const utilizzato = totaliMensili[c.utilizzatoKey] || 0;
                            const saldoFinale = saldoIniziale - utilizzato;
                            return (
                                <TableRow key={c.id}>
                                    <TableCell sx={darkThemeStyles.tableCell}>{c.label}</TableCell>
                                    <TableCell align="right" sx={darkThemeStyles.tableCell}>{saldoIniziale.toFixed(2)}h</TableCell>
                                    <TableCell align="right" sx={darkThemeStyles.tableCell}>-{utilizzato.toFixed(2)}h</TableCell>
                                    <TableCell align="right" sx={{ ...darkThemeStyles.tableCell, fontWeight: 'bold' }}>{saldoFinale.toFixed(2)}h</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

const renderTableSection = (title: string, columns: {id: string, label: string}[], week: Date[], processedMonthData: RisultatoGiornoCCNL[]) => (
    <>
      <TableRow>
        <TableCell colSpan={week.length + 1} sx={darkThemeStyles.sectionTitleCell}>{title}</TableCell>
      </TableRow>
      {columns.map(({id, label}) => (
        <TableRow key={id}>
          <TableCell component="th" scope="row" sx={{...darkThemeStyles.tableCell, minWidth: '240px'}}>{label}</TableCell>
          {week.map(day => {
            const dayStr = dayjs(day).format('YYYY-MM-DD');
            const dayData = processedMonthData.find(d => d.data === dayStr);
            if (!dayData) return <TableCell key={dayStr} align="center" sx={darkThemeStyles.tableCell}>-</TableCell>;
            
            const value = (dayData as any)[id] as number || 0;
            const isAnomaly = id === 'anomaliaDebitoUncovered' && value > 0;
  
            return (
              <TableCell key={dayStr} align="center" sx={{...darkThemeStyles.tableCell, ...(isAnomaly && darkThemeStyles.anomalyCell)}}>
                {value > 0 ? value.toFixed(2) : '-'}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );

const SaldiInizialiModal: React.FC<{open: boolean, onClose: () => void, onSave: (saldi: any) => void, tecnicoId: string}> = ({ open, onClose, onSave, tecnicoId }) => {
    const [saldi, setSaldi] = useState<any>({});
    const [unit, setUnit] = useState<any>({});

    const handleSave = () => {
        const finalSaldi = Object.keys(saldi).reduce((acc, key) => {
            const value = parseFloat(saldi[key]);
            const isDays = unit[key] === 'giorni';
            acc[key] = isDays ? value * 8 : value;
            return acc;
        }, {} as any);
        onSave(finalSaldi);
        onClose();
    };

    const fields = ['saldoFerieOre', 'saldoRolOre', 'saldoExFestivitaOre', 'permesso104ResiduoOre'];

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={darkThemeStyles.modalBox}>
                <Typography variant="h6" sx={{mb: 2}}>Imposta Saldi Residui</Typography>
                {fields.map(field => (
                    <Grid container spacing={2} key={field} sx={{mb: 2}} alignItems="center">
                        <Grid item xs={6}><Typography>{field.replace("Ore", "").replace('saldo', "").replace(/([A-Z])/g, ' $1').trim()}:</Typography></Grid>
                        <Grid item xs={3}><TextField size="small" type="number" value={saldi[field] || ''} onChange={e => setSaldi({...saldi, [field]: e.target.value})} sx={{ input: { color: 'white' }, label: { color: 'gray' } }} /></Grid>
                        <Grid item xs={3}>
                            <ToggleButtonGroup value={unit[field] || 'ore'} exclusive size="small" onChange={(_, val) => setUnit({...unit, [field]: val})}>
                                <ToggleButton value="ore">Ore</ToggleButton>
                                <ToggleButton value="giorni">Giorni</ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                ))}
                <Button variant="contained" onClick={handleSave}>Salva</Button>
            </Box>
        </Modal>
    );
}

const OreTecniciPage = () => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
    const [processedMonthData, setProcessedMonthData] = useState<RisultatoGiornoCCNL[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaldiModalOpen, setSaldiModalOpen] = useState(false);
    const [isPrintModalOpen, setPrintModalOpen] = useState(false);
    const [isBustaPagaModalOpen, setBustaPagaModalOpen] = useState(false);
    const [bustaPagaData, setBustaPagaData] = useState<object | null>(null);
    
    const printRef = useRef<HTMLDivElement>(null);
    const bustaPagaPrintRef = useRef<HTMLDivElement>(null);

    const technicians = useLiveQuery(() => db.tecnici.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    
    const saldiInizialiDb = useLiveQuery(() => selectedTechnicianId ? db.app_state.get(`saldi_${selectedTechnicianId}`) : undefined, [selectedTechnicianId]);
    
    const saldiIniziali: SaldiContatori = useMemo(() => ({
        dipendenteId: selectedTechnicianId || '0',
        anno: currentDate.year(),
        saldoFerieOre: 160, saldoRolOre: 80, saldoExFestivitaOre: 32, saldoBancaOre: 0, giorniMalattiaAccumulatiAnno: 0, permesso104ResiduoOre: 24,
        ...saldiInizialiDb?.value,
    }), [saldiInizialiDb, selectedTechnicianId, currentDate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedTechnicianId || !technicians || !tipiGiornata) {
                setProcessedMonthData([]);
                return;
            }
            setLoading(true);

            const dipendenteSelezionato = technicians.find(t => t.id === selectedTechnicianId);
            if (!dipendenteSelezionato) { setLoading(false); return; }

            const monthStart = currentDate.startOf('month');
            const extendedInterval = {
                start: monthStart.startOf('week').toDate(),
                end: currentDate.endOf('month').endOf('week').toDate(),
            };
            
            const rapportini = await db.rapportini
                .where('data').between(extendedInterval.start, extendedInterval.end, true, true)
                .filter(r => !r.isDeleted && (
                    r.tecnicoId === selectedTechnicianId || 
                    (r.presenze && r.presenze.includes(selectedTechnicianId)) ||
                    (r.dettaglioOreTecnici && r.dettaglioOreTecnici.some((d: any) => d.tecnicoId === selectedTechnicianId))
                ))
                .toArray();

            console.log("RAW RAPPORTINI FETCHED:", JSON.stringify(rapportini, null, 2));
            
            const tipiGiornataMap = new Map(tipiGiornata.map(t => [t.id, t.nome]));

            const dipendente: Dipendente = { 
                id: dipendenteSelezionato.id, 
                nome: dipendenteSelezionato.nome, 
                cognome: dipendenteSelezionato.cognome, 
                livello: 'D1', isTurnista: false, orarioSettimanaleContrattuale: 40, anzianitaAnni: 5
            };

            const risultati = processaMese(dipendente, rapportini, tipiGiornataMap, saldiIniziali, extendedInterval, monthStart.month());
            setProcessedMonthData(risultati);
            setLoading(false);
        };
        fetchData();
    }, [currentDate, selectedTechnicianId, technicians, tipiGiornata, saldiIniziali]);

    useEffect(() => {
        if (bustaPagaData) {
            setBustaPagaModalOpen(true);
        }
    }, [bustaPagaData]);

    const handleSaveSaldi = async (saldi: any) => {
      if (!selectedTechnicianId) return;
      await db.app_state.put({ key: `saldi_${selectedTechnicianId}`, value: saldi });
    }
    
    const weeks = getWeeksInMonth(currentDate.toDate());

    const sezioni = [
        {   titolo: 'Lavoro Ordinario', colonne: [
                { id: 'pagaBaseOre', label: 'Ordinarie Diurne' },
                { id: 'trasfertaOre', label: 'Trasferta' },
                { id: 'oreNotturnoSeraleOrd', label: 'Lavoro Notturno Ordinario (20-22) (+15%)' },
                { id: 'oreNotturnoPienoOrd', label: 'Lavoro Notturno Ordinario (22-06) (+30%)' },
            ]
        },
        {   titolo: 'Lavoro Straordinario', colonne: [
                { id: 'strDiu12Intero', label: 'Straordinario Feriale (Prime 2h) (+25%)' },
                { id: 'strDiuSuccessIntero', label: 'Straordinario Feriale (Oltre 2h) (+30%)' },
                { id: 'straordinarioSabatoDiurno50', label: 'Straordinario Sabato Diurno (+50%)' },
                { id: 'straordinarioNotturno50', label: 'Straordinario Notturno Feriale/Sabato (+50%)'},
                { id: 'straordinarioFestivo55', label: 'Straordinario Festivo/Domenicale Diurno (+55%)' },
                { id: 'straordinarioNotturnoFestivo75', label: 'Straordinario Notturno Festivo (+75%)' },
            ]
        },
        {   titolo: 'Assenze Retribuite', colonne: [
                { id: 'ferieScalate', label: 'Ferie' },
                { id: 'rolScalati', label: 'ROL' },
                { id: 'exFestivitaScalate', label: 'Ex Festività' },
                { id: 'permessiScalati', label: 'Permessi Retribuiti' },
                { id: 'legge104Scalate', label: 'Permessi L. 104' },
            ]
        },
        {   titolo: 'Malattia', colonne: [
                { id: 'oreMalattiaCarenzaAzienda', label: 'Malattia (Carenza)' },
                { id: 'oreMalattiaIntegrazione', label: 'Malattia (Integrazione INPS)' },
            ]
        },
        {   titolo: 'Anomalie e Debiti', colonne: [
                { id: 'anomaliaDebitoUncovered', label: 'Debito Orario Residuo' },
            ]
        }
    ];

    const tutteLeColonne = useMemo(() => sezioni.flatMap(s => s.colonne), [sezioni]);
    
    const totaliMensili = useMemo(() => {
        const newTotals: { [key: string]: number } = {};
        tutteLeColonne.forEach(col => {
            newTotals[col.id] = processedMonthData.reduce((sum, day) => sum + ((day as any)[col.id] as number || 0), 0);
        });
        return newTotals;
    }, [processedMonthData, tutteLeColonne]);

    const totaleOreLavorate = useMemo(() => {
        const chiaviOreLavorate = sezioni
            .filter(s => ['Lavoro Ordinario', 'Lavoro Straordinario'].includes(s.titolo))
            .flatMap(s => s.colonne.map(c => c.id));
        return processedMonthData.reduce((acc, curr) => {
            return acc + chiaviOreLavorate.reduce((dayTotal, key) => dayTotal + (Number((curr as any)[key]) || 0), 0);
        }, 0);
    }, [processedMonthData, sezioni]);

    const handleGeneraBustaPaga = () => {
        if (!selectedTechnicianId || !technicians) return;
        
        const technician = technicians.find(t => t.id === selectedTechnicianId);
        const finalSaldi = {
            ferie: (saldiIniziali.saldoFerieOre || 0) - (totaliMensili.ferieScalate || 0),
            rol: (saldiIniziali.saldoRolOre || 0) - (totaliMensili.rolScalati || 0),
            exFestivita: (saldiIniziali.saldoExFestivitaOre || 0) - (totaliMensili.exFestivitaScalate || 0),
        }

        const data = {
            header: {
                dipendente: `${technician?.cognome} ${technician?.nome}`,
                periodo: currentDate.format('MMMM YYYY'),
            },
            datiCalcolo: {
                giorniLavoratiNelMese: processedMonthData.filter(d => d.data.startsWith(currentDate.format('YYYY-MM')) && d.pagaBaseOre > 0).length,
                oreLavorateTotali: totaleOreLavorate,
                oreContrattualiMese: 173, 
            },
            totaliPerVoce: totaliMensili,
            saldiContatoriFinali: finalSaldi,
        };

        setBustaPagaData(data);
    };

    return (
        <Box sx={darkThemeStyles.pageContainer}>
            <Typography variant="h4" gutterBottom sx={darkThemeStyles.headerText}>Riepilogo Ore Dipendente</Typography>
            
            <Paper sx={darkThemeStyles.paper}> 
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ color: 'white' }}>Seleziona Tecnico</InputLabel>
                      <Select 
                        value={selectedTechnicianId || ''} 
                        onChange={(e) => {
                            setSelectedTechnicianId(e.target.value as string);
                            setBustaPagaData(null);
                            setBustaPagaModalOpen(false);
                        }}
                        label="Seleziona Tecnico" 
                        sx={darkThemeStyles.select}
                      >
                          {technicians?.map(tech => <MenuItem key={tech.id} value={tech.id}>{`${tech.cognome} ${tech.nome}`}</MenuItem>)}
                      </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Button fullWidth variant="contained" onClick={() => setSaldiModalOpen(true)} disabled={!selectedTechnicianId}>Imposta Residui</Button>
                </Grid>
                <Grid item xs={6} md={2}>
                    <Button fullWidth variant="contained" color="secondary" onClick={() => setPrintModalOpen(true)} disabled={!selectedTechnicianId || loading}>
                        <Print sx={{mr: 1}}/> Stampa
                    </Button>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button fullWidth variant="contained" color="primary" onClick={handleGeneraBustaPaga} disabled={!selectedTechnicianId || loading}>
                        <Receipt sx={{mr: 1}}/> Genera Busta
                    </Button>
                </Grid>
              </Grid>
            </Paper>

            <Box ref={printRef}>
                 {selectedTechnicianId && (
                    loading ? <Box sx={darkThemeStyles.loaderBox}><CircularProgress /></Box> : (
                        <>
                            <Paper sx={darkThemeStyles.paper}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <IconButton onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} sx={{ color: 'white' }}><ArrowBack /></IconButton>
                                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{currentDate.format('MMMM YYYY')}</Typography>
                                    <IconButton onClick={() => setCurrentDate(currentDate.add(1, 'month'))} sx={{ color: 'white' }}><ArrowForward /></IconButton>
                                </Box>
                            </Paper>
                            
                            {weeks.map((week, weekIndex) => (
                                 <Paper key={weekIndex} sx={darkThemeStyles.paper}>
                                    <Typography variant="h6" gutterBottom>{`Settimana ${weekIndex + 1}`}</Typography>
                                    <TableContainer>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{...darkThemeStyles.tableCellHeader, minWidth: '240px'}}>Tipo Ora</TableCell>
                                                    {week.map(day => {
                                                        const dayObj = dayjs(day);
                                                        const dayStr = dayObj.format('YYYY-MM-DD');
                                                        const dayData = processedMonthData.find(d => d.data === dayStr);
                                                        const isWeekend = dayObj.day() === 0 || dayObj.day() === 6;
                                                        const cellStyle = {
                                                            ...darkThemeStyles.tableCellHeader,
                                                            backgroundColor: dayData ? (isWeekend ? '#4a148c' : '#004d40') : 'transparent'
                                                        };
                                                        return <TableCell key={dayStr} align="center" sx={cellStyle}>{dayObj.format('dd').charAt(0).toUpperCase()}<br />{dayObj.format('D')}</TableCell>
                                                    })}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sezioni.map(sezione => (
                                                    <React.Fragment key={sezione.titolo}>
                                                        {renderTableSection(sezione.titolo, sezione.colonne, week, processedMonthData)}
                                                    </React.Fragment>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            ))}

                            <Paper sx={darkThemeStyles.paper}>
                                <Typography variant="h6" gutterBottom sx={{ color: '#64b5f6' }}>Totali Mensili</Typography>
                                 <TableContainer component={Paper} sx={{ backgroundColor: '#1e1e1e' }}>
                                    <Table size="small">
                                        <TableHead><TableRow><TableCell sx={darkThemeStyles.tableCellHeader}>Tipo Ora</TableCell><TableCell align="right" sx={darkThemeStyles.tableCellHeader}>Totale</TableCell></TableRow></TableHead>
                                        <TableBody>
                                            {tutteLeColonne.map(({id, label}) => (
                                                <TableRow key={id}>
                                                    <TableCell sx={darkThemeStyles.tableCell}>{label}</TableCell>
                                                    <TableCell align="right" sx={{...darkThemeStyles.tableCell, ...(id === 'anomaliaDebitoUncovered' && totaliMensili[id] > 0 && darkThemeStyles.anomalyCell)}}>
                                                        {(totaliMensili[id] || 0).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter><TableRow sx={darkThemeStyles.totalRow}><TableCell sx={{...darkThemeStyles.tableCell, fontWeight: 'bold'}}>Totale Ore Lavorate</TableCell><TableCell align="right" sx={{...darkThemeStyles.tableCell, fontWeight: 'bold'}}>{totaleOreLavorate.toFixed(2)}</TableCell></TableRow></TableFooter>
                                    </Table>
                                </TableContainer>
                            </Paper>
                            
                            <SaldiContatoriUI saldiIniziali={saldiIniziali} totaliMensili={totaliMensili} />
                        </>
                    )
                )}
            </Box>
            
            <div style={{ display: 'none' }}>
                <div ref={bustaPagaPrintRef}>
                    <BustaPagaPDF data={bustaPagaData} />
                </div>
            </div>

            <SaldiInizialiModal open={isSaldiModalOpen} onClose={() => setSaldiModalOpen(false)} onSave={handleSaveSaldi} tecnicoId={selectedTechnicianId!} />
            
            <PrintModal
                open={isPrintModalOpen}
                onClose={() => setPrintModalOpen(false)}
                title={`Report Ore ${technicians?.find(t => t.id === selectedTechnicianId)?.cognome || ''} - ${currentDate.format('MMMM YYYY')}`}
                contentRef={printRef}
            />

            <PrintModal
                open={isBustaPagaModalOpen}
                onClose={() => {
                    setBustaPagaModalOpen(false);
                    setBustaPagaData(null); 
                }}
                title={`Busta Paga ${technicians?.find(t => t.id === selectedTechnicianId)?.cognome || ''} - ${currentDate.format('MMMM YYYY')}`}
                contentRef={bustaPagaPrintRef}
            />
        </Box>
    );
};

export default OreTecniciPage;
