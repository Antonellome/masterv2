
import { Typography, Box, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import type { Nave, Luogo, TimelineData, LavoroSessione, InterventoSessione } from '@/models/definitions';

const getNomeLuogo = (navi: Nave[], luoghi: Luogo[], naveId?: string, luogoId?: string) => {
    if (naveId) return navi.find(n => n.id === naveId)?.nome || 'Nave non trovata';
    if (luogoId) return luoghi.find(l => l.id === luogoId)?.nome || 'Luogo non trovato';
    return 'Luogo non specificato';
}

const TooltipContent = ({ session, navi, luoghi }: { session: any, navi: Nave[], luoghi: Luogo[] }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {session.luogoId || session.naveId ? getNomeLuogo(navi, luoghi, session.naveId, session.luogoId) : "Sessione di Lavoro"}
        </Typography>
        <Typography variant="caption">
            Impostato: {dayjs(session.start).format('HH:mm')} - {session.end ? dayjs(session.end).format('HH:mm') : 'in corso'}
        </Typography>
        {session.startReale && (
            <Typography variant="caption">
                Reale: {dayjs(session.startReale).format('HH:mm')} - {session.endReale ? dayjs(session.endReale).format('HH:mm') : 'in corso'}
            </Typography>
        )}
    </Box>
);

export const TimelineBar = ({ data, navi, luoghi }: { data: TimelineData, navi: Nave[], luoghi: Luogo[] }) => {
    const { sessioniLavoro, interventi } = data;
    if (sessioniLavoro.length === 0) return <Typography variant="caption" color="text.secondary">Nessuna sessione di lavoro registrata.</Typography>;

    const primoInizio = dayjs(sessioniLavoro[0].start);
    const ultimaFine = sessioniLavoro.reduce((max, s) => s.end && dayjs(s.end).isAfter(max) ? dayjs(s.end) : max, dayjs(sessioniLavoro[0].start));
    const fineTimeline = sessioniLavoro.some(s => !s.end) ? dayjs() : ultimaFine;
    const durataTotaleMinuti = fineTimeline.diff(primoInizio, 'minute');

    if (durataTotaleMinuti < 0) return null;

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
            {sessioniLavoro.map((sessione, index) => {
                 const inizioSessione = dayjs(sessione.start);
                 const fineSessione = sessione.end ? dayjs(sessione.end) : fineTimeline;
                 const offset = inizioSessione.diff(primoInizio, 'minute');
                 const durata = fineSessione.diff(inizioSessione, 'minute');
                 
                 return (
                    <Tooltip title={<TooltipContent session={sessione} navi={navi} luoghi={luoghi}/>} key={`lavoro-${index}`} arrow>
                        <Box sx={{
                            position: 'absolute',
                            left: `${(offset / durataTotaleMinuti) * 100}%`,
                            width: `${(durata / durataTotaleMinuti) * 100}%`,
                            height: '100%',
                            backgroundColor: 'grey.300',
                            cursor: 'pointer',
                        }} />
                    </Tooltip>
                 );
            })}
            {interventi.map((intervento, index) => {
                const inizioIntervento = dayjs(intervento.start);
                const fineIntervento = intervento.end ? dayjs(intervento.end) : fineTimeline;
                const offset = inizioIntervento.diff(primoInizio, 'minute');
                const durata = fineIntervento.diff(inizioIntervento, 'minute');

                return (
                    <Tooltip title={<TooltipContent session={intervento} navi={navi} luoghi={luoghi} />} key={`intervento-${index}`} arrow>
                        <Box sx={{
                            position: 'absolute',
                            left: `${(offset / durataTotaleMinuti) * 100}%`,
                            width: `${(durata / durataTotaleMinuti) * 100}%`,
                            height: '100%',
                            backgroundColor: !intervento.end ? 'secondary.main' : 'primary.main',
                            opacity: !intervento.end ? 0.7 : 1,
                            border: '1px solid', 
                            borderColor: 'common.white',
                            cursor: 'pointer',
                        }} />
                    </Tooltip>
                );
            })}
        </Box>
    );
};

export const OrariList = ({ sessioni }: { sessioni: LavoroSessione[] }) => (
    <Box>
        {sessioni.map((s, i) => (
            <Typography key={i} variant="caption" color="text.secondary" component="div">
                <Box component="span" fontWeight="bold">Sess. {i+1}:</Box> {dayjs(s.start).format('HH:mm')} - {s.end ? dayjs(s.end).format('HH:mm') : '...'}
            </Typography>
        ))}
    </Box>
);
