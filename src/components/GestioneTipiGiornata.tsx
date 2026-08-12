
import React from 'react';
import GestioneAnagrafica from './GestioneAnagrafica';
import { anagraficheConfig } from '@/config/anagrafiche.config';
import { TipoGiornata } from '@/models/definitions';

const GestioneTipiGiornata: React.FC = () => {
    const config = anagraficheConfig.tipigiornata;

    return (
        <GestioneAnagrafica<TipoGiornata>
            collectionName={config.collectionName}
            title={config.title}
            columns={config.columns}
            fields={config.fields}
            initialSortModel={[{ field: 'nome', sort: 'asc' }]}
        />
    );
};

export default GestioneTipiGiornata;
