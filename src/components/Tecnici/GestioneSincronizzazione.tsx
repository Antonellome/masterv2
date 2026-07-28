
import React, { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Tooltip, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { SyncStatus } from '@/models/sync.models';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import SyncIcon from '@mui/icons-material/Sync';
import { syncAllData } from '@/services/offlineSync'; // Assumiamo che questa funzione esista

const GestioneSincronizzazione = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const syncStatus = useLiveQuery(() => db.syncStatus.toArray());
    const tecnici = useLiveQuery(() => db.tecnici.toArray());

    const handleSync = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            await syncAllData(); // Funzione centrale di sincronizzazione
        } catch (error) {
            console.error("Errore durante la sincronizzazione manuale:", error);
            setSyncError(error instanceof Error ? error.message : 'Errore sconosciuto.');
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const tecniciMap = useMemo(() => {
        if (!tecnici) return new Map();
        return new Map(tecnici.map(t => [t.id, `${t.cognome} ${t.nome}`]));
    }, [tecnici]);

    const getStatusChip = (status: SyncStatus['status']) => {
        switch (status) {
            case 'synced':
                return <Chip label="Sincronizzato" color="success" size="small" />;
            case 'pending':
                return <Chip label="In attesa" color="warning" size="small" />;
            case 'error':
                return <Chip label="Errore" color="error" size="small" />;
            default:
                return <Chip label="Sconosciuto" color="default" size="small" />;
        }
    };

    const columns: GridColDef = [
        { 
            field: 'tableName', 
            headerName: 'Elemento', 
            flex: 1,
            valueGetter: (params) => {
                if (params.row.tableName === 'tecnici' && tecniciMap.has(params.row.entityId)) {
                    return `Tecnico: ${tecniciMap.get(params.row.entityId)}`;
                }
                return params.row.tableName;
            }
        },
        {
            field: 'status',
            headerName: 'Stato',
            flex: 1,
            renderCell: (params) => getStatusChip(params.row.status),
        },
        {
            field: 'lastSync',
            headerName: 'Ultima Sincronizzazione',
            flex: 1,
            valueGetter: (params) => params.row.lastSync ? format(new Date(params.row.lastSync), 'dd/MM/yyyy HH:mm:ss', { locale: it }) : 'Mai',
        },
        {
            field: 'error',
            headerName: 'Dettaglio Errore',
            flex: 2,
            renderCell: (params) => (
                params.row.error ? (
                    <Tooltip title={params.row.error}>
                        <Typography variant="body2" color="error" noWrap>{params.row.error}</Typography>
                    </Tooltip>
                ) : null
            ),
        },
    ];

    if (!syncStatus || !tecnici) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ mt: 4 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <div>
                    <Typography variant="h5" gutterBottom>Stato Sincronizzazione</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Monitora qui lo stato di sincronizzazione dei dati tra l'applicazione e il server.
                    </Typography>
                </div>
                <Button
                    variant="contained"
                    startIcon={isSyncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza Ora'}
                </Button>
            </Box>

            {syncError && <Alert severity="error" sx={{ mb: 2 }}>{`Errore di sincronizzazione: ${syncError}`}</Alert>}
            
            <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={syncStatus}
                    columns={columns}
                    getRowId={(row) => `${row.tableName}-${row.entityId}`}
                    autoHeight
                    density="compact"
                />
            </Box>
        </Box>
    );
};

export default GestioneSincronizzazione;
