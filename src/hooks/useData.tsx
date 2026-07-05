import { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
// UPDATED: Imported Ditta and Categoria
import type { Tecnico, Luogo, Nave, Cliente, TipoGiornata, Veicolo, Ditta, Categoria } from '@/models/definitions';

// UPDATED: Added Ditta and Categoria to the interface
interface Anagrafiche {
  tecnici: Tecnico[];
  luoghi: Luogo[];
  navi: Nave[];
  clienti: Cliente[];
  tipiGiornata: TipoGiornata[];
  veicoli: Veicolo[];
  ditte: Ditta[];
  categorie: Categoria[];
}

// UPDATED: Added "ditte" and "categorie" to the collection names array
const COLLECTION_NAMES: (keyof Anagrafiche)[] = ['tecnici', 'luoghi', 'navi', 'clienti', 'tipiGiornata', 'veicoli', 'ditte', 'categorie'];
const CACHE_KEY = 'anagrafiche_cache';
const VERSION_KEY = 'anagrafiche_version';

export const useData = () => {
  const [data, setData] = useState<Partial<Anagrafiche>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Funzione per scaricare tutti i dati delle anagrafiche
    const fetchAllData = async (remoteVersion: string) => {
      console.log("Cache non valida o assente. Caricamento anagrafiche da Firebase...");
      setLoading(true);
      try {
        const allData: Partial<Anagrafiche> = {};
        const promises = COLLECTION_NAMES.map(async (name) => {
          const querySnapshot = await getDocs(collection(db, name));
          allData[name] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any;
        });

        await Promise.all(promises);

        // Salva i nuovi dati e la nuova versione nella cache locale
        localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
        localStorage.setItem(VERSION_KEY, remoteVersion);
        setData(allData);

      } catch (err) {
        console.error("Errore critico durante il caricamento delle anagrafiche:", err);
        setError("Impossibile caricare i dati delle anagrafiche.");
      } finally {
        setLoading(false);
      }
    };

    // Carica i dati iniziali dalla cache se disponibili e validi
    const loadInitialData = () => {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.log("Caricamento anagrafiche iniziali dalla cache locale...");
            setData(JSON.parse(cachedData));
        }
        // Anche se carico dalla cache, passo a setLoading(false) solo dopo il primo check della versione.
    };

    loadInitialData();

    // Mette in ascolto il documento di versione per aggiornamenti in tempo reale
    const versionDocRef = doc(db, 'system', 'anagrafiche');
    const unsubscribe = onSnapshot(versionDocRef, (versionSnapshot) => {
      const remoteVersion = versionSnapshot.exists() ? versionSnapshot.data().version : null;
      const localVersion = localStorage.getItem(VERSION_KEY);

      console.log(`Versione remota: ${remoteVersion}, Versione locale: ${localVersion}`);

      if (remoteVersion && remoteVersion !== localVersion) {
        console.log("Rilevata nuova versione delle anagrafiche. Avvio sincronizzazione...");
        fetchAllData(remoteVersion);
      } else {
        // Se le versioni sono uguali, mi assicuro solo che lo stato di loading sia corretto.
        // Se i dati erano in cache, sono già visibili.
        console.log("Dati anagrafiche già aggiornati.");
        setLoading(false);
      }
    }, (err) => {
        console.error("Errore durante l'ascolto delle versioni:", err);
        setError("Impossibile sincronizzare i dati con il server.");
        setLoading(false);
    });

    // Cleanup: rimuove il listener quando il componente viene smontato
    return () => unsubscribe();
  }, []); // L'array vuoto è corretto: questo effetto deve girare una sola volta per inizializzare il listener

  return {
    tecnici: data.tecnici || [],
    luoghi: data.luoghi || [],
    navi: data.navi || [],
    clienti: data.clienti || [],
    tipiGiornata: data.tipiGiornata || [],
    veicoli: data.veicoli || [],
    // UPDATED: Returning ditte and categorie
    ditte: data.ditte || [],
    categorie: data.categorie || [],
    loading,
    error,
  };
};
