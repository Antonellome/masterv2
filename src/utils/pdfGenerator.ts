import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import type { Rapportino, DettaglioOreTecnico, Tecnico } from '@/models/definitions';

// --- HELPERS ---
const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
    if (!text) return y;
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
};

// --- LOGICA DI FORMATTAZIONE ORARI: CORRETTA E DEFINITIVA ---
const formatOrario = (d: DettaglioOreTecnico): string => {
    if (!d.isManual && d.oraInizio && d.oraFine) {
        let result = `Inizio: ${d.oraInizio}, Fine: ${d.oraFine}`;
        if (typeof d.pausa === 'number' && d.pausa > 0) {
            result += `, Pausa: ${d.pausa} min`;
        }
        return result;
    }
    const ore = (d.ore || 0).toFixed(2).replace('.', ',');
    return `${ore} ore`;
};


// --- GENERATORE PDF PRINCIPALE ---
export const generateRapportinoPdf = (rapportino: Rapportino, tecniciMap: Map<string, Tecnico>): Blob => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 15;
    const blueColor = '#003366';

    // 1. INTESTAZIONE (CORRETTA COME DA IMMAGINE)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(blueColor);
    doc.text('Tecnologie Industriali Navali S.R.L.', pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#000000');
    const companyDetails =
        `Sede Legale: Via Guicciardini, 52-54 - cap 98121 Messina\n` +
        `Tel 090358694 - cell. +39 3401649518 / +39 3460227234\n` +
        `Cod. Fisc. e Part. I.V.A.: 02962480832 - e-mail: tin.srl2008@alice.it\n` +
        `Impianti elettrici di bordo e di terra - Meccanica industriale e navale.`;
    doc.text(companyDetails, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // 2. LINEA E TITOLO
    doc.setDrawColor(blueColor);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(blueColor);
    doc.text('RAPPORTO DI INTERVENTO TECNICO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // 3. DETTAGLI RAPPORTO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#000000');

    const fieldGap = 7;
    const labelWidth = 35;
    const valueX = margin + labelWidth;
    let fieldY = currentY;

    const dataRapportino = (rapportino as any).dataInizio || rapportino.data;
    doc.text('Data:', margin, fieldY);
    doc.setFont('helvetica', 'normal');
    doc.text(dayjs(dataRapportino).isValid() ? dayjs(dataRapportino).format('DD MMMM YYYY') : 'Data non specificata', valueX, fieldY);
    fieldY += fieldGap;

    if (rapportino.ordineLavoro) {
        doc.setFont('helvetica', 'bold');
        doc.text('Ordine Lavoro:', margin, fieldY);
        doc.setFont('helvetica', 'normal');
        doc.text(rapportino.ordineLavoro, valueX, fieldY);
        fieldY += fieldGap;
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Nave/Impianto:', margin, fieldY);
    doc.text('Luogo:', margin, fieldY + fieldGap);
    doc.text('Veicolo:', margin, fieldY + fieldGap * 2);

    doc.setFont('helvetica', 'normal');
    doc.text(rapportino.nave?.nome || '--', valueX, fieldY);
    doc.text(rapportino.luogo?.nome || '--', valueX, fieldY + fieldGap);
    doc.text(rapportino.veicolo?.nome || '--', valueX, fieldY + fieldGap * 2);

    currentY = fieldY + (fieldGap * 3) + 5;

    // 4. TABELLA TECNICI
    const tableHead = [['Tecnici Intervenuti', 'Orari']];
    const tableBody = (rapportino.dettaglioOreTecnici || []).map((d: DettaglioOreTecnico) => {
        const tecnico = tecniciMap.get(d.tecnicoId as string);
        const nomeCompleto = tecnico ? `${tecnico.cognome} ${tecnico.nome}`.trim() : (d.nome || 'N/D');
        return [nomeCompleto, formatOrario(d)];
    });

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: '#343a40', textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 
            0: { cellWidth: 'auto' }, 
            1: { cellWidth: 70, halign: 'right' } 
        },
        didDrawPage: (data) => { currentY = data.cursor?.y || 0; }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // 5. SEZIONI DESCRITTIVE
    doc.setDrawColor(blueColor);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;

    const addSection = (title: string, content: string | undefined) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(title, margin, currentY);
        currentY += 4;
        doc.setFont('helvetica', 'normal');
        currentY = addWrappedText(doc, content || '--', margin, currentY, contentWidth, 5);
        currentY += 8;
    };
    
    addSection('Breve Descrizione Lavoro', rapportino.descrizioneBreve);
    addSection('Materiali Impiegati', rapportino.materialiImpiegati);
    addSection('Lavoro Eseguito', rapportino.lavoroEseguito);

    // 6. SEZIONE FIRME
    let signatureY = pageHeight - 75;
    doc.setDrawColor(100);
    doc.setLineWidth(0.3);
    doc.line(margin, signatureY, pageWidth - margin, signatureY);
    signatureY += 8;

    const leftColX = margin;
    const rightColX = pageWidth / 2 + 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    doc.text('Per accettazione (firma del responsabile)', leftColX, signatureY);
    signatureY += 6;
    doc.text(`Nome Firmatario: ${rapportino.firmaFirmatarioNome || ''}`, leftColX, signatureY);
    signatureY += 5;
    doc.text(`Società: ${rapportino.firmaFirmatarioSocieta || ''}`, leftColX, signatureY);
    signatureY += 5;

    if (rapportino.firmaVettoriale) {
        try {
            doc.addImage(rapportino.firmaVettoriale, 'PNG', leftColX, signatureY, 70, 25, 'FIRMA_CLIENTE', 'NONE');
        } catch (e) { console.error("Errore immagine firma:", e); }
    }

    let signatureYRight = pageHeight - 75 + 8;
    doc.text('Firma Tecnico Responsabile', rightColX, signatureYRight);
    signatureYRight += 15;

    const mainTecnico = tecniciMap.get(rapportino.tecnicoId as string);
    const mainTecnicoName = mainTecnico ? `${mainTecnico.cognome} ${mainTecnico.nome}`.trim() : 'N/D';
    doc.text(mainTecnicoName, rightColX, signatureYRight);

    return doc.output('blob');
};
