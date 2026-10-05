import React from 'react';
import { Dialog } from '@mui/material';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import RapportinoForm from './RapportinoForm';

/**
 * Questo controller ora è guidato dallo store globale (Zustand).
 * Ascolta lo stato di `isRapportinoFormOpen` per decidere se rendersizzare il Dialog.
 * Passa i dati necessari (`editingRapportino`, `initialDate`) a RapportinoForm.
 * La funzione di chiusura (`onClose`) è anch'essa presa direttamente dallo store.
 * È stato rimosso l'attributo `key` per evitare il re-mount non necessario del form.
 * La logica di reset è ora gestita internamente da `RapportinoForm` tramite useEffect,
 * che è un approccio più pulito e performante.
 */
const RapportinoFormController: React.FC = () => {

  // Legge lo stato e le azioni per il form direttamente dallo store
  const {
    isRapportinoFormOpen,
    closeRapportinoForm,
    editingRapportino,
    rapportinoInitialDate
  } = useRapportiniStore(state => ({
    isRapportinoFormOpen: state.isRapportinoFormOpen,
    closeRapportinoForm: state.closeRapportinoForm,
    editingRapportino: state.editingRapportino,
    rapportinoInitialDate: state.rapportinoInitialDate,
  }));

  // Non renderizzare nulla se il dialog non è aperto per ottimizzare le performance
  if (!isRapportinoFormOpen) {
    return null;
  }

  return (
    <Dialog 
      open={isRapportinoFormOpen} 
      onClose={closeRapportinoForm} 
      fullWidth 
      maxWidth="md"
    >
        <RapportinoForm
            onClose={closeRapportinoForm}
            rapportino={editingRapportino}
            initialDate={rapportinoInitialDate}
        />
    </Dialog>
  );
};

export default RapportinoFormController;
