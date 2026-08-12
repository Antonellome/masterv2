import GestioneAnagrafica from './GestioneAnagrafica';
import type { Ditta } from '@/models/definitions';
import { GridColDef } from '@mui/x-data-grid';

const GestioneDitte: React.FC = () => {

    const ditteFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'pIva', label: 'Partita IVA', type: 'text' },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
        { name: 'citta', label: 'Città', type: 'text' },
        { name: 'cap', label: 'CAP', type: 'text' },
        { name: 'provincia', label: 'Provincia', type: 'text' },
        { name: 'paese', label: 'Paese', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'telefono', label: 'Telefono', type: 'text' },
    ];

    const columns: GridColDef<Ditta>[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'pIva', headerName: 'Partita IVA', width: 150, editable: true },
        { field: 'citta', headerName: 'Città', width: 150, editable: true },
        { field: 'email', headerName: 'Email', flex: 1, editable: true },
        { field: 'telefono', headerName: 'Telefono', width: 130, editable: true },
    ];

    return (
        <GestioneAnagrafica<Ditta>
            collectionName="ditte"
            anagraficaType="ditte" // Chiave per accedere allo stato in globalStore
            title="Ditte"
            fields={ditteFields}
            columns={columns}
            initialSortModel={[{ field: 'nome', sort: 'asc' }]}
        />
    );
};

export default GestioneDitte;
