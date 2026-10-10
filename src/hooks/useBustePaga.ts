import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { processaMese } from '@/services/BustaPagaService';
import { Dipendente, SaldiContatori, RisultatoGiornoCCNL } from '@/models/definitions';
import { useAnagrafiche } from '@/contexts/AnagraficheContext';
import { Rapportino } from '@/models/rapportino';

// Hook personalizzato per la logica della busta paga
export const useBustePaga = (dipendenteId: string, mese: number, anno: number) => {
  const { dipendenti, rapportini, tipiGiornata } = useAnagrafiche();
  const [risultati, setRisultati] = useState<RisultatoGiornoCCNL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dipendente = useMemo(() => dipendenti.find(d => d.id === dipendenteId), [dipendenti, dipendenteId]);

  const { weekRanges, monthInterval } = useMemo(() => {
    const startOfMonth = dayjs().year(anno).month(mese).startOf('month');
    const endOfMonth = dayjs().year(anno).month(mese).endOf('month');
    
    const firstDay = startOfMonth.startOf('week');
    const lastDay = endOfMonth.endOf('week');

    const monthInterval = { start: startOfMonth.toDate(), end: endOfMonth.toDate() };

    const weekRanges: { start: Date, end: Date }[] = [];
    let currentDay = firstDay;
    while (currentDay.isBefore(lastDay)) {
      const startOfWeek = currentDay.startOf('week').toDate();
      const endOfWeek = currentDay.endOf('week').toDate();
      weekRanges.push({ start: startOfWeek, end: endOfWeek });
      currentDay = currentDay.add(1, 'week');
    }
    
    return { weekRanges, monthInterval: { start: firstDay.toDate(), end: lastDay.toDate()} };

  }, [mese, anno]);


  useEffect(() => {
    if (!dipendente) {
      setError('Dipendente non trovato.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // const saldiIniziali: SaldiContatori = {
      //   dipendenteId: dipendente.id,
      //   anno: anno,
      //   saldoFerieOre: 160,
      //   saldoRolOre: 72,
      //   saldoExFestivitaOre: 16,
      //   saldoBancaOre: 0,
      //   giorniMalattiaAccumulatiAnno: 0,
      //   permesso104ResiduoOre: 72, 
      // };
      const saldiIniziali: SaldiContatori = {
	dipendenteId: "d1",
	anno: 2024,
	saldoFerieOre: 160,
	saldoRolOre: 72,
	saldoExFestivitaOre: 16,
	saldoBancaOre: 10,
	giorniMalattiaAccumulatiAnno: 2,
	permesso104ResiduoOre: 24,
      };


      const tipiGiornataMap = new Map(tipiGiornata.map(tg => [tg.id, tg.nome]));
      
      const risultatiMese = processaMese(
        dipendente,
        rapportini, 
        tipiGiornataMap, 
        saldiIniziali, 
        monthInterval, // Usa l'intervallo che copre le settimane complete
        mese
      );
      
      setRisultati(risultatiMese);

    } catch (err: any) {
      console.error("Errore nel calcolo della busta paga:", err);
      setError(`Errore durante l'elaborazione: ${err.message}`);
    }

    setLoading(false);

  }, [dipendente, rapportini, tipiGiornata, mese, anno, monthInterval]);

  return { risultati, loading, error, weekRanges };
};
