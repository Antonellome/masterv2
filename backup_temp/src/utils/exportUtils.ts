import type { Tecnico, Ditta, Categoria } from '@/models/definitions';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

// Funzione per formattare un valore, specialmente le date
const formatValue = (value: any): string => {
    if (value == null) return 'N/D';
    if (value instanceof Timestamp) {
        return dayjs(value.toDate()).format('DD/MM/YYYY');
    }
    if (dayjs.isDayjs(value)) {
        return value.format('DD/MM/YYYY');
    }
    if (typeof value === 'boolean') {
        return value ? 'Sì' : 'No';
    }
    return String(value);
};

// Funzione per generare l'HTML di una sezione, stile form
const createSection = (title: string, data: { label: string, value: any }[]) => {
    const content = data
        .map(item => `
            <div class="field-container">
                <strong class="field-label">${item.label}:</strong>
                <span class="field-value">${formatValue(item.value)}</span>
            </div>`)
        .join('');

    if (content.trim() === '') return ''; // Non creare la sezione se non ci sono dati

    return `
        <div class="section">
            <h2 class="section-title">${title}</h2>
            <div class="section-content">${content}</div>
        </div>`;
};

// Funzione principale per l'esportazione del singolo tecnico
export const exportSingleTecnico = (tecnico: Tecnico, ditteMap: Map<string, string>, categorieMap: Map<string, string>) => {

    const anagraficaData = [
        { label: 'Cognome', value: tecnico.cognome },
        { label: 'Nome', value: tecnico.nome },
        { label: 'Codice Fiscale', value: tecnico.codiceFiscale },
        { label: 'Email', value: tecnico.email },
        { label: 'Telefono', value: tecnico.telefono },
        { label: 'Indirizzo', value: `${tecnico.indirizzo || ''}, ${tecnico.cap || ''} ${tecnico.citta || ''} (${tecnico.provincia || ''})` },
    ];

    const lavorativiData = [
        { label: 'Ditta', value: ditteMap.get(tecnico.dittaId || '') },
        { label: 'Categoria', value: categorieMap.get(tecnico.categoriaId || '') },
        { label: 'Tipo Contratto', value: tecnico.tipoContratto },
        { label: 'Data Assunzione', value: tecnico.dataAssunzione },
        { label: 'Scadenza Contratto', value: tecnico.scadenzaContratto },
        { label: 'Scadenza UNILAV', value: tecnico.scadenzaUnilav },
    ];

    const documentiData = [
        { label: 'Carta Identità', value: `${tecnico.numeroCartaIdentita || ''} (Scad. ${formatValue(tecnico.scadenzaCartaIdentita)})` },
        { label: 'Passaporto', value: `${tecnico.numeroPassaporto || ''} (Scad. ${formatValue(tecnico.scadenzaPassaporto)})` },
        { label: 'Patente', value: `${tecnico.numeroPatente || ''} ${tecnico.categoriaPatente || ''} (Scad. ${formatValue(tecnico.scadenzaPatente)})` },
        { label: 'CQC', value: `${tecnico.numeroCQC || ''} (Scad. ${formatValue(tecnico.scadenzaCQC)})` },
    ];
    
    const sicurezzaData = [
        { label: 'Scadenza Visita Medica', value: tecnico.scadenzaVisita },
        { label: 'Scadenza Corso Sicurezza', value: tecnico.scadenzaCorsoSicurezza },
        { label: 'Scadenza Primo Soccorso', value: tecnico.scadenzaPrimoSoccorso },
        { label: 'Scadenza Antincendio', value: tecnico.scadenzaAntincendio },
    ];

    const impostazioniData = [
        { label: 'Tecnico Attivo', value: tecnico.attivo },
        { label: 'Sincronizzazione App', value: tecnico.sincronizzazioneAttiva },
    ];

    const note = tecnico.note ? `<div class="section"><h2 class="section-title">Note</h2><div class="notes-content">${tecnico.note.replace(/\n/g, '<br>')}</div></div>` : '';

    const htmlContent = `
        <html>
            <head>
                <title>Report Tecnico - ${tecnico.cognome} ${tecnico.nome}</title>
                <style>
                    @media print {
                        body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                    }
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #000;
                        background-color: #fff;
                    }
                    .header {
                        margin-bottom: 30px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                    }
                    .logo-main { font-size: 18px; font-weight: bold; }
                    .logo-sub { font-size: 14px; }
                    .section { margin-bottom: 20px; }
                    .section-title {
                        font-size: 16px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 5px;
                    }
                    .section-content { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
                    .field-container { display: flex; flex-wrap: wrap; margin-bottom: 5px; }
                    .field-label { font-weight: bold; margin-right: 8px; }
                    .field-value { }
                    .notes-content { white-space: pre-wrap; word-wrap: break-word; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-main">R.I.S.O. Master Office</div>
                    <div class="logo-sub">Report Individuali Sincronizzati Online</div>
                </div>
                ${createSection('Anagrafica', anagraficaData)}
                ${createSection('Dati Lavorativi', lavorativiData)}
                ${createSection('Documenti', documentiData)}
                ${createSection('Formazione e Sicurezza', sicurezzaData)}
                ${createSection('Impostazioni', impostazioniData)}
                ${note}
            </body>
        </html>
    `;

    // Apri una nuova finestra e scrivi il contenuto HTML, quindi avvia la stampa
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        // Un piccolo ritardo per assicurarsi che l'HTML sia renderizzato prima di stampare
        setTimeout(() => {
            printWindow.print();
           // printWindow.close(); // Scommenta se vuoi chiudere la finestra dopo la stampa
        }, 500);
    }
};
