import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, Typography, Box } from '@mui/material';

// Definiamo un tipo per gli item che ci aspettiamo
export interface DettaglioItem {
    label: string;
    value: React.ReactNode;
}

interface DettaglioItemDialogProps {
    open: boolean;
    onClose: () => void;
    items: DettaglioItem[] | null; // Accettiamo un array di DettaglioItem
    title: string;
}

const DettaglioItemDialog = ({ open, onClose, items, title }: DettaglioItemDialogProps) => {

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers>
                {items && items.length > 0 ? (
                    <List disablePadding>
                        {items.map((item) => (
                            <ListItem key={item.label} disableGutters divider>
                                <ListItemText
                                    primary={<Typography variant="subtitle2" color="text.secondary">{item.label}</Typography>}
                                    secondary={<Typography variant="body1" color="text.primary">{item.value || 'N/D'}</Typography>}
                                    sx={{ my: 1 }}
                                />
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                        <Typography color="text.secondary">Nessun dettaglio da mostrare.</Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default DettaglioItemDialog;
