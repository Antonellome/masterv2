import { useContext } from 'react';
import { RefreshContext } from '@/contexts/RefreshContext';

export const useRefreshContext = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefreshContext must be used within a RefreshProvider');
  }
  return context;
};
