import GestioneAnagrafica from './GestioneAnagrafica';
import type { Categoria } from '@/models/definitions';
import { GridColDef } from '@mui/x-data-grid';

const GestioneCategorie: React.FC = () => {

    const categorieFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'descrizione', label: 'Descrizione', type: 'text' },
    ];

    const columns: GridColDef<Categoria>[] = [
        { field: 'nome', headerName: 'Nome', flex: 1, editable: true },
        { field: 'descrizione', headerName: 'Descrizione', flex: 2, editable: true },
    ];

    return (
        <GestioneAnagrafica<Categoria>
            collectionName="categorie"
            anagraficaType="categorie" // Chiave per accedere allo stato in globalStore
            title="Categorie"
            fields={categorieFields}
            columns={columns}
            initialSortModel={[{ field: 'nome', sort: 'asc' }]}
        />
    );
};

export default GestioneCategorie;
