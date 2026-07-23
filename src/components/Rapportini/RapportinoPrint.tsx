
import React, { useMemo } from 'react';
import { Box, Typography, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import dayjs from 'dayjs';
import { formatOreLavoro } from '@/utils/formatters';

interface PrintProps {
  rapportinoId: string;
  className?: string; 
}

const getCleanId = (id: any): string | undefined => {
    if (typeof id === 'string' && id) return id;
    if (id && typeof id === 'object' && id.id && typeof id.id === 'string') return id.id;
    return undefined;
};

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <Box sx={{ display: 'flex', mb: 0.5, alignItems: 'flex-start' }}>
        <Typography component="span" sx={{ fontWeight: 'bold', width: 120, flexShrink: 0, fontSize: '10pt', color: '#000' }}>{label}:</Typography>
        <Typography component="span" sx={{ fontSize: '10pt', color: '#000' }}>{value}</Typography>
    </Box>
);

const BlockInfo = ({ label, value, preWrap = false }: { label: string, value: React.ReactNode, preWrap?: boolean }) => (
    <Box sx={{ mb: 2, pageBreakInside: 'avoid' }}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '10pt', color: '#000' }}>{label}</Typography>
        <Typography sx={{ fontSize: '10pt', color: '#000', whiteSpace: preWrap ? 'pre-wrap' : 'normal' }}>
            {value}
        </Typography>
    </Box>
);

const RapportinoPrint = React.forwardRef<HTMLDivElement, PrintProps>((props, ref) => {
  const { rapportinoId, className } = props;

  const data = useLiveQuery(async () => {
      if (!rapportinoId) return null;
      const rapportino = await db.rapportini.get(rapportinoId);
      if (!rapportino) return null;

      const [tecnici, navi, clienti, luoghi, veicoli] = await Promise.all([
          db.tecnici.toArray(),
          db.navi.toArray(),
          db.clienti.toArray(),
          db.luoghi.toArray(),
          db.veicoli.toArray()
      ]);

      return { rapportino, anagrafiche: { tecnici, navi, clienti, luoghi, veicoli } };
  }, [rapportinoId]);

  const enrichedData = useMemo(() => {
    if (!data?.rapportino || !data?.anagrafiche) return null;

    const { rapportino, anagrafiche } = data;
    const { tecnici, navi, clienti, luoghi, veicoli } = anagrafiche;

    const tecniciMap = new Map(tecnici.map(t => [t.id, t]));
    const naviMap = new Map(navi.map(n => [n.id, n]));
    const clientiMap = new Map(clienti.map(c => [c.id, c]));
    const luoghiMap = new Map(luoghi.map(l => [l.id, l]));
    const veicoliMap = new Map(veicoli.map(v => [v.id, v]));

    const getTecnicoName = (id: string | undefined) => {
        if (!id) return "N/D";
        const tecnico = tecniciMap.get(id);
        return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : "Tecnico non trovato";
    };
    
    const tuttiITecnici = new Map<string, { nome: string, ore: number }>();
    if (rapportino.dettaglioOre && rapportino.dettaglioOre.length > 0) {
        rapportino.dettaglioOre.forEach(dettaglio => {
            const id = getCleanId(dettaglio.tecnicoId);
            // @ts-ignore
            const ore = typeof dettaglio.ore === 'string' ? parseFloat(dettaglio.ore.replace(',', '.')) : dettaglio.ore || 0;
            if (id) {
                tuttiITecnici.set(id, { nome: getTecnicoName(id), ore });
            }
        });
    } else { 
        // @ts-ignore
        const oreLavoro = typeof rapportino.oreLavoro === 'string' ? parseFloat(rapportino.oreLavoro.replace(',', '.')) : rapportino.oreLavoro || 0;
        const allIds = [...new Set([getCleanId(rapportino.tecnicoId), ...(rapportino.presenze || []).map(getCleanId)].filter(Boolean) as string[])];
        const orePerTecnico = allIds.length > 0 ? oreLavoro / allIds.length : 0;
        allIds.forEach(id => {
            tuttiITecnici.set(id, { nome: getTecnicoName(id), ore: orePerTecnico });
        });
    }

    const getDataNave = () => {
        const naveId = getCleanId(rapportino.naveId);
        if (!naveId) return "N/D";
        const nave = naviMap.get(naveId);
        if(!nave) return "Nave non trovata";
        return nave.nome;
    };

    return {
        data: dayjs(rapportino.dataInizio as Date).format('DD MMMM YYYY'),
        naveImpianto: getDataNave(),
        luogo: getCleanId(rapportino.luogoId) ? luoghiMap.get(getCleanId(rapportino.luogoId)!)?.nome : "N/D",
        veicolo: getCleanId(rapportino.veicoloId) ? veicoliMap.get(getCleanId(rapportino.veicoloId)!)?.targa : "N/D",
        tecniciIntervenuti: Array.from(tuttiITecnici.values()),
        breveDescrizione: rapportino.descrizioneBreve || "",
        materialiImpiegati: rapportino.materialiImpiegati || "",
        lavoroEseguito: rapportino.lavoroEseguito || "",
        tecnicoResponsabile: getTecnicoName(getCleanId(rapportino.tecnicoId)),
        nomeFirma: rapportino.firmaFirmatarioNome || "",
        societaFirma: rapportino.firmaFirmatarioSocieta || "",
        firmaCliente: rapportino.firmaVettoriale || null,
    };

  }, [data]);

  if (!enrichedData) {
    return (
        <Box ref={ref} className={className} sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography>Caricamento rapportino...</Typography>
        </Box>
    );
  }

  return (
    <Box ref={ref} className={className} sx={{ color: '#000', backgroundColor: '#fff', fontFamily: 'Calibri, sans-serif', fontSize: '11pt', p: '40px' }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 'bold', color: '#2E75B5', fontSize: '16pt' }}>Tecnologie Industriali Navali S.R.L.</Typography>
            <Typography sx={{ fontSize: '9pt', color: '#000' }}>Sede Legale: Via Guicciardini, 52-54 - cap 08121 Messina</Typography>
            <Typography sx={{ fontSize: '9pt', color: '#000' }}>Tel 090358894 - cell. +39 3401649518 / +39 3460227234</Typography>
            <Typography sx={{ fontSize: '9pt', color: '#000' }}>Cod. Fisc. e Part. I.V.A.: 02982490832 - e-mail: tin.srl2008@alice.it</Typography>
            <Typography sx={{ fontSize: '9pt', color: '#000' }}>Impianti elettrici di bordo e di terra - Meccanica industriale e navale.</Typography>
        </Box>
        <Divider sx={{ my: 1, borderColor: '#2E75B5', borderWidth: '1px' }} />
        <Typography sx={{ textAlign: 'center', fontWeight: 'bold', my: 1, fontSize: '12pt', color: '#000' }}>RAPPORTO DI INTERVENTO TECNICO</Typography>
        <Divider sx={{ my: 1, mb: 2, borderColor: '#2E75B5', borderWidth: '1px' }} />

        <Box sx={{ my: 2 }}>
            <InfoRow label="Data" value={enrichedData.data} />
            <InfoRow label="Nave/Impianto" value={enrichedData.naveImpianto} />
            <InfoRow label="Luogo" value={enrichedData.luogo} />
            <InfoRow label="Veicolo" value={enrichedData.veicolo} />
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{my: 2, border: '1px solid #BFBFBF'}}>
            <Table size="small">
                <TableHead sx={{ backgroundColor: '#404040' }}>
                    <TableRow>
                        <TableCell sx={{color: '#fff', fontWeight: 'bold', fontSize: '11pt'}}>Tecnici Intervenuti</TableCell>
                        <TableCell sx={{color: '#fff', fontWeight: 'bold', fontSize: '11pt'}} align="right">Orari</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {enrichedData.tecniciIntervenuti.map((t, index) => (
                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell sx={{fontSize: '11pt', color: '#000'}}>{t.nome}</TableCell>
                            <TableCell align="right" sx={{fontSize: '11pt', color: '#000'}}>{formatOreLavoro(t.ore)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>

        <Box sx={{ my: 3 }}>
            {enrichedData.breveDescrizione && <BlockInfo label="Breve Descrizione Lavoro" value={enrichedData.breveDescrizione} />}
            {enrichedData.materialiImpiegati && <BlockInfo label="Materiali Impiegati" value={enrichedData.materialiImpiegati} />}
            {enrichedData.lavoroEseguito && <BlockInfo label="Lavoro Eseguito" value={enrichedData.lavoroEseguito} preWrap={true} />}
        </Box>

        <Divider sx={{ mt: 2, mb: 4, borderColor: '#2E75B5', borderWidth: '1px' }} />

        {/* BLOCCO FIRME CORRETTO */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pageBreakInside: 'avoid', mt: 4 }}>
            <Box sx={{ width: '48%' }}>
                <Typography sx={{fontSize: '11pt', color: '#000', mb: 1}}>Per accettazione (firma del responsabile)</Typography>
                <Typography sx={{fontSize: '10pt', color: '#000'}}>Nome Firmatario: {enrichedData.nomeFirma || 'N/D'}</Typography>
                <Typography sx={{fontSize: '10pt', color: '#000', mb: 2}}>Società: {enrichedData.societaFirma || 'N/D'}</Typography>
                {enrichedData.firmaCliente && (
                    <img src={enrichedData.firmaCliente} alt="Firma Cliente" style={{display: 'block', maxHeight: 100, maxWidth: '100%'}} />
                )}
            </Box>
            <Box sx={{ width: '48%', textAlign: 'left' }}>
                 <Typography sx={{fontSize: '11pt', color: '#000', mb: 2}}>Firma Tecnico Responsabile</Typography>
                 <Typography sx={{fontSize: '12pt', color: '#000', fontWeight: 'normal'}}>{enrichedData.tecnicoResponsabile}</Typography>
            </Box>
        </Box>

    </Box>
  );
});

export default RapportinoPrint;
