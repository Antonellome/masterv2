
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlpnXKXYvh52cQtojfLsTFUcet-geKzqQ",
  authDomain: "riso-project-app.firebaseapp.com",
  projectId: "riso-project-app",
  storageBucket: "riso-project-app.firebasestorage.app",
  messagingSenderId: "157316892209",
  appId: "1:157316892209:web:c591c034fa132e549bb710",
  databaseURL: "https://riso-project-app-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteRapportini() {
    console.log("Inizio la pulizia dei rapportini...");

    const rapportiniRef = collection(db, "rapportini");
    const targetDate = new Date('2026-04-10T00:00:00Z');
    const targetTimestamp = Timestamp.fromDate(targetDate);

    try {
        const querySnapshot = await getDocs(rapportiniRef);
        const batch = writeBatch(db);
        let deleteCount = 0;

        console.log(`Trovati ${querySnapshot.docs.length} rapportini. Inizio il controllo della data...`);

        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Controllo che il campo 'data' esista e sia un oggetto Timestamp
            if (data.data && typeof data.data.toDate === 'function') {
                const rapportinoDate = data.data.toDate();
                // Confronto solo giorno, mese e anno, ignorando l'orario
                if (rapportinoDate.getUTCFullYear() !== targetDate.getUTCFullYear() ||
                    rapportinoDate.getUTCMonth() !== targetDate.getUTCMonth() ||
                    rapportinoDate.getUTCDate() !== targetDate.getUTCDate()) {
                    
                    batch.delete(doc.ref);
                    deleteCount++;
                    console.log(`Rapportino ${doc.id} (data: ${rapportinoDate.toISOString()}) aggiunto al batch di eliminazione.`);
                }
            } else {
                 console.warn(`Rapportino ${doc.id} non ha un campo 'data' valido. Verrà cancellato.`);
                 batch.delete(doc.ref);
                 deleteCount++;
            }
        });

        if (deleteCount > 0) {
            console.log(`Sto per eliminare ${deleteCount} rapportini...`);
            await batch.commit();
            console.log(`${deleteCount} rapportini sono stati eliminati con successo.`);
        } else {
            console.log("Nessun rapportino da eliminare. Tutti i rapportini sono conformi alla data specificata.");
        }

    } catch (error) {
        console.error("Errore durante la pulizia dei rapportini:", error);
    }
}

deleteRapportini();
