
import React from 'react';
import GestioneAnagrafica from './GestioneAnagrafica';
import type { TipoGiornata } from '@/models/definitions';

const GestioneTipiGiornata: React.FC = () => {
    return (
        <GestioneAnagrafica<TipoGiornata>
            anagraficaType="tipiGiornata"
            title="Tipi Giornata"
        />
    );
};

export default GestioneTipiGiornata;
