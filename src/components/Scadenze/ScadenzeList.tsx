import { useState, useMemo } from 'react';
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, TextField, Tooltip } from '@mui/material';
import { Scadenza } from '@/models/definitions';
import { useScadenzeStore } from '@/store/useScadenzeStore';
import { NotificationsActive, NotificationsOff, ErrorOutline, WarningAmber, Event as EventIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

interface ScadenzeListProps {
  scadenze: Scadenza[];
  filter: "all" | "personali" | "veicoli" | "documenti";
}

const getStatusProps = (status: Scadenza['status']) => {
    if (status === 'scaduto') return { color: 'error.main', icon: <ErrorOutline />, label: 'Scaduto' };
    if (status === 'imminente') return { color: 'warning.main', icon: <WarningAmber />, label: 'In Scadenza' };
    return { color: 'success.main', icon: <EventIcon />, label: 'Valido' };
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
      valueGetter: (value: string) => dayjs(value).toDate(),
      renderCell: (params) => dayjs(params.value).format('DD/MM/YYYY'),
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
            sortModel: [{ field: 'data', sort: 'asc' }],
          },
          pagination: {
            paginationModel: { pageSize: 50 }
          }
        }}
        pageSizeOptions={[25, 50, 100]}
      />
    </Box>
  );
};

export default ScadenzeList;
