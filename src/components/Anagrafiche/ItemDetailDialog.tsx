import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, Typography, Paper, Box, Divider } from '@mui/material';
import type { Nave, Luogo, BaseAnagrafica } from '@/models/definitions'; // Import dei tipi

interface ItemDetailDialogProps<T extends BaseAnagrafica> {
    open: boolean;
    onClose: () => void;
    title: string;
    data: T | null;
    anagraficaType: string; // Tipo di anagrafica (es. 'Cliente')
    relatedNavi?: Nave[];   // Navi associate
    relatedLuoghi?: Luogo[];// Luoghi associati
}

const formatLabel = (key: string): string => {
    if (key === 'id') return 'ID';
    if (key === 'pIva') return 'Partita IVA';
    if (key === 'codiceFiscale') return 'Codice Fiscale';
    if (key === 'clienteId') return 'ID Cliente';
    if (key === 'imo') return 'IMO';
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const ItemDetailDialog = <T extends BaseAnagrafica>({ open, onClose, title, data, anagraficaType, relatedNavi = [], relatedLuoghi = [] }: ItemDetailDialogProps<T>) => {
    if (!data) return null;

    const mainTitle = data.nome || 'Dettaglio';
    const fieldsToShow = Object.entries(data).filter(([key]) => key !== 'nome' && key !== 'id' && key !== 'clienteId');

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}: <span style={{ fontWeight: 500 }}>{mainTitle}</span></DialogTitle>
            <DialogContent dividers>
                {/* Sezione Dettagli Principali */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <List dense>
                        {fieldsToShow.map(([key, value]) => (
                            <ListItem key={key} divider>
                                <ListItemText
                                    primary={formatLabel(key)}
                                    secondary={<Typography variant="body1" color="text.primary">{String(value) || 'N/D'}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>

                {/* Sezione Condizionale per Clienti */}
                {anagraficaType === 'Cliente' && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }}><Typography variant="overline">Proprietà Associate</Typography></Divider>
                        
                        {/* Sottosezione Navi */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 2, fontSize: '1.1rem' }}>Navi</Typography>
                        {relatedNavi.length > 0 ? (
                            <Paper variant="outlined" sx={{ p: 1 }}>
                                <List dense>
                                    {relatedNavi.map(nave => (
                                        <ListItem key={nave.id}>
                                            <ListItemText primary={nave.nome} secondary={`IMO: ${nave.imo || 'N/D'}`} />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>Nessuna nave associata.</Typography>
                        )}

                        {/* Sottosezione Luoghi */}
                        <Typography variant="h6" gutterBottom sx={{ mt: 3, fontSize: '1.1rem' }}>Luoghi</Typography>
                        {relatedLuoghi.length > 0 ? (
                            <Paper variant="outlined" sx={{ p: 1 }}>
                                <List dense>
                                    {relatedLuoghi.map(luogo => (
                                        <ListItem key={luogo.id}>
                                            <ListItemText primary={luogo.nome} secondary={luogo.indirizzo} />
                                        </ListItem>
                                    ))}
                                </List>
                             </Paper>
                        ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>Nessun luogo associato.</Typography>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ItemDetailDialog;
