import { useMemo } from 'react';
import { collection, CollectionReference } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Veicolo } from '@/models/definitions';
import { useCollectionData } from '@/hooks/useCollectionData';
import type { GridColDef } from '@mui/x-data-grid';
import ListaGestibile from './ListaGestibile';
import VeicoloForm from './VeicoloForm';

const VeicoliList = () => {
    const veicoliCollection = useMemo(() => collection(db, 'veicoli') as CollectionReference<Veicolo>, []);
    const { data: veicoli, loading, error, handleUpdate, handleDelete, handleAdd } = useCollectionData<Veicolo>(veicoliCollection);

    const columns: GridColDef[] = [
        { field: 'targa', headerName: 'Targa', flex: 1 },
        { field: 'marca', headerName: 'Marca', flex: 1 },
        { field: 'modello', headerName: 'Modello', flex: 1 },
        { field: 'anno', headerName: 'Anno', type: 'number', width: 100 },
    ];

    return (
        <ListaGestibile
            items={veicoli || []}
            columns={columns}
            loading={loading}
            error={error}
            onEdit={handleUpdate}
            onDelete={handleDelete}
            onAdd={handleAdd}
            FormComponent={VeicoloForm}
            collectionName="veicoli"
        />
    );
};

export default VeicoliList;
