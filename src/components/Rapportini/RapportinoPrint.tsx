
'use client';

import React, { forwardRef } from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Rapportino, Attivita, Cliente, Viaggio, Ddt, Extra } from '@/models/definitions'; // Assicurarsi che i tipi siano corretti
import { format } from 'date-fns';

// Definisco gli stili
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottom: '2px solid #4A90E2',
        paddingBottom: 10,
    },
    logo: {
        width: 80,
        height: 80,
    },
    companyDetails: {
        textAlign: 'right',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#4A90E2',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#4A90E2',
        borderBottom: '1px solid #EEE',
        paddingBottom: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        fontWeight: 'bold',
        marginRight: 5,
        width: 120, // Allineamento delle etichette
    },
    text: {
        flex: 1,
    },
    table: {
        // @ts-expect-error - jspdf-autotable non è compatibile con i tipi di react-pdf
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        // @ts-expect-error - jspdf-autotable non è compatibile con i tipi di react-pdf
        borderWidth: 1,
        borderColor: '#EEE',
        borderRightWidth: 0,
        // @ts-expect-error - jspdf-autotable non è compatibile con i tipi di react-pdf
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
    },
    tableColHeader: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#EEE',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
        backgroundColor: '#4A90E2',
        color: 'white',
        fontWeight: 'bold',
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#EEE',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 5,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#777',
        borderTop: '1px solid #EEE',
        paddingTop: 10,
    },
});

interface RapportinoPrintProps {
    rapportino: Rapportino;
    cliente: Cliente;
    attivita: Attivita[];
    viaggi: Viaggio[];
    ddts: Ddt[];
    extras: Extra[];
}

const RapportinoPrint = forwardRef<any, RapportinoPrintProps>(({ rapportino, cliente, attivita, viaggi, ddts, extras }, ref) => (
    <Document ref={ref}>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Image style={styles.logo} src="/logo.png" />
                <View style={styles.companyDetails}>
                    <Text>R.I.S.O. S.r.l.</Text>
                    <Text>Via Montegrappa, 10</Text>
                    <Text>30020, Meolo (VE)</Text>
                    <Text>P.I. 04541880279</Text>
                </View>
            </View>

            {/* Titolo */}
            <Text style={styles.title}>Rapportino di Lavoro</Text>

            {/* Dettagli Principali */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Data Intervento:</Text>
                    <Text style={styles.text}>{rapportino.data ? format(new Date(rapportino.data), 'dd/MM/yyyy') : 'N/D'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Cliente:</Text>
                    <Text style={styles.text}>{cliente?.nome || 'N/D'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Tecnico:</Text>
                    <Text style={styles.text}>{rapportino.tecnico?.nome || 'N/D'}</Text>
                </View>
            </View>

            {/* Attività */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attività Svolte</Text>
                {attivita.map((item, index) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.text}>{item.descrizione}</Text>
                    </View>
                ))}
            </View>

            {/* Viaggi */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Viaggi</Text>
                {viaggi.map((item, index) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.text}>{item.destinazione} - {item.km} km</Text>
                    </View>
                ))}
            </View>

            {/* DDT */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DDT</Text>
                {ddts.map((item, index) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.text}>{item.numero}</Text>
                    </View>
                ))}
            </View>

            {/* Extra */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Materiale Extra</Text>
                {extras.map((item, index) => (
                    <View key={index} style={styles.row}>
                        <Text style={styles.text}>{item.descrizione}</Text>
                    </View>
                ))}
            </View>

            {/* Note */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Note</Text>
                <Text style={styles.text}>{rapportino.note}</Text>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
                Questo è un documento generato automaticamente. Per qualsiasi chiarimento, si prega di contattare R.I.S.O. S.r.l.
            </Text>
        </Page>
    </Document>
));

RapportinoPrint.displayName = 'RapportinoPrint';

export default RapportinoPrint;
