
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Checkin, Tecnico, Nave, Luogo } from '@/models/definitions';

dayjs.extend(isBetween);

// --- TIPI DI DATO PER LE RIGHE DELLE TABELLE ---

// Singolo evento con orario impostato e reale
interface OrarioEntry {
    impostato: Date | null;
    reale: Date | null;
}

// Riga per la tabella "Orario di Lavoro"
export interface OrarioLavoroRow {
    id: string; // data + tecnicoId
    data: string;
    tecnicoName: string;
    ingresso: OrarioEntry;
    uscita: OrarioEntry;
}

// Riga per la tabella "Interventi"
export interface InterventoRow {
    id: string; // id del check-in o check-out
    data: string;
    tecnicoName: string;
    luogoNave: string;
    ingresso: OrarioEntry;
    uscita: OrarioEntry;
}

// Oggetto restituito dalla funzione principale
export interface ProcessedPresenze {
    orariLavoro: OrarioLavoroRow[];
    interventi: InterventoRow[];
}

// --- FUNZIONE DI ELABORAZIONE PRINCIPALE ---

export function processaPresenze(checkins: Checkin[], navi: Nave[], luoghi: Luogo[], filtri: {
    dataInizio: dayjs.Dayjs | null,
    dataFine: dayjs.Dayjs | null,
    tecnico: Tecnico | null,
    nave: Nave | null,
    luogo: Luogo | null,
}): ProcessedPresenze {
    
    if (!checkins) return { orariLavoro: [], interventi: [] };

    // Creazione di mappe per un accesso rapido ai nomi di navi e luoghi
    const luoghiMap = new Map(luoghi.map(l => [l.id, l.nome]));
    const naviMap = new Map(navi.map(n => [n.id, n.nome]));

    // Funzione helper per convertire stringhe di timestamp in oggetti Date
    // Restituisce null se il timestamp non è valido per evitare crash
    const toDate = (ts: string | null | undefined): Date | null => {
        if (!ts || !dayjs(ts).isValid()) {
            return null;
        }
        return dayjs(ts).toDate();
    };

    // Filtra gli eventi in base ai filtri applicati nell'interfaccia utente
    const eventiFiltrati = checkins.filter(c => {
        const checkinDate = dayjs(c.data);

        // Controlla se l'evento rientra nell'intervallo di date selezionato
        const isInDateRange = filtri.dataInizio && filtri.dataFine ? 
            checkinDate.isBetween(filtri.dataInizio.startOf('day'), filtri.dataFine.endOf('day'), 'day', '[]') :
            true; // Se non c'è un filtro di data, non filtrare
        
        // Controlla la corrispondenza con il tecnico, la nave o il luogo selezionati
        const tecnicoMatch = !filtri.tecnico || c.tecnicoId === filtri.tecnico.id;
        const naveMatch = !filtri.nave || c.naveId === filtri.nave.id;
        const luogoMatch = !filtri.luogo || c.luogoId === filtri.luogo.id;

        return isInDateRange && tecnicoMatch && naveMatch && luogoMatch;
    });

    // Map per raggruppare gli eventi di inizio/fine giornata
    const orariLavoroMap = new Map<string, Partial<OrarioLavoroRow>>();
    // Map per raggruppare gli interventi su luoghi/navi
    const interventiMap = new Map<string, Partial<InterventoRow>>();

    for (const evento of eventiFiltrati) {
        const dataKey = evento.data; // Usa il campo 'data' come chiave
        
        // Gestisce gli eventi di inizio e fine giornata lavorativa
        if (evento.tipo === 'inizio_giornata' || evento.tipo === 'fine_giornata') {
            const key = `${dataKey}_${evento.tecnicoId}`;
            if (!orariLavoroMap.has(key)) {
                orariLavoroMap.set(key, {
                    id: key,
                    data: dayjs(evento.data).format('DD/MM/YYYY'),
                    tecnicoName: evento.tecnicoName,
                    ingresso: { impostato: null, reale: null },
                    uscita: { impostato: null, reale: null },
                });
            }
            const riga = orariLavoroMap.get(key)!;

            if (evento.tipo === 'inizio_giornata') {
                riga.ingresso!.impostato = toDate(evento.timestampImpostato);
                riga.ingresso!.reale = toDate(evento.timestampReale);
            } else { // fine_giornata
                riga.uscita!.impostato = toDate(evento.timestampImpostato);
                riga.uscita!.reale = toDate(evento.timestampReale);
            }
        }

        // Gestisce gli eventi di check-in e check-out da luoghi o navi
        if (evento.tipo === 'check_in_luogo' || evento.tipo === 'check_out_luogo') {
            const luogoId = evento.naveId || evento.luogoId;
            if (!luogoId) continue; // Salta se non c'è un luogo/nave associato

            const key = `${dataKey}_${evento.tecnicoId}_${luogoId}`;
             if (!interventiMap.has(key)) {
                interventiMap.set(key, {
                    id: evento.id, 
                    data: dayjs(evento.data).format('DD/MM/YYYY'),
                    tecnicoName: evento.tecnicoName,
                    luogoNave: evento.naveId ? naviMap.get(evento.naveId) : luoghiMap.get(luogoId),
                    ingresso: { impostato: null, reale: null },
                    uscita: { impostato: null, reale: null },
                });
            }
            const riga = interventiMap.get(key)!;

            if (evento.tipo === 'check_in_luogo') {
                riga.ingresso!.impostato = toDate(evento.timestampImpostato);
                riga.ingresso!.reale = toDate(evento.timestampReale);
            } else { // check_out_luogo
                riga.uscita!.impostato = toDate(evento.timestampImpostato);
                riga.uscita!.reale = toDate(evento.timestampReale);
            }
        }
    }

    // Converte le mappe in array per la visualizzazione
    return {
        orariLavoro: Array.from(orariLavoroMap.values()) as OrarioLavoroRow[],
        interventi: Array.from(interventiMap.values()) as InterventoRow[],
    };
}
