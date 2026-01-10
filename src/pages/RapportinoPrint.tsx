
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { Box, Typography, Paper, CircularProgress, Grid, Divider } from '@mui/material';
import dayjs from 'dayjs';

// Interfaccia per i dati completamente popolati
interface FullRapportinoData {
    id: string;
    data: string;
    orario: string;
    oreLavorate: string;
    pausa: string;
    tecnicoScrivente: string;
    tecniciAggiunti: string;
    nave: string;
    luogo: string;
    cliente: string;
    tipoGiornata: string;
    veicolo: string;
    breveDescrizione: string;
    lavoroEseguito: string;
    materialiImpiegati: string;
}

// Componente helper per mostrare una riga di informazione
const InfoRow = ({ label, value, bold = false }: { label: string; value: React.ReactNode; bold?: boolean }) => (
    <Box sx={{ mb: 1.5, pageBreakInside: 'avoid' }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ textTransform: 'uppercase' }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: bold ? 'bold' : 'normal' }}>
            {value || '--'}
        </Typography>
    </Box>
);

const RapportinoPrint = () => {
    const { id } = useParams<{ id: string }>();
    const [rapportino, setRapportino] = useState<FullRapportinoData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('ID del rapportino non specificato.');
            setLoading(false);
            return;
        }

        const fetchAndProcessRapportino = async () => {
            try {
                const rapportinoRef = doc(db, 'rapportini', id);
                const rapportinoSnap = await getDoc(rapportinoRef);

                if (!rapportinoSnap.exists()) {
                    setError('Rapportino non trovato.');
                    return;
                }

                const data = rapportinoSnap.data() as DocumentData;

                const getRefData = async (refId: string, collectionName: string): Promise<string> => {
                    if (!refId) return 'N/D';
                    const docRef = doc(db, collectionName, refId);
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists()) return 'Rif. non trovato';
                    const docData = docSnap.data() as any;
                    return docData.cognome ? `${docData.cognome} ${docData.nome}`.trim() : docData.nome || 'N/D';
                };

                const getMultipleRefData = async (refIds: string[]): Promise<string> => {
                    if (!refIds || refIds.length === 0) return 'Nessuno';
                    const names = await Promise.all(refIds.map(refId => getRefData(refId, 'tecnici')));
                    return names.join(', ');
                };

                const safeToDate = (ts: any) => (ts?.toDate ? ts.toDate() : null);
                const dataRapportino = safeToDate(data.data);
                const oraInizio = safeToDate(data.oraInizio);
                const oraFine = safeToDate(data.oraFine);

                const [tecnico, nave, luogo, cliente, tipoGiornata, veicolo, tecniciAggiunti] = await Promise.all([
                    getRefData(data.tecnicoScriventeId, 'tecnici'),
                    getRefData(data.naveId, 'navi'),
                    getRefData(data.luogoId, 'luoghi'),
                    getRefData(data.clienteId, 'clienti'),
                    getRefData(data.giornataId, 'tipiGiornata'),
                    getRefData(data.veicoloId, 'veicoli'),
                    getMultipleRefData(data.tecniciAggiuntiIds || []),
                ]);

                setRapportino({
                    id,
                    data: dataRapportino ? dayjs(dataRapportino).format('DD/MM/YYYY') : 'N/D',
                    orario: oraInizio && oraFine ? `Dalle ${dayjs(oraInizio).format('HH:mm')} alle ${dayjs(oraFine).format('HH:mm')}` : 'Orario non specificato',
                    oreLavorate: data.oreLavorate ? `${data.oreLavorate} ore` : 'N/D',
                    pausa: data.pausa ? `${data.pausa} minuti` : '0 minuti',
                    tecnicoScrivente: tecnico,
                    tecniciAggiunti: tecniciAggiunti,
                    nave,
                    luogo,
                    cliente,
                    tipoGiornata,
                    veicolo,
                    breveDescrizione: data.breveDescrizione || 'Nessuna',
                    lavoroEseguito: data.lavoroEseguito || 'Nessuno',
                    materialiImpiegati: data.materialiImpiegati || 'Nessuno',
                });

            } catch (err) {
                console.error("Errore:", err);
                setError('Si è verificato un errore grave.');
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessRapportino();
    }, [id]);

    useEffect(() => {
        if (!loading && rapportino) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, rapportino]);

    if (loading) {
        return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>{error}</Typography>;
    }

    if (!rapportino) {
        return <Typography sx={{ p: 4, textAlign: 'center' }}>Impossibile caricare i dati del rapportino.</Typography>;
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: '800px', mx: 'auto' }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 } }}>
                <header>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        {/* -- LOGO A SINISTRA -- */}
                        <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                R.I.S.O.
                            </Typography>
                             <Typography variant="body2" component="div" sx={{ lineHeight: 1.2, fontStyle: 'italic' }}>
                                Master Office
                            </Typography>
                            <Typography variant="caption" component="div" sx={{ lineHeight: 1.2 }}>
                                Report Individuali Sincronizzati Online
                            </Typography>
                        </Box>
                        
                        {/* -- TITOLO A DESTRA -- */}
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h4" component="h1">
                                Rapportino
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                </header>

                <main>
                    <Grid container spacing={3} sx={{ mb: 2 }}>
                        <Grid item xs={6}><InfoRow label="Data Intervento" value={rapportino.data} bold /></Grid>
                        <Grid item xs={6}><InfoRow label="Tecnico Scrivente" value={rapportino.tecnicoScrivente} /></Grid>
                        <Grid item xs={6}><InfoRow label="Tipo Giornata" value={rapportino.tipoGiornata} /></Grid>
                        <Grid item xs={6}><InfoRow label="Cliente" value={rapportino.cliente} /></Grid>
                        <Grid item xs={6}><InfoRow label="Nave" value={rapportino.nave} /></Grid>
                        <Grid item xs={6}><InfoRow label="Luogo Intervento" value={rapportino.luogo} /></Grid>
                        <Grid item xs={6}><InfoRow label="Veicolo Utilizzato" value={rapportino.veicolo} /></Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }}>Dettagli Orari</Divider>

                    <Grid container spacing={3} sx={{ mb: 2 }}>
                        <Grid item xs={4}><InfoRow label="Orario Svolto" value={rapportino.orario} /></Grid>
                        <Grid item xs={4}><InfoRow label="Pausa" value={rapportino.pausa} /></Grid>
                        <Grid item xs={4}><InfoRow label="Totale Ore Lavorate" value={rapportino.oreLavorate} bold /></Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }}>Descrizione</Divider>
                    
                    <InfoRow label="Breve Descrizione" value={rapportino.breveDescrizione} />
                    <InfoRow 
                        label="Lavoro Eseguito nel Dettaglio" 
                        value={<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', p: 1, border: '1px solid #eee', borderRadius: 1 }}>{rapportino.lavoroEseguito}</Typography>} 
                    />
                    <InfoRow 
                        label="Materiali Impiegati" 
                        value={<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', p: 1, border: '1px solid #eee', borderRadius: 1 }}>{rapportino.materialiImpiegati}</Typography>} 
                    />
                    <InfoRow label="Altri Tecnici Presenti" value={rapportino.tecniciAggiunti} />
                </main>
            </Paper>
        </Box>
    );
};

export default RapportinoPrint;
