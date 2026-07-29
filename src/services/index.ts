
// Questo file serve come punto di esportazione centrale per i servizi 
// e gli hook che devono essere utilizzati in contesti non-React.

export { useAlert } from '@/contexts/AlertContext';
export { syncAnagrafiche, syncRapportini } from './SyncService';
