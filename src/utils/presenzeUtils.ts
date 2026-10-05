
import { Checkin, OrarioLavoro, Intervento } from '@/models/definitions';
import dayjs from 'dayjs';

// --- HELPERS ---

const toDate = (value: string | number | Date | null | undefined): Date | null => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) return value;
    const date = dayjs(value);
    return date.isValid() ? date.toDate() : null;
};

const groupBy = <T>(array: T[], key: (item: T) => string): Record<string, T[]> => {
    return array.reduce((result, item) => {
        const keyValue = key(item);
        (result[keyValue] = result[keyValue] || []).push(item);
        return result;
    }, {} as Record<string, T[]>);
};

const pairEventsWithStack = (eventi: Checkin[], tipoInizio: string, tipoFine: string): [Checkin | null, Checkin | null][] => {
    const stack: Checkin[] = [];
    const pairs: [Checkin | null, Checkin | null][] = [];

    const eventiOrdinati = [...eventi].sort((a, b) => new Date(a.timestampReale!).getTime() - new Date(b.timestampReale!).getTime());

    for (const evento of eventiOrdinati) {
        if (evento.tipo === tipoInizio) {
            stack.push(evento);
        } else if (evento.tipo === tipoFine) {
            if (stack.length > 0) {
                const inizio = stack.pop();
                pairs.push([inizio, evento]);
            } else {
                pairs.push([null, evento]);
            }
        }
    }

    stack.forEach(inizio => pairs.push([inizio, null]));
    return pairs;
};


export const processaPresenze = (eventi: Checkin[]): { orariLavoro: OrarioLavoro[], interventi: Intervento[] } => {
    if (!eventi || eventi.length === 0) {
        return { orariLavoro: [], interventi: [] };
    }

    const eventiSanificati = eventi.map(e => {
        let dataValida = e.data;
        if (!dayjs(dataValida, 'YYYY-MM-DD', true).isValid()) {
            dataValida = e.timestampReale ? dayjs(e.timestampReale).format('YYYY-MM-DD') : 'invalid';
        }
        return { ...e, data: dataValida };
    }).filter(e => e.data !== 'invalid' && e.tecnicoId && e.timestampReale);

    const allOrariLavoro: OrarioLavoro[] = [];
    const allInterventi: Intervento[] = [];

    const gruppiPerTecnico = groupBy(eventiSanificati, item => item.tecnicoId);

    for (const tecnicoId in gruppiPerTecnico) {
        const eventiTecnico = gruppiPerTecnico[tecnicoId];
        const gruppiPerGiorno = groupBy(eventiTecnico, item => item.data);

        for (const data in gruppiPerGiorno) {
            const eventiDelGiorno = gruppiPerGiorno[data];

            const eventiLavoro = eventiDelGiorno.filter(e => e.tipo === 'inizio_giornata' || e.tipo === 'fine_giornata');
            const coppieLavoro = pairEventsWithStack(eventiLavoro, 'inizio_giornata', 'fine_giornata');

            coppieLavoro.forEach(([inizio, fine]) => {
                allOrariLavoro.push({
                    id: `lavoro_${inizio?.id || 'orphanIn'}_${fine?.id || 'orphanOut'}`,
                    tecnicoId: inizio?.tecnicoId || fine!.tecnicoId,
                    tecnicoName: inizio?.tecnicoName || fine!.tecnicoName,
                    data: inizio?.data || fine!.data,
                    ingresso: { impostato: toDate(inizio?.timestampImpostato), reale: toDate(inizio?.timestampReale) },
                    uscita: { impostato: toDate(fine?.timestampImpostato), reale: toDate(fine?.timestampReale) },
                });
            });

            const eventiIntervento = eventiDelGiorno.filter(e => e.tipo === 'check_in_luogo' || e.tipo === 'check_out_luogo');
            const coppieIntervento = pairEventsWithStack(eventiIntervento, 'check_in_luogo', 'check_out_luogo');

            coppieIntervento.forEach(([inizio, fine]) => {
                allInterventi.push({
                     id: `intervento_${inizio?.id || 'orphanIn'}_${fine?.id || 'orphanOut'}`,
                    tecnicoId: inizio?.tecnicoId || fine!.tecnicoId,
                    tecnicoName: inizio?.tecnicoName || fine!.tecnicoName,
                    data: inizio?.data || fine!.data,
                    naveId: inizio?.naveId || fine?.naveId,
                    luogoId: inizio?.luogoId || fine?.luogoId,
                    ingresso: { impostato: toDate(inizio?.timestampImpostato), reale: toDate(inizio?.timestampReale) },
                    uscita: { impostato: toDate(fine?.timestampImpostato), reale: toDate(fine?.timestampReale) },
                });
            });
        }
    }

    const sortFn = (a: OrarioLavoro | Intervento, b: OrarioLavoro | Intervento) => {
        const dateA = dayjs(a.data);
        const dateB = dayjs(b.data);
        if (dateA.isBefore(dateB)) return -1;
        if (dateA.isAfter(dateB)) return 1;
        const timeA = a.ingresso.reale || a.uscita.reale;
        const timeB = b.ingresso.reale || b.uscita.reale;
        if (timeA && timeB) return timeA.getTime() - timeB.getTime();
        return 0;
    };

    return {
        orariLavoro: allOrariLavoro.sort(sortFn),
        interventi: allInterventi.sort(sortFn)
    };
};
