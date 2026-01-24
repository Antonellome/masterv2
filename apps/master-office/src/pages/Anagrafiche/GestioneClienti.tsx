import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Cliente, Nave, Luogo } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';
import { useData } from '@/hooks/useData';
import { Box, CircularProgress } from '@mui/material';

const GestioneClienti = () => {
    const { clienti, navi, luoghi, loading } = useData();

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12 } },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text', gridProps: { xs: 12 } },
        { name: 'citta', label: 'Città', type: 'text', gridProps: { xs: 12, md: 6 } },
        { name: 'cap', label: 'CAP', type: 'text', gridProps: { xs: 6, md: 3 } },
        { name: 'provincia', label: 'Provincia', type: 'text', gridProps: { xs: 6, md: 3 } },
        { name: 'partitaIva', label: 'Partita IVA', type: 'text', gridProps: { xs: 12, md: 6 } },
        { name: 'codiceFiscale', label: 'Codice Fiscale', type: 'text', gridProps: { xs: 12, md: 6 } },
        { name: 'email', label: 'Email', type: 'email', gridProps: { xs: 12, md: 6 } },
        { name: 'telefono', label: 'Telefono', type: 'text', gridProps: { xs: 12, md: 6 } },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
        {
            field: 'numNavi',
            headerName: 'N. Navi',
            type: 'number',
            width: 90,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'numLuoghi',
            headerName: 'N. Luoghi',
            type: 'number',
            width: 90,
            align: 'center',
            headerAlign: 'center'
        },
        { field: 'citta', headerName: 'Città', flex: 1, minWidth: 120, editable: true },
        { field: 'partitaIva', headerName: 'Partita IVA', flex: 1, minWidth: 120, editable: true },
    ];

    const dataAggregator = (clienti: Cliente[], secondaryData: { navi?: Nave[], luoghi?: Luogo[] }) => {
        const naviData = secondaryData.navi || [];
        const luoghiData = secondaryData.luoghi || [];

        return clienti.map(cliente => ({
            ...cliente,
            numNavi: naviData.filter(nave => nave.clienteId === cliente.id).length,
            numLuoghi: luoghiData.filter(luogo => luogo.clienteId === cliente.id).length,
        }));
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <GestioneAnagrafica<Cliente>
                collectionName="clienti"
                title="Gestione Clienti"
                data={clienti}
                loading={loading}
                secondaryData={{ navi, luoghi }}
                fields={fields}
                columns={columns}
                dataAggregator={dataAggregator}
                anagraficaType="cliente"
            />
        </Box>
    );
};

export default GestioneClienti;
