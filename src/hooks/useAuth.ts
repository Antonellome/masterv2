import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// NOTA PER L'APP MASTER: Questa è un'implementazione "bridge" dell'hook useAuth.
// Nell'App Tecnici, questo hook ha una logica più complessa per gestire il profilo del tecnico.
// Qui, simuliamo un profilo utente sufficiente a soddisfare le necessità del componente ReportFormPage,
// assumendo che l'utente loggato sia un amministratore che agisce per conto dei tecnici.

export const useAuth = () => {
    const [userProfile, setUserProfile] = useState<{ tecnicoId: string | null } | null>(null);
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Per l'App Master, potremmo voler assegnare un ID specifico dell'amministratore
                // o un ID "generico" per la creazione dei rapportini da back-office.
                // Per ora, usiamo l'UID di Firebase come segnaposto per `tecnicoId`.
                setUserProfile({
                    tecnicoId: user.uid
                });
            } else {
                setUserProfile(null);
            }
        });

        return () => unsubscribe();
    }, [auth]);

    // L'oggetto restituito è volutamente minimale per soddisfare solo le necessità di ReportFormPage.
    return { userProfile };
};
