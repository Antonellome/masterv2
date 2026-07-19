import React from 'react';
import {
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    Typography 
} from '@mui/material';

// Placeholder per le props che verranno definite con la logica di calcolo
interface MatriceTableProps {
    // tecnici: any[];
    // giorni: number[];
    // dati: any;
}

const MatriceTable: React.FC<MatriceTableProps> = (/*{ tecnici, giorni, dati }*/) => {

    // Dati di esempio per la struttura
    const giorniMese = Array.from({ length: 31 }, (_, i) => i + 1);
    const tecniciEsempio = [
        { id: '1', nome: 'Mario Rossi', dittaId: 'g-tech' },
        { id: '2', nome: 'Luca Bianchi', dittaId: 'tin' },
    ];

    return (
        <TableContainer component={Paper} elevation={0}>
            <Table stickyHeader size="small" aria-label="matrice cumulativi">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 150, border: '1px solid #ddd' }}>Tecnico</TableCell>
                        {giorniMese.map(giorno => (
                            <TableCell 
                                key={giorno} 
                                align="center" 
                                sx={{ 
                                    fontWeight: 'bold', 
                                    width: 40, 
                                    p: 0.5,
                                    border: '1px solid #ddd',
                                    // Esempio di evidenziazione weekend
                                    backgroundColor: (giorno % 7 === 0 || giorno % 7 === 1) ? '#f5f5f5' : 'white'
                                }}
                            >
                                {giorno}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tecniciEsempio.map((tecnico) => (
                        <TableRow key={tecnico.id} sx={{ backgroundColor: tecnico.dittaId === 'g-tech' ? '#e0f7fa' : '#e8f5e9' }}>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', border: '1px solid #ddd' }}>
                                {tecnico.nome}
                            </TableCell>
                            {giorniMese.map(giorno => (
                                <TableCell key={giorno} align="center" sx={{ p: 0.5, border: '1px solid #ddd' }}>
                                    {/* Esempio di cella compilata */}
                                    {giorno === 5 && tecnico.id === '1' ? '8+2' : ''}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MatriceTable;
