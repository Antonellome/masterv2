
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { Rapportino, Tecnico, Veicolo, Nave, Luogo, TipoGiornata } from '@/models/definitions';

// Helper to resolve ID to name
const getNome = (collection: any[], id: string | undefined): string => {
    if (!id) return 'N/D';
    const item = collection.find(t => t.id === id);
    if (!item) return `ID non trovato`;
    if ('cognome' in item && 'nome' in item) return `${item.cognome} ${item.nome}`.trim();
    if ('targa' in item && 'nome' in item) return `${item.targa} - ${item.nome}`.trim();
    return item.nome;
};

interface Anagrafiche {
    tecnici: Tecnico[];
    veicoli: Veicolo[];
    navi: Nave[];
    luoghi: Luogo[];
    tipiGiornata: TipoGiornata[];
}

export const generateRapportinoPage = (
    pdfDoc: jsPDF,
    rapportinoData: Rapportino,
    anagrafiche: Anagrafiche
) => {
    const { tecnici, veicoli, navi, luoghi, tipiGiornata } = anagrafiche;

    // ### HEADER ###
    pdfDoc.setFontSize(16);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text("Tecnologie Industriali Navali", 105, 15, { align: 'center' });

    pdfDoc.setFontSize(12);
    pdfDoc.setFont('helvetica', 'normal');
    pdfDoc.text("Rapportino di Intervento", 105, 22, { align: 'center' });

    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(20, 27, 190, 27);

    // ### FOOTER ###
    pdfDoc.setFontSize(8);
    pdfDoc.setTextColor(150); // Gray
    pdfDoc.text("R.I.S.O.", 20, 285);
    pdfDoc.text("Master Office", 20, 289);
    pdfDoc.text("Report Individuali Sincronizzati Online", 20, 293);
    pdfDoc.setTextColor(0); // Reset to black

    // ### BODY ### (with y-shift to make space for header)
    const yShift = 15;
    pdfDoc.setFontSize(11);
    const dataRap = dayjs(rapportinoData.data.toDate()).format('DD/MM/YYYY');
    pdfDoc.text(`Data: ${dataRap}`, 20, 30 + yShift);
    pdfDoc.text(`Tipo Giornata: ${getNome(tipiGiornata, rapportinoData.giornataId)}`, 100, 30 + yShift);
    pdfDoc.text(`Tecnico Responsabile: ${getNome(tecnici, rapportinoData.tecnicoId)}`, 20, 40 + yShift);

    pdfDoc.line(20, 45 + yShift, 190, 45 + yShift);
    pdfDoc.setFontSize(14);
    pdfDoc.text("Dettagli Intervento", 20, 55 + yShift);
    pdfDoc.setFontSize(11);
    pdfDoc.text(`Nave: ${getNome(navi, rapportinoData.naveId)}`, 20, 65 + yShift);
    pdfDoc.text(`Luogo: ${getNome(luoghi, rapportinoData.luogoId)}`, 20, 72 + yShift);
    pdfDoc.text(`Veicolo: ${getNome(veicoli, rapportinoData.veicoloId)}`, 20, 79 + yShift);
    pdfDoc.text(`Descrizione Breve: ${rapportinoData.descrizioneBreve || 'Nessuna'}`, 20, 86 + yShift);

    pdfDoc.setFontSize(14);
    pdfDoc.text("Lavoro Eseguito", 20, 100 + yShift);
    pdfDoc.setFontSize(11);
    const lavoroLines = pdfDoc.splitTextToSize(rapportinoData.lavoroEseguito || 'Nessuno', 170);
    pdfDoc.text(lavoroLines, 20, 107 + yShift);

    pdfDoc.setFontSize(14);
    pdfDoc.text("Materiali Impiegati", 20, 150 + yShift);
    pdfDoc.setFontSize(11);
    const materialiLines = pdfDoc.splitTextToSize(rapportinoData.materialiImpiegati || 'Nessuno', 170);
    pdfDoc.text(materialiLines, 20, 157 + yShift);

    pdfDoc.line(20, 200 + yShift, 190, 200 + yShift);
    pdfDoc.setFontSize(14);
    pdfDoc.text("Dettaglio Ore Lavoro", 20, 210 + yShift);
    pdfDoc.setFontSize(11);

    const oreBody = (rapportinoData.dettaglioOreTecnici || []).map(d => [
        getNome(tecnici, d.tecnicoId),
        `${d.ore || 0} ore`
    ]);

    autoTable(pdfDoc, { startY: 215 + yShift, head: [['Tecnico', 'Ore']], body: oreBody, theme: 'grid' });

    const finalY = (pdfDoc as any).lastAutoTable.finalY + 10;
    pdfDoc.setFontSize(12);
    pdfDoc.setFont('helvetica', 'bold');
    pdfDoc.text(`Totale Ore Lavoro: ${rapportinoData.oreLavoro || 0}`, 20, finalY);
};
