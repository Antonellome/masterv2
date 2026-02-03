import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import type { FormField } from '@/models/definitions';
import type { GridColDef } from '@mui/x-data-grid';

const GestioneCategorie = () => {

    const fields: FormField[] = [
        { name: 'nome', label: 'Nome', type: 'text', required: true, gridProps: { xs: 12 } },
    ];

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    ];

    return (
        <GestioneAnagrafica
            collectionName="categorie"
            title="Gestione Categorie"
            fields={fields}
            columns={columns}
            anagraficaType="categoria"
        />
    );
};

export default GestioneCategorie;
