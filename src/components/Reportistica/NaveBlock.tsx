import React from 'react';
import { Box, Paper, Typography, Card, CardContent } from '@mui/material';

// Placeholder per le props, verranno definite in dettaglio con la logica di calcolo
interface NaveBlockProps {
    naveNome: string;
    // datiTabella: any; // Conterrà i dati per la MatriceTable
}

const NaveBlock: React.FC<NaveBlockProps> = ({ naveNome }) => {
    return (
        <Card elevation={4} sx={{ mb: 4 }}>
            <CardContent>
                <Typography variant="h5" component="div" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {naveNome}
                </Typography>
                <Box>
                    {/* Qui verrà inserito il componente MatriceTable.tsx */}
                    <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
                        <Typography align="center" color="text.secondary">
                            Tabella Matrice per {naveNome} (in costruzione)
                        </Typography>
                    </Paper>
                </Box>
            </CardContent>
        </Card>
    );
};

export default NaveBlock;
