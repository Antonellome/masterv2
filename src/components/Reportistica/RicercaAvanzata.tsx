
import React, { useState, useMemo, useCallback } from 'react';
import {
    Paper, Typography, Button, Box, TextField, Autocomplete, 
    Snackbar, Alert, Tooltip, CircularProgress, Switch, FormControlLabel,
    Dialog, AppBar, Toolbar, IconButton, DialogContent
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
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
import { Anagrafica, Nave, Cliente, Luogo, TipoGiornata, Rapportino, Veicolo } from '@/models/definitions';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useGlobalStore } from '@/stores/globalStore';
import { rapportinoPDFGenerator } from '@/services/pdfService';

import ConfirmationDialog from '@/components/ConfirmationDialog';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import DrawIcon from '@mui/icons-material/Draw';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';

dayjs.locale('it');

// --- COMPONENTE MODALE ANTEPRIMA PDF ---
interface PdfPreviewDialogProps {
    open: boolean;
    onClose: () => void;
    pdfDataUrl: string;
    pdfFilename: string;
}

const PdfPreviewDialog: React.FC<PdfPreviewDialogProps> = ({ open, onClose, pdfDataUrl, pdfFilename }) => {
    const handlePrint = async () => {
        if (!pdfDataUrl) return;
        try {
            const response = await fetch(pdfDataUrl);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = objectUrl;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    iframe.contentWindow?.print();
                } catch (error) {
                    console.error('Stampa fallita:', error);
                    alert('Impossibile avviare la stampa. Prova a scaricare e stampare il file manualmente.');
                } finally {
                    URL.revokeObjectURL(objectUrl);
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 100);
                }
            };

            iframe.onerror = () => {
                console.error('Errore Iframe: Impossibile caricare l\'URL del PDF.');
                alert('Impossibile caricare il file per la stampa.');
                URL.revokeObjectURL(objectUrl);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            };

        } catch (error) {
            console.error('Errore durante la preparazione della stampa:', error);
            alert('Impossibile preparare il file per la stampa.');
        }
    };

    const handleShare = async () => {
        try {
            const response = await fetch(pdfDataUrl);
            const blob = await response.blob();
            const file = new File([blob], pdfFilename, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Rapportino di Intervento', text: `Ecco il rapportino ${pdfFilename}` });
            } else {
                alert('La condivisione di file non è supportata su questo browser.');
            }
        } catch (error) {
            console.error("Errore condivisione:", error);
            alert("Impossibile condividere il file.");
        }
    };

    return (
        <Dialog fullScreen open={open} onClose={onClose}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close"><CloseIcon /></IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">Anteprima Rapportino</Typography>
                    {navigator.share && <IconButton color="inherit" onClick={handleShare}><ShareIcon /></IconButton>}
                    <IconButton color="inherit" onClick={handlePrint}><PrintIcon /></IconButton>
                </Toolbar>
            </AppBar>
            <DialogContent sx={{ height: 'calc(100vh - 64px)', p: 0 }}>
                <iframe id="pdf-preview-iframe" src={pdfDataUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Anteprima PDF" />
            </DialogContent>
        </Dialog>
    );
};

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
    const [pdfPreview, setPdfPreview] = useState<{ open: boolean, dataUrl: string, filename: string }>({ open: false, dataUrl: '', filename: '' });


    const masterData = useLiveQuery(() => Promise.all([
        db.tecnici.toArray(), db.navi.toArray(), db.luoghi.toArray(), 
        db.clienti.toArray(), db.veicoli.toArray(), db.tipiGiornata.toArray()
    ]).then(([tecnici, navi, luoghi, clienti, veicoli, tipiGiornata]) => ({tecnici, navi, luoghi, clienti, veicoli, tipiGiornata})), []);

    const allRapportiniRaw = useLiveQuery(() => db.rapportini.toArray(), []);

    const isLoading = !allRapportiniRaw || !masterData || isSyncing;

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
        tecniciMap: new Map((masterData?.tecnici || []).map(t => [t.id, t])),
        naviMap: new Map((masterData?.navi || []).map(n => [n.id, n])),
        luoghiMap: new Map((masterData?.luoghi || []).map(l => [l.id, l])),
        clientiMap: new Map((masterData?.clienti || []).map(c => [c.id, c])),
        tipiGiornataMap: new Map((masterData?.tipiGiornata || []).map(t => [t.id, t]))
    }), [masterData]);

    const sortedTecnici = useMemo(() => [...(masterData?.tecnici || [])].sort(safeSortCognomeNome), [masterData]);
    const sortedNavi = useMemo(() => [...(masterData?.navi || [])].sort((a,b) => safeSort(a,b, 'nome')), [masterData]);
    const sortedLuoghi = useMemo(() => [...(masterData?.luoghi || [])].sort((a,b) => safeSort(a,b, 'nome')), [masterData]);
    const sortedClienti = useMemo(() => [...(masterData?.clienti || [])].sort((a,b) => safeSort(a,b, 'nome')), [masterData]);
    const sortedTipiGiornata = useMemo(() => [...(masterData?.tipiGiornata || [])].sort((a,b) => safeSort(a,b, 'nome')), [masterData]);

    const [filters, setFilters] = useState<FilterState>({ dataDa: null, dataA: null, tecnico: null, nave: null, cliente: null, tipoGiornata: null, luogo: null, ordineLavoro: '' });
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);
    const [rowToRestore, setRowToRestore] = useState<string | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'warning' } | null>(null);

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

    const handlePrint = useCallback(async (id: string) => {
        const rapportinoToPrint = allRapportiniRaw?.find(r => r.id === id);
        if (!rapportinoToPrint) {
            setSnackbar({ open: true, message: 'Errore: rapportino non trovato.', severity: 'error' });
            return;
        }
        if (!masterData) {
            setSnackbar({ open: true, message: 'Dati non ancora pronti per la stampa.', severity: 'warning' });
            return;
        }

        try {
            const { dataUrl, filename } = await rapportinoPDFGenerator(rapportinoToPrint, masterData);
            setPdfPreview({ open: true, dataUrl, filename });
        } catch (error) {
            console.error("Errore durante la generazione del PDF:", error);
            setSnackbar({ open: true, message: 'Impossibile generare il PDF.', severity: 'error' });
        }
    }, [allRapportiniRaw, masterData]);

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
                    <GridActionsCellItem icon={<PrintIcon/>} label="Stampa/PDF" onClick={() => handlePrint(params.id as string)} showInMenu/>, 
                    <GridActionsCellItem icon={<DeleteIcon color="error"/>} label="Archivia" onClick={() => handleDeleteRequest(params.id as string)} showInMenu/>
                ];
            }
        },
    ], [handleEdit, handleDeleteRequest, handleRestoreRequest, handlePrint, tecniciMap, tipiGiornataMap, naviMap, luoghiMap, clientiMap]);
    
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
                        <Grid xs={12} sm={6} md={3}><DatePicker label="Da" value={filters.dataDa} onChange={d => handleFilterChange('dataDa', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid xs={12} sm={6} md={3}><DatePicker label="A" value={filters.dataA} onChange={d => handleFilterChange('dataA', d)} slotProps={{ textField: { fullWidth: true, size: 'small' } }} /></Grid>
                        <Grid xs={12} sm={6} md={3}><Autocomplete options={sortedTecnici} getOptionLabel={(o) => getOptionLabel(o, 'cognome_nome')} value={filters.tecnico} onChange={(_, v) => handleFilterChange('tecnico', v)} renderInput={(params) => <TextField {...params} label="Tecnico" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} sm={6} md={3}><Autocomplete options={sortedNavi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.nave} onChange={(_, v) => handleFilterChange('nave', v)} renderInput={(params) => <TextField {...params} label="Nave" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} sm={6} md={3}><Autocomplete options={sortedLuoghi} getOptionLabel={(o) => getOptionLabel(o)} value={filters.luogo} onChange={(_, v) => handleFilterChange('luogo', v)} renderInput={(params) => <TextField {...params} label="Luogo" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} sm={6} md={3}><Autocomplete options={sortedClienti} getOptionLabel={(o) => getOptionLabel(o)} value={filters.cliente} onChange={(_, v) => handleFilterChange('cliente', v)} renderInput={(params) => <TextField {...params} label="Cliente" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} sm={6} md={3}><Autocomplete options={sortedTipiGiornata} getOptionLabel={(o) => getOptionLabel(o)} value={filters.tipoGiornata} onChange={(_, v) => handleFilterChange('tipoGiornata', v)} renderInput={(params) => <TextField {...params} label="Tipo Giornata" size="small" />} isOptionEqualToValue={(option, value) => option.id === value.id}/></Grid>
                        <Grid xs={12} sm={6} md={3}><TextField label="Ordine di Lavoro" value={filters.ordineLavoro} onChange={e => handleFilterChange('ordineLavoro', e.target.value)} fullWidth size="small" /></Grid>
                        <Grid xs={12}><Button onClick={resetFilters} variant="outlined" fullWidth>Azzera Filtri</Button></Grid>
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
                            getRowId={(row) => row.id}
                        />
                    )}
                </Paper>
                
                <PdfPreviewDialog open={pdfPreview.open} onClose={() => setPdfPreview(p => ({...p, open: false}))} pdfDataUrl={pdfPreview.dataUrl} pdfFilename={pdfPreview.filename} />
                <ConfirmationDialog open={!!rowToDelete} onClose={() => setRowToDelete(null)} onConfirm={handleConfirmDelete} title="Conferma Archiviazione" description={"Sei sicuro di voler archiviare questo rapportino?"} />
                <ConfirmationDialog open={!!rowToRestore} onClose={() => setRowToRestore(null)} onConfirm={handleConfirmRestore} title="Conferma Ripristino" description={"Sei sicuro di voler ripristinare questo rapportino?"} />
                {snackbar && <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity || 'info'} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>}
            </Box>
        </LocalizationProvider>
    );
};

export default RicercaAvanzata;
