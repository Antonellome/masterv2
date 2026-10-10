
import React from 'react';
import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import dayjs from 'dayjs';

interface BustaPagaPDFProps {
  data: any; // I dati della busta paga calcolati
}

// Stili per il PDF, simili a una busta paga reale
const styles = {
  container: {
    padding: '20px',
    backgroundColor: 'white',
    color: 'black',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '10px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  section: {
    marginBottom: '15px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '10px',
  },
  sectionTitle: {
    fontSize: '12px', 
    fontWeight: 'bold',
    marginBottom: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '5px',
  },
  gridLabel: { 
    fontWeight: 'bold'
  },
  table: {
    fontSize: '9px',
  },
  tableCell: {
    padding: '4px 8px',
    border: '1px solid #ddd',
  },
  tableCellHeader: {
    padding: '6px 8px',
    fontWeight: 'bold',
    backgroundColor: '#f2f2f2',
    border: '1px solid #ddd',
  },
  summaryRow: {
    backgroundColor: '#f7f7f7',
    fontWeight: 'bold',
  }
};

const BustaPagaPDF: React.FC<BustaPagaPDFProps> = ({ data }) => {
  if (!data) return null;

  const { header, datiCalcolo, totaliPerVoce, saldiContatoriFinali } = data;

  return (
    <Box sx={styles.container}>
      {/* INTESTAZIONE */}
      <Box sx={styles.header}>
        <Typography variant="h5" component="h1">BUSTA PAGA</Typography>
        <Typography variant="h6">{header.periodo}</Typography>
      </Box>

      {/* DATI DIPENDENTE E PERIODO */}
      <Paper elevation={0} sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Dati Dipendente</Typography>
        <Grid container spacing={1}>
          <Grid item xs={3} sx={styles.gridLabel}>Dipendente:</Grid>
          <Grid item xs={9}>{header.dipendente}</Grid>
          <Grid item xs={3} sx={styles.gridLabel}>Periodo di Paga:</Grid>
          <Grid item xs={9}>{header.periodo}</Grid>
          <Grid item xs={3} sx={styles.gridLabel}>Giorni Lavorati:</Grid>
          <Grid item xs={9}>{datiCalcolo.giorniLavoratiNelMese}</Grid>
          <Grid item xs={3} sx={styles.gridLabel}>Ore Contrattuali:</Grid>
          <Grid item xs={9}>{datiCalcolo.oreContrattualiMese}</Grid>
        </Grid>
      </Paper>

      {/* CORPO DELLA BUSTA PAGA - VOCI RETRIBUTIVE */}
      <Paper elevation={0} sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Dettaglio Voci Retributive</Typography>
        <TableContainer>
          <Table size="small" sx={styles.table}>
            <TableHead>
              <TableRow>
                <TableCell sx={styles.tableCellHeader}>Descrizione Voce</TableCell>
                <TableCell align="right" sx={styles.tableCellHeader}>Ore Lavorate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(totaliPerVoce).map(([key, value]) => {
                  if (typeof value === 'number' && value > 0) {
                      // Semplice mappatura da id a label leggibile
                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                          <TableRow key={key}>
                              <TableCell sx={styles.tableCell}>{label}</TableCell>
                              <TableCell align="right" sx={styles.tableCell}>{(value as number).toFixed(2)}</TableCell>
                          </TableRow>
                      );
                  }
                  return null;
              })}
              <TableRow sx={styles.summaryRow}>
                  <TableCell sx={styles.tableCell}>Totale Ore Lavorate</TableCell>
                  <TableCell align="right" sx={styles.tableCell}>{datiCalcolo.oreLavorateTotali.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* SALDI FERIE, ROL, ECC. */}
      <Paper elevation={0} sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Saldi Residui</Typography>
        <TableContainer>
          <Table size="small" sx={styles.table}>
            <TableHead>
              <TableRow>
                <TableCell sx={styles.tableCellHeader}>Contatore</TableCell>
                <TableCell align="right" sx={styles.tableCellHeader}>Saldo Residuo (ore)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={styles.tableCell}>Ferie Residue</TableCell>
                <TableCell align="right" sx={styles.tableCell}>{saldiContatoriFinali.ferie.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={styles.tableCell}>ROL Residui</TableCell>
                <TableCell align="right" sx={styles.tableCell}>{saldiContatoriFinali.rol.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={styles.tableCell}>Ex Festività Residue</TableCell>
                <TableCell align="right" sx={styles.tableCell}>{saldiContatoriFinali.exFestivita.toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ mt: 3, fontSize: '8px', textAlign: 'center', color: '#888' }}>
        <Typography variant="caption">
          Documento generato automaticamente il {dayjs().format('DD/MM/YYYY HH:mm')}. Il presente documento non ha valore fiscale.
        </Typography>
      </Box>
    </Box>
  );
};

export default BustaPagaPDF;
