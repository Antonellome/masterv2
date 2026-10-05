
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Rapportino, Tecnico, Nave, Luogo, Veicolo, TipoGiornata, DettaglioOreTecnici, Cliente } from '@/models/definitions';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export interface MasterData {
    tecnici: Tecnico[];
    navi: Nave[];
    clienti: Cliente[];
    luoghi: Luogo[];
    veicoli: Veicolo[];
    tipiGiornata: TipoGiornata[];
}


const drawSignature = (svgData: any, isWhiteBackground = false): Promise<string> => {
    return new Promise((resolve, reject) => {

        // Caso 0: I dati sono già un'immagine PNG in base64
        if (typeof svgData === 'string' && svgData.startsWith('data:image/png;base64,')) {
            return resolve(svgData);
        }

        // Caso 1: I dati sono una stringa SVG XML completa
        if (typeof svgData === 'string' && svgData.trim().startsWith('<svg')) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Cannot create canvas context');
                
                canvas.width = img.width;
                canvas.height = img.height;
                if(isWhiteBackground){
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0,0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => reject(new Error(`Image loading failed for raw SVG: ${e}`));
            img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
            return;
        }

        // Caso 2: I dati sono JSON (stringa o oggetto)
        let signaturePaths: any[];
        try {
            if (typeof svgData === 'string') {
                const parsed = JSON.parse(svgData);
                signaturePaths = Array.isArray(parsed) ? parsed : (parsed.paths || []);
            } else if (typeof svgData === 'object' && svgData !== null) {
                signaturePaths = Array.isArray(svgData) ? svgData : (svgData.paths || []);
            } else {
                return reject(new Error('Invalid signature data format'));
            }

            if (!Array.isArray(signaturePaths) || signaturePaths.length === 0) {
                 return reject(new Error('Signature data is empty or invalid'));
            }
        } catch (e) {
            console.error("RAW SIGNATURE DATA THAT FAILED PARSING:", svgData);
            return reject(new Error(`Failed to parse signature JSON data. Content: ${svgData.substring(0, 50)}...`));
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        signaturePaths.forEach(path => {
            path.points.forEach((p: {x:number, y:number}) => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        if (!isFinite(minX)) {
             return reject(new Error('No valid points in signature data'));
        }

        const padding = 20;
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
                ${isWhiteBackground ? `<rect x="${minX - padding}" y="${minY - padding}" width="${width}" height="${height}" fill="white"/>` : ''}
                ${signaturePaths.map(path => `
                    <path d="${path.path}" stroke="${path.color || 'black'}" stroke-width="${path.strokeWidth || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                `).join('')}
            </svg>
        `;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Cannot create canvas context');
            
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(new Error(`Image loading failed for generated SVG: ${e}`));
        img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    });
};


/**
 * Genera il PDF di un rapportino e restituisce un URL Dati e il nome del file.
 * @param rapportino L'oggetto Rapportino.
 * @param masterData I dati anagrafici aggregati.
 * @returns Una Promise che si risolve con un oggetto contenente l'URL del PDF e il nome del file.
 */
export const rapportinoPDFGenerator = async (rapportino: Rapportino, masterData: MasterData): Promise<{ dataUrl: string, filename: string }> => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let finalY = margin;

    const { tecnici, navi, luoghi, veicoli, tipiGiornata, clienti } = masterData;

    const getNomeTecnico = (id?: string) => {
        if (!id) return 'N/D';
        const tecnico = tecnici.find(t => t.id === id);
        return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'ID non trovato';
    };
    const getNaveNome = (id?: string) => navi.find(n => n.id === id)?.nome || '';
    const getLuogoNome = (id?: string) => luoghi.find(l => l.id === id)?.nome || '';
    const getClienteNome = (id?: string) => clienti.find(c => c.id === id)?.nome || 'N/D';
    
    const getTargetEntity = () => {
        if (rapportino.naveId) {
            const nave = navi.find(n => n.id === rapportino.naveId);
            if (nave) return { tipo: 'Nave', nome: nave.nome, cliente: getClienteNome(nave.clienteId) };
        }
        if (rapportino.luogoId) {
            const luogo = luoghi.find(l => l.id === rapportino.luogoId);
            if (luogo) return { tipo: 'Luogo', nome: luogo.nome, cliente: getClienteNome(luogo.clienteId) };
        }
        return { tipo: 'Destinazione', nome: 'Non specificata', cliente: 'N/D' };
    };
    const target = getTargetEntity();

    const getVeicoloNome = (id?: string) => {
        if (!id) return '--';
        const v = veicoli.find(v => v.id === id);
        if (!v) return '--';
        return `${v.marca} ${v.modello} (${v.targa})`
    };
    const getTipoGiornataNome = (id?: string) => tipiGiornata.find(tg => tg.id === id)?.nome || 'N/D';
    
    const formatOre = (ore?: number) => ore?.toFixed(2).replace('.', ',') || '0,00';
    const formatOrari = (d: DettaglioOreTecnici) => {
        if (d.isManual || (!d.oraInizio && !d.oraFine)) return 'Manuale';
        return `${d.oraInizio || '--'} - ${d.oraFine || '--'}`;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor('#0D47A1');
    doc.text('Tecnologie Industriali Navali S.R.L.', pageWidth / 2, finalY, { align: 'center' });
    finalY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#000000');
    const companyInfo = `Sede Legale: Salita alla Motta 2, 6900 Lugano (CH) - P.IVA: CHE-308.571.238\nSede Operativa: Via Monte Ceneri 25, 6830 Chiasso (CH)\nContatti: info@tin-sa.ch - Tel: +41 79 123 4567`;
    doc.text(companyInfo, pageWidth / 2, finalY, { align: 'center' });
    finalY += 12;
    doc.setDrawColor('#0D47A1');
    doc.setLineWidth(0.5);
    doc.line(margin, finalY, pageWidth - margin, finalY);
    finalY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#0D47A1');
    doc.text('REPORT DI INTERVENTO TECNICO', pageWidth / 2, finalY, { align: 'center' });
    finalY += 15;
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    const addMainData = (label: string, value: string, y: number, isLeft: boolean) => {
        const x = isLeft ? margin : pageWidth / 2 + 5;
        doc.setFont('helvetica', 'bold');
        doc.text(label, x, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, x + 35, y);
    };
    
    const dataFormatted = rapportino.data ? format(new Date(rapportino.data), 'dd/MM/yyyy', { locale: it }) : 'N/D';
    addMainData('Data:', dataFormatted, finalY, true);
    addMainData('ID Rapportino:', rapportino.id || 'N/D', finalY, false);
    finalY += 7;
    addMainData('Cliente:', target.cliente, finalY, true);
    addMainData(target.tipo + ':', target.nome, finalY, false);
    finalY += 7;
    addMainData('Veicolo:', getVeicoloNome(rapportino.veicoloId), finalY, true);
    addMainData('Ordine Lavoro:', rapportino.ordineLavoro || '--', finalY, false);
    finalY += 7;
    addMainData('Tipo Giornata:', getTipoGiornataNome(rapportino.tipoGiornataId), finalY, true);
    finalY += 12;

    const tableBody = (rapportino.dettaglioOreTecnici || []).map(d => [ getNomeTecnico(d.tecnicoId), formatOrari(d), formatOre(d.ore) ]);
    autoTable(doc, {
        startY: finalY,
        head: [['Tecnici Intervenuti', 'Orari', 'Ore']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: '#424242', textColor: '#FFFFFF' },
        didDrawPage: (data) => { finalY = data.cursor?.y || finalY; }
    });
    finalY = (doc as any).lastAutoTable.finalY;
    const totalHours = (rapportino.dettaglioOreTecnici || []).reduce((acc, d) => acc + (d.ore || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor('#424242');
    doc.text(`Totale ore tecnici: ${totalHours.toFixed(2).replace('.', ',')}`, pageWidth - margin, finalY + 5, { align: 'right' });
    finalY += 15;

    const addTextBlock = (title: string, content?: string) => {
        if (!content || finalY > 250) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor('#424242');
        doc.text(title, margin, finalY);
        finalY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor('#000000');
        const splitText = doc.splitTextToSize(content, contentWidth);
        doc.text(splitText, margin, finalY);
        finalY += (splitText.length * 5) + 8;
    };

    addTextBlock('Breve Descrizione Lavoro', rapportino.descrizioneBreve);
    addTextBlock('Lavoro Eseguito', rapportino.lavoroEseguito);
    addTextBlock('Materiali Impiegati', rapportino.materialiImpiegati);

    if (rapportino.firmaVettoriale) {
        try {
            const signatureImage = await drawSignature(rapportino.firmaVettoriale, true);
            const signatureY = Math.max(finalY, 200);
            doc.setDrawColor('#AAAAAA');
            doc.setLineWidth(0.2);
            doc.line(margin, signatureY, pageWidth - margin, signatureY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#000000');
            doc.text('Per accettazione', margin, signatureY + 8);
            doc.text('Firma Tecnico', pageWidth - margin, signatureY + 8, { align: 'right' });
            
            const imgProps = doc.getImageProperties(signatureImage);
            const imgWidth = 60;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            const imgY = signatureY + 10;
            doc.addImage(signatureImage, 'PNG', margin, imgY, imgWidth, imgHeight);

            const firmatario = rapportino.firmaFirmatarioNome || 'N/D';
            const tecnicoScrivente = getNomeTecnico(rapportino.tecnicoScriventeId);
            const textY = imgY + imgHeight + 5;
            doc.text(firmatario, margin, textY);
            doc.text(tecnicoScrivente, pageWidth - margin, textY, { align: 'right' });

        } catch (error) {
            console.error(`Errore elaborazione firma per PDF (Rapportino ID: ${rapportino.id}):`, error);
            addTextBlock('ERRORE FIRMA', 'Impossibile visualizzare la firma del cliente. Dati corrotti o in formato non valido.');
        }
    }

    const dataUrl = doc.output('datauristring');
    const filename = `Report_${dataFormatted.replace(/\//g, '-')}_${target.nome}.pdf`;

    return { dataUrl, filename };
};
