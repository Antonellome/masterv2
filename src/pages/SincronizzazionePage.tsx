import GestioneUtenti from '@/components/GestioneUtenti/GestioneUtenti';
import { useGlobalStore } from '@/stores/globalStore';
import { SyncService } from '@/services/SyncService';
import type { Tecnico } from '@/models/definitions';
import { GridColDef } from '@mui/x-data-grid';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// Colonne di base per i tecnici
const baseColumns: GridColDef<Tecnico>[] = [
  { field: 'cognome', headerName: 'Cognome', flex: 1 },
  { field: 'nome', headerName: 'Nome', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 2 },
];

const SincronizzazionePage = () => {
  // Corretto il selettore per puntare direttamente a state.tecnici
  const tecnici = useGlobalStore((state) => state.tecnici);
  // Sostituito useAlert con showNotification dal global store
  const showNotification = useGlobalStore((state) => state.showNotification);
  const auth = getAuth();
  const navigate = useNavigate();

  const handleStatusChange = async (id: string, newStatus: boolean) => {
    try {
      await SyncService.updateRecord('tecnici', id, { sincronizzazioneAttiva: newStatus });
      showNotification(`Stato sincronizzazione aggiornato per il tecnico.`, 'success');
    } catch (error) {
      console.error("Errore durante l'aggiornamento: ", error);
      showNotification("Errore durante l'aggiornamento dello stato.", 'error');
    }
  };

  const handleSendPassword = (email: string) => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        showNotification(`Email di reset password inviata con successo a ${email}.`, 'success');
      })
      .catch((error) => {
        console.error("Errore durante l'invio dell'email: ", error);
        showNotification(`Errore durante l'invio dell'email a ${email}.`, 'error');
      });
  };

  const handleAddNew = () => {
    navigate('/tecnici/nuovo');
  };

  return (
    <GestioneUtenti<Tecnico>
      title="Gestione Sincronizzazione Tecnici"
      data={tecnici} // I dati ora arrivano correttamente dal globalStore
      baseColumns={baseColumns}
      statusField="sincronizzazioneAttiva"
      onStatusChange={handleStatusChange}
      onSendPassword={handleSendPassword}
      onAddNew={handleAddNew}
    />
  );
};

export default SincronizzazionePage;
