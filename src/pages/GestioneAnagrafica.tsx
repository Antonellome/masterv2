import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData'; 
import { anagraficheConfig, AnagraficaConfig } from '@/config/anagrafiche.config';

import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridRenderCellParams } from '@mui/x-data-grid';
import GenericForm from '@/components/Anagrafiche/GenericForm';
import ConfirmationDialog from '@/components/ConfirmationDialog';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const GestioneAnagrafica: React.FC = () => {
    const { anagraficaId } = useParams<{ anagraficaId: string }>();
    const { refreshData } = useData();

    const [config, setConfig] = useState<AnagraficaConfig | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [clienti, setClienti] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const fetchData = useCallback(async (collectionName: string) => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(items);
        } catch (error) {
            console.error("Errore nel caricamento dati: ", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'clienti'));
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setClienti(items);
            } catch (error) {
                console.error("Errore nel caricamento clienti: ", error);
            }
        };

        if (anagraficaId && anagraficheConfig[anagraficaId]) {
            const currentConfig = anagraficheConfig[anagraficaId];
            setConfig(currentConfig);
            fetchData(currentConfig.collectionName);
            fetchClients();
        } else {
            setLoading(false);
        }
    }, [anagraficaId, fetchData]);

    const handleOpenForm = (item: any | null = null) => {
        setSelectedItem(item);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setSelectedItem(null);
        setFormOpen(false);
        if (config) {
            fetchData(config.collectionName);
            refreshData([config.collectionName]); 
        }
    };

    const handleOpenConfirm = (item: any) => {
        setSelectedItem(item);
        setConfirmOpen(true);
    };

    const handleCloseConfirm = () => {
        setSelectedItem(null);
        setConfirmOpen(false);
    };

    const handleSave = async (itemData: any) => {
        if (!config) return;
        
        const dataToSave = {
            ...itemData,
            tipo: config.anagraficaType,
        };

        try {
            if (selectedItem?.id) {
                await updateDoc(doc(db, config.collectionName, selectedItem.id), dataToSave);
            } else {
                await addDoc(collection(db, config.collectionName), dataToSave);
            }
            handleCloseForm();
        } catch (error) {
            console.error("Errore nel salvataggio: ", error);
        }
    };

    const handleDelete = async () => {
        if (selectedItem?.id && config) {
            try {
                await deleteDoc(doc(db, config.collectionName, selectedItem.id));
                handleCloseConfirm();
                fetchData(config.collectionName);
                refreshData([config.collectionName]);
            } catch (error) {
                console.error("Errore nell'eliminazione: ", error);
            }
        }
    };

    const columns = useMemo<GridColDef[]>(() => {
        if (!config) return [];

        const enhancedColumns = config.columns.map(col => {
            if (col.field === 'clienteId') {
                return {
                    ...col,
                    headerName: 'Cliente',
                    renderCell: (params: GridRenderCellParams) => {
                        const clienteId = params.value as string;
                        // MODIFICA: Ritorna una stringa vuota se non c'è un cliente
                        if (!clienteId) return '';
                        const cliente = clienti.find(c => c.id === clienteId);
                        return cliente ? cliente.nome : ''; // E anche qui
                    }
                };
            }
            return col;
        });

        return [
            ...enhancedColumns,
            {
                field: 'actions',
                type: 'actions',
                headerName: 'Azioni',
                width: 100,
                cellClassName: 'actions',
                getActions: ({ row }) => [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Modifica"
                        onClick={() => handleOpenForm(row)}
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Elimina"
                        onClick={() => handleOpenConfirm(row)}
                    />,
                ],
            },
        ];
    }, [config, clienti, handleOpenForm, handleOpenConfirm]);

    if (!anagraficaId) return <Typography>Seleziona un'anagrafica dal menu.</Typography>;
    if (loading) return <CircularProgress />;
    if (!config) return <Typography>Configurazione per "{anagraficaId}" non trovata.</Typography>;

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
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
                sx={{ backgroundColor: 'background.paper', '& .MuiDataGrid-cell': { py: 1 } }}
            />

            {formOpen && (
                <GenericForm
                    open={formOpen}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    item={selectedItem}
                    fields={config.fields}
                    title={`${(selectedItem ? 'Modifica' : 'Aggiungi')} ${config.title.replace('Gestione ', '').slice(0, -1)}`}
                />
            )}

            <ConfirmationDialog
                open={confirmOpen}
                onClose={handleCloseConfirm}
                onConfirm={handleDelete}
                title={`Conferma Eliminazione`}
                description={`Sei sicuro di voler eliminare questo elemento? L'azione è irreversibile.`}
            />
        </Box>
    );
};

export default GestioneAnagrafica;
