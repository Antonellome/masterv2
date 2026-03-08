import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase';
import { Box, Typography, Paper, CircularProgress, Grid, Divider } from '@mui/material';
import dayjs from 'dayjs';
import { formatOreLavoro } from '@/utils/formatters';
import { TecnicoAggiunto } from '@/models/rapportino.schema';
import { Tecnico } from '@/models/definitions';

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
    const [rapportino, setRapportino] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tecniciMap, setTecniciMap] = useState<Map<string, Tecnico>>(new Map());

     useEffect(() => {
        const fetchTecnici = async () => {
            const tecSnap = await getDocs(collection(db, 'tecnici'));
            const map = new Map(tecSnap.docs.map(d => [d.id, {id: d.id, ...d.data()} as Tecnico]));
            setTecniciMap(map);
        };
        fetchTecnici();
    }, []);

    useEffect(() => {
        if (!id || tecniciMap.size === 0) {
            if (!id) setError('ID del rapportino non specificato.');
            return;
        }

        const fetchAndProcessRapportino = async () => {
            setLoading(true);
            try {
                const rapportinoRef = doc(db, 'rapportini', id);
                const rapportinoSnap = await getDoc(rapportinoRef);

                if (!rapportinoSnap.exists()) {
                    setError('Rapportino non trovato.');
                    setLoading(false);
                    return;
                }

                const data = rapportinoSnap.data() as DocumentData;

                 const getRefData = async (refId: string, collectionName: string): Promise<string> => {
                    if (!refId) return 'N/D';
                    const docRef = doc(db, collectionName, refId);
                    const docSnap = await getDoc(docRef);
                    return docSnap.exists() ? (docSnap.data() as any).nome || 'N/D' : 'Rif. non trovato';
                };

                const [nave, luogo, tipoGiornata, veicolo] = await Promise.all([
                    getRefData(data.naveId, 'navi'),
                    getRefData(data.luogoId, 'luoghi'),
                    getRefData(data.giornataId, 'tipiGiornata'),
                    getRefData(data.veicoloId, 'veicoli'),
                ]);
                
                let clienteName = 'N/D';
                if (data.clienteId) {
                    clienteName = await getRefData(data.clienteId, 'clienti');
                } else if (data.naveId) {
                    const naveSnap = await getDoc(doc(db, 'navi', data.naveId));
                    if (naveSnap.exists() && naveSnap.data().clienteId) {
                        clienteName = await getRefData(naveSnap.data().clienteId, 'clienti');
                    }
                }

                setRapportino({
                    ...data,
                    id,
                    nave, luogo, tipoGiornata, veicolo, cliente: clienteName
                });

            } catch (err) {
                console.error("Errore durante il caricamento per la stampa:", err);
                setError('Si è verificato un errore grave.');
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessRapportino();
    }, [id, tecniciMap]);

    useEffect(() => {
        if (!loading && rapportino) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, rapportino]);

    const formatOrarioSingolo = (orario: any) => orario?.toDate ? dayjs(orario.toDate()).format('HH:mm') : '--';

    const formatDettaglioOreTecnico = (tec: TecnicoAggiunto, principale: any) => {
         if (principale.inserimentoManualeOre) {
            return formatOreLavoro(tec.oreLavorate);
        } else {
            return `In: ${formatOrarioSingolo(tec.oraInizio)}, Out: ${formatOrarioSingolo(tec.oraFine)}, Pausa: ${tec.pausa || 0}m`;
        }
    }

    if (loading) {
        return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Typography color="error" sx={{ p: 4, textAlign: 'center' }}>{error}</Typography>;
    }

    if (!rapportino) {
        return <Typography sx={{ p: 4, textAlign: 'center' }}>Impossibile caricare i dati.</Typography>;
    }
    
    const tecnicoScriventeInfo = tecniciMap.get(rapportino.tecnicoScriventeId);
    const tecnicoScriventeNome = tecnicoScriventeInfo ? `${tecnicoScriventeInfo.cognome} ${tecnicoScriventeInfo.nome}` : 'N/D';

    return (
        <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: '800px', mx: 'auto' }}>
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 } }}>
                <header>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>R.I.S.O.</Typography>
                             <Typography variant="body2" fontStyle='italic'>Master Office</Typography>
                            <Typography variant="caption">Report Individuali Sincronizzati Online</Typography>
                        </Box>
                        <Typography variant="h4" component="h1">Rapportino</Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                </header>

                <main>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6 }}><InfoRow label="Data Intervento" value={dayjs(rapportino.data.toDate()).format('DD/MM/YYYY')} bold /></Grid>
                        <Grid size={{ xs: 6 }}><InfoRow label="Tipo Giornata" value={rapportino.tipoGiornata} /></Grid>
                        <Grid size={{ xs: 6 }}><InfoRow label="Cliente" value={rapportino.cliente} /></Grid>
                        <Grid size={{ xs: 6 }}><InfoRow label="Nave" value={rapportino.nave} /></Grid>
                        <Grid size={{ xs: 6 }}><InfoRow label="Luogo Intervento" value={rapportino.luogo} /></Grid>
                        <Grid size={{ xs: 6 }}><InfoRow label="Veicolo Utilizzato" value={rapportino.veicolo} /></Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }}>Dettagli Personale e Orari</Divider>

                    <Box sx={{ mb: 2 }}>
                        <InfoRow label={`Tecnico Scrivente: ${tecnicoScriventeNome}`} value={rapportino.inserimentoManualeOre ? formatOreLavoro(rapportino.oreLavorate) : `Dalle ${formatOrarioSingolo(rapportino.oraInizio)} alle ${formatOrarioSingolo(rapportino.oraFine)}, Pausa: ${rapportino.pausa}m`} bold />
                    </Box>
                    {rapportino.tecniciAggiunti && rapportino.tecniciAggiunti.length > 0 && (
                       <Box sx={{mb: 2, pageBreakInside: 'avoid'}}>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ textTransform: 'uppercase' }}>Altri Tecnici Presenti</Typography>
                           {rapportino.tecniciAggiunti.map((tec: TecnicoAggiunto) => {
                               const tecInfo = tecniciMap.get(tec.tecnicoId);
                               const nome = tecInfo ? `${tecInfo.cognome} ${tecInfo.nome}` : 'Tecnico non trovato';
                               return <InfoRow key={tec.tecnicoId} label={nome} value={formatDettaglioOreTecnico(tec, rapportino)} />;
                           })}
                       </Box>
                    )}

                    <Divider sx={{ my: 2 }}>Descrizione Intervento</Divider>
                    
                    <InfoRow label="Breve Descrizione" value={rapportino.breveDescrizione} />
                    <InfoRow label="Lavoro Eseguito nel Dettaglio" value={<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', p: 1, border: '1px solid #eee', borderRadius: 1 }}>{rapportino.lavoroEseguito}</Typography>} />
                    <InfoRow label="Materiali Impiegati" value={<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', p: 1, border: '1px solid #eee', borderRadius: 1 }}>{rapportino.materialiImpiegati}</Typography>} />
                </main>
            </Paper>
        </Box>
    );
};

export default RapportinoPrint;
