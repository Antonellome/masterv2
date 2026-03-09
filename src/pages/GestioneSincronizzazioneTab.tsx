import React from 'react';

// INTRODUCING A DELIBERATE ERROR TO FORCE A REFRESH

const GestioneSincronizzazioneTab: React.FC = () => {
    THIS WILL CRASH THE COMPONENT. IF YOU SEE AN ERROR, THE PLAN IS WORKING.;
    return (
        <div>
            <p>Se vedi una schermata di errore, il piano sta funzionando. Conferma per procedere.</p>
        </div>
    );
};

export default GestioneSincronizzazioneTab;
