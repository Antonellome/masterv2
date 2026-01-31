import { collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { Qualifica } from '@/models/definitions';
import CrudManager from '../CrudManager';

// CORREZIONE: Spostato collectionRef fuori dal componente per renderlo stabile.
const collectionRef = collection(db, 'qualifiche');

const GestioneQualifiche = () => {

    const formFields = [
        { name: 'nome', label: 'Nome Qualifica', type: 'text', required: true },
        { name: 'descrizione', label: 'Descrizione', type: 'text', multiline: true, rows: 4 },
    ];

    const columns = [
        { id: 'nome', label: 'Nome', minWidth: 170 },
        { id: 'descrizione', label: 'Descrizione', minWidth: 250 },
    ];

    return (
        <CrudManager<Qualifica>
            collectionRef={collectionRef}
            columns={columns}
            formFields={formFields}
            itemType="Qualifica"
            itemNameKey="nome"
        />
    );
};

export default GestioneQualifiche;
