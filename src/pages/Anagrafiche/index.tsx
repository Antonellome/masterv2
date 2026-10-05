
import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, Paper, Box, Divider } from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2'; // <-- Import corretto
import { NavLink } from 'react-router-dom';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import PlaceIcon from '@mui/icons-material/Place';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import CategoryIcon from '@mui/icons-material/Category';
import PageHeader from '@/components/PageHeader';

const anagraficheItems = [
    { text: 'Gestione Veicoli', path: '/anagrafiche/veicoli', icon: <DirectionsCarIcon /> },
    // { text: 'Gestione Clienti', path: '/anagrafiche/clienti', icon: <BusinessIcon /> },
    // { text: 'Gestione Luoghi', path: '/anagrafiche/luoghi', icon: <PlaceIcon /> },
    // { text: 'Gestione Navi', path: '/anagrafiche/navi', icon: <DirectionsBoatIcon /> },
    // { text: 'Tipi Giornata', path: '/anagrafiche/tipi-giornata', icon: <CategoryIcon /> },
];

const Anagrafiche: React.FC = () => {
    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
             <PageHeader title="Anagrafiche" />
            <Paper elevation={3} sx={{p: 3}}>
                <Typography variant="h6" gutterBottom>
                    Seleziona una categoria da gestire
                </Typography>
                <Divider sx={{mb: 3}} />
                <Grid container spacing={3}>
                    {anagraficheItems.map((item, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4}} key={index}>
                            <Card component={NavLink} to={item.path} sx={{ textDecoration: 'none', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': {transform: 'scale(1.03)'} }}>
                                <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                                    <ListItemIcon sx={{minWidth: 40}}>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>
        </Box>
    );
};

export default Anagrafiche;
