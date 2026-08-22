
import React from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridActionsCellItem } from '@mui/x-data-grid';
import { Rapportino } from '@/models/definitions';
import { parseToDayjs } from '@/utils/dateUtils';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

type AnagraficaMap = Map<string, { nome: string; cognome?: string }>;

interface RapportiniTableProps {
    rapportini: Rapportino[];
    onRowClick: (rapportino: Rapportino) => void;
    onEdit: (rapportino: Rapportino) => void;
    onDelete: (rapportinoId: string) => void;
    onPrint: (rapportino: Rapportino) => void;
    tecniciMap: AnagraficaMap;
    naviMap: AnagraficaMap;
    loading: boolean;
}

const MissingDataChip = ({ label }: { label: string }) => (
    <Tooltip title="Dato anagrafico non trovato. Il record potrebbe essere corrotto.">
        <Chip icon={<WarningAmberIcon />} label={label} color="warning" size="small" variant="outlined" />
    </Tooltip>
);

const getNomeAnagrafica = (mappa: AnagraficaMap, id: string | undefined): string => {
    if (!id) return 'ID Mancante';
    const anagrafica = mappa.get(id);
    if (!anagrafica) return 'Sconosciuto';
    return `${anagrafica.cognome || ''} ${anagrafica.nome}`.trim();
};

const RapportiniTable: React.FC<RapportiniTableProps> = ({ 
    rapportini, 
    onRowClick, 
    onEdit, 
    onDelete, 
    onPrint,
    tecniciMap,
    naviMap,
    loading
}) => {

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

                const mainTecnicoNome = getNomeAnagrafica(tecniciMap, params.row.tecnicoId);

                const altriTecnici = (params.row.dettaglioOreTecnici || [])
                    .filter(d => d.tecnicoId !== params.row.tecnicoId)
                    .map(d => getNomeAnagrafica(tecniciMap, d.tecnicoId))
                    .filter(nome => nome !== 'Sconosciuto' && nome !== 'ID Mancante');

                if (mainTecnicoNome === 'Sconosciuto' || mainTecnicoNome === 'ID Mancante') {
                    return <MissingDataChip label="Tecnico Resp. non trovato" />;
                }
                
                const countAltri = altriTecnici.length;
                const tooltipText = [mainTecnicoNome, ...altriTecnici].join(', ');

                return (
                    <Tooltip title={tooltipText} placement="bottom-start">
                        <Typography variant="body2" noWrap>
                            <Box component="strong" sx={{ fontWeight: 'bold' }}>{mainTecnicoNome}</Box>
                            {countAltri > 0 && <Box component="span" sx={{ ml: 0.5 }}> (+{countAltri})</Box>}
                        </Typography>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'lavoroEseguito', 
            headerName: 'Descrizione', 
            flex: 1.5, 
            minWidth: 250, 
            valueGetter: (params) => params.row?.lavoroEseguito || '–'
        },
        { 
            field: 'naveNome', 
            headerName: 'Nave', 
            width: 180, 
            renderCell: (params) => {
                const nomeNave = getNomeAnagrafica(naviMap, params.row?.naveId);
                if (nomeNave === 'Sconosciuto' || nomeNave === 'ID Mancante') {
                    return <MissingDataChip label="Nave non trovata" />;
                }
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
            renderCell: (params) => <Typography variant="body2" sx={{ textAlign: 'right', width: '100%' }}>{(params.value || 0).toFixed(1)}h</Typography>
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
                    <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={() => onEdit(params.row)} showInMenu />,
                    <GridActionsCellItem icon={<PrintIcon />} label="Stampa/PDF" onClick={() => onPrint(params.row)} showInMenu />,
                    <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={() => onDelete(params.row.id)} showInMenu />,
                ];
            }
        },
    ];

    return (
        <Box sx={{ height: '75vh', width: '100%' }}>
            <DataGrid
                rows={rapportini}
                columns={columns}
                loading={loading}
                rowHeight={45}
                density="compact"
                onRowClick={(params) => params.row && onRowClick(params.row)}
                initialState={{
                    pagination: { paginationModel: { pageSize: 50 } },
                    sorting: { sortModel: [{ field: 'data', sort: 'desc' }] },
                }}
                pageSizeOptions={[25, 50, 100]}
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
