
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '@/db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, Grid,
    Snackbar, Alert, Tooltip, CircularProgress
} from '@mui/material';
import { DataGrid, GridToolbar, GridColDef, GridRowParams, GridActionsCellItem, GridSortComparator } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { formatOreLavoro } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tecnico, Nave, Cliente, Luogo, TipoGiornata, Veicolo, Rapportino } from '@/models/definitions';
import { useCollectionData } from '@/hooks/useCollectionData';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { db as firestoreDb } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

import { generateRapportinoPdf } from '@/utils/pdfGenerator';
import PdfPreviewDialog from '@/components/common/PdfPreviewDialog';

dayjs.locale('it');

// --- INTERFACES & HELPERS ---
interface FlatRapportino {
    id: string;
    dataFormatted: string;
    tecniciNomi: string[];
    mainTecnicoNome: string;
    altriTecniciNomi: string[];
    tipoGiornataNome: string;
    naveNome: string;
    luogoNome: string;
    clienteNome: string;
    ordineLavoro?: string;
    oreResponsabile: string;
    oreTotali: string;
    data: Date;
    tecnicoIds: string[];
    naveId?: string | null;
    clienteId?: string | null;
    tipoGiornataId?: string | null;
    luogoId?: string | null;
}

interface FilterState {
    dataDa: Dayjs | null;
    dataA: Dayjs | null;
    tecnico: Tecnico | null;
    nave: Nave | null;
    cliente: Cliente | null;
    luogo: Luogo | null;
    tipoGiornata: TipoGiornata | null;
    ordineLavoro: string;
}

const dateSortComparator: GridSortComparator<Date> = (v1, v2) => v1.getTime() - v2.getTime();

const normalizeDate = (date: any): Date => {
    if (!date) return new Date('invalid');
    if (date && typeof date.seconds === 'number') { return new Date(date.seconds * 1000); }
    if (typeof date.toDate === 'function') { return date.toDate(); }
    const parsedDate = dayjs(date);
    return parsedDate.isValid() ? parsedDate.toDate() : new Date('invalid');
};

const getCleanId = (id: any): string | undefined => {
    if (typeof id === 'string' && id) return id;
    if (id && typeof id === 'object' && id.id && typeof id.id === 'string') return id.id;
    return undefined;
};

const RicercaAvanzata: React.FC = () => {
    const navigate = useNavigate();
    
    const rapportini = useLiveQuery(() => db.rapportini.toArray(), []) as Rapportino[] | undefined;
    const { data: anagraficaTecnici = [] } = useCollectionData<Tecnico>('tecnici');
    const { data: anagraficaNavi = [] } = useCollectionData<Nave>('navi');
    const { data: anagraficaClienti = [] } = useCollectionData<Cliente>('clienti');
    const { data: anagraficaLuoghi = [] } = useCollectionData<Luogo>('luoghi');
    const { data: anagraficaTipiGiornata = [] } = useCollectionData<TipoGiornata>('tipiGiornata');
    const { data: anagraficaVeicoli = [] } = useCollectionData<Veicolo>('veicoli');
    
    const anagraficheLoading = !anagraficaTecnici || !anagraficaNavi || !anagraficaClienti || !anagraficaLuoghi || !anagraficaTipiGiornata || !anagraficaVeicoli;
    const rapportiniLoading = rapportini === undefined;

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' } | null>(null);

    // State for PDF Preview
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [activeRapportinoId, setActiveRapportinoId] = useState<string | null>(null);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const { tecniciMap, naviMap, clientiMap, tipiGiornataMap, luoghiMap, veicoliMap } = useMemo(() => {
        if (anagraficheLoading) return { tecniciMap: new Map(), naviMap: new Map(), clientiMap: new Map(), tipiGiornataMap: new Map(), luoghiMap: new Map(), veicoliMap: new Map() };
        return {
            tecniciMap: new Map(anagraficaTecnici.map((t) => [t.id, t])),
            naviMap: new Map(anagraficaNavi.map((n) => [n.id, n])),
            clientiMap: new Map(anagraficaClienti.map((c) => [c.id, c])),
            tipiGiornataMap: new Map(anagraficaTipiGiornata.map((tg) => [tg.id, tg])),
            luoghiMap: new Map(anagraficaLuoghi.map((l) => [l.id, l])),
            veicoliMap: new Map(anagraficaVeicoli.map((v) => [v.id, v]))
        };
    }, [anagraficaTecnici, anagraficaNavi, anagraficaClienti, anagraficaTipiGiornata, anagraficaLuoghi, anagraficaVeicoli, anagraficheLoading]);

    const handlePrintShareClick = useCallback(async (id: string) => {
        const rapportino = rapportini?.find(r => r.id === id);
        if (!rapportino) {
            setSnackbar({ open: true, message: 'Rapportino non trovato.', severity: 'error' });
            return;
        }

        setPdfGenerating(true);
        setActiveRapportinoId(id);

        try {
            // STEP 1: Ricostruire l'oggetto completo come facevamo prima
            const nave = naviMap.get(getCleanId(rapportino.naveId) || '');
            const fullRapportino: Rapportino = {
                ...rapportino,
                data: normalizeDate(rapportino.data),
                nave: nave || undefined,
                luogo: luoghiMap.get(getCleanId(rapportino.luogoId) || '') || undefined,
                veicolo: veicoliMap.get(getCleanId(rapportino.veicoloId) || '') || undefined,
                dettaglioOreTecnici: (rapportino.dettaglioOreTecnici || []).map(d => ({
                    ...d,
                    nome: tecniciMap.get(getCleanId(d.tecnicoId) || '')?.nome || 'N/D'
                }))
            };

            // STEP 2: Generare il PDF con l'oggetto completo
            const blob = generateRapportinoPdf(fullRapportino, tecniciMap);
            setPdfBlob(blob);
            setPdfPreviewOpen(true);
        } catch (error) {
            console.error("Errore generazione PDF:", error);
            setSnackbar({ open: true, message: 'Errore durante la creazione del PDF.', severity: 'error' });
        } finally {
            setPdfGenerating(false);
        }
    }, [rapportini, tecniciMap, naviMap, luoghiMap, veicoliMap]);

    const getPdfFileName = () => {
        if (!activeRapportinoId) return 'Rapportino.pdf';
        const rapportino = rapportini?.find(r => r.id === activeRapportinoId);
        if (!rapportino) return 'Rapportino.pdf';
        const mainTecnico = tecniciMap.get(getCleanId(rapportino.tecnicoId) || '');
        const dateStr = dayjs(normalizeDate(rapportino.data)).format('YYYY-MM-DD');
        return `Rapportino_${mainTecnico?.cognome || 'TEC'}_${dateStr}.pdf`;
    };
    
    const flatRapportini = useMemo((): FlatRapportino[] => {
        if (!rapportini || anagraficheLoading) return [];
        return rapportini.map((rapportino) => {
            const dataDaNormalizzare = (rapportino as any).dataInizio || rapportino.data;
            const dataNormalizzata = normalizeDate(dataDaNormalizzare);
            let clienteNome = "N/D";
            let finalClienteId: string | undefined = undefined;
            const naveId = getCleanId(rapportino.naveId);
            if (naveId) {
                const nave = naviMap.get(naveId);
                if (nave) {
                    const clienteId = getCleanId(nave.clienteId);
                    if (clienteId) {
                        const cliente = clientiMap.get(clienteId);
                        if (cliente) { clienteNome = cliente.nome; finalClienteId = cliente.id; }
                    }
                }
            }
            if (clienteNome === "N/D") {
                const luogoId = getCleanId(rapportino.luogoId);
                if (luogoId) {
                    const luogo = luoghiMap.get(luogoId);
                    if (luogo) {
                        const clienteId = getCleanId(luogo.clienteId);
                        if (clienteId) {
                            const cliente = clientiMap.get(clienteId);
                            if (cliente) { clienteNome = cliente.nome; finalClienteId = cliente.id; }
                        }
                    }
                }
            }
            const mainTecnicoId = getCleanId(rapportino.tecnicoId);
            const allTecnicoIdsInPresenze = (Array.isArray(rapportino.presenze) ? rapportino.presenze.map(getCleanId) : []).filter(Boolean) as string[];
            const getName = (id: string) => {
                const t = tecniciMap.get(id);
                return t ? `${t.cognome} ${t.nome}`.trim() : `ID: ${id}`;
            };
            const mainTecnicoNome = mainTecnicoId ? getName(mainTecnicoId) : "N/D";
            const altriTecniciNomi = allTecnicoIdsInPresenze.filter(id => id !== mainTecnicoId).map(getName);
            const tecnicoIds = [...new Set([mainTecnicoId, ...allTecnicoIdsInPresenze].filter(Boolean) as string[])];
            const tipoGiornataId = getCleanId(rapportino.tipoGiornataId);
            const tipoGiornataObj = tipoGiornataId ? tipiGiornataMap.get(tipoGiornataId) : undefined;
            const naveObj = naveId ? naviMap.get(naveId) : undefined;
            const luogoId = getCleanId(rapportino.luogoId);
            const luogoObj = luogoId ? luoghiMap.get(luogoId) : undefined;
            let oreTotaliRapporto = rapportino.dettaglioOreTecnici?.reduce((sum, d) => sum + (d.ore || 0), 0) ?? Number(rapportino.oreLavoro) ?? 0;
            const dettaglioResponsabile = rapportino.dettaglioOreTecnici?.find(d => getCleanId(d.tecnicoId) === getCleanId(rapportino.tecnicoId));
            let oreResponsabile = dettaglioResponsabile?.ore ?? (rapportino.dettaglioOreTecnici ? 0 : oreTotaliRapporto);
            return {
                id: rapportino.id,
                data: dataNormalizzata,
                dataFormatted: dayjs(dataNormalizzata).isValid() ? dayjs(dataNormalizzata).format("DD/MM/YYYY") : "Data Invalida",
                tecniciNomi: [mainTecnicoNome, ...altriTecniciNomi],
                mainTecnicoNome,
                altriTecniciNomi,
                tipoGiornataNome: tipoGiornataObj?.nome || "N/D",
                naveNome: naveObj?.nome || "N/D",
                luogoNome: luogoObj?.nome || "N/D",
                clienteNome,
                ordineLavoro: rapportino.ordineLavoro,
                oreResponsabile: formatOreLavoro(oreResponsabile),
                oreTotali: formatOreLavoro(oreTotaliRapporto),
                tecnicoIds, 
                naveId: naveId,
                clienteId: finalClienteId, 
                tipoGiornataId: tipoGiornataId,
                luogoId: luogoId,
            };
        });
    }, [rapportini, anagraficheLoading, naviMap, clientiMap, luoghiMap, tecniciMap, tipiGiornataMap]);

    // DEBUGGING LOGIC
    useEffect(() => {
        if (flatRapportini.length > 0 && rapportini) {
            const debugData = dayjs('2026-07-17');
            const targetDataString = debugData.format('DD/MM/YYYY');

            const targetRapportino = flatRapportini.find(r => 
                r.dataFormatted === targetDataString && 
                r.naveNome.toLowerCase() === 'iginia' && 
                r.mainTecnicoNome.toLowerCase().includes('scuderi')
            );

            if (targetRapportino) {
                console.log("--- DEBUG: RAPPORTO SPECIFICO TROVATO ---");
                console.log("DATI ELABORATI (per la tabella):", JSON.stringify(targetRapportino, null, 2));
                
                const originalRawRapportino = rapportini.find(r => r.id === targetRapportino.id);
                console.log("DATI GREZZI (dal database):", JSON.stringify(originalRawRapportino, null, 2));
                console.log("--- FINE DEBUG ---");
            }
        }
    }, [flatRapportini, rapportini]);
    
    const filteredRapportini = useMemo(() => {
        return flatRapportini.filter(r => {
           const r_data = dayjs(r.data);
           if (filters.dataDa && r_data.isBefore(filters.dataDa, 'day')) return false;
           if (filters.dataA && r_data.isAfter(filters.dataA, 'day')) return false;
           if (filters.tecnico && !r.tecnicoIds.includes(filters.tecnico.id)) return false;
           if (filters.nave && r.naveId !== filters.nave.id) return false;
           if (filters.cliente && r.clienteId !== filters.cliente.id) return false;
           if (filters.tipoGiornata && r.tipoGiornataId !== filters.tipoGiornata.id) return false;
           if (filters.luogo && r.luogoId !== filters.luogo.id) return false;
           if (filters.ordineLavoro && !(r.ordineLavoro || '').toLowerCase().includes(filters.ordineLavoro.toLowerCase())) return false;
           return true;
       });
   }, [flatRapportini, filters]);

    const handleDeleteRequest = useCallback((id: string) => setRowToDelete(id), []);
    
    const handleConfirmDelete = async () => {
        if (!rowToDelete) return;
        try {
            await deleteDoc(doc(firestoreDb, 'rapportini', rowToDelete));
            await db.rapportini.delete(rowToDelete);
            setSnackbar({ open: true, message: 'Rapportino eliminato con successo.', severity: 'success' });
        } catch (error) {
            console.error("Errore eliminazione:", error);
            setSnackbar({ open: true, message: "Errore durante l'eliminazione del rapportino.", severity: 'error' });
        }
        setRowToDelete(null);
    };
    
    const handleRowClick = (params: GridRowParams) => {
        if (params.field !== 'actions') {
            navigate(`/rapportino/edit/${params.id}`);
        }
    };

    const handleFilterChange = useCallback(<K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    }, []);

    const resetFilters = useCallback(() => setFilters({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' }), []);

    const columns: GridColDef<FlatRapportino>[] = useMemo(() => [
        { field: 'data', headerName: 'Data', width: 110, renderCell: (params) => params.row.dataFormatted, sortComparator: dateSortComparator, type: 'date' },
        { 
            field: 'tecniciNomi', headerName: 'Tecnici', flex: 1.5, minWidth: 150, 
            renderCell: params => {
                const mainTecnico = params.row.mainTecnicoNome;
                const altriTecnici = params.row.altriTecniciNomi;
                const fullList = [mainTecnico, ...altriTecnici].join(', ');
                const numAltri = altriTecnici.length;
                return (
                    <Tooltip title={fullList} arrow placement="top">
                        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', my: 'auto' }}>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}> {mainTecnico} </Typography>
                            {numAltri > 0 && (
                                <Typography variant="body2" component="span" sx={{ ml: 0.5, color: 'text.secondary' }}> (+{numAltri}) </Typography>
                            )}
                        </Box>
                    </Tooltip>
                );
            }
        },
        { field: 'tipoGiornataNome', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'ordineLavoro', headerName: 'Ordine Lavoro', flex: 1 },
        { field: 'naveNome', headerName: 'Nave', flex: 1 },
        { field: 'luogoNome', headerName: 'Luogo', flex: 1 },
        { field: 'clienteNome', headerName: 'Cliente', flex: 1 },
        { field: 'oreResponsabile', headerName: 'Ore Resp.', width: 100, align: 'right', headerAlign: 'right' },
        { field: 'oreTotali', headerName: 'Ore Totali', width: 100, align: 'right', headerAlign: 'right' },
        {
            field: 'actions', type: 'actions', headerName: 'Azioni', width: 120,
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<EditIcon />} label="Modifica" onClick={(e) => { e.stopPropagation(); handleEdit(id as string);}} showInMenu />, 
                <GridActionsCellItem 
                    icon={pdfGenerating && activeRapportinoId === id ? <CircularProgress size={24} /> : <PrintIcon />}
                    label="Stampa / Condividi" 
                    onClick={(e) => { e.stopPropagation(); handlePrintShareClick(id as string);}} 
                    disabled={pdfGenerating && activeRapportinoId === id}
                />,
                <GridActionsCellItem icon={<DeleteIcon color="error" />} label="Elimina" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(id as string);}} showInMenu />,
            ],
        },
    ], [handleEdit, handlePrintShareClick, handleDeleteRequest, pdfGenerating, activeRapportinoId]);
    
    const loading = anagraficheLoading || rapportiniLoading;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ height: 'calc(100vh - 120px)', width: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1, sm: 2 }, gap: 2 }}>
                <Paper elevation={2} sx={{ p: 2, flexShrink: 0 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Filtri Ricerca</Typography>
                     <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaTecnici} getOptionLabel={(o) => `${o.cognome} ${o.nome}`.trim()} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaNavi} getOptionLabel={(o) => o.nome} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaLuoghi} getOptionLabel={(o) => o.nome} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaClienti} getOptionLabel={(o) => o.nome} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><Autocomplete options={anagraficaTipiGiornata} getOptionLabel={(o) => o.nome} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} /></Grid>
                        <Grid item xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid item xs={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
                    </Grid>
                </Paper>

                <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <DataGrid 
                        rows={filteredRapportini} 
                        columns={columns} 
                        loading={loading} 
                        localeText={itIT.components.MuiDataGrid.defaultProps.localeText} 
                        slots={{ toolbar: GridToolbar }} 
                        slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }} 
                        initialState={{ pagination: { paginationModel: { pageSize: 25 } }, sorting: { sortModel: [{ field: 'data', sort: 'desc' }] } }} 
                        pageSizeOptions={[10, 25, 50, 100]} 
                        density="compact" 
                        onRowClick={handleRowClick}
                        sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' }, '& .MuiDataGrid-cell': { alignItems: 'center', display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', }, }}
                    />
                </Paper>
                
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione" description={"Sei sicuro di voler eliminare questo rapportino? L'azione è irreversibile."} />
                
                {pdfPreviewOpen &&
                    <PdfPreviewDialog
                        open={pdfPreviewOpen}
                        onClose={() => {
                            setPdfPreviewOpen(false);
                            setPdfBlob(null);
                            setActiveRapportinoId(null);
                        }}
                        pdfBlob={pdfBlob}
                        fileName={getPdfFileName()}
                        canShare={!!navigator.share}
                    />
                }

                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
