
import { runRapportiniMigration } from './src/migrations/rapportini-prestazioni';

const execute = async () => {
    try {
        await runRapportiniMigration();
        process.exit(0);
    } catch (error) {
        console.error("Esecuzione migrazione fallita:", error);
        process.exit(1);
    }
};

execute();
