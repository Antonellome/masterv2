import React from 'react';
import { Dialog } from '@mui/material';
import type { Tecnico, Rapportino } from '@/models/definitions'; // <-- CORRETTO
import RapportinoForm from './RapportinoForm';
import type { Dayjs } from 'dayjs';

interface RapportinoFormControllerProps {
  open: boolean;
  onClose: () => void;
  rapportino?: Rapportino | null;
  currentTecnico?: Tecnico;
  initialDate?: Dayjs;
}

/**
 * Questo componente agisce come un semplice wrapper. Gestisce l'apertura/chiusura
 * del Dialog e passa le props necessarie a RapportinoForm.
 * Tutta la logica di fetching e gestione del form è ora incapsulata in RapportinoForm.
 */
const RapportinoFormController: React.FC<RapportinoFormControllerProps> = ({
  open,
  onClose,
  rapportino,
  currentTecnico,
  initialDate,
}) => {
  
  // Non renderizzare nulla se il dialog non è aperto per ottimizzare le performance
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" key={rapportino?.id || 'new'}>
        {/* RapportinoForm ora gestisce il proprio stato di caricamento internamente */}
        <RapportinoForm
            onClose={onClose}
            rapportino={rapportino}
            currentTecnico={currentTecnico}
            initialDate={initialDate}
        />
    </Dialog>
  );
};

export default RapportinoFormController;
