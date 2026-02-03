import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField, Ditta } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';

const fields: FormField[] = [
    { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12 } },
];

const columns: GridColDef[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150, editable: true },
];

const GestioneDitte = () => {

    return (
        <GestioneAnagrafica<Ditta>
            collectionName="ditte"
            title="Gestione Ditte"
            fields={fields}
            columns={columns}
            anagraficaType="ditta"
        />
    );
};

export default GestioneDitte;
