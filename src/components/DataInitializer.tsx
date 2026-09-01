import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { db } from '@/db/database';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { anagraficheService } from '@/services/anagraficheService';
import { logger } from '@/utils/logger';
import { parseToDayjs } from '@/utils/dateUtils';
import { Rapportino } from '@/models/definitions';

const sanitizeRapportinoForDexie = (rapportino: any): Rapportino => {
    const finalDate = parseToDayjs(rapportino.data)?.toDate() || new Date();
    return {
        ...rapportino,
        id: rapportino.id,
        data: finalDate,
        createdAt: parseToDayjs(rapportino.createdAt)?.toDate() || finalDate,
        updatedAt: parseToDayjs(rapportino.updatedAt)?.toDate() || finalDate,
    } as Rapportino;
};

export const DataInitializer = () => {
    const { user } = useAuthStore();
    const { setLoading, setData } = useRapportiniStore();
    const syncStarted = useRef(false);

    useEffect(() => {
        const performSync = async () => {
            if (!user || syncStarted.current) return;
            syncStarted.current = true;
            setLoading(true);
            logger.log("[DataInitializer] AVVIO SYNC AMMINISTRATORE.");
            try {
                const anagraficheData = await anagraficheService.getAll();
                
                await db.rapportini.clear();

                // CORREZIONE: Usa il nuovo servizio senza `user.uid`
                const lastSync = await db.sync_status.get('lastRapportiniSync');
                const lastSyncTimestamp = lastSync?.value || 0;
                const rapportiniToSync = await rapportinoCloudService.getUpdates(lastSyncTimestamp);
                
                if (rapportiniToSync && rapportiniToSync.length > 0) {
                    const sanitizedRapportini = rapportiniToSync.map(sanitizeRapportinoForDexie);
                    await db.rapportini.bulkPut(sanitizedRapportini);
                    const newLastSync = new Date().getTime();
                    await db.sync_status.put({ id: 'lastRapportiniSync', value: newLastSync });
                }

                const allRapportiniFromDb = await db.rapportini.toArray();
                const finalPayload = {
                    ...anagraficheData,
                    rapportini: allRapportiniFromDb
                };
                setData(finalPayload);

            } catch (error: any) {
                logger.error("[DataInitializer] Errore critico durante sync admin.", error);
            } finally {
                setLoading(false);
                logger.log("[DataInitializer] SYNC AMMINISTRATORE TERMINATO.");
            }
        };

        performSync();

        return () => {
            syncStarted.current = false;
        };
    }, [user, setLoading, setData]);

    return null;
};