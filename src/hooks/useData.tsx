import { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico, Luogo, Nave, Cliente, TipoGiornata, Veicolo, Ditta, Categoria } from '@/models/definitions';

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

const COLLECTION_NAMES: (keyof Anagrafiche)[] = ['tecnici', 'luoghi', 'navi', 'clienti', 'tipiGiornata', 'veicoli', 'ditte', 'categorie'];
const CACHE_KEY = 'anagrafiche_cache';
const VERSION_KEY = 'anagrafiche_version';

export const useData = () => {
  const [data, setData] = useState<Partial<Anagrafiche>>({
    tecnici: [],
    luoghi: [],
    navi: [],
    clienti: [],
    tipiGiornata: [],
    veicoli: [],
    ditte: [],
    categorie: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    const loadInitialData = () => {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            console.log("Caricamento anagrafiche iniziali dalla cache locale...");
            setData(JSON.parse(cachedData));
        }
    };

    loadInitialData();

    const versionDocRef = doc(db, 'system', 'anagrafiche');
    const unsubscribe = onSnapshot(versionDocRef, (versionSnapshot) => {
      const remoteVersion = versionSnapshot.exists() ? versionSnapshot.data().version : null;
      const localVersion = localStorage.getItem(VERSION_KEY);

      console.log(`Versione remota: ${remoteVersion}, Versione locale: ${localVersion}`);

      if (remoteVersion && remoteVersion !== localVersion) {
        console.log("Rilevata nuova versione delle anagrafiche. Avvio sincronizzazione...");
        fetchAllData(remoteVersion);
      } else {
        console.log("Dati anagrafiche già aggiornati.");
        setLoading(false);
      }
    }, (err) => {
        console.error("Errore during l'ascolto delle versioni:", err);
        setError("Impossibile sincronizzare i dati con il server.");
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    tecnici: data.tecnici || [],
    luoghi: data.luoghi || [],
    navi: data.navi || [],
    clienti: data.clienti || [],
    tipiGiornata: data.tipiGiornata || [],
    veicoli: data.veicoli || [],
    ditte: data.ditte || [],
    categorie: data.categorie || [],
    loading,
    error,
  };
};
