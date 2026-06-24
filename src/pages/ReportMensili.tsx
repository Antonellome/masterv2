import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Paper, Typography, Box, Grid, Autocomplete, TextField, CircularProgress, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import { useData } from '@/hooks/useData';
import { Rapportino, Tecnico } from '@/models/definitions';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import CheckIcon from '@mui/icons-material/Check';
import { useAlert } from '@/contexts/AlertContext';
import { generateRapportinoPDF } from '@/services/pdfService';
import PdfPreviewDialog from '@/components/Rapportini/PdfPreviewDialog';

dayjs.locale('it');

const ReportMensili: React.FC = () => {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const anagrafiche = useData();
    const { tecnici, clienti, navi, luoghi, tipiGiornata, veicoli, loading: anagraficheLoading } = anagrafiche;
    const [rapportini, setRapportini] = useState<Rapportino[]>([]);
    const [rapportiniLoading, setRapportiniLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(dayjs());
    const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);

    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'rapportini'), snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
            setRapportini(data);
            setRapportiniLoading(false);
        }, () => {
            setRapportiniLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (selectedRapportino && isPdfPreviewOpen) {
            const generatePdf = async () => {
                setIsGeneratingPdf(true);
                try {
                    const masterData = { tecnici, navi, luoghi, veicoli, tipiGiornata, clienti };
                    const pdfBlob = await generateRapportinoPDF(selectedRapportino, masterData);
                    const url = URL.createObjectURL(pdfBlob);
                    setPdfUrl(url);
                } catch (error) {
                    console.error("Errore PDF: ", error);
                    showAlert("Errore durante la generazione del PDF.", "error");
                    setIsPdfPreviewOpen(false);
                } finally {
                    setIsGeneratingPdf(false);
                }
            };
            generatePdf();
        }
    }, [selectedRapportino, isPdfPreviewOpen, tecnici, navi, luoghi, veicoli, tipiGiornata, clienti, showAlert]);

    const handleShareClick = useCallback((id: string) => {
        const rapportinoToShare = rapportini.find(r => r.id === id);
        if (!rapportinoToShare) {
            showAlert('Rapportino non trovato.', 'error');
            return;
        }
        const rapportinoConDataCorretta = {
            ...rapportinoToShare,
            data: rapportinoToShare.data.toDate ? rapportinoToShare.data.toDate() : new Date(rapportinoToShare.data),
        };
        
        setSelectedRapportino(rapportinoConDataCorretta as Rapportino);
        setIsPdfPreviewOpen(true);

    }, [rapportini, showAlert]);

    const filteredData = useMemo(() => {
        if (!selectedTecnico) return [];
        const startOfMonth = selectedMonth.startOf('month');
        const endOfMonth = selectedMonth.endOf('month');
        return rapportini.filter(r => {
            const rapportinoDate = dayjs(r.data.toDate());
            const isInMonth = rapportinoDate.isBetween(startOfMonth, endOfMonth, null, '[]');
            const isTecnico = (r.presenze || []).includes(selectedTecnico.id);
            return isInMonth && isTecnico;
        }).map(r => {
            const nave = navi.find(n => n.id === r.naveId);
            return {
                id: r.id,
                data: dayjs(r.data.toDate()).format('DD/MM/YYYY'),
                nave: nave?.nome || 'N/D',
                luogo: luoghi.find(l => l.id === r.luogoId)?.nome || 'N/D',
                cliente: clienti.find(c => c.id === nave?.clienteId)?.nome || 'N/D',
                ore: r.dettaglioOreTecnici?.find(d => d.tecnicoId === selectedTecnico.id)?.ore || r.oreLavoro || 0,
                tipoGiornata: tipiGiornata.find(t => t.id === r.tipoGiornataId)?.nome || 'N/D',
                firmato: !!r.firmaVettoriale,
                rawData: r.data.toDate(),
            }
        });
    }, [rapportini, selectedMonth, selectedTecnico, navi, clienti, luoghi, tipiGiornata]);

    const totals = useMemo(() => {
        if (!selectedTecnico) return { ore: 0, giorni: 0, trasferte: 0 };
        const ore = filteredData.reduce((acc, curr) => acc + (curr.ore || 0), 0);
        const giorni = filteredData.length;
        const trasferte = rapportini.filter(r => {
             const rapportinoDate = dayjs(r.data.toDate());
             const isInMonth = rapportinoDate.isBetween(selectedMonth.startOf('month'), selectedMonth.endOf('month'), null, '[]');
             const isTecnico = (r.presenze || []).includes(selectedTecnico.id);
             return isInMonth && isTecnico && r.isTrasferta;
        }).length;
        return { ore, giorni, trasferte };
    }, [filteredData, rapportini, selectedMonth, selectedTecnico]);

    const handleEdit = (id: string) => navigate(`/rapportino/edit/${id}`);

    const columns: GridColDef[] = [
        { field: 'data', headerName: 'Data', width: 120 },
        { field: 'cliente', headerName: 'Cliente', flex: 1 },
        { field: 'nave', headerName: 'Nave', flex: 1 },
        { field: 'luogo', headerName: 'Luogo', flex: 1 },
        { field: 'tipoGiornata', headerName: 'Tipo Giornata', flex: 1 },
        { field: 'ore', headerName: 'Ore Lavorate', width: 120, align: 'right', headerAlign: 'right' },
        {
            field: 'firmato',
            headerName: 'Firmato',
            width: 80,
            align: 'center',
            headerAlign: 'center',
            renderCell: params => params.value ? <Tooltip title="Firmato"><CheckIcon color="success" /></Tooltip> : null
        },
        {
            field: 'actions',
            type: 'actions',
            width: 80,
            getActions: ({ id }) => [
                <GridActionsCellItem icon={<Tooltip title="Modifica"><EditIcon /></Tooltip>} label="Modifica" onClick={() => handleEdit(id as string)} />,
                <GridActionsCellItem icon={<Tooltip title="Stampa/Condividi"><PrintIcon /></Tooltip>} label="Stampa" onClick={() => handleShareClick(id as string)} />,
            ],
        },
    ];

    if (anagraficheLoading || rapportiniLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                    <Typography variant="h5" gutterBottom>Report Mensile Tecnico</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                views={['month', 'year']}
                                label="Mese e Anno"
                                value={selectedMonth}
                                onChange={(newDate) => setSelectedMonth(newDate || dayjs())}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={tecnici.sort((a, b) => (`${a.cognome} ${a.nome}`).localeCompare(`${b.cognome} ${b.nome}`))}
                                getOptionLabel={(option) => `${option.cognome} ${option.nome}`}
                                value={selectedTecnico}
                                onChange={(_, newValue) => setSelectedTecnico(newValue)}
                                renderInput={(params) => <TextField {...params} label="Seleziona Tecnico" />}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {selectedTecnico && (
                    <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6">Riepilogo per {selectedTecnico.cognome} {selectedTecnico.nome}</Typography>
                        <Typography>Mese: {selectedMonth.format('MMMM YYYY')}</Typography>
                        <Typography>Totale Ore Lavorate: {totals.ore}</Typography>
                        <Typography>Totale Giorni Lavorati: {totals.giorni}</Typography>
                        <Typography>Totale Trasferte: {totals.trasferte}</Typography>
                    </Paper>
                )}

                {selectedTecnico && (
                    <Paper sx={{ height: 600, width: '100%' }}>
                        <DataGrid
                            rows={filteredData.sort((a,b) => b.rawData.getTime() - a.rawData.getTime())}
                            columns={columns}
                            density="compact"
                            rowHeight={42}
                        />
                    </Paper>
                )}

                <PdfPreviewDialog
                    open={isPdfPreviewOpen}
                    onClose={() => {
                        setIsPdfPreviewOpen(false);
                        if (pdfUrl) {
                            URL.revokeObjectURL(pdfUrl);
                            setPdfUrl(null);
                        }
                        setSelectedRapportino(null);
                    }}
                    onShare={async () => {
                        if (!pdfUrl || !selectedRapportino?.data) return;
                        try {
                            const response = await fetch(pdfUrl);
                            const blob = await response.blob();
                            const file = new File([blob], `Rapportino-${dayjs(selectedRapportino.data).format('DD-MM-YYYY')}.pdf`, { type: 'application/pdf' });
                            if (navigator.share) {
                                await navigator.share({
                                    files: [file],
                                    title: `Rapportino ${dayjs(selectedRapportino.data).format('DD-MM-YYYY')}`,
                                });
                            }
                        } catch (err) {
                            showAlert('Condivisione non riuscita.', 'error');
                        }
                    }}
                    pdfDataUrl={pdfUrl}
                    isGenerating={isGeneratingPdf}
                    fileName={selectedRapportino?.data ? `Rapportino-${dayjs(selectedRapportino.data).format('DD-MM-YYYY')}.pdf` : 'Rapportino.pdf'}
                />
            </Box>
        </LocalizationProvider>
    );
};

export default ReportMensili;
