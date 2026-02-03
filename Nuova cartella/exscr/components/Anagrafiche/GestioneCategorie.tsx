import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { Categoria } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';

const GestioneCategorie: React.FC = () => {
    const { categorie, loading, refreshData } = useData();

    const handleSave = async (formData: Categoria) => {
        const { id, ...dataToSave } = formData;
        if (id) {
            await updateDoc(doc(db, 'categorie', id), dataToSave);
        } else {
            await addDoc(collection(db, 'categorie'), dataToSave);
        }
        await refreshData(['categorie']);
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'categorie', id));
        await refreshData(['categorie']);
    };

    const categorieFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
    ];

    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
    ];

    return (
        <GestioneAnagrafica<Categoria>
            data={categorie}
            loading={loading}
            title="Categorie"
            fields={categorieFields}
            columns={columns}
            onSave={handleSave}
            onDelete={handleDelete}
        />
    );
};

export default GestioneCategorie;
