
import React from 'react';
import GestioneAnagrafica from './GestioneAnagrafica';
import { anagraficheConfig } from '@/config/anagrafiche.config';
import type { Tecnico } from '@/models/definitions';

const GestioneTecnici: React.FC = () => {
    const config = anagraficheConfig.tecnici;

    return (
        <GestioneAnagrafica<Tecnico>
            collectionName={config.collectionName}
            title={config.title}
            fields={config.fields}
            columns={config.columns}
        />
    );
};

export default GestioneTecnici;
