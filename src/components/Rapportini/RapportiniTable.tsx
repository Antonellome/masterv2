
import React from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridValueGetterParams, GridActionsCellItem } from '@mui/x-data-grid';
import { useGlobalStore } from '@/stores/globalStore';
import { Rapportino } from '@/models/definitions';
import dayjs from 'dayjs';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface RapportiniTableProps {
    rapportini: Rapportino[];
    onEdit: (rapportino: Rapportino) => void;
    onDelete: (rapportinoId: string) => void;
    onPrint: (rapportino: Rapportino) => void;
}

const MissingDataChip = ({ label }: { label: string }) => (
    <Tooltip title="Dato non trovato."><Chip icon={<WarningAmberIcon />} label={label} color="warning" size="small" variant="outlined" /></Tooltip>
);

const parseDate = (dateValue: any): dayjs.Dayjs | null => {
    if (!dateValue) return null;
    if (dateValue && typeof dateValue.toDate === 'function') return dayjs(dateValue.toDate());
    const d = dayjs(dateValue);
    return d.isValid() ? d : null;
};

const RapportiniTable: React.FC<RapportiniTableProps> = ({ rapportini, onEdit, onDelete, onPrint }) => {
    const {
        tecniciMap, clientiMap, naviMap, luoghiMap, tipiGiornataMap, areAnagraficheLoading
    } = useGlobalStore(state => ({
        tecniciMap: state.tecniciMap,
        clientiMap: state.clientiMap,
        naviMap: state.naviMap,
        luoghiMap: state.luoghiMap,
        tipiGiornataMap: state.tipiGiornataMap,
        areAnagraficheLoading: state.areAnagraficheLoading,
    }));

    const columns: GridColDef<Rapportino>[] = [
        { 
            field: 'dataFormatted', 
            headerName: 'Data', 
            width: 100, 
            valueGetter: (params) => parseDate(params.row.dataInizio)?.format('DD/MM/YYYY') ?? 'Data Invalida',
            sortComparator: (v1, v2, param1, param2) => {
                const date1 = parseDate(param1.api.getRow(param1.id).dataInizio);
                const date2 = parseDate(param2.api.getRow(param2.id).dataInizio);
                if (!date1 || !date2) return 0;
                return date1.diff(date2);
            }
        },
        {
            field: 'tecniciNomi', headerName: 'Tecnici', flex: 0.7, minWidth: 180,
            renderCell: (params) => {
                const mainTecnicoId = params.row.tecnicoId;
                const allTecniciIds = [ ...new Set([mainTecnicoId, ...(params.row.presenze || [])]) ];
                const mainTecnico = tecniciMap.get(mainTecnicoId);
                const altriTecnici = allTecniciIds.filter(id => id !== mainTecnicoId).map(id => tecniciMap.get(id)?.nomeCompleto).filter(Boolean);

                if (!mainTecnico) return <MissingDataChip label="Tecnico Resp. mancante" />;

                const countAltri = altriTecnici.length;
                const tooltipText = [mainTecnico.nomeCompleto, ...altriTecnici].join(', ');

                return (
                    <Tooltip title={tooltipText}>
                        <Typography variant="body2" noWrap>
                            <Box component="strong" sx={{ fontWeight: 'bold' }}>{mainTecnico.nomeCompleto}</Box>
                            {countAltri > 0 && <Box component="span" sx={{ ml: 0.5 }}> (+{countAltri})</Box>}
                        </Typography>
                    </Tooltip>
                );
            }
        },
        {
            field: 'descrizioneBreve',
            headerName: 'Descrizione Breve',
            flex: 1,
            minWidth: 200,
            valueGetter: (params) => params.row.descrizioneBreve || '-',
        },
        {
            field: 'tipoGiornataNome', headerName: 'Tipo Giornata', width: 130,
            valueGetter: (params) => tipiGiornataMap.get(params.row.tipoGiornataId)?.nome || '-',
        },
        { field: 'ordineLavoro', headerName: 'Ordine', width: 120, valueGetter: (params) => params.row.ordineLavoro || '-' },
        { field: 'naveNome', headerName: 'Nave', width: 150, valueGetter: (params) => naviMap.get(params.row.naveId)?.nome || '-' },
        { field: 'luogoNome', headerName: 'Luogo', width: 150, valueGetter: (params) => luoghiMap.get(params.row.luogoId)?.nome || '-' },
        {
            field: 'clienteNome', headerName: 'Cliente', width: 150,
            valueGetter: (params) => {
                const nave = naviMap.get(params.row.naveId);
                if (nave?.clienteId) return clientiMap.get(nave.clienteId)?.nome;
                return clientiMap.get(params.row.clienteId)?.nome || '-';
            }
        },
        {
            field: 'oreTotali', headerName: 'Ore', width: 80, align: 'center', headerAlign: 'center',
            valueGetter: (params) => {
                if (Array.isArray(params.row.dettaglioOre) && params.row.dettaglioOre.length > 0) {
                    return params.row.dettaglioOre.reduce((sum, item) => sum + (item.ore || 0), 0);
                }
                return 0;
            },
            renderCell: (params) => `${(params.value || 0).toFixed(1)}h`
        },
        {
            field: 'firma', headerName: 'Firma', width: 70, align: 'center', headerAlign: 'center',
            renderCell: (params) => {
                 const hasFirma = !!params.row.firmaVettoriale;
                 const tooltipText = hasFirma 
                    ? `Firmato da: ${params.row.firmaFirmatarioNome || 'N/D'}`
                    : 'Non Firmato';
                return (
                     <Tooltip title={tooltipText}>
                         <span style={{ fontSize: '1.2rem' }}>{hasFirma ? '\u2714\uFE0F' : '\u274C'}</span>
                     </Tooltip>
                )
            }
        },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 100, align: 'center', headerAlign: 'center',
            getActions: (params) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={() => onEdit(params.row)} showInMenu />, 
                <GridActionsCellItem icon={<PrintIcon />} label="Stampa" onClick={() => onPrint(params.row)} showInMenu />, 
                <GridActionsCellItem icon={<DeleteIcon />} label="Elimina" onClick={() => onDelete(params.row.id)} showInMenu />,
            ]
        },
    ];

    return (
        <Box sx={{ height: '75vh', width: '100%' }}>
            <DataGrid
                rows={rapportini}
                columns={columns}
                loading={areAnagraficheLoading}
                rowHeight={45}
                density="compact"
                initialState={{
                    pagination: { paginationModel: { pageSize: 50 } },
                    sorting: { sortModel: [{ field: 'dataFormatted', sort: 'desc' }] },
                }}
                pageSizeOptions={[25, 50, 100]}
                disableRowSelectionOnClick
                 sx={{ border: 0, '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none !important' } }}
            />
        </Box>
    );
};

export default RapportiniTable;
