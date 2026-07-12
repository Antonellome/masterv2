
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { anagraficheConfig, AnagraficaConfig } from '@/config/anagrafiche.config.tsx';

import { Box, Button, Typography, CircularProgress, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import GenericForm from '@/components/Anagrafiche/GenericForm';
import ConfirmationDialog from '@/components/ConfirmationDialog';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Cliente, Luogo, Nave } from '@/models/definitions';

const GestioneAnagrafica: React.FC = () => {
    const { anagraficaId } = useParams<{ anagraficaId: string }>();

    const [config, setConfig] = useState<AnagraficaConfig | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [relatedData, setRelatedData] = useState<{ navi: Nave[], luoghi: Luogo[], clienti: Cliente[] }>({ navi: [], luoghi: [], clienti: [] });
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const fetchData = useCallback(async () => {
        if (!anagraficaId) {
            setLoading(false);
            return;
        }
        const currentConfig = anagraficheConfig[anagraficaId];
        if (!currentConfig) {
            setLoading(false);
            return;
        }

        setConfig(currentConfig);
        setLoading(true);

        try {
            const mainSnapshot = await getDocs(collection(db, currentConfig.collectionName));
            const mainData = mainSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(mainData);

            // Carica sempre i dati correlati per i conteggi e la risoluzione dei nomi
            const [naviSnapshot, luoghiSnapshot, clientiSnapshot] = await Promise.all([
                getDocs(collection(db, 'navi')),
                getDocs(collection(db, 'luoghi')),
                getDocs(collection(db, 'clienti')),
            ]);
            const navi = naviSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Nave[];
            const luoghi = luoghiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Luogo[];
            const clienti = clientiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cliente[];
            setRelatedData({ navi, luoghi, clienti });

        } catch (error) {
            console.error("Errore nel caricamento dati: ", error);
        } finally {
            setLoading(false);
        }
    }, [anagraficaId]);

    useEffect(() => {
        fetchData();
    }, [anagraficaId, fetchData]);
    
    const handleOpenForm = (item: any | null = null) => { setSelectedItem(item); setFormOpen(true); };
    const handleCloseForm = () => { setSelectedItem(null); setFormOpen(false); fetchData(); };
    const handleOpenConfirm = (item: any) => { setSelectedItem(item); setConfirmOpen(true); };
    const handleCloseConfirm = () => { setSelectedItem(null); setConfirmOpen(false); };
    
    const handleSave = async (itemData: any) => {
        if (!config) return;
        try {
            if (selectedItem?.id) {
                await updateDoc(doc(db, config.collectionName, selectedItem.id), itemData);
            } else {
                await addDoc(collection(db, config.collectionName), itemData);
            }
        } catch (error) {
            console.error("Errore nel salvataggio: ", error);
        } finally {
            handleCloseForm();
        }
    };
    
    const handleDelete = async () => {
        if (selectedItem?.id && config) {
            try {
                await deleteDoc(doc(db, config.collectionName, selectedItem.id));
            } catch (error) {
                console.error("Errore nell'eliminazione: ", error);
            } finally {
                handleCloseConfirm();
                fetchData();
            }
        }
    };

    const columns = useMemo<GridColDef[]>(() => {
        if (!config) return [];

        let finalColumns = [...config.columns];

        if (anagraficaId === 'clienti') {
            const naviCountMap = relatedData.navi.reduce((acc, nave) => {
                const clienteId = typeof nave.clienteId === 'object' && nave.clienteId !== null ? (nave.clienteId as any).id : nave.clienteId;
                if (clienteId) acc[clienteId] = (acc[clienteId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const luoghiCountMap = relatedData.luoghi.reduce((acc, luogo) => {
                const clienteId = typeof luogo.clienteId === 'object' && luogo.clienteId !== null ? (luogo.clienteId as any).id : luogo.clienteId;
                if (clienteId) acc[clienteId] = (acc[clienteId] || 0) + 1;
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
            const clientiMap = new Map(relatedData.clienti.map(c => [c.id, c.nome]));
            finalColumns = finalColumns.map(col => {
                if (col.field === 'clienteId') {
                    return {
                        ...col,
                        renderCell: (params: GridRenderCellParams) => {
                            const value = params.value;
                            const clienteId = typeof value === 'object' && value !== null && value.id ? value.id : value;
                            return clientiMap.get(clienteId) || 'N/D';
                        }
                    };
                }
                return col;
            });
        }

        return [
            ...finalColumns,
            {
                field: 'actions', type: 'actions', headerName: 'Azioni', width: 100, cellClassName: 'actions',
                getActions: ({ row }) => [
                    <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={() => handleOpenForm(row)} />,
                    <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={() => handleOpenConfirm(row)} />,
                ],
            },
        ];
    }, [config, data, relatedData, anagraficaId]);

    if (!anagraficaId) return <Typography>Seleziona un'anagrafica dal menu.</Typography>;
    if (loading) return <CenteredCircularProgress />;
    if (!config) return <Typography>Configurazione per "{anagraficaId}" non trovata.</Typography>;

    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">{config.title}</Typography>
                <Button variant="contained" onClick={() => handleOpenForm()}>Aggiungi Nuovo</Button>
            </Box>

            <DataGrid
                rows={data}
                columns={columns}
                loading={loading}
                autoHeight
                getRowHeight={() => 'auto'}
                sx={{ 
                    backgroundColor: 'background.paper', 
                    '& .MuiDataGrid-cell': { py: 1.5 },
                    '& .actions': {
                        justifyContent: 'center'
                    }
                }}
            />

            {formOpen && (
                <GenericForm
                    open={formOpen}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    item={selectedItem}
                    fields={config.fields}
                    title={`${(selectedItem ? 'Modifica' : 'Aggiungi')} ${config.title.replace('Gestione ', '').slice(0, -1)}`}
                    clienti={relatedData.clienti}
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

// Aggiunto un componente CenteredCircularProgress per una migliore UX durante il caricamento
const CenteredCircularProgress = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
    </Box>
);

export default GestioneAnagrafica;
