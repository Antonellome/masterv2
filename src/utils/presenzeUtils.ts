
import type { Checkin, TimelineData, LavoroSessione, InterventoSessione } from '@/models/definitions';
import dayjs from 'dayjs';

const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K): Record<K, T[]> => {
    return list.reduce((previous, currentItem) => {
        const group = getKey(currentItem);
        if (!previous[group]) previous[group] = [];
        previous[group].push(currentItem);
        return previous;
    }, {} as Record<K, T[]>);
};

const pairEvents = (eventi: Checkin[], tipoInizio: string, tipoFine: string): { start: Date, end?: Date, startReale: Date, endReale?: Date, [key: string]: any }[] => {
    const sessions = [];
    const stack: Checkin[] = [];
    const sortedEvents = [...eventi].sort((a, b) => new Date(a.timestampImpostato).getTime() - new Date(b.timestampImpostato).getTime());

    for (const evento of sortedEvents) {
        if (evento.tipo === tipoInizio) {
            stack.push(evento);
        } else if (evento.tipo === tipoFine) {
            if (stack.length > 0) {
                const inizio = stack.pop(); // Prende l'ultimo inizio, corretto per LIFO
                if (inizio) {
                    sessions.push({
                        start: inizio.timestampImpostato,
                        end: evento.timestampImpostato,
                        startReale: inizio.timestampReale,
                        endReale: evento.timestampReale,
                        // Aggiungo dati specifici per interventi
                        luogoId: inizio.luogoId,
                        naveId: inizio.naveId,
                    });
                }
            }
        }
    }

    // Gestisce le sessioni lasciate aperte
    stack.forEach(inizio => {
        sessions.push({
            start: inizio.timestampImpostato,
            end: undefined,
            startReale: inizio.timestampReale,
            endReale: undefined,
            luogoId: inizio.luogoId,
            naveId: inizio.naveId,
        });
    });

    return sessions;
};

export const processaPresenze = (eventi: Checkin[]): TimelineData[] => {
    if (!eventi || eventi.length === 0) {
        return [];
    }

    const perTecnico = groupBy(eventi, (e) => e.tecnicoId);
    const risultatoFinale: TimelineData[] = [];

    for (const tecnicoId in perTecnico) {
        const eventiTecnico = perTecnico[tecnicoId];
        const perGiorno = groupBy(eventiTecnico, (e) => dayjs(e.timestampImpostato).format('YYYY-MM-DD'));

        for (const data in perGiorno) {
            const eventiDelGiorno = perGiorno[data];
            if (eventiDelGiorno.length === 0) continue;

            const sessioniLavoro = pairEvents(eventiDelGiorno, 'inizio_giornata', 'fine_giornata') as LavoroSessione[];
            const sessioniIntervento = pairEvents(eventiDelGiorno, 'check_in_luogo', 'check_out_luogo') as InterventoSessione[];

            if (sessioniLavoro.length === 0 && sessioniIntervento.length > 0) {
                // Caso critico: ci sono interventi ma nessun inizio/fine giornata.
                // Creiamo una sessione di lavoro fittizia che copra tutti gli interventi.
                const primoEvento = eventiDelGiorno[0];
                const ultimoEvento = eventiDelGiorno[eventiDelGiorno.length - 1];
                sessioniLavoro.push({
                    start: primoEvento.timestampImpostato,
                    end: ultimoEvento.tipo !== 'check_in_luogo' ? ultimoEvento.timestampImpostato : undefined,
                    startReale: primoEvento.timestampReale,
                    endReale: ultimoEvento.tipo !== 'check_in_luogo' ? ultimoEvento.timestampReale : undefined,
                });
            }

            if (sessioniLavoro.length === 0) continue; // Se ancora non ci sono sessioni, salta

            risultatoFinale.push({
                id: `${tecnicoId}-${data}`,
                tecnicoId: tecnicoId,
                tecnicoName: eventiDelGiorno[0]?.tecnicoName || 'N/D',
                data: data,
                sessioniLavoro: sessioniLavoro.sort((a,b) => a.start.getTime() - b.start.getTime()),
                interventi: sessioniIntervento.sort((a,b) => a.start.getTime() - b.start.getTime()),
            });
        }
    }

    return risultatoFinale.sort((a,b) => dayjs(b.data).valueOf() - dayjs(a.data).valueOf() || a.tecnicoName.localeCompare(b.tecnicoName));
};
