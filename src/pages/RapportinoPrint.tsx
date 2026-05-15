
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Box, Typography, Paper, Grid, Divider, Table, TableBody, TableCell, TableHead, TableRow, Button, GlobalStyles } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import dayjs from 'dayjs';

// Stili per la stampa: nasconde elementi non desiderati e Rimuove header/footer del browser
const printPageStyles = (
    <GlobalStyles styles={{
        '@media print': {
            '@page': {
                margin: 0, // Azzera i margini della pagina di stampa (rimuove header/footer)
                size: 'A4',
            },
            'body': {
                margin: 0, // Azzera i margini del body
            },
            '.printable-area': {
                padding: '15mm', // Aggiunge un padding per simulare i margini
            },
            '.no-print': {
                display: 'none !important', // Nasconde elementi con questa classe
            },
        },
    }} />
);

// Componente per una riga di informazioni con etichetta e valore
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            {value || '--'}
        </Typography>
    </Box>
);

const RapportinoPrint = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { rapportino } = location.state || {}; // Riceve l'oggetto completo
    const printTriggered = useRef(false);

    useEffect(() => {
        if (rapportino && !printTriggered.current) {
            printTriggered.current = true;
            setTimeout(() => window.print(), 500);

            const handleAfterPrint = () => navigate(-1);
            window.addEventListener('afterprint', handleAfterPrint);

            return () => window.removeEventListener('afterprint', handleAfterPrint);
        }

        if (!rapportino && !printTriggered.current) {
            navigate(-1);
        }
    }, [rapportino, navigate]);

    if (!rapportino) {
        return <Typography sx={{ p: 4, textAlign: 'center' }}>Recupero dati per la stampa...</Typography>;
    }

    const { data, veicolo, tipoGiornata, descrizioneBreve, lavoroEseguito, materialiImpiegati, dettaglioOreTecnici, nave, luogo } = rapportino;
    const oreTotali = (dettaglioOreTecnici || []).reduce((sum: number, d: any) => sum + (d.ore || 0), 0);

    return (
        <>
            {printPageStyles}
            <Box sx={{ maxWidth: '210mm', mx: 'auto' }}>
                <Box className="no-print" sx={{ p: 2, display: 'flex', justifyContent: 'flex-start' }}>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
                        Torna alla Ricerca
                    </Button>
                </Box>
                
                <Box className="printable-area">
                    {/* TITOLO APP - FUORI DALLA CORNICE */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>R.I.S.O. Master Office</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Report Individuali Sincronizzati Online
                        </Typography>
                    </Box>

                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, border: '1px solid #ddd' }}>
                        {/* INTESTAZIONE INTERNA */}
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Typography variant="h6" component="div">Tecnologie Industriali Navali srl</Typography>
                            <Typography variant="h4" component="h1" sx={{ mt: 1, fontWeight: 'bold' }}>Rapportino di Lavoro</Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* DETTAGLI PRINCIPALI */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6} sm={3}><InfoRow label="Data Intervento" value={dayjs(data).format('DD/MM/YYYY')} /></Grid>
                            <Grid item xs={6} sm={3}><InfoRow label="Tipo Giornata" value={tipoGiornata?.nome} /></Grid>
                            <Grid item xs={6} sm={3}><InfoRow label="Cliente" value={nave?.cliente?.nome} /></Grid>
                            <Grid item xs={6} sm={3}><InfoRow label="Nave" value={nave?.nome} /></Grid>
                            <Grid item xs={6} sm={6}><InfoRow label="Luogo Intervento" value={luogo?.nome} /></Grid>
                            <Grid item xs={6} sm={6}><InfoRow label="Veicolo Utilizzato" value={veicolo?.nome} /></Grid>
                        </Grid>

                        {/* TABELLA TECNICI */}
                        <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>Personale e Ore</Typography>
                        <Table size="small" sx={{ mb: 2 }}>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell>Tecnico</TableCell>
                                    <TableCell align="right">Ore Lavorate</TableCell>
                                    <TableCell>Orario</TableCell>
                                    <TableCell align="right">Pausa (min)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dettaglioOreTecnici?.map((d: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell sx={{ fontWeight: rapportino.tecnicoId === d.tecnicoId ? 'bold' : 'normal' }}>
                                            {d.nome} {rapportino.tecnicoId === d.tecnicoId ? '(Responsabile)' : ''}
                                        </TableCell>
                                        <TableCell align="right">{d.ore || 0}</TableCell>
                                        <TableCell>{d.isManual ? 'Manuale' : `${d.oraInizio} - ${d.oraFine}`}</TableCell>
                                        <TableCell align="right">{d.isManual ? '-' : d.pausa}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        
                        {/* RIGA TOTALI */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 2, mb: 3 }}>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                Totale Ore: {oreTotali.toFixed(2)}
                            </Typography>
                        </Box>

                        {/* DESCRIZIONE INTERVENTO */}
                        <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>Dettagli Intervento</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <InfoRow label="Breve Descrizione" value={descrizioneBreve} />
                            </Grid>
                            <Grid item xs={12}>
                                <InfoRow label="Lavoro Eseguito nel Dettaglio" value={<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{lavoroEseguito}</Typography>} />
                            </Grid>
                            <Grid item xs={12}>
                                <InfoRow label="Materiali Impiegati" value={<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{materialiImpiegati}</Typography>} />
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            </Box>
        </>
    );
};

export default RapportinoPrint;
