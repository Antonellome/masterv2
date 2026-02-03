import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Cliente, Nave, Luogo } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';

const GestioneClienti = () => {

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
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
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
        { field: 'citta', headerName: 'Città', flex: 1, minWidth: 120 },
        { field: 'partitaIva', headerName: 'Partita IVA', flex: 1, minWidth: 120 },
    ];

    const secondaryCollections = [
        { name: 'navi', foreignKey: 'clienteId' },
        { name: 'luoghi', foreignKey: 'clienteId' },
    ];

    const dataAggregator = (clienti: Cliente[], secondaryData: { navi?: Nave[], luoghi?: Luogo[] }) => {
        const navi = secondaryData.navi || [];
        const luoghi = secondaryData.luoghi || [];

        return clienti.map(cliente => ({
            ...cliente,
            numNavi: navi.filter(nave => nave.clienteId === cliente.id).length,
            numLuoghi: luoghi.filter(luogo => luogo.clienteId === cliente.id).length,
        }));
    };


    return (
        <GestioneAnagrafica
            collectionName="clienti"
            title="Gestione Clienti"
            fields={fields}
            columns={columns}
            secondaryCollections={secondaryCollections}
            dataAggregator={dataAggregator}
            anagraficaType="cliente"
        />
    );
};

export default GestioneClienti;
