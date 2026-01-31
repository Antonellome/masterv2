import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useData } from '@/contexts/DataContext.tsx'; // CORREZIONE
import { Box, Chip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';
import type { Veicolo, Documento, Tecnico } from '@/models/definitions';

interface ScadenzaRow {
    id: string;
    origine: string;
    tipoScadenza: string;
    dataScadenza: Timestamp | null;
}

const toDayjs = (date: string | Timestamp | null | undefined): dayjs.Dayjs | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return dayjs(date.toDate());
    return dayjs(date);
};

const getStatus = (date: dayjs.Dayjs | null): { color: 'error' | 'warning' | 'success' | 'default', label: string } => {
    if (!date) return { color: 'default', label: 'N/A' };
    const diff = date.diff(dayjs().startOf('day'), 'day');
    if (diff < 0) return { color: 'error', label: `Scaduto da ${Math.abs(diff)} gg` };
    if (diff <= 30) return { color: 'warning', label: `In scadenza tra ${diff} gg` };
    return { color: 'success', label: `Valido` };
};

const columns: GridColDef<ScadenzaRow>[] = [
    { field: 'origine', headerName: 'Origine', flex: 1.5, renderCell: (params) => <Typography variant="body2">{params.value}</Typography> },
    { field: 'tipoScadenza', headerName: 'Tipo Scadenza', flex: 1, renderCell: (params) => <Typography variant="body2"><strong>{params.value}</strong></Typography> },
    {
        field: 'dataScadenza',
        headerName: 'Data Scadenza',
        type: 'date',
        flex: 1,
        valueGetter: (value) => value ? (value as Timestamp).toDate() : null,
    },
    {
        field: 'status',
        headerName: 'Stato',
        flex: 1.5,
        renderCell: (params) => {
            const date = toDayjs(params.row.dataScadenza);
            const status = getStatus(date);
            return <Chip label={status.label} color={status.color} size="small" variant="outlined" />;
        },
        sortComparator: (v1, v2, param1, param2) => {
            const date1 = toDayjs(param1.api.getCellValue(param1.id, 'dataScadenza'));
            const date2 = toDayjs(param2.api.getCellValue(param2.id, 'dataScadenza'));
            const diff1 = date1?.diff(dayjs(), 'day') ?? Infinity;
            const diff2 = date2?.diff(dayjs(), 'day') ?? Infinity;
            return diff1 - diff2;
        }
    },
];

const ScadenzeGrid = () => {
    // CORREZIONE: Destruttura correttamente i dati da useData
    const { veicoli, documenti, tecnici } = useData();

    // CORREZIONE: Utilizza le proprietà corrette degli oggetti
    const rows: ScadenzaRow[] = [
        ...(veicoli || []).flatMap((v: Veicolo): ScadenzaRow[] => [
            { id: `${v.id}-ass`, origine: `${v.targa}`, tipoScadenza: 'Assicurazione', dataScadenza: v.scadenzaAssicurazione },
            { id: `${v.id}-bollo`, origine: `${v.targa}`, tipoScadenza: 'Bollo', dataScadenza: v.scadenzaBollo },
            { id: `${v.id}-rev`, origine: `${v.targa}`, tipoScadenza: 'Revisione', dataScadenza: v.scadenzaRevisione },
            { id: `${v.id}-tagl`, origine: `${v.targa}`, tipoScadenza: 'Tagliando', dataScadenza: v.scadenzaTagliando },
            { id: `${v.id}-tachi`, origine: `${v.targa}`, tipoScadenza: 'Tachigrafo', dataScadenza: v.scadenzaTachigrafo },
        ].filter(item => item.dataScadenza)),
        ...(documenti || []).flatMap((d: Documento): ScadenzaRow[] => [
            { id: `${d.id}-scad`, origine: d.nome, tipoScadenza: 'Scadenza Documento', dataScadenza: d.dataScadenza },
        ].filter(item => item.dataScadenza)),
        ...(tecnici || []).flatMap((t: Tecnico): ScadenzaRow[] => [
            { id: `${t.id}-visita`, origine: `${t.cognome} ${t.nome}`, tipoScadenza: 'Visita Medica', dataScadenza: t.scadenzaVisita },
            { id: `${t.id}-unilav`, origine: `${t.cognome} ${t.nome}`, tipoScadenza: 'UNILAV', dataScadenza: t.scadenzaUnilav },
             { id: `${t.id}-contratto`, origine: `${t.cognome} ${t.nome}`, tipoScadenza: 'Contratto', dataScadenza: t.scadenzaContratto },
        ].filter(item => item.dataScadenza))
    ].filter((row): row is ScadenzaRow => row.dataScadenza != null);

    return (
        <Box sx={{ height: 'auto', width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 10 },
                    },
                    sorting: {
                        sortModel: [{ field: 'status', sort: 'asc' }],
                    },
                }}
                 getRowId={(row) => row.id}
                 autoHeight
                 disableRowSelectionOnClick
            />
        </Box>
    );
};

export default ScadenzeGrid;
