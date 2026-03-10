import React, { createContext, useState, useCallback, ReactNode, useContext } from 'react';

// --- TIPI E INTERFACCIA ---
interface IRefreshContext {
  refreshKey: number;
  triggerRefresh: () => void;
}

// --- CREAZIONE DEL CONTESTO ---
// Creato con undefined come valore di default, come da best practice.
const RefreshContext = createContext<IRefreshContext | undefined>(undefined);

// --- HOOK USEFRESH ---
// Hook pubblico per accedere al contesto in modo sicuro.
export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (context === undefined) {
        throw new Error("useRefresh deve essere utilizzato all'interno di un RefreshProvider");
    }
    return context;
};

// --- COMPONENTE PROVIDER ---
export const RefreshProvider = ({ children }: { children: ReactNode }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // La funzione per triggerare l'aggiornamento, memoizzata per stabilità.
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  const value = { refreshKey, triggerRefresh };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};
