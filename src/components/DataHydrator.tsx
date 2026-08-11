
import { useEffect } from 'react';
import { useGlobalStore } from '@/stores/globalStore';
import { syncAnagrafiche } from '@/db/sync'; // Funzione che dobbiamo creare

/**
 * Componente "invisibile" che ha il solo scopo di attivare
 * la sincronizzazione dei dati quando l'utente è autenticato.
 */
export const DataHydrator = () => {
  const { isAuthenticated, lastUpdated } = useGlobalStore(state => ({
      isAuthenticated: state.isAuthenticated,
      lastUpdated: state.lastUpdated,
  }));

  useEffect(() => {
    if (isAuthenticated) {
      console.log('[DataHydrator] Utente autenticato, avvio sincronizzazione anagrafiche.');
      // La funzione syncAnagrafiche conterrà la logica per decidere
      // se è necessario aggiornare i dati (es. basandosi su lastUpdated)
      syncAnagrafiche();
    }
  }, [isAuthenticated]); // Si attiva solo quando lo stato di autenticazione cambia

  return null; // Questo componente non renderizza nulla
};
