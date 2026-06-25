
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EnrichedRapportino, RiepilogoMese, Tecnico, MasterData } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const generateMonthlyReportPDF = async (
    rapportini: EnrichedRapportino[],
    riepilogo: RiepilogoMese,
    tecnico: Tecnico,
    month: Date,
    masterData: MasterData
): Promise<Blob> => {
    const doc = new jsPDF();

    // Intestazione
    doc.setFontSize(15);
    doc.text(`Report Mensile per ${tecnico.cognome} ${tecnico.nome}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    const monthName = format(month, 'MMMM yyyy', { locale: it });
    doc.text(`Mese di: ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, 14, 26);

    // Tabella Riepilogo
    const summaryData = [
        ['Ore Ordinarie', riepilogo.oreOrdinarie],
        ['Ore Straordinarie', riepilogo.oreStraordinarie],
        [{ content: 'Ore Totali Lavorate', styles: { fontStyle: 'bold'} }, { content: riepilogo.oreTotali, styles: { fontStyle: 'bold'} }],
        ['Giorni Lavorati', riepilogo.giorniTotaliLavorati],
        ['Giorni di Trasferta', riepilogo.giorniTrasferta],
    ];

    autoTable(doc, {
        startY: 32,
        head: [[{content: 'Riepilogo Ore e Presenze', colSpan: 2, styles: { halign: 'center'}}]],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 160, 133], fontSize: 10 },
    });
    
    const tableStartY = (doc as any).lastAutoTable.finalY + 8;

    // Tabella Dettaglio Rapportini
    const tableColumn = ["Data", "Cliente", "Nave", "Luogo", "Tipo Giornata", "Ord.", "Stra.", "Trasf."];
    const tableRows: (string | number)[][] = [];

    // Crea una copia per l'ordinamento per non mutare l'array originale
    [...rapportini].sort((a,b) => a.data.getTime() - b.data.getTime()).forEach(item => {
        const nave = masterData.navi.find(n => n.id === item.naveId);
        const cliente = nave ? masterData.clienti.find(c => c.id === nave.clienteId) : undefined;

        const rowData = [
            item.dataFormatted,
            cliente?.nome || '-',
            nave?.nome || '-',
            masterData.luoghi.find(l => l.id === item.luogoId)?.nome || '-',
            item.tipoGiornata?.nome || 'N/D',
            item.oreOrdinarie,
            item.oreStraordinarie,
            item.trasfertaId ? 'Sì' : 'No'
        ];
        tableRows.push(rowData);
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 16 }, // Data
            1: { cellWidth: 'auto' }, // Cliente
            2: { cellWidth: 'auto' }, // Nave
            3: { cellWidth: 'auto' }, // Luogo
            4: { cellWidth: 28 }, // Tipo Giornata
            5: { cellWidth: 10, halign: 'right' }, // Ore Ord
            6: { cellWidth: 10, halign: 'right' }, // Ore Straord
            7: { cellWidth: 12, halign: 'center' }, // Trasferta
        }
    });

    return doc.output('blob');
};
