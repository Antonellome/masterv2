
import React from 'react';
import GestioneAnagrafica from './GestioneAnagrafica';
import type { Cliente } from '@/models/definitions';

const GestioneClienti: React.FC = () => {
    return (
        <GestioneAnagrafica<Cliente>
            anagraficaType="clienti"
            title="Clienti"
        />
    );
};

export default GestioneClienti;
