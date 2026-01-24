import { useContext } from 'react';
import { RefreshContext } from '@/contexts/RefreshContext';

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
