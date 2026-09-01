
import { useMemo } from 'react';
import { db } from '../db/db'; // Importiamo il nostro database Dexie
import { useCollectionData } from './useCollectionData';
import type { Tecnico, Nave, Luogo, Categoria, Cliente, Ditta, TipoGiornata, Qualifica, Veicolo } from '../models/definitions';

/**
 * Hook per recuperare TUTTE le anagrafiche di base dal database locale (Dexie).
 * Questo hook centralizza il caricamento dei dati anagrafici per coerenza.
 */
export const useAnagrafiche = () => {
  // CORREZIONE: Passiamo il NOME della tabella (stringa) invece dell'oggetto tabella.
  const { data: tecnici, loading: lTecnici, error: eTecnici } = useCollectionData<Tecnico>('tecnici');
  const { data: navi, loading: lNavi, error: eNavi } = useCollectionData<Nave>('navi');
  const { data: luoghi, loading: lLuoghi, error: eLuoghi } = useCollectionData<Luogo>('luoghi');
  const { data: categorie, loading: lCategorie, error: eCategorie } = useCollectionData<Categoria>('categorie');
  const { data: clienti, loading: lClienti, error: eClienti } = useCollectionData<Cliente>('clienti');
  const { data: ditte, loading: lDitte, error: eDitte } = useCollectionData<Ditta>('ditte');
  const { data: tipiGiornata, loading: lTipiGiornata, error: eTipiGiornata } = useCollectionData<TipoGiornata>('tipiGiornata');
  const { data: qualifiche, loading: lQualifiche, error: eQualifiche } = useCollectionData<Qualifica>('qualifiche');
  const { data: veicoli, loading: lVeicoli, error: eVeicoli } = useCollectionData<Veicolo>('veicoli');

  const loading = lTecnici || lNavi || lLuoghi || lCategorie || lClienti || lDitte || lTipiGiornata || lQualifiche || lVeicoli;
  const error = eTecnici || eNavi || eLuoghi || eCategorie || eClienti || eDitte || eTipiGiornata || eQualifiche || eVeicoli;

  const anagrafiche = useMemo(() => ({
    tecnici: tecnici || [],
    navi: navi || [],
    luoghi: luoghi || [],
    categorie: categorie || [],
    clienti: clienti || [],
    ditte: ditte || [],
    tipiGiornata: tipiGiornata || [],
    qualifiche: qualifiche || [],
    veicoli: veicoli || [],
  }), [tecnici, navi, luoghi, categorie, clienti, ditte, tipiGiornata, qualifiche, veicoli]);

  return { ...anagrafiche, loading, error };
};
