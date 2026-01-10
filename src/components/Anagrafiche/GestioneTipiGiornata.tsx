import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { TipoGiornata } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';

const GestioneTipiGiornata: React.FC = () => {
    const { tipiGiornata, loading, refreshData } = useData();

    const handleSave = async (formData: TipoGiornata) => {
        const { id, ...dataToSave } = formData;
        if (id) {
            await updateDoc(doc(db, 'tipiGiornata', id), dataToSave);
        } else {
            await addDoc(collection(db, 'tipiGiornata'), dataToSave);
        }
        await refreshData(['tipiGiornata']);
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'tipiGiornata', id));
        await refreshData(['tipiGiornata']);
    };

    const tipiGiornataFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
    ];

    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
    ];

    return (
        <GestioneAnagrafica<TipoGiornata>
            data={tipiGiornata}
            loading={loading}
            title="Tipi Giornata"
            fields={tipiGiornataFields}
            columns={columns}
            onSave={handleSave}
            onDelete={handleDelete}
        />
    );
};

export default GestioneTipiGiornata;
