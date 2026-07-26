
import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { anagraficheConfig, AnagraficaConfig } from '@/config/anagrafiche.config';
import { useCollectionData } from '@/hooks/useCollectionData';
import { useAnagraficaData } from '@/contexts/DataContext';
import { addAnagraficaWithVersion, updateAnagraficaWithVersion, deleteAnagraficaWithVersion } from '@/utils/firestoreWrite';

import { Box, Button, Typography, CircularProgress, Chip, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import GenericForm from '@/components/Anagrafiche/GenericForm';
import ConfirmationDialog from '@/components/ConfirmationDialog';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Anagrafica, Cliente } from '@/models/definitions';

const GestioneAnagrafica: React.FC = () => {
    const { anagraficaId } = useParams<{ anagraficaId: string }>();

    // 1. CONFIGURAZIONE E HOOK DATI LOCALI
    const config = useMemo(() => anagraficaId ? anagraficheConfig[anagraficaId] : null, [anagraficaId]);
    const { data, loading, error, forceRefresh } = useCollectionData<any>(config?.collectionName || '');
    const { clienti, navi, luoghi, clientiMap } = useAnagraficaData();

    // STATO INTERNO
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    
    // GESTIONE AZIONI UI
    const handleOpenForm = (item: any | null = null) => { setSelectedItem(item); setFormOpen(true); };
    const handleCloseForm = () => { setSelectedItem(null); setFormOpen(false); forceRefresh(); };
    const handleOpenConfirm = (item: any) => { setSelectedItem(item); setConfirmOpen(true); };
    const handleCloseConfirm = () => { setSelectedItem(null); setConfirmOpen(false); };
    
    // 2. LOGICA DI SALVATAGGIO (Create/Update) OFFLINE-FIRST
    const handleSave = async (itemData: any) => {
        if (!config) return;
        try {
            const { id, ...dataToSave } = itemData;
            if (id) { // Modifica
                await updateAnagraficaWithVersion(config.collectionName, id, dataToSave);
            } else { // Creazione
                await addAnagraficaWithVersion(config.collectionName, dataToSave);
            }
        } catch (error) {
            console.error("Errore nel salvataggio: ", error);
        } finally {
            handleCloseForm();
        }
    };
    
    // 3. LOGICA DI ELIMINAZIONE OFFLINE-FIRST
    const handleDelete = async () => {
        if (selectedItem?.id && config) {
            try {
                await deleteAnagraficaWithVersion(config.collectionName, selectedItem.id);
            } catch (error) {
                console.error("Errore nell'eliminazione: ", error);
            } finally {
                handleCloseConfirm();
                forceRefresh();
            }
        }
    };

    // 4. COSTRUZIONE COLONNE CON DATI CORRELATI DAL CONTEXT
    const columns = useMemo<GridColDef[]>(() => {
        if (!config) return [];

        let finalColumns = [...config.columns];

        if (anagraficaId === 'clienti') {
            const naviCountMap = navi.reduce((acc, nave) => {
                if (nave.clienteId) acc[nave.clienteId] = (acc[nave.clienteId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const luoghiCountMap = luoghi.reduce((acc, luogo) => {
                if (luogo.clienteId) acc[luogo.clienteId] = (acc[luogo.clienteId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            finalColumns = finalColumns.map(col => {
                if (col.field === 'numNavi') {
                    return { ...col, renderCell: (params) => <Chip label={naviCountMap[params.row.id] || 0} size="small" /> };
                }
                if (col.field === 'numLuoghi') {
                    return { ...col, renderCell: (params) => <Chip label={luoghiCountMap[params.row.id] || 0} size="small" /> };
                }
                return col;
            });
        }
        
        if (anagraficaId === 'navi' || anagraficaId === 'luoghi') {
            finalColumns = finalColumns.map(col => {
                if (col.field === 'clienteId') {
                    return { ...col, renderCell: (params: GridRenderCellParams) => clientiMap[params.value] || 'N/D' };
                }
                return col;
            });
        }

        return [
            ...finalColumns,
            {
                field: 'actions', type: 'actions', headerName: 'Azioni', width: 100,
                getActions: ({ row }) => [
                    <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={() => handleOpenForm(row)} />,
                    <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={() => handleOpenConfirm(row)} />,
                ],
            },
        ];
    }, [config, data, navi, luoghi, clientiMap, anagraficaId]);

    // RENDER LOGIC
    if (!anagraficaId) return <Typography>Seleziona un'anagrafica dal menu.</Typography>;
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">Errore nel caricamento: {error.message}</Typography>;
    if (!config) return <Typography>Configurazione per "{anagraficaId}" non trovata.</Typography>;

    return (
        <Box sx={{ height: '100%', width: '100%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">{config.title}</Typography>
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => handleOpenForm()}>Aggiungi Nuovo</Button>
            </Box>

            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <DataGrid
                    rows={data}
                    columns={columns}
                    loading={loading}
                    autoHeight={false}
                    sx={{ backgroundColor: 'background.paper', border: 0 }}
                />
            </Box>

            {formOpen && (
                <GenericForm
                    open={formOpen}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    item={selectedItem}
                    fields={config.fields}
                    title={`${(selectedItem ? 'Modifica' : 'Aggiungi')} ${config.title.replace('Gestione ', '').slice(0, -1)}`}
                    clienti={clienti as Cliente[]}
                />
            )}

            <ConfirmationDialog
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title="Conferma Eliminazione"
                description="Sei sicuro di voler eliminare questo elemento? L'azione è irreversibile."
            />
        </Box>
    );
};

export default GestioneAnagrafica;
