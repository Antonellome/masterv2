
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { Tecnico } from '@/models/definitions';

// Definizione delle interfacce per i dati in ingresso, per chiarezza e type safety
interface PresenzaData {
  data: string;
  tipoGiornata: string;
  nave: string;
  luogo: string;
  dettaglioOrario: string; // Aggiunto campo
  oreOrdinarie: number;
  oreStraordinarie: number;
  totaleOreGiorno: number;
}

interface TotaliData {
  oreOrdinarie: number;
  oreStraordinarie: number;
  totaleGenerale: number;
  perTipoGiornata: { [key: string]: { ore: number; giorni: number } };
}

// Funzione per aggiungere l'header su ogni pagina
const addHeader = (doc: jsPDF, tecnico: Tecnico, mese: dayjs.Dayjs) => {
  doc.setFontSize(18);
  doc.text('Tecnologie Industriali Navali S.R.L.', 14, 20);
  doc.setFontSize(11);
  doc.text('Riepilogo Mensile Interventi', 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Tecnico: ${tecnico.cognome} ${tecnico.nome}`, 14, 40);
  doc.text(`Mese di Riferimento: ${mese.format('MMMM YYYY')}`, 14, 45);
};

// Funzione per aggiungere il footer con la paginazione
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
};

export const generateReportMensilePDF = async (
  presenze: PresenzaData[],
  totali: TotaliData,
  tecnico: Tecnico,
  mese: dayjs.Dayjs
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  // Colonne della tabella aggiornate
  const head = [['Data', 'Tipo Giornata', 'Nave', 'Luogo', 'Orario', 'Ord.', 'Straord.', 'Totale']];
  
  // Righe della tabella aggiornate
  const body = presenze.map(p => [
    p.data,
    p.tipoGiornata,
    p.nave,
    p.luogo,
    p.dettaglioOrario,
    p.oreOrdinarie.toString(),
    p.oreStraordinarie.toString(),
    p.totaleOreGiorno.toString(),
  ]);

  autoTable(doc, {
    head: head,
    body: body,
    startY: 50,
    didDrawPage: (data) => {
      addHeader(doc, tecnico, mese);
    },
    styles: {
        fontSize: 8,
        cellPadding: 2,
    },
    headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontStyle: 'bold',
    },
    alternateRowStyles: {
        fillColor: [245, 245, 245],
    },
    columnStyles: { // Stili per colonne specifiche
        4: { cellWidth: 35 }, // Orario
        5: { cellWidth: 15 }, // Ord.
        6: { cellWidth: 18 }, // Straord.
        7: { cellWidth: 16 }, // Totale
    }
  });

  // Aggiunge il riepilogo dei totali alla fine della tabella
  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(10);
  doc.text('Riepilogo Totale Mensile', 14, finalY + 15);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text(`- Ore Ordinarie Totali: ${totali.oreOrdinarie}`, 16, finalY + 22);
  doc.text(`- Ore Straordinarie Totali: ${totali.oreStraordinarie}`, 16, finalY + 27);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`- TOTALE GENERALE: ${totali.totaleGenerale} ore`, 16, finalY + 34);

  // Aggiunge la paginazione
  addFooter(doc);

  return doc.output('blob');
};
