import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Box, Typography, Chip, Grid, Divider, Button
} from '@mui/material';
import {
    Phone, Mail, Event, Today, Work, Business, Category, VpnKey
} from '@mui/icons-material';
import type { Tecnico, CategoriaTecnico, Ditta } from '@/models/definitions';

interface TecnicoDetailProps {
    open: boolean;
    onClose: () => void;
    tecnico: Tecnico | null;
    categorie: CategoriaTecnico[];
    ditte: Ditta[];
}

const getRelationName = (id: string | undefined, list: {id: string, nome: string}[]) => {
    if (!id) return <Typography variant="body2" color="text.secondary">Non specificato</Typography>;
    const item = list.find(i => i.id === id);
    return <Typography variant="body2">{item ? item.nome : 'ID non trovato'}</Typography>;
};

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/D';
    try {
        return new Date(dateString).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return 'Data non valida';
    }
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode;}> = ({ icon, label, value }) => (
    <Grid xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ mr: 1.5, color: 'text.secondary' }}>{icon}</Box>
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="body1">{value}</Typography>
        </Box>
    </Grid>
);

const TecnicoDetail: React.FC<TecnicoDetailProps> = ({ open, onClose, tecnico, categorie, ditte }) => {
    if (!tecnico) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                        Dettaglio Tecnico: <strong>{tecnico.cognome} {tecnico.nome}</strong>
                    </Typography>
                    <Chip 
                        label={tecnico.attivo ? 'Attivo' : 'Inattivo'}
                        color={tecnico.attivo ? 'success' : 'default'}
                    />
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Informazioni di Contatto</Typography>
                    <Grid container spacing={2}>
                        <DetailItem icon={<Mail />} label="Email" value={tecnico.email || '-'} />
                        <DetailItem icon={<Phone />} label="Telefono" value={tecnico.telefono || '-'} />
                    </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Affiliazione e Contratto</Typography>
                     <Grid container spacing={2}>
                        <DetailItem icon={<Business />} label="Ditta" value={getRelationName(tecnico.dittaId, ditte)} />
                        <DetailItem icon={<Category />} label="Categoria" value={getRelationName(tecnico.categoriaId, categorie)} />
                        <DetailItem icon={<Work />} label="Tipo Contratto" value={tecnico.tipoContratto || '-'} />
                        <DetailItem icon={<Event />} label="Data Assunzione" value={formatDate(tecnico.assunzione)} />
                    </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Scadenze e Accessi</Typography>
                    <Grid container spacing={2}>
                        <DetailItem icon={<Event />} label="Scadenza Contratto" value={formatDate(tecnico.scadenzaContratto)} />
                        <DetailItem icon={<Today />} label="Scadenza Visita Medica" value={formatDate(tecnico.scadenzaVisita)} />
                        <DetailItem icon={<Today />} label="Scadenza Unilav" value={formatDate(tecnico.scadenzaUnilav)} />
                        <DetailItem 
                            icon={<VpnKey color={tecnico.accessoApp ? 'primary' : 'disabled'}/>}
                            label="Accesso App"
                            value={tecnico.accessoApp ? `Sì ${tecnico.sincronizzazioneAttiva ? '(Sincro Attiva)' : ''}`: 'No'}
                        />
                    </Grid>
                </Box>
                
                {tecnico.note && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                            <Typography variant="h6" gutterBottom>Note</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{tecnico.note}</Typography>
                        </Box>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TecnicoDetail;
