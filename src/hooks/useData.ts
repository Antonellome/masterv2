
import { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Cliente, Tecnico, TipoGiornata, Nave, Luogo, Veicolo, Categoria, Impostazioni } from '@/models/definitions';

export interface DataBundle {
  clienti: Cliente[];
  tecnici: Tecnico[];
  tipiGiornata: TipoGiornata[];
  navi: Nave[];
  luoghi: Luogo[];
  veicoli: Veicolo[];
  categorie: Categoria[]; 
  impostazioni: Impostazioni | null;
  loading: boolean;
  error: string | null;
}

const collectionsToLoad: { key: keyof Omit<DataBundle, 'loading' | 'error'>; name: string, isSingleDoc?: boolean }[] = [
  { key: 'clienti', name: 'clienti' },
  { key: 'tecnici', name: 'tecnici' },
  { key: 'tipiGiornata', name: 'tipiGiornata' },
  { key: 'navi', name: 'navi' },
  { key: 'luoghi', name: 'luoghi' },
  { key: 'veicoli', name: 'veicoli' },
  { key: 'categorie', name: 'categorie' },
  { key: 'impostazioni', name: 'impostazioni', isSingleDoc: true },
];

export const useData = (): DataBundle => {
  const [data, setData] = useState<Omit<DataBundle, 'loading' | 'error'>>({
    clienti: [],
    tecnici: [],
    tipiGiornata: [],
    navi: [],
    luoghi: [],
    veicoli: [],
    categorie: [],
    impostazioni: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
        try {
            const allData: Partial<Omit<DataBundle, 'loading' | 'error'>> = {};
            const promises = collectionsToLoad.map(async ({ key, name, isSingleDoc }) => {
                const collRef = collection(db, name);
                const snapshot = await getDocs(collRef);

                if (isSingleDoc) {
                    if (!snapshot.empty) {
                        allData[key] = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
                    } else {
                        allData[key] = null;
                    }
                } else {
                    allData[key] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;
                }
            });

            await Promise.all(promises);
            setData(allData as Omit<DataBundle, 'loading' | 'error'>);
        } catch (err) {
            console.error("Errore durante il caricamento dei dati: ", err);
            setError("Impossibile caricare i dati anagrafici necessari.");
        } finally {
            setLoading(false);
        }
    };

    loadAllData();

  }, []);

  return { ...data, loading, error };
};
