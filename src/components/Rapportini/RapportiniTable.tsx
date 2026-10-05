
import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridActionsCellItem } from '@mui/x-data-grid';
import { Rapportino } from '@/models/definitions';
import { parseToDayjs } from '@/utils/dateUtils';
import { useRapportiniStore } from '@/store/useRapportiniStore'; // Importa lo store

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

type AnagraficaMap = Map<string, { nome: string; cognome?: string }>;

// Le props non includono più le funzioni di callback per le azioni
interface RapportiniTableProps {
    rapportini: Rapportino[];
    tecniciMap: AnagraficaMap;
    naviMap: AnagraficaMap;
    luoghiMap: AnagraficaMap;
    tipiGiornataMap: AnagraficaMap;
    loading: boolean;
}

// Componente per i dati mancanti
const MissingDataChip = ({ label }: { label: string }) => (
    <Tooltip title="Dato anagrafico non trovato. Il record potrebbe essere corrotto o obsoleto.">
        <Chip icon={<WarningAmberIcon />} label={label} color="warning" size="small" variant="outlined" />
    </Tooltip>
);

// Funzione helper per ottenere il nome da una mappa anagrafica
const getNomeAnagrafica = (mappa: AnagraficaMap, id: string | undefined): string => {
    if (!id) return 'ID Mancante';
    const anagrafica = mappa.get(id);
    if (!anagrafica) return `ID: ${id.substring(0,5)}...`;
    return `${anagrafica.cognome || ''} ${anagrafica.nome}`.trim();
};

const RapportiniTable: React.FC<RapportiniTableProps> = ({ 
    rapportini, 
    tecniciMap,
    naviMap,
    luoghiMap,
    tipiGiornataMap,
    loading
}) => {

    // Usa le azioni direttamente dallo store
    const openRapportinoForm = useRapportiniStore(state => state.openRapportinoForm);
    // Qui potresti aggiungere anche le azioni per eliminare e stampare
    // const deleteRapportino = useRapportiniStore(state => state.deleteRapportino);
    // const printRapportino = useRapportiniStore(state => state.printRapportino);

    const columns: GridColDef<Rapportino>[] = [
        {
            field: 'data',
            headerName: 'Data',
            type: 'date',
            width: 100,
            valueGetter: (params) => params.row ? parseToDayjs(params.row.data)?.toDate() : null,
            valueFormatter: (params) => params.value ? parseToDayjs(params.value)?.format('DD/MM/YYYY') : '',
        },
        {
            field: 'tecniciNomi',
            headerName: 'Tecnici',
            flex: 1,
            minWidth: 200,
            renderCell: (params: GridRenderCellParams<Rapportino>) => {
                if (!params.row) return null;
                const mainTecnicoNome = getNomeAnagrafica(tecniciMap, params.row.tecnicoScriventeId || params.row.tecnicoId);
                const altriTecnici = (params.row.presenze || [])
                    .filter(id => id !== (params.row.tecnicoScriventeId || params.row.tecnicoId))
                    .map(id => getNomeAnagrafica(tecniciMap, id));

                if (mainTecnicoNome.startsWith('ID')) return <MissingDataChip label="Tecnico Resp. non valido" />;
                
                const countAltri = altriTecnici.length;
                const tooltipText = [mainTecnicoNome, ...altriTecnici].join(', ');

                return (
                    <Tooltip title={tooltipText} placement="bottom-start">
                         <Typography variant="body2" noWrap>
                            <Box component="strong" sx={{ fontWeight: 'bold' }}>{mainTecnicoNome}</Box>
                            {countAltri > 0 && <Box component="span" sx={{ ml: 0.5, color: 'text.secondary' }}> (+{countAltri})</Box>}
                        </Typography>
                    </Tooltip>
                );
            }
        },
        {
            field: 'descrizioneBreve',
            headerName: 'Descrizione Intervento',
            flex: 1.5,
            minWidth: 250,
            valueGetter: (params) => params.row?.descrizioneBreve || params.row?.lavoroEseguito || '–',
            renderCell: (params) => <Typography variant="body2" noWrap title={params.value}>{params.value}</Typography>
        },
        { 
            field: 'naveNome', 
            headerName: 'Nave', 
            width: 180, 
            renderCell: (params) => {
                const nomeNave = getNomeAnagrafica(naviMap, params.row?.naveId);
                if (nomeNave.startsWith('ID')) return <MissingDataChip label="Nave non valida" />;
                return <Typography variant="body2" noWrap>{nomeNave}</Typography>;
            }
        },
         {
            field: 'oreTotali',
            headerName: 'Ore',
            width: 80,
            align: 'right',
            headerAlign: 'right',
            valueGetter: (params) => {
                const dettaglio = params.row?.dettaglioOreTecnici;
                return Array.isArray(dettaglio) ? dettaglio.reduce((sum, item) => sum + (item.ore || 0), 0) : 0;
            },
            renderCell: (params) => <Typography variant="body2" sx={{ fontWeight: '500', textAlign: 'right', width: '100%' }}>{(params.value || 0).toFixed(1)}h</Typography>
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Azioni',
            width: 100,
            align: 'center',
            getActions: (params) => {
                if (!params.row?.id) return [];
                return [
                    // L'azione di modifica ora chiama direttamente lo store
                    <GridActionsCellItem 
                        icon={<EditIcon />} 
                        label="Modifica Rapportino" 
                        onClick={() => openRapportinoForm(params.row)} // Usa l'azione dello store
                    />,
                    <GridActionsCellItem icon={<PrintIcon />} label="Stampa/PDF" onClick={() => alert('Stampa non implementata')} showInMenu />,
                    <GridActionsCell-item icon={<DeleteIcon />} label="Elimina" onClick={() => alert('Eliminazione non implementata')} showInMenu />,
                ];
            }
        },
    ];

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%' }}>
            <DataGrid
                rows={rapportini}
                columns={columns}
                loading={loading}
                rowHeight={40}
                density="compact"
                onRowClick={(params) => params.row && openRapportinoForm(params.row)}
                initialState={{
                    pagination: { paginationModel: { pageSize: 100 } },
                    sorting: { sortModel: [{ field: 'data', sort: 'desc' }] },
                }}
                pageSizeOptions={[50, 100, 200]}
                sx={{
                    cursor: 'pointer',
                    border: 0,
                    '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': {
                        outline: 'none !important'
                    }
                }}
            />
        </Box>
    );
};

export default RapportiniTable; 
