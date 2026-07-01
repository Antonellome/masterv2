import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useCollectionData } from './useCollectionData'; // Corretto: usa il nuovo hook
import type { Tecnico, Nave, Luogo } from '../models/definitions';

export const useAnagrafiche = () => {
  const tecniciQuery = useMemo(() => collection(db, 'tecnici'), []);
  const naviQuery = useMemo(() => collection(db, 'navi'), []);
  const luoghiQuery = useMemo(() => collection(db, 'luoghi'), []);

  const { data: tecnici, loading: lTecnici, error: eTecnici } = useCollectionData<Tecnico>(tecniciQuery);
  const { data: navi, loading: lNavi, error: eNavi } = useCollectionData<Nave>(naviQuery);
  const { data: luoghi, loading: lLuoghi, error: eLuoghi } = useCollectionData<Luogo>(luoghiQuery);

  const loading = lTecnici || lNavi || lLuoghi;
  const error = eTecnici || eNavi || eLuoghi;

  const anagrafiche = useMemo(() => ({
    tecnici,
    navi,
    luoghi
  }), [tecnici, navi, luoghi]);

  return { ...anagrafiche, loading, error };
};
