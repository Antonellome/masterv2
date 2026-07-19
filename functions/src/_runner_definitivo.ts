
// Script di migrazione definitivo, basato sull'analisi dei dati reali.
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function runDefinitiveMigration() {
    const db = getFirestore();
    console.log("INIZIO MIGRAZIONE DEFINITIVA: Campo `dettaglioOreTecnici` e ricalcolo `oreLavoro`.");

    const rapportiniRef = db.collection('rapportini');
    const batch = db.batch();
    let updatedCount = 0;
    let totalDocs = 0;

    const snapshot = await rapportiniRef.get();
    totalDocs = snapshot.docs.length;
    console.log(`Trovati ${totalDocs} rapportini in totale. Inizio analisi...`);

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // La condizione di migrazione: `dettaglioOreTecnici` non esiste o e' un array vuoto.
        const needsMigration = !data.dettaglioOreTecnici || data.dettaglioOreTecnici.length === 0;

        if (needsMigration) {
            const oldOreLavoro = data.oreLavoro ?? 0;
            const tecnicoPrincipale = data.tecnicoId;
            
            if (tecnicoPrincipale && oldOreLavoro > 0) {
                console.log(` -> Migrazione necessaria per il rapportino ID: ${doc.id}`);
                updatedCount++;

                const allTecniciIds = new Set<string>();
                allTecniciIds.add(tecnicoPrincipale);
                
                const presenze = data.presenze || data.altriTecniciIds || [];
                presenze.forEach((id: string) => id && allTecniciIds.add(id));

                const newDettaglio: { tecnicoId: string; ore: number }[] = [];
                allTecniciIds.forEach(id => {
                    newDettaglio.push({ tecnicoId: id, ore: oldOreLavoro });
                });

                // Ricalcola il totale oreLavoro come somma
                const newOreLavoro = newDettaglio.reduce((sum, item) => sum + item.ore, 0);

                const updates: { [key: string]: any } = {
                    dettaglioOreTecnici: newDettaglio,
                    oreLavoro: newOreLavoro
                };

                batch.update(doc.ref, updates);
            } 
        }
    }

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`\n--- MIGRAZIONE DEFINITIVA COMPLETATA ---`);
        console.log(`${updatedCount} su ${totalDocs} rapportini sono stati migrati.`);
    } else {
        console.log("\n--- NESSUNA MIGRAZIONE NECESSARIA ---");
        console.log(`Tutti i ${totalDocs} rapportini analizzati risultano già conformi.`);
    }
}

// --- ESECUZIONE ---
async function main() {
    try {
        admin.initializeApp();
        await runDefinitiveMigration();
        process.exit(0);
    } catch (error) {
        console.error("\n!!! ESECUZIONE MIGRAZIONE FALLITA !!!", error);
        process.exit(1);
    }
}

main();
