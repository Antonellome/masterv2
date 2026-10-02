
import React, { useState, useMemo, useCallback } from 'react';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Tooltip, CircularProgress, Switch, FormControlLabel
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowParams, GridActionsCellItem } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';

import { db } from '@/db/database';
import { formatOreLavoro } from '@/utils/formatters';
import { Anagrafica, Nave, Cliente, Luogo, TipoGiornata, Rapportino } from '@/models/definitions';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useGlobalStore } from '@/stores/globalStore';

import ConfirmationDialog from '@/components/ConfirmationDialog';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DrawIcon from '@mui/icons-material/Draw';

dayjs.locale('it');

const DELETED_FIELD_APP_TECNICI = 'cancellato';

const robustParseToDayjs = (date: any): Dayjs | null => {
    if (!date) return null;
    if (typeof date.seconds === 'number') return dayjs(new Date(date.seconds * 1000));
    if (typeof date.toDate === 'function') return dayjs(date.toDate());
    const d = dayjs(date);
    return d.isValid() ? d : null;
};

const isRowDeleted = (row: any) => {
    if (!row) return false;
    return row.isDeleted === true || row[DELETED_FIELD_APP_TECNICI] === true;
};

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Anagrafica | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
    tipoGiornata: TipoGiornata | null;
    ordineLavoro: string;
}

const safeSort = (a: any, b: any, field: string) => (a?.[field] || '').localeCompare(b?.[field] || '');
const safeSortCognomeNome = (a: any, b: any) => `${a?.cognome || ''} ${a?.nome || ''}`.localeCompare(`${b?.cognome || ''} ${b?.nome || ''}`);

const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    const isSyncing = useGlobalStore(state => state.isSyncing);
    const [showDeleted, setShowDeleted] = useState(false);

    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);
    const navi = useLiveQuery(() => db.navi.toArray(), []);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []);
    const clienti = useLiveQuery(() => db.clienti.toArray(), []);
    const tipiGiornata = useLiveQuery(() => db.tipiGiornata.toArray(), []);
    const allRapportiniRaw = useLiveQuery(() => db.rapportini.toArray(), []);

    const isLoading = !allRapportiniRaw || !tecnici || !navi || !luoghi || !clienti || !tipiGiornata || isSyncing;

    const rapportini = useMemo(() => {
        if (isLoading || !allRapportiniRaw) return [];
        return allRapportiniRaw
            .filter(r => {
                if (!r || !r.id) return false;
                if (showDeleted) return true;
                return !isRowDeleted(r);
            })
            .map(r => ({
                ...r,
                data: robustParseToDayjs(r.data)?.toDate() ?? null,
            }));
    }, [allRapportiniRaw, isLoading, showDeleted]);

    const { tecniciMap, naviMap, luoghiMap, clientiMap, tipiGiornataMap } = useMemo(() => ({
        tecniciMap: new Map((tecnici || []).map(t => [t.id, t])),
        naviMap: new Map((navi || []).map(n => [n.id, n])),
        luoghiMap: new Map((luoghi || []).map(l => [l.id, l])),
        clientiMap: new Map((clienti || []).map(c => [c.id, c])),
        tipiGiornataMap: new Map((tipiGiornata || []).map(t => [t.id, t]))
    }), [tecnici, navi, luoghi, clienti, tipiGiornata]);

    const sortedTecnici = useMemo(() => [...(tecnici || [])].sort(safeSortCognomeNome), [tecnici]);
    const sortedNavi = useMemo(() => [...(navi || [])].sort((a,b) => safeSort(a,b, 'nome')), [navi]);
    const sortedLuoghi = useMemo(() => [...(luoghi || [])].sort((a,b) => safeSort(a,b, 'nome')), [luoghi]);
    const sortedClienti = useMemo(() => [...(clienti || [])].sort((a,b) => safeSort(a,b, 'nome')), [clienti]);
    const sortedTipiGiornata = useMemo(() => [...(tipiGiornata || [])].sort((a,b) => safeSort(a,b, 'nome')), [tipiGiornata]);

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [rowToRestore, setRowToRestore] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    const filteredRapportini = useMemo(() => {
        if (isLoading || !rapportini) return [];
        return rapportini.filter(r => {
            const dataRapportino = r.data ? dayjs(r.data) : null;
            if (filters.dataDa && dataRapportino && dataRapportino.isBefore(filters.dataDa, 'day')) return false;
            if (filters.dataA && dataRapportino && dataRapportino.isAfter(filters.dataA, 'day')) return false;
            if (filters.nave && r.naveId !== filters.nave.id) return false;
            if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
            if (filters.tipoGiornata && r.tipoGiornataId !== filters.tipoGiornata.id) return false;
            if (filters.ordineLavoro && !(r.ordineLavoro || '').toLowerCase().includes(filters.ordineLavoro.toLowerCase())) return false;
            if (filters.cliente) {
                const nave = naviMap.get(r.naveId || '');
                const luogo = luoghiMap.get(r.luogoId || '');
                const clienteId = nave?.clienteId || luogo?.clienteId;
                if (clienteId !== filters.cliente.id) return false;
            }
            if (filters.tecnico) {
                const tecnicoId = filters.tecnico.id;
                const match = 
                    r.tecnicoId === tecnicoId ||
                    r.presenze?.includes(tecnicoId) ||
                    r.dettaglioOreTecnici?.some(d => d.tecnicoId === tecnicoId);
                
                if (!match) return false;
            }
            return true;
        });
    }, [rapportini, filters, naviMap, luoghiMap, isLoading]);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);
    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);
    const handleRestoreRequest = useCallback((id: string) => setRowToRestore(id), []);

    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        const id = rowToDelete;
        setRowToDelete(null);
        try {
            await db.rapportini.update(id, { isDeleted: true, [DELETED_FIELD_APP_TECNICI]: true });
            setSnackbar({ open: true, message: 'Rapportino archiviato.', severity: 'success' });
            rapportinoCloudService.delete(id).catch(err => {
                console.error("Cloud delete failed:", err);
                db.rapportini.update(id, { isDeleted: false, [DELETED_FIELD_APP_TECNICI]: false });
                setSnackbar({ open: true, message: 'Archiviazione fallita sul server.', severity: 'error' });
            });
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || "Errore.", severity: 'error' });
        }
    };
    
    const handleConfirmRestore = async () => {
        if (!rowToRestore) return;
        const id = rowToRestore;
        setRowToRestore(null);
        try {
            await db.rapportini.update(id, { isDeleted: false, [DELETED_FIELD_APP_TECNICI]: false });
            setSnackbar({ open: true, message: 'Rapportino ripristinato.', severity: 'success' });
            rapportinoCloudService.restore(id).catch(err => {
                 console.error("Cloud restore failed:", err);
                 db.rapportini.update(id, { isDeleted: true, [DELETED_FIELD_APP_TECNICI]: true });
                 setSnackbar({ open: true, message: 'Ripristino fallito sul server.', severity: 'error' });
            });
        } catch (error: any) {
            setSnackbar({ open: true, message: error.message || "Errore.", severity: 'error' });
        }
    };

    const handleRowClick = (params: GridRowParams) => {
        if (params.field === 'actions' || params.field === '__check__' || isRowDeleted(params.row)) return;
        navigate(`/rapportino/edit/${params.id}`);
    };

    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' }), []);

    const calculateTotalHoursForRow = (row: Rapportino | undefined) => {
        if (!row) return 0;

        if (row.dettaglioOreTecnici && Array.isArray(row.dettaglioOreTecnici) && row.dettaglioOreTecnici.length > 0) {
            return row.dettaglioOreTecnici.reduce((total, tecnico) => {
                const ore = parseFloat(tecnico?.ore as any);
                return total + (isNaN(ore) ? 0 : ore);
            }, 0);
        }

        const oreLavoro = parseFloat(row.oreLavoro as any);
        return isNaN(oreLavoro) ? 0 : oreLavoro;
    };

    const getAuthorHours = (row: Rapportino | undefined) => {
        if (!row || !row.dettaglioOreTecnici || row.dettaglioOreTecnici.length === 0) {
            const authorId = row?.tecnicoScriventeId || row?.tecnicoId;
            if (row?.tecnicoId === authorId) {
                const oreLavoro = parseFloat(row.oreLavoro as any);
                return isNaN(oreLavoro) ? 0 : oreLavoro;
            }
            return 0;
        }

        const authorId = row.tecnicoScriventeId || row.tecnicoId;
        const authorDetail = row.dettaglioOreTecnici.find(d => d.tecnicoId === authorId);
        const ore = parseFloat(authorDetail?.ore as any);
        return isNaN(ore) ? 0 : ore;
    };

    const columns: GridColDef<(typeof rapportini)[0]>[] = useMemo(() => [
        { 
            field: 'data', 
            headerName: 'Data', 
            width: 110, 
            type: 'date',
            renderCell: (p) => p.value ? dayjs(p.value).format("DD/MM/YYYY") : '', 
            cellClassName: (params) => isRowDeleted(params.row) ? 'deleted-date' : ''
        },
        {
            field: 'tecnici',
            headerName: 'Tecnici',
            flex: 1.5, 
            minWidth: 150,
            valueGetter: (p) => {
                if (!p?.row) return '';
                const allIds = [...new Set([
                    p.row.tecnicoScriventeId,
                    p.row.tecnicoId,
                    ...(p.row.presenze || []),
                    ...(p.row.dettaglioOreTecnici?.map(d => d.tecnicoId) || [])
                ])].filter(Boolean);
                return allIds.map(id => {
                    const t = tecniciMap.get(id);
                    return t ? `${t.cognome} ${t.nome}` : '';
                }).filter(Boolean).join(', ');
            },
            renderCell: (p) => {
                if (!p.row) return null;
                const authorId = p.row.tecnicoScriventeId || p.row.tecnicoId;
                const author = authorId ? tecniciMap.get(authorId) : null;
                const authorName = author ? `${author.cognome} ${author.nome}` : 'N/D';
                const allPresentIds = [...new Set([
                    p.row.tecnicoScriventeId,
                    p.row.tecnicoId,
                    ...(p.row.presenze || []),
                    ...(p.row.dettaglioOreTecnici?.map(d => d.tecnicoId) || [])
                ])].filter(Boolean);
                const allNamesString = allPresentIds.map(id => {
                    const t = tecniciMap.get(id);
                    return t ? `${t.cognome} ${t.nome}` : null;
                }).filter(Boolean).join(', ');
                const tooltipText = allNamesString ? `Tecnici presenti: ${allNamesString}` : 'Nessun tecnico specificato';
                return (
                    <Tooltip title={tooltipText} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {authorName}
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
            field: 'descrizioneBreve', 
            headerName: 'Breve Descrizione', 
            flex: 2, 
            minWidth: 200,
            renderCell: (params) => {
                const description = params.row.descrizioneBreve as string;
                if (!description) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={description} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {description}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'tipoGiornataId', 
            headerName: 'Tipo Giornata', 
            flex: 1,
            valueGetter: (p) => tipiGiornataMap.get(p?.row?.tipoGiornataId)?.nome,
            renderCell: (params) => {
                const tipoGiornata = params.row.tipoGiornataId ? tipiGiornataMap.get(params.row.tipoGiornataId) : null;
                const nome = tipoGiornata?.nome;
                if (!nome) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={nome} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {nome}
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
             field: 'ordineLavoro', 
             headerName: 'Ordine Lavoro', 
             flex: 1, 
             renderCell: (params) => {
                const value = params.row.ordineLavoro as string;
                if (!value) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={value} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {value}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'naveId', 
            headerName: 'Nave', 
            flex: 1, 
            valueGetter: (p) => naviMap.get(p?.row?.naveId)?.nome,
            renderCell: (params) => {
                const nave = params.row.naveId ? naviMap.get(params.row.naveId) : null;
                const nome = nave?.nome;
                if (!nome) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={nome} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {nome}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'luogoId', 
            headerName: 'Luogo', 
            flex: 1, 
            valueGetter: (p) => luoghiMap.get(p?.row?.luogoId)?.nome,
            renderCell: (params) => {
                const luogo = params.row.luogoId ? luoghiMap.get(params.row.luogoId) : null;
                const nome = luogo?.nome;
                if (!nome) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={nome} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {nome}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { 
            field: 'clienteId', 
            headerName: 'Cliente', 
            flex: 1,
            valueGetter: (p) => {
                if (!p?.row) return '';
                const nave = p.row.naveId ? naviMap.get(p.row.naveId) : null;
                const luogo = p.row.luogoId ? luoghiMap.get(p.row.luogoId) : null;
                const clienteId = nave?.clienteId || luogo?.clienteId;
                return clienteId ? (clientiMap.get(clienteId)?.nome || '') : '';
            },
            renderCell: (params) => {
                const { row } = params;
                const nave = row.naveId ? naviMap.get(row.naveId) : null;
                const luogo = row.luogoId ? luoghiMap.get(row.luogoId) : null;
                const clienteId = nave?.clienteId || luogo?.clienteId;
                const nomeCliente = clienteId ? clientiMap.get(clienteId)?.nome : null;

                if (!nomeCliente) {
                    return <span style={{ color: '#9e9e9e' }}>—</span>;
                }
                return (
                    <Tooltip title={nomeCliente} arrow>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                            {nomeCliente}
                        </Box>
                    </Tooltip>
                );
            }
        },
        {
            field: 'oreTecnico',
            headerName: 'Ore Tecnico',
            width: 110,
            align: 'right',
            headerAlign: 'right',
            renderCell: (params) => {
                const authorHours = getAuthorHours(params.row as Rapportino);
                return formatOreLavoro(authorHours);
            },
            sortComparator: (v1, v2, cellParams1, cellParams2) => {
                const authorHours1 = getAuthorHours(cellParams1.row as Rapportino);
                const authorHours2 = getAuthorHours(cellParams2.row as Rapportino);
                return authorHours1 - authorHours2;
            }
        },
        { 
            field: 'oreTotali', 
            headerName: 'Ore Totali', 
            width: 100, 
            align: 'right', 
            headerAlign: 'right', 
            renderCell: (params) => {
                const totalHours = calculateTotalHoursForRow(params.row as Rapportino);
                return formatOreLavoro(totalHours);
            },
            sortComparator: (v1, v2, cellParams1, cellParams2) => {
                const totalHours1 = calculateTotalHoursForRow(cellParams1.row as Rapportino);
                const totalHours2 = calculateTotalHoursForRow(cellParams2.row as Rapportino);
                return totalHours1 - totalHours2;
            }
        },
        {
            field: 'hasFirma',
            headerName: 'Firma',
            width: 70,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            disableColumnMenu: true,
            valueGetter: (params) => !!params?.row?.firmaVettoriale,
            renderCell: (params) => {
                const hasSignature = !!params?.row?.firmaVettoriale;
                return (
                    <Tooltip title={hasSignature ? "Firmato" : "Non Firmato"}>
                        <span>
                            <DrawIcon sx={{ color: hasSignature ? '#1976d2' : 'action.disabled' }} />
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            field: 'actions', 
            type: 'actions', 
            headerName: 'Azioni', 
            width: 120, 
            getActions: (params) => {
                if (isRowDeleted(params.row)) {
                    return [<GridActionsCellItem icon={<RestoreFromTrashIcon />} label="Ripristina" onClick={() => handleRestoreRequest(params.id as string)} showInMenu/>];
                }
                return [
                    <GridActionsCellItem icon={<EditIcon/>} label="Modifica" onClick={() => handleEdit(params.id as string)} showInMenu/>, 
                    <GridActionsCellItem icon={<PrintIcon/>} label="Stampa/PDF" onClick={()=>{}} showInMenu/>, 
                    <GridActionsCellItem icon={<DeleteIcon color="error"/>} label="Archivia" onClick={() => handleDeleteRequest(params.id as string)} showInMenu/>
                ];
            }
        },
    ], [handleEdit, handleDeleteRequest, handleRestoreRequest, tecniciMap, tipiGiornataMap, naviMap, luoghiMap, clientiMap]);
    
    const getOptionLabel = (option: any, field = 'nome') => {
        if (typeof option === 'string') return option;
        if (!option) return '';
        if (field === 'cognome_nome') return `${option.cognome || ''} ${option.nome || ''}`.trim();
        return option[field] || '';
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Filtri Ricerca</Typography>
                        <FormControlLabel
                            control={<Switch checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />}
                            label="Mostra archiviati"
                        />
                    </Box>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => getOptionLabel(o, 'cognome_nome')} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedNavi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedLuoghi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedClienti} getOptionLabel={(o) => getOptionLabel(o)} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={sortedTipiGiornata} getOptionLabel={(o) => getOptionLabel(o)} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <DataGrid 
                            rows={filteredRapportini} 
                            columns={columns} 
                            localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                            slots={{ toolbar: GridToolbar }} 
                            slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }} 
                            initialState={{ 
                                pagination: { paginationModel: { pageSize: 100 } }, 
                                sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } 
                            }} 
                            pageSizeOptions={[25, 50, 100, 200]} 
                            density="compact" 
                            onRowClick={handleRowClick} 
                            sx={{ 
                                border: 0, 
                                '& .MuiDataGrid-row': { cursor: 'pointer' },
                                '& .deleted-date': { color: 'red' }
                            }} 
                        />
                    )}
                </Paper>
                
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Archiviazione" description={"Sei sicuro di voler archiviare questo rapportino?"} />
                <ConfirmationDialog open={!!rowToRestore} onClose={() => setRowToRestore(null)} onConfirm={handleConfirmRestore} title="Conferma Ripristino" description={"Sei sicuro di voler ripristinare questo rapportino?"} />
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
