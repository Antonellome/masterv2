import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { SaldiContatori } from '@/models/definitions';
import { RisultatoGiornoCCNL } from '@/services/BustaPagaService';

// --- CONSTANTS FOR COMPRESSION ---
const PAGE_MARGIN = 10;
const FONT_SIZE_NORMAL = 9;
const FONT_SIZE_HEADER = 8;
const FONT_SIZE_TABLE = 7;
const FONT_SIZE_TABLE_SMALL = 6.5;
const SPACING_TIGHT = 3;
const SPACING_NORMAL = 5;
const LINE_HEIGHT_COMPACT = 1.1;

// --- PDF GENERATOR ---
export const oreTecniciPDFGenerator = async (
    technicianName: string,
    currentDate: dayjs.Dayjs,
    sezioni: any[],
    totaliMensili: { [key: string]: number },
    totaleOreLavorate: number,
    totaleOreAssenza: number,
    totaleOreRetribuite: number,
    saldiIniziali: SaldiContatori,
    weeks: Date[][],
    processedMonthData: RisultatoGiornoCCNL[]
): Promise<{ dataUrl: string; filename: string }> => {
    
    const doc = new jsPDF('p', 'mm', 'a4');
    let cursorY = PAGE_MARGIN;

    const estimateTableHeight = (bodyRowCount: number, headRowCount = 1) => {
        const bodyRowHeight = (FONT_SIZE_TABLE_SMALL * LINE_HEIGHT_COMPACT) + (0.8 * 2); // Approximation
        const headRowHeight = (FONT_SIZE_TABLE * LINE_HEIGHT_COMPACT) + (0.8 * 2); // Approximation
        return (headRowCount * headRowHeight) + (bodyRowCount * bodyRowHeight) + SPACING_TIGHT;
    };

    const addPageIfNeeded = (estimatedHeight: number) => {
        if (cursorY + estimatedHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN) {
            doc.addPage();
            cursorY = PAGE_MARGIN;
            // Re-add header on new page if needed
            doc.setFontSize(FONT_SIZE_NORMAL);
            doc.setFont('helvetica', 'bold');
            doc.text(technicianName, PAGE_MARGIN, cursorY);
            doc.text(currentDate.format('MMMM YYYY'), doc.internal.pageSize.getWidth() - PAGE_MARGIN, cursorY, { align: 'right' });
            cursorY += FONT_SIZE_NORMAL / 2 + SPACING_TIGHT;
        }
    };

    // --- 1. COMPACT HEADER ---
    doc.setFontSize(FONT_SIZE_NORMAL);
    doc.setFont('helvetica', 'bold');
    doc.text(technicianName, PAGE_MARGIN, cursorY);
    doc.text(currentDate.format('MMMM YYYY'), doc.internal.pageSize.getWidth() - PAGE_MARGIN, cursorY, { align: 'right' });
    cursorY += FONT_SIZE_NORMAL / 2 + SPACING_NORMAL;

    // --- 2. SEQUENTIAL WEEKLY TABLES ---
    weeks.forEach((week, weekIndex) => {
        const weekHasData = sezioni.some(s => s.colonne.some(({id}: {id: string}) => week.some(d => {
            const dayData = processedMonthData.find(pd => pd.data === dayjs(d).format('YYYY-MM-DD'));
            return dayData && ((dayData as any)[id] || 0) > 0;
        })));

        if (!weekHasData) return; // Skip empty weeks

        const head = ['Tipo Ora', ...week.map(day => dayjs(day).format('D'))];
        const body: any[][] = [];

        sezioni.forEach(sezione => {
            const sectionRows: any[][] = [];
            sezione.colonne.forEach(({ id, label }: { id: string; label: string }) => {
                const rowData = [label.length > 30 ? label.substring(0, 28) + '...' : label];
                let hasValues = false;
                week.forEach(day => {
                    const dayStr = dayjs(day).format('YYYY-MM-DD');
                    const dayData = processedMonthData.find(d => d.data === dayStr);
                    const value = dayData ? (dayData as any)[id] as number || 0 : 0;
                    if (value > 0) hasValues = true;
                    rowData.push(value > 0 ? value.toFixed(2) : '-');
                });
                if (hasValues) sectionRows.push(rowData);
            });

            if (sectionRows.length > 0) {
                body.push([{ content: sezione.titolo, colSpan: head.length, styles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: '#000', fontSize: FONT_SIZE_TABLE } }]);
                body.push(...sectionRows);
            }
        });
        
        const tableHeight = estimateTableHeight(body.length) + (FONT_SIZE_HEADER / 2);
        addPageIfNeeded(tableHeight);
        
        doc.setFontSize(FONT_SIZE_HEADER);
        doc.setFont('helvetica', 'bold');
        doc.text(`Dettaglio Settimana ${weekIndex + 1}`, PAGE_MARGIN, cursorY);
        cursorY += SPACING_TIGHT;

        autoTable(doc, {
            startY: cursorY,
            head: [head],
            body,
            theme: 'grid',
            styles: { fontSize: FONT_SIZE_TABLE_SMALL, cellPadding: 0.8, overflow: 'linebreak' },
            headStyles: { fillColor: '#004d40', textColor: '#fff', halign: 'center', fontSize: FONT_SIZE_TABLE },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
            bodyStyles: { halign: 'center' },
            didDrawPage: data => { cursorY = data.cursor?.y || cursorY; },
        });

        cursorY += SPACING_NORMAL;
    });

    // --- 3. FINAL SUMMARIES ---
    const summaryBody: any[][] = [];
    sezioni.forEach(sezione => {
        const sectionHasData = sezione.colonne.some(({ id }: { id: string }) => (totaliMensili[id] || 0) > 0);
        if (sectionHasData) {
            summaryBody.push([{ content: sezione.titolo, colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: '#000' } }]);
            sezione.colonne.forEach(({ id, label }: { id: string; label: string }) => {
                if ((totaliMensili[id] || 0) > 0) {
                    summaryBody.push([label, (totaliMensili[id] || 0).toFixed(2)]);
                }
            });
        }
    });

    const summaryHeight = estimateTableHeight(summaryBody.length) + (FONT_SIZE_HEADER / 2);
    addPageIfNeeded(summaryHeight);

    doc.setFontSize(FONT_SIZE_HEADER);
    doc.setFont('helvetica', 'bold');
    doc.text('Riepiloghi Finali', PAGE_MARGIN, cursorY);
    cursorY += SPACING_TIGHT;
    autoTable(doc, {
        startY: cursorY,
        head: [['Categoria', 'Ore Totali']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: '#004d40', textColor: '#fff' },
        styles: { fontSize: FONT_SIZE_TABLE, cellPadding: 1 },
        didDrawPage: data => { cursorY = data.cursor?.y || 0; }
    });
    
    cursorY += SPACING_TIGHT;

    const finalTotalsHeight = estimateTableHeight(5, 1);
    addPageIfNeeded(finalTotalsHeight);
    
    const availableWidth = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
    const halfWidth = availableWidth / 2 - 1;

    autoTable(doc, {
        startY: cursorY,
        theme: 'grid',
        styles: { fontSize: FONT_SIZE_TABLE, cellPadding: 1 },
        body: [
            ['Totale Ore Lavorate', totaleOreLavorate.toFixed(2)],
            ['Totale Ore Assenza', totaleOreAssenza.toFixed(2)],
            [{ content: 'TOTALE ORE RETRIBUITE', styles: { fontStyle: 'bold' } }, { content: totaleOreRetribuite.toFixed(2), styles: { fontStyle: 'bold' } }]
        ],
        columnStyles: { 1: { halign: 'right' } },
        tableWidth: halfWidth,
        margin: { left: PAGE_MARGIN },
        didDrawPage: data => { cursorY = Math.max(cursorY, data.cursor?.y || 0); }
    });

    autoTable(doc, {
        startY: cursorY,
        head: [['Contatore', 'Saldo Finale']],
        body: [
            ['Ferie', (saldiIniziali.saldoFerieOre - (totaliMensili['ferieScalate'] || 0)).toFixed(2)],
            ['ROL', (saldiIniziali.saldoRolOre - (totaliMensili['rolScalati'] || 0)).toFixed(2)],
            ['Ex Festività', (saldiIniziali.saldoExFestivitaOre - (totaliMensili['exFestivitaScalate'] || 0)).toFixed(2)],
            ['L. 104', (saldiIniziali.permesso104ResiduoOre - (totaliMensili['legge104Scalate'] || 0)).toFixed(2)],
        ],
        headStyles: { fillColor: '#004d40', textColor: '#fff' },
        theme: 'grid',
        styles: { fontSize: FONT_SIZE_TABLE, cellPadding: 1 },
        columnStyles: { 1: { halign: 'right' } },
        tableWidth: halfWidth,
        margin: { left: PAGE_MARGIN + halfWidth + 2 },
        didDrawPage: data => { cursorY = Math.max(cursorY, data.cursor?.y || 0); }
    });

    // --- FINALIZATION ---
    const filename = `Report_Ore_${technicianName.replace(/\s+/g, '_')}_${currentDate.format('MM-YYYY')}.pdf`;
    const dataUrl = doc.output('datauristring');

    return { dataUrl, filename };
};