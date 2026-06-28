
import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import pjson from '../../package.json';

const UpdateNotifier = () => {
    const [open, setOpen] = useState(false);
    const currentVersion = pjson.version;
    // In a real app, you would fetch this from a server.
    const latestVersion = "1.6.0"; 

    useEffect(() => {
        // A simple version comparison.
        // For a robust solution, consider using a library like `semver`.
        if (latestVersion > currentVersion) {
            setOpen(true);
        }
    }, [currentVersion, latestVersion]);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <Snackbar open={open} autoHideDuration={null} onClose={handleClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={handleClose} severity="info" sx={{ width: '100%' }}>
                Una nuova versione dell'applicazione è disponibile! Per aggiornare, esegui <code>bash update.sh</code> nel terminale.
            </Alert>
        </Snackbar>
    );
};

export default UpdateNotifier;
