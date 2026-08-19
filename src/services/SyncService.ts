
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useGlobalStore } from '@/stores/globalStore';
import { Rapportino, Anagrafiche } from '@/models/definitions';

const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date('invalid');
  if (timestamp && typeof timestamp === 'object' && typeof timestamp._seconds === 'number') {
    return new Date(timestamp._seconds * 1000);
  }
  const d = new Date(timestamp);
  if (!isNaN(d.getTime())) {
    return d;
  }
  return new Date('invalid');
};

const syncAnagrafiche = async () => {
    console.log("SyncService: Inizio sincronizzazione ANAGRAFICHE.");
    try {
        const getAnagrafiche = httpsCallable(functions, 'syncAllAnagrafiche');
        const response = await getAnagrafiche();
        const data = response.data as Anagrafiche;

        if (!data || typeof data !== 'object') {
            console.error("SyncService: ERRORE FATALE - La risposta delle anagrafiche non è un oggetto valido.", response.data);
            useGlobalStore.getState().setAnagrafiche({ tecnici: [], navi: [], clienti: [], luoghi: [], tipiGiornata: [], veicoli: [] });
            return;
        }

        const anagrafiche: Anagrafiche = {
            tecnici: data.tecnici || [],
            navi: data.navi || [],
            clienti: data.clienti || [],
            luoghi: data.luoghi || [],
            tipiGiornata: data.tipiGiornata || [],
            veicoli: data.veicoli || []
        };

        useGlobalStore.getState().setAnagrafiche(anagrafiche);
        console.log(`SyncService: Anagrafiche sincronizzate. Trovati ${anagrafiche.tecnici.length} tecnici.`);

    } catch (error) {
        console.error("SyncService: ERRORE CRITICO durante la sincronizzazione delle anagrafiche:", error);
        useGlobalStore.getState().setAnagrafiche({ tecnici: [], navi: [], clienti: [], luoghi: [], tipiGiornata: [], veicoli: [] });
    }
};

const syncRapportini = async () => {
    console.log("SyncService: Inizio sincronizzazione RAPPORTINI.");
    try {
        const getAllRapportini = httpsCallable(functions, 'getAllRapportiniForSync');
        const response = await getAllRapportini();
        
        // =========================================================================
        //  DEBUGGING ATTIVO: STAMPO LA RISPOSTA GREZZA DAL SERVER
        // =========================================================================
        console.log("******************************************************************");
        console.log("*** RISPOSTA GREZZA RICEVUTA DA getAllRapportiniForSync ***");
        console.log(JSON.stringify(response, null, 2));
        console.log("******************************************************************");
        // =========================================================================

        const serverData = (response.data as any)?.data;

        if (!Array.isArray(serverData)) {
            console.error("SyncService: ERRORE FATALE - La risposta dei rapportini non contiene 'data' come array.", response.data);
            useGlobalStore.getState().setRapportini([]);
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        const rapportiniClient: Rapportino[] = serverData.map((serverReport: any, index: number) => {
            try {
                const rapportino: Rapportino = {
                    id: serverReport.id,
                    dataInizio: toDate(serverReport.data || serverReport.dataInizio),
                    dataFine: serverReport.dataFine ? toDate(serverReport.dataFine) : undefined,
                    tecnicoId: serverReport.tecnicoId,
                    presenze: serverReport.presenze || [],
                    tipoGiornataId: serverReport.tipoGiornataId,
                    trasfertaId: serverReport.trasfertaId,
                    includeTrasferta: serverReport.includeTrasferta || false,
                    naveId: serverReport.naveId,
                    luogoId: serverReport.luogoId,
                    veicoloId: serverReport.veicoloId,
                    lavoroEseguito: serverReport.lavoroEseguito || '',
                    descrizioneBreve: serverReport.descrizioneBreve || '',
                    materialiImpiegati: serverReport.materialiImpiegati || '',
                    ordineLavoro: serverReport.ordineLavoro || '',
                    dettaglioOre: serverReport.dettaglioOreTecnici || serverReport.dettaglioOre || [],
                    firmaFirmatarioNome: serverReport.firmaFirmatarioNome || '',
                    firmaFirmatarioSocieta: serverReport.firmaFirmatarioSocieta || '',
                    firmaVettoriale: serverReport.firmaVettoriale,
                    createdAt: serverReport.createdAt ? toDate(serverReport.createdAt) : undefined,
                    createdBy: serverReport.createdBy,
                    updatedAt: serverReport.updatedAt ? toDate(serverReport.updatedAt) : undefined,
                    updatedBy: serverReport.updatedBy,
                    isLocked: serverReport.isLocked || false,
                    version: serverReport.version || 1,
                };
                successCount++;
                return rapportino;
            } catch(e) {
                errorCount++;
                console.error(`SyncService: Errore durante la trasformazione del rapportino #${index} (ID: ${serverReport.id}). Saltato.`, {error: e, data: serverReport });
                return null;
            }
        }).filter((r): r is Rapportino => r !== null);

        useGlobalStore.getState().setRapportini(rapportiniClient);
        console.log(`SyncService: Sincronizzazione rapportini completata. Caricati: ${successCount}. Falliti: ${errorCount}.`);

    } catch (error) {
        console.error("SyncService: ERRORE CRITICO durante la sincronizzazione dei rapportini:", error);
        useGlobalStore.getState().setRapportini([]);
    }
};

export const avviaSincronizzazioneCompleta = async () => {
    console.log("Sincronizzazione Completa avviata...");
    useGlobalStore.getState().setIsSyncInProgress(true);
    
    await syncAnagrafiche();
    await syncRapportini();
    
    useGlobalStore.getState().setIsSyncInProgress(false);
    useGlobalStore.getState().setLastUpdated();
    console.log("Sincronizzazione Completa terminata.");
};
