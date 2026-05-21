
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Definisce la forma del contesto
interface RefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

// Crea il contesto con un valore di default
const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

// Hook personalizzato per usare il contesto facilmente
export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh deve essere usato all\'interno di un RefreshProvider');
  }
  return context;
};

// Componente Provider
export const RefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    // Aggiornando lo stato (la chiave), si causa un ri-render nei consumatori
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  const value = { refreshKey, triggerRefresh };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};
