
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Checkin, Tecnico, Nave, Luogo } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';

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

    const luoghiMap = new Map(luoghi.map(l => [l.id, l.nome]));
    const naviMap = new Map(navi.map(n => [n.id, n.nome]));

    // 1. FILTRAGGIO INIZIALE
    const eventiFiltrati = checkins.filter(c => {
        // Converte il timestamp in oggetto Dayjs solo una volta
        const checkinDate = dayjs(c.timestampReale.toDate());

        // Controllo intervallo date
        const isInDateRange = filtri.dataInizio && filtri.dataFine ? 
            checkinDate.isBetween(filtri.dataInizio.startOf('day'), filtri.dataFine.endOf('day'), null, '[]') :
            true;
        
        const tecnicoMatch = !filtri.tecnico || c.tecnicoId === filtri.tecnico.id;
        const naveMatch = !filtri.nave || c.naveId === filtri.nave.id;
        const luogoMatch = !filtri.luogo || c.luogoId === filtri.luogo.id;

        return isInDateRange && tecnicoMatch && naveMatch && luogoMatch;
    });

    // 2. RAGGRUPPAMENTO EVENTI

    const orariLavoroMap = new Map<string, Partial<OrarioLavoroRow>>();
    const interventiMap = new Map<string, Partial<InterventoRow>>();

    for (const evento of eventiFiltrati) {
        const dataKey = dayjs(evento.timestampReale.toDate()).format('YYYY-MM-DD');
        const toDate = (ts: Timestamp) => ts.toDate();

        // --- Logica per Orario di Lavoro ---
        if (evento.tipo === 'inizio_giornata' || evento.tipo === 'fine_giornata') {
            const key = `${dataKey}_${evento.tecnicoId}`;
            if (!orariLavoroMap.has(key)) {
                orariLavoroMap.set(key, {
                    id: key,
                    data: dayjs(evento.timestampReale.toDate()).format('DD/MM/YYYY'),
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

        // --- Logica per Interventi ---
        if (evento.tipo === 'check_in_luogo' || evento.tipo === 'check_out_luogo') {
            const luogoId = evento.naveId || evento.luogoId;
            if (!luogoId) continue;

            const key = `${dataKey}_${evento.tecnicoId}_${luogoId}`;
             if (!interventiMap.has(key)) {
                interventiMap.set(key, {
                    id: evento.id, // Usiamo l'id dell'evento per l'univocita' della riga
                    data: dayjs(evento.timestampReale.toDate()).format('DD/MM/YYYY'),
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

    return {
        orariLavoro: Array.from(orariLavoroMap.values()) as OrarioLavoroRow[],
        interventi: Array.from(interventiMap.values()) as InterventoRow[],
    };
}
