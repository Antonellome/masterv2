import { useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useData } from '@/hooks/useData';
import type { Cliente } from '@/models/definitions';
import GestioneAnagrafica from './GestioneAnagrafica';
import type { GridRenderCellParams } from '@mui/x-data-grid';

const GestioneClienti: React.FC = () => {
    // Recupero tutti i dati necessari dal contesto
    const { clienti, navi, luoghi, loading, refreshData } = useData();

    // Calcolo il conteggio delle navi per ogni cliente, memoizzato per efficienza
    const naviCountByCliente = useMemo(() => {
        const counts = new Map<string, number>();
        navi.forEach(nave => {
            if (nave.clienteId) {
                counts.set(nave.clienteId, (counts.get(nave.clienteId) || 0) + 1);
            }
        });
        return counts;
    }, [navi]);

    // Calcolo il conteggio dei luoghi per ogni cliente, memoizzato per efficienza
    const luoghiCountByCliente = useMemo(() => {
        const counts = new Map<string, number>();
        luoghi.forEach(luogo => {
            if (luogo.clienteId) {
                counts.set(luogo.clienteId, (counts.get(luogo.clienteId) || 0) + 1);
            }
        });
        return counts;
    }, [luoghi]);

    // Funzioni per salvare ed eliminare un cliente
    const handleSave = async (formData: Cliente) => {
        const { id, ...dataToSave } = formData;
        if (id) {
            await updateDoc(doc(db, 'clienti', id), dataToSave);
        } else {
            await addDoc(collection(db, 'clienti'), dataToSave);
        }
        await refreshData(['clienti']);
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'clienti', id));
        await refreshData(['clienti']);
    };

    // I campi per il form di creazione/modifica rimangono invariati
    const clientiFields = [
        { name: 'nome', label: 'Nome', type: 'text', required: true },
        { name: 'pIva', label: 'Partita IVA', type: 'text' },
        { name: 'codiceFiscale', label: 'Codice Fiscale', type: 'text' },
        { name: 'indirizzo', label: 'Indirizzo', type: 'text' },
        { name: 'citta', label: 'Città', type: 'text' },
        { name: 'cap', label: 'CAP', type: 'text' },
        { name: 'provincia', label: 'Provincia', type: 'text' },
        { name: 'telefono', label: 'Telefono', type: 'text' },
        { name: 'email', label: 'Email', type: 'email' },
    ];

    // Definisco le nuove colonne per la tabella
    const columns = [
        { field: 'nome', headerName: 'Nome', flex: 1 },
        {
            field: 'naviCount',
            headerName: 'Navi',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<Cliente>) => {
                const count = naviCountByCliente.get(params.row.id) || 0;
                return <span style={{ fontWeight: count > 0 ? 'bold' : 'normal' }}>{count}</span>;
            },
        },
        {
            field: 'luoghiCount',
            headerName: 'Luoghi',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params: GridRenderCellParams<Cliente>) => {
                const count = luoghiCountByCliente.get(params.row.id) || 0;
                return <span style={{ fontWeight: count > 0 ? 'bold' : 'normal' }}>{count}</span>;
            },
        },
    ];

    return (
        <GestioneAnagrafica<Cliente>
            data={clienti}
            loading={loading}
            title="Clienti"
            fields={clientiFields} // I campi del form restano gli stessi
            columns={columns}      // Le colonne della tabella sono aggiornate
            onSave={handleSave}
            onDelete={handleDelete}
        />
    );
};

export default GestioneClienti;
