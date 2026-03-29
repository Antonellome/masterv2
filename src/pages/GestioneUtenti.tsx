
import { useEffect, useState, useCallback } from 'react';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { Dna } from 'react-loader-spinner';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserTable from '../components/UserTable';
import AddUserModal from '../components/AddUserModal';

export interface User {
    uid: string;
    email: string;
    nome: string;
    cognome: string;
    ruolo: 'admin' | 'tecnico' | 'utente';
    disabled: boolean;
}

const manageUsers = httpsCallable(functions, 'manageUsers');

const GestioneUtenti = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await manageUsers({ action: 'list' });
            const data = result.data as { users: User[] };
            
            // Logging in console - questa è la nostra fonte di verità
            console.log("Dati ricevuti dalla Cloud Function:", JSON.stringify(data, null, 2));
            
            setUsers(data.users || []);
        } catch (error) {
            console.error("Errore nel recuperare gli utenti:", error);
            toast.error("Impossibile caricare la lista degli utenti.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserAdded = () => {
        fetchUsers();
    };
    
    const handleSaveChanges = async (editedUsers: User[]) => {
        const promises = editedUsers.map(user => {
            return manageUsers({
                action: 'setRole',
                payload: { uid: user.uid, role: user.ruolo }
            }).then(() => {
                toast.success(`Ruolo di ${user.nome} ${user.cognome} aggiornato.`);
            }).catch(error => {
                console.error(`Errore nell'aggiornare l'utente ${user.uid}:`, error);
                toast.error(`Errore nell'aggiornare ${user.nome}.`);
            });
        });

        await Promise.all(promises);
        fetchUsers();
    };

    return (
        <div className="container mx-auto p-4 bg-gray-900 text-white min-h-screen">
            <ToastContainer theme="dark" />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-purple-400">Gestione Utenti</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition duration-300"
                >
                    Aggiungi Utente
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Dna
                        visible={true}
                        height="120"
                        width="120"
                        ariaLabel="dna-loading"
                    />
                </div>
            ) : (
                <UserTable users={users} onSaveChanges={handleSaveChanges} refreshUsers={fetchUsers} />
            )}

            <AddUserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUserAdded={handleUserAdded}
            />
        </div>
    );
};

export default GestioneUtenti;
