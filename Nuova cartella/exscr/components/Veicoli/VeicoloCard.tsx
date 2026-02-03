import { Card, CardContent, Typography, CardActions, Button, Box, Chip } from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import type { Veicolo } from '@/models/definitions';

interface VeicoloCardProps {
    veicolo: Veicolo;
    onEdit: (veicolo: Veicolo) => void;
    onDelete: (veicolo: Veicolo) => void;
}

const getStatusChipColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'disponibile':
            return { backgroundColor: '#4caf50', color: 'white' }; // Verde
        case 'in uso':
            return { backgroundColor: '#ff9800', color: 'white' }; // Arancione
        case 'in manutenzione':
            return { backgroundColor: '#f44336', color: 'white' }; // Rosso
        default:
            return { backgroundColor: '#9e9e9e', color: 'white' }; // Grigio
    }
};

const VeicoloCard: React.FC<VeicoloCardProps> = ({ veicolo, onEdit, onDelete }) => {
    const { targa, marca, modello, stato } = veicolo;
    const chipStyle = getStatusChipColor(stato);

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div" gutterBottom>
                        {marca} {modello}
                    </Typography>
                    <Chip label={stato} sx={{ ...chipStyle, fontWeight: 'bold' }} />
                </Box>
                <Typography color="text.secondary">
                    Targa: {targa}
                </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button size="small" startIcon={<Edit />} onClick={() => onEdit(veicolo)}>
                    Modifica
                </Button>
                <Button size="small" startIcon={<Delete />} color="error" onClick={() => onDelete(veicolo)}>
                    Elimina
                </Button>
            </CardActions>
        </Card>
    );
};

export default VeicoloCard;
