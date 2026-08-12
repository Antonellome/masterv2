
import Dexie from 'dexie';
import { db } from './db';

// Questa funzione tenta di aprire il DB. Se fallisce con un errore di upgrade irreparabile,
// cancella il database e ricarica la pagina.
export const attemptDbRecovery = async () => {
  try {
    // Prova ad aprire il database. Questa operazione scatenerà l'errore di upgrade se presente.
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (error) {
    // Intercettiamo specificamente l'errore di upgrade.
    if (error instanceof Dexie.DexieError && error.name === 'UpgradeError') {
      console.error(
        "************************************************************************\n" +
        "*** DATABASE CORROTTO RILEVATO. RECUPERO AUTOMATICO IN CORSO... ***\n" +
        "************************************************************************"
      );
      // Chiudiamo qualsiasi connessione rimasta aperta prima di cancellare.
      db.close();
      // CANCELLIAMO IL DATABASE CORROTTO.
      await Dexie.delete('gestionaleLavoro');
      // Forziamo il ricaricamento della pagina. L'app ripartirà con un DB pulito.
      window.location.reload();
    } else {
      // Se l'errore è diverso, lo logghiamo senza intervenire.
      console.error("Errore non gestito durante l'apertura del database:", error);
    }
  }
};
