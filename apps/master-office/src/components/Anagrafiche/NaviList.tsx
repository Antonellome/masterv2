import { useMemo } from 'react';
import { collection, CollectionReference } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Nave } from '@/models/definitions';
import { useCollectionData } from '@/hooks/useCollectionData';
import type { GridColDef } from '@mui/x-data-grid';
import ListaGestibile from './ListaGestibile';
import NaveForm from './NaveForm'; // Assicurati che il percorso sia corretto

const NaviList = () => {
    const naviCollection = useMemo(() => collection(db, 'navi') as CollectionReference<Nave>, []);
    const { data: navi, loading, error, handleUpdate, handleDelete, handleAdd } = useCollectionData<Nave>(naviCollection);

    const columns: GridColDef[] = [
        { field: 'nome', headerName: 'Nome Nave', flex: 1 },
        { field: 'clienteId', headerName: 'ID Cliente', flex: 1 }, // Aggiunto per debugging
    ];

    return (
        <ListaGestibile
            items={navi || []}
            columns={columns}
            loading={loading}
            error={error}
            onEdit={handleUpdate}
            onDelete={handleDelete}
            onAdd={handleAdd}
            FormComponent={NaveForm}
            formTitle="Gestione Nave"
            collectionName="navi"
        />
    );
};

export default NaviList;
