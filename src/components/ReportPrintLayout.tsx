import React from 'react';
import dayjs from 'dayjs';
import { RisultatoGiornoCCNL } from '@/services/BustaPagaService';
import { SaldiContatori } from '@/models/definitions';

// Stili inline per garantire la resa nel PDF
const styles = {
  page: {
    backgroundColor: 'white',
    color: 'black',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '10px',
    width: '100%',
    boxSizing: 'border-box' as 'border-box',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2px solid #333',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as 'collapse',
    marginBottom: '20px',
  },
  th: {
    border: '1px solid #ccc',
    padding: '4px',
    textAlign: 'left' as 'left',
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold' as 'bold',
  },
  td: {
    border: '1px solid #ccc',
    padding: '4px',
    textAlign: 'center' as 'center',
  },
  thLeft: {
    border: '1px solid #ccc',
    padding: '4px',
    textAlign: 'left' as 'left',
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold' as 'bold',
    minWidth: '180px',
  },
  sectionTitle: {
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold' as 'bold',
    padding: '6px',
    textAlign: 'left' as 'left',
  },
  totalRow: {
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold' as 'bold',
  },
  anomaly: {
    color: 'red',
    fontWeight: 'bold' as 'bold',
  }
};

interface ReportPrintLayoutProps {
  technicianName: string;
  currentDate: dayjs.Dayjs;
  weeks: Date[][];
  processedMonthData: RisultatoGiornoCCNL[];
  sezioni: any[];
  totaliMensili: { [key: string]: number };
  totaleOreLavorate: number;
  totaleOreAssenza: number;
  totaleOreRetribuite: number;
  saldiIniziali: SaldiContatori;
}

export const ReportPrintLayout = React.forwardRef<HTMLDivElement, ReportPrintLayoutProps>((props, ref) => {
  const { 
    technicianName, currentDate, weeks, processedMonthData, sezioni, totaliMensili,
    totaleOreLavorate, totaleOreAssenza, totaleOreRetribuite, saldiIniziali
  } = props;

  const contatori = [
    { label: 'Ferie', id: 'ferie', saldoInizialeKey: 'saldoFerieOre', utilizzatoKey: 'ferieScalate' },
    { label: 'ROL', id: 'rol', saldoInizialeKey: 'saldoRolOre', utilizzatoKey: 'rolScalati' },
    { label: 'Ex Festività', id: 'exfest', saldoInizialeKey: 'saldoExFestivitaOre', utilizzatoKey: 'exFestivitaScalate' },
    { label: 'Permessi L. 104', id: 'l104', saldoInizialeKey: 'permesso104ResiduoOre', utilizzatoKey: 'legge104Scalate' },
  ];

  return (
    <div ref={ref} style={styles.page}>
      <div style={styles.header}>
        <h1>Report Ore - {technicianName}</h1>
        <h2>{currentDate.format('MMMM YYYY')}</h2>
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex}>
          <h3>{`Settimana ${weekIndex + 1}`}</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thLeft}>Tipo Ora</th>
                {week.map(day => (
                  <th key={day.toISOString()} style={styles.th}>
                    {dayjs(day).format('dd D')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sezioni.map(sezione => (
                <React.Fragment key={sezione.titolo}>
                  <tr>
                    <td colSpan={week.length + 1} style={styles.sectionTitle}>{sezione.titolo}</td>
                  </tr>
                  {sezione.colonne.map(({id, label}: {id: string, label: string}) => (
                    <tr key={id}>
                      <td style={{...styles.td, textAlign: 'left'}}>{label}</td>
                      {week.map(day => {
                        const dayStr = dayjs(day).format('YYYY-MM-DD');
                        const dayData = processedMonthData.find(d => d.data === dayStr);
                        const value = dayData ? (dayData as any)[id] as number || 0 : 0;
                        const isAnomaly = id === 'anomaliaDebitoUncovered' && value > 0;
                        return (
                          <td key={dayStr} style={{...styles.td, ...(isAnomaly && styles.anomaly)}}>
                            {value > 0 ? value.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h3>Riepilogo Mensile</h3>
      <table style={{...styles.table, width: '50%'}}>
        <tbody>
            {sezioni.map(sezione => (
                <React.Fragment key={sezione.titolo}>
                    <tr>
                        <td colSpan={2} style={styles.sectionTitle}>{sezione.titolo}</td>
                    </tr>
                    {sezione.colonne.map(({id, label}: {id:string, label:string}) => (
                        <tr key={id}>
                            <td style={{...styles.td, textAlign: 'left'}}>{label}</td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>
                                {(totaliMensili[id] || 0).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </React.Fragment>
            ))}
        </tbody>
        <tfoot>
            <tr style={styles.totalRow}><td style={{...styles.td, textAlign: 'left'}}>Totale Ore Lavorate</td><td style={{...styles.td, textAlign: 'right'}}>{totaleOreLavorate.toFixed(2)}</td></tr>
            <tr style={styles.totalRow}><td style={{...styles.td, textAlign: 'left'}}>Totale Ore Assenza</td><td style={{...styles.td, textAlign: 'right'}}>{totaleOreAssenza.toFixed(2)}</td></tr>
            <tr style={styles.totalRow}><td style={{...styles.td, textAlign: 'left', fontSize: '12px'}}>Totale Ore Retribuite</td><td style={{...styles.td, textAlign: 'right', fontSize: '12px'}}>{totaleOreRetribuite.toFixed(2)}</td></tr>
        </tfoot>
      </table>

      <h3>Saldi Residui</h3>
        <table style={{...styles.table, width: '50%'}}>
            <thead><tr><th style={styles.th}>Contatore</th><th style={styles.th}>Saldo Iniziale</th><th style={styles.th}>Utilizzato</th><th style={styles.th}>Saldo Finale</th></tr></thead>
            <tbody>
            {contatori.map(c => {
                const saldoIniziale = saldiIniziali[c.saldoInizialeKey as keyof SaldiContatori] as number || 0;
                const utilizzato = totaliMensili[c.utilizzatoKey] || 0;
                const saldoFinale = saldoIniziale - utilizzato;
                return (
                    <tr key={c.id}>
                        <td style={{...styles.td, textAlign: 'left'}}>{c.label}</td>
                        <td style={{...styles.td, textAlign: 'right'}}>{saldoIniziale.toFixed(2)}h</td>
                        <td style={{...styles.td, textAlign: 'right'}}>-{utilizzato.toFixed(2)}h</td>
                        <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{saldoFinale.toFixed(2)}h</td>
                    </tr>
                );
            })}
            </tbody>
        </table>

    </div>
  );
});
