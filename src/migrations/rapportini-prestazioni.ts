
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase'; // Assicurati che il percorso di importazione sia corretto

// Definizione di tipo per il formato del rapportino, per chiarezza
interface Rapportino {
    id: string;
    tecnicoId?: string;
    oreLavoro?: number;
    altriTecniciIds?: string[];
    presenze?: string[];
    dettaglioOreTecnici?: { tecnicoId: string; ore: number }[];
    [key: string]: any; 
}

/**
 * Esegue la migrazione per aggiornare i vecchi rapportini al nuovo standard con `dettaglioOreTecnici`.
 * 
 * 1. Recupera tutti i documenti dalla collezione `rapportini`.
 * 2. Identifica i rapportini "vecchi" (quelli senza `dettaglioOreTecnici` ma con ore lavorate).
 * 3. Crea un nuovo array `dettaglioOreTecnici` basandosi sui campi `tecnicoId`, `oreLavoro` e `altriTecniciIds`/`presenze`.
 * 4. Aggiorna i documenti in un batch per efficienza.
 */
export const runRapportiniMigration = async () => {
    console.log("INIZIO MIGRAZIONE RAPPORTINI...");
    const rapportiniRef = collection(db, 'rapportini');
    const batch = writeBatch(db);
    let updatedCount = 0;

    try {
        console.log("Recupero tutti i rapportini da Firestore...");
        const snapshot = await getDocs(rapportiniRef);
        const allRapportini: Rapportino[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rapportino));
        console.log(`Trovati ${allRapportini.length} rapportini in totale.`);

        for (const r of allRapportini) {
            // CONDIZIONE DI MIGRAZIONE:
            // - Il rapportino NON deve avere il campo `dettaglioOreTecnici`.
            // - Il rapportino DEVE avere un `tecnicoId` e `oreLavoro` > 0.
            const needsMigration = !r.dettaglioOreTecnici && r.tecnicoId && (r.oreLavoro ?? 0) > 0;

            if (needsMigration) {
                console.log(`Migrazione necessaria per il rapportino ID: ${r.id}`);
                updatedCount++;

                const newDettaglio: { tecnicoId: string; ore: number }[] = [];

                // 1. Aggiungi il tecnico principale
                newDettaglio.push({
                    tecnicoId: r.tecnicoId!,
                    ore: r.oreLavoro!
                });

                // 2. Aggiungi gli altri tecnici (da `altriTecniciIds` o dal vecchio `presenze`)
                const altriTecnici = r.altriTecniciIds || r.presenze || [];
                for (const altroTecnicoId of altriTecnici) {
                    // Evita di aggiungere duplicati se per errore l'ID principale è anche nei secondari
                    if (altroTecnicoId !== r.tecnicoId) {
                        newDettaglio.push({
                            tecnicoId: altroTecnicoId,
                            ore: r.oreLavoro! // Assumiamo che i tecnici secondari abbiano lavorato le stesse ore
                        });
                    }
                }
                
                const docRef = doc(db, 'rapportini', r.id);
                batch.update(docRef, { dettaglioOreTecnici: newDettaglio });
                console.log(`  -> Preparato aggiornamento per ${newDettaglio.length} tecnici.`);
            }
        }

        if (updatedCount > 0) {
            console.log(`Committing batch di ${updatedCount} aggiornamenti...`);
            await batch.commit();
            console.log(`MIGRAZIONE COMPLETATA CON SUCCESSO! ${updatedCount} rapportini sono stati aggiornati.`);
        } else {
            console.log("Nessun rapportino da migrare. Il database è già aggiornato.");
        }

        return { success: true, updatedCount };

    } catch (error) {
        console.error("ERRORE DURANTE LA MIGRAZIONE DEI RAPPORTINI:", error);
        throw new Error("La migrazione dei rapportini è fallita.");
    }
};
