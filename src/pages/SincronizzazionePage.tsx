import GestioneUtenti from '@/components/GestioneUtenti/GestioneUtenti';
import { useGlobalStore } from '@/stores/globalStore';
import { tecniciService, resetPasswordTecnico } from '@/services/tecniciService'; // << 1. IMPORT CORRETTO
import type { Tecnico } from '@/models/definitions';
import { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';

// Colonne di base per i tecnici
const baseColumns: GridColDef<Tecnico>[] = [
  { field: 'cognome', headerName: 'Cognome', flex: 1 },
  { field: 'nome', headerName: 'Nome', flex: 1 },
  { field: 'email', headerName: 'Email', flex: 2 },
];

const SincronizzazionePage = () => {
  const tecnici = useGlobalStore((state) => state.tecnici);
  const showNotification = useGlobalStore((state) => state.showNotification);
  const navigate = useNavigate();

  const handleStatusChange = async (id: string, newStatus: boolean) => {
    try {
      // << 2. UTILIZZO DEL SERVIZIO CORRETTO COME DA ARCHITETTURA
      await tecniciService('update', { id, sincronizzazioneAttiva: newStatus });
      showNotification(`Stato sincronizzazione aggiornato per il tecnico.`, 'success');
      // La UI si aggiornerà automaticamente grazie al sync richiamato dal service
    } catch (error) {
      console.error("Errore durante l'aggiornamento: ", error);
      // La notifica di errore è già gestita centralmente dal service, non serve duplicarla
    }
  };

  const handleSendPassword = async (email: string) => {
    try {
      await resetPasswordTecnico(email);
      // La notifica di successo/errore è gestita internamente dal service
    } catch (error) {
      console.error("Errore durante l'invio dell'email: ", error);
    }
  };

  const handleAddNew = () => {
    navigate('/tecnici/nuovo');
  };

  return (
    <GestioneUtenti<Tecnico>
      title="Gestione Sincronizzazione Tecnici"
      data={tecnici}
      baseColumns={baseColumns}
      statusField="sincronizzazioneAttiva"
      onStatusChange={handleStatusChange}
      onSendPassword={handleSendPassword}
      onAddNew={handleAddNew}
    />
  );
};

export default SincronizzazionePage;
