import { useState, useMemo } from 'react';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, TextField, Tooltip, Typography } from '@mui/material';
import { Scadenza } from '@/models/definitions';
import { useScadenzeStore } from '@/store/useScadenzeStore';
import { NotificationsActive, NotificationsOff, ErrorOutline, WarningAmber, HelpOutline, Event as EventIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

interface ScadenzeListProps {
  scadenze: Scadenza[];
  filter: "all" | "personali" | "veicoli" | "documenti";
}

// Mappa completa degli stati per colore, icona ed etichetta
const getStatusProps = (status: Scadenza['status']) => {
    switch (status) {
        case 'scaduto':
            return { color: 'error.main', icon: <ErrorOutline />, label: 'Scaduto' };
        case 'imminente':
            return { color: 'error.main', icon: <WarningAmber />, label: 'Meno di 15 giorni' }; // ROSSO
        case 'in_scadenza':
            return { color: 'warning.main', icon: <WarningAmber />, label: 'Meno di 30 giorni' }; // GIALLO
        case 'non_impostata':
            return { color: 'text.disabled', icon: <HelpOutline />, label: 'Non impostata' }; // GRIGIO
        case 'ok':
        default:
            return { color: 'success.main', icon: <EventIcon />, label: 'Valido' };
    }
};

const ScadenzeList = ({ scadenze, filter }: ScadenzeListProps) => {
  const [searchText, setSearchText] = useState('');
  const { toggleSilence } = useScadenzeStore();

  const filteredScadenze = useMemo(() => {
    return scadenze
      .filter(s => filter === 'all' || s.tipo === filter)
      .filter(s => {
        const search = searchText.toLowerCase();
        return (
          s.descrizione.toLowerCase().includes(search) ||
          s.riferimento.toLowerCase().includes(search)
        );
      });
  }, [scadenze, filter, searchText]);

  const columns: GridColDef<Scadenza>[] = [
    {
        field: 'status',
        headerName: 'Stato',
        width: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
            const { color, icon, label } = getStatusProps(params.row.status);
            return <Tooltip title={label}><Box sx={{ color }}>{icon}</Box></Tooltip>;
        },
        // Ordina per severità dello stato
        sortComparator: (v1, v2, param1, param2) => {
            const order: Scadenza['status'][] = ['scaduto', 'imminente', 'in_scadenza', 'non_impostata', 'ok'];
            return order.indexOf(param1.value) - order.indexOf(param2.value);
        }
    },
    { 
        field: 'descrizione', 
        headerName: 'Descrizione', 
        flex: 1.5, 
        minWidth: 200 
    },
    {
      field: 'riferimento',
      headerName: 'Riferimento',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'data',
      headerName: 'Data Scadenza',
      width: 150,
      type: 'date',
      valueGetter: (value: string) => value === 'N/D' ? null : dayjs(value).toDate(),
      renderCell: (params) => {
        if (params.value === null || params.row.status === 'non_impostata') {
            return <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Non impostata</Typography>;
        }
        return dayjs(params.value).format('DD/MM/YYYY');
      },
    },
    {
        field: 'actions',
        type: 'actions',
        width: 100,
        getActions: ({ id, row }) => [
            <GridActionsCellItem
                key={`silence-${id}`}
                icon={row.silenced ? <NotificationsOff /> : <NotificationsActive />}
                label={row.silenced ? 'Riattiva notifica' : 'Silenzia notifica'}
                onClick={() => toggleSilence(id as string)}
                color="inherit"
                disabled={row.status === 'non_impostata'} // Disabilita il silenziamento per date non impostate
            />,
        ],
    }
  ];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Cerca per descrizione o riferimento..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Box>
      <DataGrid
        rows={filteredScadenze}
        columns={columns}
        getRowId={(row) => row.id}
        slots={{ toolbar: GridToolbar }}
        density="compact"
        autoHeight
        initialState={{
          sorting: {
            sortModel: [{ field: 'status', sort: 'asc' }], // Ordina per stato di default
          },
          pagination: {
            paginationModel: { pageSize: 50 }
          }
        }}
      />
    </Box>
  );
};

export default ScadenzeList;
