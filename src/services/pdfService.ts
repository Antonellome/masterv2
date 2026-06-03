
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RapportinoSchema } from '@/models/rapportino.schema';
import { MasterData } from '@/hooks/useRapportinoMasterData'; // Assumendo che questo tipo esista
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Genera un PDF per un rapportino e ne avvia il download.
 * @param rapportino L'oggetto rapportino validato.
 * @param masterData I dati anagrafici (tecnici, navi, ecc.) per la risoluzione dei nomi.
 */
export const generatePdf = (rapportino: RapportinoSchema, masterData: MasterData) => {
    const doc = new jsPDF();

    const { tecnici, navi, luoghi, tipiGiornata } = masterData;

    // --- FUNZIONI HELPER ---
    const getNomeTecnico = (id: string) => {
        const tecnico = tecnici.find(t => t.id === id);
        return tecnico ? `${tecnico.cognome} ${tecnico.nome}` : 'N/D';
    };
    const getNaveNome = (id: string | null) => navi.find(n => n.id === id)?.nome || 'N/D';
    const getLuogoNome = (id: string | null) => luoghi.find(l => l.id === id)?.nome || 'N/D';
    const getTipoGiornataNome = (id: string) => tipiGiornata.find(tg => tg.id === id)?.nome || 'N/D';

    // --- HEADER ---
    doc.setFontSize(20);
    doc.text("Rapportino di Lavoro", 105, 20, { align: 'center' });

    doc.setFontSize(12);
    const dataRapportino = format(rapportino.data.toDate(), 'dd MMMM yyyy', { locale: it });
    const tipoGiornataNome = getTipoGiornataNome(rapportino.idTipoGiornata);
    doc.text(`Data: ${dataRapportino}`, 20, 40);
    doc.text(`Tipo Giornata: ${tipoGiornataNome}`, 20, 48);

    let finalY = 55;

    // --- TABELLA TECNICI E ORE ---
    if (rapportino.dettaglioOreTecnici.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Tecnico', 'Ore Lavorate', 'Pausa (min)']],
            body: rapportino.dettaglioOreTecnici.map(d => [
                getNomeTecnico(d.tecnicoId),
                d.ore.toString(),
                d.pausa?.toString() || '0'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- DETTAGLI INTERVENTO ---
    if ('attivitaSvolte' in rapportino && rapportino.attivitaSvolte) {
        doc.setFontSize(14);
        doc.text("Dettagli Intervento", 20, finalY);
        doc.setFontSize(11);
        finalY += 8;

        const dettagli = [
            ['Sede:', `${getNaveNome(rapportino.sede.idNave)} - ${getLuogoNome(rapportino.sede.idLuogo)}`],
            ['Lavoro Svolto:', rapportino.attivitaSvolte],
            ['Materiali Impiegati:', rapportino.materialiImpiegati || 'Nessuno'],
        ];

        autoTable(doc, {
            startY: finalY,
            body: dettagli,
            theme: 'plain'
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- FIRMA ---
    if (rapportino.firma?.immagineFirma) {
        doc.setFontSize(14);
        doc.text("Firma del Cliente", 20, finalY);
        finalY += 8;
        doc.addImage(rapportino.firma.immagineFirma, 'PNG', 20, finalY, 100, 50);
        finalY += 60;
        doc.setFontSize(11);
        doc.text(`Firmato da: ${rapportino.firma.firmatarioNome || 'N/D'}`, 20, finalY);
        doc.text(`Società: ${rapportino.firma.firmatarioSocieta || 'N/D'}`, 20, finalY + 7);
    }

    // --- SALVATAGGIO ---
    const fileName = `Rapportino_${dataRapportino}.pdf`;
    doc.save(fileName);
};
