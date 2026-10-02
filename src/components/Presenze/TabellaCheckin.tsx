import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import { itIT } from '@mui/x-data-grid/locales';
import { Nave, Luogo, CheckinRecord } from '@/models/definitions';
import { useMemo } from 'react';
import { Box, Paper, Button } from '@mui/material';
import dayjs from 'dayjs';

const formatTipoEvento = (tipo: string): string => {
  if (!tipo) return 'N/D';
  return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const EPOCH_START = new Date(0);

interface TabellaCheckinProps {
  checkins: CheckinRecord[];
  navi: Nave[];
  luoghi: Luogo[];
  onPrint: () => void;
}

const TabellaCheckin = ({ checkins, navi, luoghi, onPrint }: TabellaCheckinProps) => {
  const naviMap = useMemo(() => new Map(navi.map(n => [n.id, n.nome])), [navi]);
  const luoghiMap = useMemo(() => new Map(luoghi.map(l => [l.id, l.nome])), [luoghi]);

  const columns: GridColDef<CheckinRecord>[] = [
    {
      field: 'data',
      headerName: 'Data',
      width: 120,
      type: 'date',
      valueGetter: (params) => {
        if (!params.row) return EPOCH_START;
        const date = dayjs(params.row.data);
        return date.isValid() ? date.toDate() : EPOCH_START;
      },
      renderCell: (params) => {
        if (!params.value || params.value.getTime() === EPOCH_START.getTime()) return 'N/D';
        return dayjs(params.value).format('DD/MM/YYYY');
      },
    },
    {
      field: 'tecnicoName',
      headerName: 'Tecnico',
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => {
        if (!params.row) return 'N/A';
        return params.row.tecnicoName || 'N/A';
      }
    },
    {
      field: 'tipo',
      headerName: 'Tipo Evento',
      flex: 1,
      minWidth: 120,
      valueGetter: (params) => {
          if (!params.row) return 'N/D';
          return formatTipoEvento(params.row.tipo || '');
      }
    },
    {
        field: 'dettaglio',
        headerName: 'Dettaglio',
        flex: 1,
        minWidth: 150,
        valueGetter: (params) => {
            if (!params.row) return '---';
            if (params.row.luogoId) return luoghiMap.get(params.row.luogoId) || 'Luogo non trovato';
            if (params.row.naveId) return naviMap.get(params.row.naveId) || 'Nave non trovata';
            return '---';
        },
    },
    {
      field: 'timestampImpostato',
      headerName: 'Ora Impostata',
      width: 130,
      type: 'dateTime',
      valueGetter: (params) => {
        if (!params.row) return EPOCH_START;
        const date = dayjs(params.row.timestampImpostato);
        return date.isValid() ? date.toDate() : EPOCH_START;
      },
      renderCell: (params) => {
        if (!params.value || params.value.getTime() === EPOCH_START.getTime()) return 'N/D';
        return dayjs(params.value).format('HH:mm:ss');
      },
    },
    {
      field: 'timestampReale',
      headerName: 'Ora Reale',
      width: 120,
      type: 'dateTime',
       valueGetter: (params) => {
        if (!params.row) return EPOCH_START;
        const date = dayjs(params.row.timestampReale);
        return date.isValid() ? date.toDate() : EPOCH_START;
      },
      renderCell: (params) => {
        if (!params.value || params.value.getTime() === EPOCH_START.getTime()) return 'N/D';
        return dayjs(params.value).format('HH:mm:ss');
      },
    },
  ];

  return (
    <Paper elevation={3} sx={{ height: '75vh', width: '100%', p: 2, boxSizing: 'border-box' }}>
       <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={onPrint} variant="contained">Stampa</Button>
        </Box>
      <DataGrid
        rows={checkins || []}
        columns={columns}
        getRowId={(row) => row.id}
        localeText={itIT.components.MuiDataGrid.defaultProps.localeText}
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        initialState={{
          pagination: { paginationModel: { pageSize: 100 } },
          sorting: { sortModel: [{ field: 'timestampReale', sort: 'desc' }] },
        }}
        pageSizeOptions={[25, 50, 100, 200]}
        density="compact"
        sx={{ border: 0 }}
      />
    </Paper>
  );
};

export default TabellaCheckin;
