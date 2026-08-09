
import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db'; // Assumendo che db.ts esista
import { useGlobalStore } from '../stores/globalStore';

const DataHydrator: React.FC = () => {
  // Esempio: useLiveQuery per leggere i tecnici da Dexie
  const tecnici = useLiveQuery(() => db.tecnici.toArray(), []);

  useEffect(() => {
    // Quando i dati da Dexie cambiano, aggiorniamo lo store globale
    // Esempio: useGlobalStore.setState({ tecnici: tecnici });
  }, [tecnici]);

  return null; // Questo componente non renderizza nulla
};

export default DataHydrator;
