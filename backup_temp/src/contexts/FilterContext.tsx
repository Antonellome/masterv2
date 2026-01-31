import { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

export type ScadenzeFilter = 'all' | 'personali' | 'veicoli' | 'documenti';

interface FilterContextProps {
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

export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [scadenzeFilter, setScadenzeFilter] = useState<ScadenzeFilter>('all');
    const [silencedScadenze, setSilencedScadenze] = useState<string[]>([]);

    const toggleSilenceScadenza = (id: string) => {
        setSilencedScadenze(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <FilterContext.Provider value={{ scadenzeFilter, setScadenzeFilter, silencedScadenze, toggleSilenceScadenza }}>
            {children}
        </FilterContext.Provider>
    );
};
