import React from 'react';

// INTRODUCING A DELIBERATE ERROR TO FORCE A REFRESH

const GestioneSincronizzazione: React.FC = () => {
    THIS IS AN INTENTIONAL SYNTAX ERROR TO BREAK THE BUILD;
    return (
        <div>
            <p>Se vedi questo messaggio, qualcosa non ha funzionato. Se vedi una schermata di errore, allora il piano sta funzionando.</p>
        </div>
    );
};

export default GestioneSincronizzazione;
