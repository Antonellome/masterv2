import React from 'react';
import { CheckinRecord } from '@/models/definitions';
import dayjs from 'dayjs';

interface PrintableCheckinListProps {
    checkins: CheckinRecord[];
    // La prop 'tecnici' non è più necessaria perché 'tecnicoNome' è garantito nel checkin
}

const formatTipoCheckin = (tipo: string): string => {
  switch (tipo) {
    case 'INIZIO_LAVORO':
      return 'Inizio Lavoro';
    case 'FINE_LAVORO':
      return 'Fine Lavoro';
    default:
      return tipo;
  }
};

export const PrintableCheckinList = React.forwardRef<HTMLDivElement, PrintableCheckinListProps>(({ checkins }, ref) => {
    // I dati sono puliti. La logica può essere diretta e senza controlli.
    return (
        <div ref={ref} style={{ padding: '20px', fontFamily: 'sans-serif', color: 'black' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Elenco Check-in</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Data</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Tecnico</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Tipo Check-in</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Ora Impostata</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Ora Reale</th>
                    </tr>
                </thead>
                <tbody>
                    {checkins.map(checkin => (
                        // L'ID e tutti i campi sono garantiti. Nessun controllo necessario.
                        <tr key={checkin.id}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {dayjs(checkin.data).format('DD/MM/YYYY')}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {checkin.tecnicoNome}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {formatTipoCheckin(checkin.tipoCheckin)}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {checkin.oraImpostata}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {dayjs(checkin.oraReale).format('HH:mm:ss')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
