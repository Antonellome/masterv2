
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import type { CollectionName, Rapportino } from '@/models/definitions';
import { logger } from '@/utils/logger';

if (typeof (window as any).isDataInitializerActive === 'undefined') {
    (window as any).isDataInitializerActive = false;
}

const collectionsToSync: { name: CollectionName; stateKey: keyof Omit<typeof useRapportiniStore.getState, 'loading' | 'error' | 'setData' | 'setLoading' | 'setError' | 'toggleScadenzaSilence' | 'getRapportinoById'> }[] = [
    { name: 'rapportini', stateKey: 'rapportini' },
    { name: 'tecnici', stateKey: 'tecnici' },
    { name: 'clienti', stateKey: 'clienti' },
    { name: 'ditte', stateKey: 'ditte' },
    { name: 'navi', stateKey: 'navi' },
    { name: 'luoghi', stateKey: 'luoghi' },
    { name: 'categorie', stateKey: 'categorie' },
    { name: 'tipi_giornata', stateKey: 'tipiGiornata' },
    { name: 'veicoli', stateKey: 'veicoli' },
    { name: 'checkin_giornalieri', stateKey: 'checkins' },
    { name: 'scadenze', stateKey: 'scadenze' },
];

const toDateSafe = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
    if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    }
    return null;
};

export const DataInitializer = () => {
    const { setData, setLoading, setError } = useRapportiniStore();
    const listenersInitialized = useRef(new Set<string>());

    useEffect(() => {
        if ((window as any).isDataInitializerActive) {
            logger.warn('Istanza di DataInitializer già attiva. Salto per evitare conflitti HMR.');
            return;
        }
        (window as any).isDataInitializerActive = true;

        setLoading(true);
        const unsubscribers: Unsubscribe[] = [];
        const totalListeners = collectionsToSync.length;

        logger.log('DataInitializer: Avvio dei listener Firestore (Standard R.4)...');

        collectionsToSync.forEach(({ name, stateKey }) => {
            try {
                const q = collection(db, name);
                const unsubscribe = onSnapshot(q, 
                    (snapshot) => {
                        let processedData: any[];
                        
                        if (name === 'rapportini') {
                            const validDocs: Rapportino[] = [];
                            let discardedCount = 0;

                            for (const doc of snapshot.docs) {
                                const docData = { id: doc.id, ...doc.data() };

                                const finalDate = toDateSafe(docData.data) || toDateSafe(docData.dataInizio) || toDateSafe(docData.createdAt);

                                if (finalDate) {
                                    const createdAtDate = toDateSafe(docData.createdAt) || finalDate;
                                    const updatedAtDate = toDateSafe(docData.updatedAt) || createdAtDate;
                                    
                                    const cleanData: any = { ...docData };
                                    delete cleanData.dataInizio;
                                    delete cleanData.dettaglioOre; // Pulizia da campi errati

                                    validDocs.push({
                                        ...cleanData,
                                        id: doc.id,
                                        data: finalDate,
                                        createdAt: createdAtDate,
                                        updatedAt: updatedAtDate,
                                        // Assicura che il campo standard sia sempre un array
                                        dettaglioOreTecnici: cleanData.dettaglioOreTecnici || [],
                                    } as Rapportino);
                                } else {
                                    logger.warn(`DataInitializer: Rapportino scartato (ID: ${doc.id}) - nessuna data valida trovata.`);
                                    discardedCount++;
                                }
                            }
                            
                            logger.log(`DataInitializer: Processati ${snapshot.docs.length} rapportini. Validi: ${validDocs.length}, Scartati: ${discardedCount}.`);
                            processedData = validDocs;

                        } else {
                            processedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        }
                        
                        setData({ [stateKey]: processedData } as any);

                        if (!listenersInitialized.current.has(name)) {
                            listenersInitialized.current.add(name);
                            if (listenersInitialized.current.size === totalListeners) {
                                setLoading(false);
                                logger.log('DataInitializer: Tutte le collezioni sono state caricate. Inizializzazione R.4 completata.');
                            }
                        }
                    },
                    (error) => {
                        logger.error(`DataInitializer: Errore caricamento collezione [${name}]:`, error);
                        setError(`Errore caricamento ${name}: ${error.message}`);
                        setLoading(false);
                    }
                );
                unsubscribers.push(unsubscribe);
            } catch (error) {
                logger.error(`DataInitializer: Setup del listener fallito per [${name}]:`, error);
                setError(`Setup fallito per ${name}`);
                setLoading(false);
            }
        });

        return () => {
            logger.log('DataInitializer: Pulizia dei listener Firestore e rilascio del lock.');
            unsubscribers.forEach(unsub => unsub());
            (window as any).isDataInitializerActive = false;
        };
        
    }, [setData, setLoading, setError]);

    return null;
};
