import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Luogo, Nave, Cliente, TipoGiornata, Veicolo } from '@/models/definitions';

// Definiamo un tipo per mappare i nomi delle collezioni ai loro tipi di dati
interface Anagrafiche {
  tecnici: Tecnico[];
  luoghi: Luogo[];
  navi: Nave[];
  clienti: Cliente[];
  tipiGiornata: TipoGiornata[];
  veicoli: Veicolo[];
}

const COLLECTION_NAMES: (keyof Anagrafiche)[] = ['tecnici', 'luoghi', 'navi', 'clienti', 'tipiGiornata', 'veicoli'];
const CACHE_KEY = 'anagrafiche_cache';
const VERSION_KEY = 'anagrafiche_version';

export const useData = () => {
  const [data, setData] = useState<Partial<Anagrafiche>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Leggo la versione remota dal documento di sistema
        const versionDocRef = doc(db, 'system', 'anagrafiche');
        const versionSnapshot = await getDoc(versionDocRef);
        const remoteVersion = versionSnapshot.exists() ? versionSnapshot.data().version : null;

        // 2. Leggo la versione locale e i dati dalla cache del browser
        const localVersion = localStorage.getItem(VERSION_KEY);
        const cachedData = localStorage.getItem(CACHE_KEY);

        // 3. Confronto le versioni. Se sono uguali e la cache esiste, uso i dati locali.
        if (remoteVersion && remoteVersion === localVersion && cachedData) {
          console.log("Caricamento anagrafiche dalla cache locale...");
          setData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        // 4. Se le versioni non coincidono o non c'è cache, scarico tutto da Firebase
        console.log("Cache non valida o assente. Caricamento anagrafiche da Firebase...");
        
        const allData: Partial<Anagrafiche> = {};

        const promises = COLLECTION_NAMES.map(async (name) => {
          const querySnapshot = await getDocs(collection(db, name));
          allData[name] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any;
        });

        await Promise.all(promises);

        // 5. Salvo i nuovi dati e la nuova versione nella cache locale
        localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
        if (remoteVersion) {
            localStorage.setItem(VERSION_KEY, remoteVersion);
        }

        setData(allData);

      } catch (err) {
        console.error("Errore critico durante il caricamento delle anagrafiche:", err);
        setError("Impossibile caricare i dati delle anagrafiche. L'applicazione non può funzionare correttamente.");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  return {
    tecnici: data.tecnici || [],
    luoghi: data.luoghi || [],
    navi: data.navi || [],
    clienti: data.clienti || [],
    tipiGiornata: data.tipiGiornata || [],
    veicoli: data.veicoli || [],
    loading,
    error
  };
};
