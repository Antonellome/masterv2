import React from 'react';
import { Grid, Typography, Box, Divider, Chip } from '@mui/material';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import type { Tecnico, Ditta, Categoria } from '@/models/definitions'; // Corretto CategoriaTecnico in Categoria
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

interface TecnicoPrintLayoutProps {
    tecnico: Tecnico;
    ditte: Ditta[];
    categorie: Categoria[]; // Corretto CategoriaTecnico in Categoria
}

// Componente per mostrare un dettaglio di stampa
const PrintDetailItem: React.FC<{label: string, value: React.ReactNode, xs?: number}> = ({ label, value, xs = 6 }) => (
    <Grid sx={{ padding: '8px 0' }} size={xs}>
        <Typography variant="subtitle2" component="div" sx={{ color: '#555', fontSize: '0.8rem' }}>{label}</Typography>
        <Typography variant="body1" component="div" sx={{ fontWeight: 500, fontSize: '1rem' }}>{value || 'N/D'}</Typography>
    </Grid>
);

const TecnicoPrintLayout: React.FC<TecnicoPrintLayoutProps> = ({ tecnico, ditte, categorie }) => {

    // Funzione per formattare le date da Timestamp a stringa
    const formatDate = (date: Timestamp | undefined) => {
        if (!date) return 'N/D';
        const jsDate = date.toDate(); // Converti Timestamp a Date
        return format(jsDate, 'dd/MM/yyyy');
    };

    // Funzione per trovare il nome da una relazione ID
    const getRelationName = (id: string | undefined, list: {id: string, nome: string}[]) => {
        if (!id) return 'N/A';
        const item = list.find(i => i.id === id);
        return item ? item.nome : 'Non trovato';
    };

    return (
        <Box id="printable-content-wrapper" sx={{ padding: '20px', backgroundColor: 'white' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
                <Typography variant="h4" component="h1">Scheda Dettaglio Tecnico</Typography>
                <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <BusinessCenterIcon sx={{ color: '#333', marginRight: '8px' }}/>
                        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>R.I.S.O. Master Office</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#555' }}>Documento generato dal sistema gestionale</Typography>
                </Box>
            </Box>

            {/* Informazioni Anagrafiche */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Informazioni Anagrafiche</Typography>
                <Grid container spacing={2}>
                    <PrintDetailItem label="Cognome" value={tecnico.cognome} />
                    <PrintDetailItem label="Nome" value={tecnico.nome} />
                    <PrintDetailItem label="Email" value={tecnico.email} xs={8}/>
                    <PrintDetailItem label="Telefono" value={tecnico.telefono} xs={4}/>
                </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* Dettagli Professionali */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Dettagli Professionali</Typography>
                <Grid container spacing={2}>
                    <PrintDetailItem label="Ditta Appartenenza" value={getRelationName(tecnico.dittaId, ditte)} />
                    <PrintDetailItem label="Categoria" value={getRelationName(tecnico.categoriaId, categorie)} />
                </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* Scadenze */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Scadenze</Typography>
                <Grid container spacing={2}>
                    <PrintDetailItem label="Data Assunzione" value={formatDate(tecnico.dataAssunzione)} xs={4} />
                    <PrintDetailItem label="Scadenza Visita Medica" value={formatDate(tecnico.scadenzaVisita)} xs={4} />
                    <PrintDetailItem label="Scadenza Contratto" value={formatDate(tecnico.scadenzaContratto)} xs={4} />
                </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* Stato e Accessi */}
            <Box sx={{ mb: 3 }}>
                 <Typography variant="h6" gutterBottom>Stato e Accessi</Typography>
                 <Grid container spacing={2}>
                    <PrintDetailItem label="Stato" value={<Chip label={tecnico.attivo ? 'Attivo' : 'Inattivo'} color={tecnico.attivo ? 'success' : 'default'} />} xs={4}/>
                    <PrintDetailItem label="Accesso App" value={<Chip label={tecnico.accessoApp ? 'Abilitato' : 'Disabilitato'} color={tecnico.accessoApp ? 'success' : 'default'} />} xs={4}/>
                    <PrintDetailItem label="Sincronizzazione" value={<Chip label={tecnico.sincronizzazioneAttiva ? 'Attiva' : 'Non attiva'} color={tecnico.sincronizzazioneAttiva ? 'success' : 'default'} />} xs={4}/>
                </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* Note */}
            <Box>
                <Typography variant="h6" gutterBottom>Note</Typography>
                <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', p: 2, minHeight: 100 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {tecnico.note || 'Nessuna nota presente.'}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default TecnicoPrintLayout;
