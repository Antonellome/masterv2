import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Snackbar,
    Alert
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SentNotificationsList from '@/components/Notifiche/SentNotificationsList';
import InviaNotificaDialog from '@/components/Notifiche/InviaNotificaDialog';
import SectionLayout from '@/components/common/SectionLayout';

const NotificationsPage = () => {
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    const handleSuccess = () => {
        setSnackbar({ open: true, message: 'Richiesta di notifica inviata con successo!', severity: 'success' });
    };

    const handleError = (message: string) => {
        setSnackbar({ open: true, message: message, severity: 'error' });
    };

    return (
        <>
            <SectionLayout>
                <Box sx={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography color="text.secondary" sx={{ maxWidth: '70%' }}>
                            Da qui puoi inviare notifiche push ai tecnici e consultare lo storico delle notifiche inviate.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddCircleOutlineIcon />}
                            onClick={() => setDialogOpen(true)}
                        >
                            Invia Nuova Notifica
                        </Button>
                    </Box>
                    
                    <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                        <SentNotificationsList />
                    </Box>
                </Box>
            </SectionLayout>

            <InviaNotificaDialog
                open={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={handleSuccess}
                onError={handleError}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default NotificationsPage;
