import { createContext, Dispatch, SetStateAction } from 'react';

export type ScadenzeFilter = 'all' | 'personali' | 'veicoli' | 'documenti';

export interface FilterContextProps {
    scadenzeFilter: ScadenzeFilter;
    setScadenzeFilter: Dispatch<SetStateAction<ScadenzeFilter>>;
    silencedScadenze: string[];
    toggleSilenceScadenza: (id: string) => void;
}

export const FilterContext = createContext<FilterContextProps>({
    scadenzeFilter: 'all',
    setScadenzeFilter: () => {},
    silencedScadenze: [],
    toggleSilenceScadenza: () => {},
});
