import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { Ditta } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';

const GestioneDitte: React.FC = () => {
    const { ditte, loading, refreshData } = useData();

    const handleSave = async (formData: Ditta) => {
        const { id, ...dataToSave } = formData;
        if (id) {
            await updateDoc(doc(db, 'ditte', id), dataToSave);
        } else {
            await addDoc(collection(db, 'ditte'), dataToSave);
        }
        await refreshData(['ditte']);
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'ditte', id));
        await refreshData(['ditte']);
    };

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

    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        { field: 'pIva', headerName: 'Partita IVA', width: 200 },
        { field: 'citta', headerName: 'Città', width: 200 },
    ];

    return (
        <GestioneAnagrafica<Ditta>
            data={ditte}
            loading={loading}
            title="Ditte"
            fields={ditteFields}
            columns={columns}
            onSave={handleSave}
            onDelete={handleDelete}
        />
    );
};

export default GestioneDitte;
