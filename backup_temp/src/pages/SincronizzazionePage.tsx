import GestioneUtenti from '@/components/GestioneUtenti/GestioneUtenti';
import { useData } from '@/hooks/useData';
import type { Tecnico } from '@/models/definitions';
import { GridColDef } from '@mui/x-data-grid';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useAlert } from '@/contexts/AlertContext';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate

// Colonne di base per i tecnici
const baseColumns: GridColDef<Tecnico>[] = [
  { field: 'cognome', headerName: 'Cognome', flex: 1 },
  { field: 'nome', headerName: 'Nome', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 2 },
];

const SincronizzazionePage = () => {
  const { tecnici, updateData } = useData();
  const { showAlert } = useAlert();
  const auth = getAuth();
  const navigate = useNavigate(); // Inizializza useNavigate

  const handleStatusChange = async (id: string, newStatus: boolean) => {
    try {
      await updateData('tecnici', id, { sincronizzazioneAttiva: newStatus });
      showAlert(`Stato sincronizzazione aggiornato per il tecnico.`, 'success');
    } catch (error) {
      console.error("Errore durante l'aggiornamento: ", error);
      showAlert("Errore durante l'aggiornamento dello stato.", 'error');
    }
  };

  const handleSendPassword = (email: string) => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        showAlert(`Email di reset password inviata con successo a ${email}.`, 'success');
      })
      .catch((error) => {
        console.error("Errore durante l'invio dell'email: ", error);
        showAlert(`Errore durante l'invio dell'email a ${email}.`, 'error');
      });
  };

  // Funzione per gestire il click sul pulsante "Nuovo"
  const handleAddNew = () => {
    navigate('/tecnici/nuovo'); // Naviga alla pagina di creazione
  };

  return (
    <GestioneUtenti<Tecnico>
      title="Gestione Sincronizzazione Tecnici"
      data={tecnici}
      baseColumns={baseColumns}
      statusField="sincronizzazioneAttiva"
      onStatusChange={handleStatusChange}
      onSendPassword={handleSendPassword}
      onAddNew={handleAddNew} // Passa la funzione alla toolbar
    />
  );
};

export default SincronizzazionePage;
