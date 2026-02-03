import { Box, Typography, Divider } from '@mui/material';
import type { Tecnico, FormField } from '@/models/definitions';
import { useData } from '@/hooks/useData';
import { safeGetDayjs } from '@/utils/dateUtils';
import logo from '@/assets/react.svg';

interface PrintableTechnicianListProps {
    data: Tecnico[];
    fields: FormField[];
}

const abbreviations: Record<string, string> = {
    'Ditta Appartenenza': 'Ditta',
    'Categoria': 'Cat.',
    'Attivo / Inattivo': 'Stato',
    'Sincronizzazione': 'Sync',
    'Telefono': 'Tel.',
    'Email': 'Email',
    'Data Assunzione': 'Assunto il',
    'Data Licenziamento': 'Licenz. il',
    'Scadenza Contratto': 'Sc. Ctr.',
    'Scadenza Visita Medica': 'Sc. V.M.',
    'Tipo Contratto': 'Contratto',
    'Note / Descrizione': 'Note',
    'Accesso App': 'App',
};

const PrintableTechnicianList = ({ data, fields }: PrintableTechnicianListProps) => {
    const { ditteMap, categorieMap } = useData();

    const getDisplayValue = (field: FormField, value: Tecnico[keyof Tecnico]): string | null => {
        if (value === null || typeof value === 'undefined' || value === '') return null;
        if (field.type === 'switch') return value ? 'Sì' : 'No';
        if (field.type === 'date') {
            const date = safeGetDayjs(value);
            return date ? date.format('DD/MM/YYYY') : null;
        }
        if (field.name === 'dittaId') return ditteMap?.get(value as string)?.nome || null;
        if (field.name === 'categoriaId') return categorieMap?.get(value as string)?.nome || null;
        if (field.type === 'select' && field.options) {
            return field.options.find(opt => opt.value === value)?.label || String(value);
        }
        const stringValue = String(value);
        return stringValue.trim() === '' ? null : stringValue;
    };

    const nameFields = ['nome', 'cognome'];
    const noteField = fields.find(f => f.name === 'note');
    const otherFields = fields.filter(f => !nameFields.includes(f.name) && f.name !== 'note');

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid black', pb: 1, mb: 2 }}>
                <img src={logo} alt="Logo" style={{ width: 40, height: 40, marginRight: 16 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Scheda Tecnico</Typography>
                    <Typography variant="caption">R.I.S.O. Masre Office - Report Individuali Sincronizzati Online</Typography>
                </Box>
            </Box>

            {data.map((tecnico, index) => {
                const fullName = `${tecnico.cognome || ''}, ${tecnico.nome || ''}`.replace(/^,|,$/g, '').trim();
                const noteValue = tecnico.note;

                return (
                    <Box key={tecnico.id} sx={{ pageBreakInside: 'avoid', pt: 1, pb: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ minWidth: '200px', pr: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {fullName}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', rowGap: '4px', columnGap: '16px' }}>
                                {otherFields.map(field => {
                                    const displayValue = getDisplayValue(field, tecnico[field.name as keyof Tecnico]);
                                    const label = abbreviations[field.label] || field.label;
                                    return (
                                        <Box key={`${tecnico.id}-${field.name}`} sx={{ display: 'flex', alignItems: 'baseline' }}>
                                            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold', mr: 0.5 }}>
                                                {label}:
                                            </Typography>
                                            <Typography variant="body2" component="span">
                                                {displayValue !== null ? displayValue : '-'}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {noteField && (
                            <Box sx={{ pl: '216px', mt: 1 }}>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 'bold' }}>
                                    {abbreviations[noteField.label] || noteField.label}:
                                </Typography>
                                {noteValue ? (
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                                        {noteValue.split('\n').map((line, i) => (
                                            line.trim() && <li key={i}>{line.trim()}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Typography variant="body2" component="span">-</Typography>
                                )}
                            </Box>
                        )}

                        {index < data.length - 1 && <Divider sx={{ mt: 2, mb: 1 }} />}
                    </Box>
                );
            })}
        </Box>
    );
};

export default PrintableTechnicianList;
