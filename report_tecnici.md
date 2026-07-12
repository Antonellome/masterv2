# Documentazione Form Rapportino (App Tecnici)

Questo documento serve come riferimento per l'App Master Office per comprendere la struttura e il funzionamento del form di creazione/modifica dei rapportini presente nell'app dei tecnici.

---

## 1. Funzionamento Generale

Il form è gestito dal componente `ReportFormPage.tsx` e da un hook custom `useReportForm.ts` che ne contiene tutta la logica.

Permette di creare due tipi di rapportini:

1.  **Rapportino Singolo Giorno**: Per qualsiasi tipo di giornata (lavorativa, ferie, malattia, etc.). Contiene tutti i dettagli dell'intervento.
2.  **Rapportino Multi-Giorno**: Una modalità semplificata *esclusivamente* per Ferie e Malattia, che permette di creare più rapportini identici in un range di date specificato.

Il form gestisce anche la modifica, la condivisione in PDF e il salvataggio offline.

---

## 2. Codice Sorgente del Form (`ReportFormPage.tsx`)

Questo è l'intero codice JSX che renderizza l'interfaccia del form.

```jsx
import React from 'react';
import {
    Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
    Autocomplete, Button, CircularProgress, Alert, Box, Chip, IconButton, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import Grid from '@mui/material/Grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';
import { format } from 'date-fns';

import { useReportForm } from '@/hooks/useReportForm';
import OreLavoroSingoloTecnico from '@/components/Rapportini/OreLavoroSingoloTecnico';
import SignatureDialog from '@/components/form/SignatureDialog';
import PdfPreviewDialog from '@/components/pdf/PdfPreviewDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ p: 2, mt: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {title}
        </Typography>
        <Grid container spacing={3}>
            {children}
        </Grid>
    </Paper>
);

const ReportFormPage: React.FC = () => {
    const form = useReportForm();

    if (form.pageLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                     <Box sx={{ textAlign: 'center', mb: 3, borderBottom: '2px solid', borderColor: 'primary.main', pb: 2 }}>
                        <Typography variant="h4" component="h1" fontWeight="bold">Tecnologie Industriali Navali</Typography>
                        <Typography variant="h6" component="h2">Report Intervento</Typography>
                    </Box>

                    {form.isReadOnly && form.lockReason && <Alert severity="info" sx={{ mb: 2 }}>{form.lockReason}</Alert>}

                    <Section title="Dati Principali">
                        <Grid item xs={12}>
                            {!form.isEditMode && (
                                <FormControlLabel control={<Switch checked={form.isMultiDay} onChange={form.handleMultiDayToggle} />} label="Crea per più giorni (solo Ferie/Malattia)" disabled={form.isEditMode || form.disableActions} />
                            )}
                        </Grid>
                        <Grid item xs={12} md={form.isMultiDay ? 6 : 4}>
                             <DatePicker label={form.isMultiDay ? "Dal" : "Data"} value={form.dataInizio} onChange={form.setDataInizio} disabled={form.disableActions} sx={{width: '100%'}} />
                        </Grid>
                        {form.isMultiDay && (
                            <Grid item xs={12} md={4}>
                                <DatePicker label="Al" value={form.dataFine} onChange={form.setDataFine} disabled={form.disableActions} sx={{width: '100%'}} minDate={form.dataInizio || undefined} />
                            </Grid>
                        )}
                         <Grid item xs={12} md={form.isMultiDay ? 12 : 4}>
                            <TextField label="Tecnico Responsabile" value={form.scriventeDettaglio?.nome || 'Caricamento...'} fullWidth disabled />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField label="Ordine di Lavoro" value={form.ordineLavoro} onChange={(e) => form.setOrdineLavoro(e.target.value)} fullWidth />
                        </Grid>
                         <Grid item xs={12} md={8}>
                           <FormControl fullWidth required disabled={form.disableActions}>
                                <InputLabel id="tipo-giornata-label">Tipo Giornata</InputLabel>
                                <Select
                                    labelId="tipo-giornata-label"
                                    id="tipo-giornata-select"
                                    value={form.tipoGiornataId}
                                    label="Tipo Giornata"
                                    onChange={e => form.handleTipoGiornataChange(e.target.value as string)}
                                >
                                    {form.tipiGiornataFiltrati.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControlLabel
                                control={<Switch checked={form.includeTrasferta} onChange={(e) => form.setIncludeTrasferta(e.target.checked)} />}
                                label="Aggiungi Trasferta"
                                disabled={form.disableActions}
                            />
                            {form.includeTrasferta && (
                                <FormControl fullWidth required disabled={form.disableActions} sx={{ mt: 2 }}>
                                    <InputLabel id="tipo-trasferta-label">Tipo di Trasferta</InputLabel>
                                    <Select
                                        labelId="tipo-trasferta-label"
                                        id="tipo-trasferta-select"
                                        value={form.trasfertaId}
                                        label="Tipo di Trasferta"
                                        onChange={e => form.setTrasfertaId(e.target.value as string)}
                                    >
                                        {form.tipiGiornataTrasferta?.map((t: any) => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                        </Grid>
                    </Section>

                    {!form.isMultiDay && (
                        <>
                            <Section title="Tecnici Coinvolti">
                                {form.scriventeDettaglio && !form.isLavorativo && (
                                    <Grid item xs={12}><Typography variant="body2" color="text.secondary">Per giornate non lavorative, le ore sono impostate a 8 di default.</Typography></Grid>
                                )}
                                {form.scriventeDettaglio && form.isLavorativo && (
                                    <Grid item xs={12}>
                                        <OreLavoroSingoloTecnico key={form.scriventeDettaglio.tecnicoId} datiOre={form.scriventeDettaglio} onUpdate={form.handleOreUpdate} isReadOnly={form.disableActions} isScrivente={true} />
                                    </Grid>
                                )}
                                <Grid item xs={12}>
                                        <Autocomplete
                                        multiple
                                        options={form.otherTecnicos}
                                        getOptionLabel={(o) => `${o.cognome} ${o.nome}`}
                                        value={form.selectedTecnicos}
                                        onChange={form.handleAltriTecniciChange}
                                        renderInput={params => <TextField {...params} label={form.isLavorativo ? "Aggiungi altri tecnici" : "Aggiungi tecnici"} />}
                                        disabled={form.disableActions}
                                    />
                                </Grid>

                                {form.dettaglioOre.filter(d => d.tecnicoId !== form.tecnicoScrivente?.id).map(dett => (
                                    <Grid key={dett.tecnicoId} item xs={12}>
                                        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, width: '100%' }}>
                                            <Box><Typography variant="body1" fontWeight="500">{dett.nome}</Typography>
                                                {form.isLavorativo ? <Chip label={dett.isManual ? `Manuale: ${dett.ore || 0} ore` : `Orario: ${dett.oraInizio || 'N/A'}-${dett.oraFine || 'N/A'} (${(dett.ore || 0).toFixed(2)}h)`} size="small" /> : <Chip label={`8 ore di default`} size="small" />}
                                            </Box>
                                            <Box>
                                                {form.isLavorativo && <IconButton size="small" onClick={() => form.handleOpenModal(dett)} disabled={form.disableActions}><EditIcon /></IconButton>}
                                                <IconButton size="small" onClick={() => form.removeTecnico(dett.tecnicoId)} disabled={form.disableActions}><DeleteIcon /></IconButton>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Section>

                            <Section title="Dettagli Intervento">
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth required disabled={form.disableActions}>
                                        <InputLabel id="nave-label">Nave</InputLabel>
                                        <Select labelId="nave-label" value={form.naveId} label="Nave" onChange={e => form.setNaveId(e.target.value as string)}>
                                            <MenuItem value="Nessuna"><em>Nessuna</em></MenuItem>
                                            {form.sortedNavi.map((n: any) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth required disabled={form.disableActions}>
                                        <InputLabel id="luogo-label">Luogo</InputLabel>
                                        <Select labelId="luogo-label" value={form.luogoId} label="Luogo" onChange={e => form.setLuogoId(e.target.value as string)}>
                                            <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                            {form.sortedLuoghi.map((l: any) => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth disabled={form.disableActions}>
                                        <InputLabel id="veicolo-label">Veicolo</InputLabel>
                                        <Select
                                            labelId="veicolo-label"
                                            value={form.veicoloId}
                                            label="Veicolo"
                                            onChange={e => form.setVeicoloId(e.target.value as string)}
                                            renderValue={(selected) => form.getVeicoloLabel(form.sortedVeicoli.find((v:any) => v.id === selected))}
                                        >
                                            <MenuItem value="Nessuno"><em>Nessuno</em></MenuItem>
                                            {form.sortedVeicoli.map((v: any) => <MenuItem key={v.id} value={v.id}>{form.getVeicoloLabel(v)}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}><TextField label="Breve Descrizione Lavoro" value={form.descrizioneBreve} onChange={e => form.setDescrizioneBreve(e.target.value)} fullWidth disabled={form.disableActions} /></Grid>
                                <Grid item xs={12}><TextField label="Materiali Impiegati" value={form.materialiImpiegati} onChange={e => form.setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} disabled={form.disableActions} /></Grid>
                                <Grid item xs={12}><TextField label="Lavoro Eseguito" value={form.lavoroEseguito} onChange={e => form.setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} required disabled={form.disableActions} /></Grid>
                            </Section>

                            <Section title="Firma Cliente">
                                <Grid item xs={12} md={6}>
                                    <TextField label="Nome e Cognome Firmatario" value={form.firmaFirmatarioNome} onChange={(e) => form.setFirmaFirmatarioNome(e.target.value)} fullWidth required disabled={form.disableActions}/>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField label="Società" value={form.firmaFirmatarioSocieta} onChange={(e) => form.setFirmaFirmatarioSocieta(e.target.value)} fullWidth disabled={form.disableActions}/>
                                </Grid>
                                <Grid item xs={12}>
                                    {form.firmaVettoriale ? (
                                        <Box sx={{border: '1px dashed grey', borderRadius: 1, p: 2, textAlign: 'center', backgroundColor: form.isReadOnly ? '#f5f5f5' : '#616161' }}>
                                            <Typography variant="body2" gutterBottom sx={{ color: form.isReadOnly ? 'black' : 'white' }}>Firma salvata:</Typography>
                                            <img
                                                key={form.firmaVettoriale}
                                                src={form.firmaVettoriale}
                                                alt="Firma"
                                                style={{
                                                    maxWidth: '200px',
                                                    height: 'auto',
                                                    margin: 'auto',
                                                    filter: form.isReadOnly ? 'none' : 'invert(1)'
                                                }}/>
                                            <br />
                                            {!form.isReadOnly && <Button onClick={form.handleOpenSignatureModal} startIcon={<EditIcon/>} sx={{mt: 1, color: form.isReadOnly ? 'black' : 'white' }} disabled={form.disableActions}>Modifica Firma</Button>}
                                        </Box>
                                    ) : (
                                        <Button variant="outlined" startIcon={<BorderColorIcon />} onClick={form.handleOpenSignatureModal} disabled={form.disableActions} fullWidth>Aggiungi Firma Cliente</Button>
                                    )}
                                </Grid>
                            </Section>
                        </>
                    )}

                    <Box id="action-buttons" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                        <Button variant="outlined" color="primary" onClick={form.handleCancel} disabled={form.isProcessing}>Chiudi</Button>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                           {form.isReadOnly ? (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={form.handleShare}
                                    disabled={form.isProcessing}
                                    startIcon={form.isProcessing ? <CircularProgress size={24} /> : <ShareIcon />}
                                >
                                    Condividi
                                </Button>
                            ) : (
                                <>
                                    <Button variant="contained" onClick={form.handleSave} disabled={form.disableActions}>
                                        {form.isProcessing ? <CircularProgress size={24} /> : (form.isEditMode ? 'Aggiorna' : 'Salva')}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={form.handleSaveAndShare}
                                        disabled={form.disableActions || form.isMultiDay}
                                        startIcon={form.isProcessing ? <CircularProgress size={24} /> : <ShareIcon />}
                                    >
                                        Salva e Condividi
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>
                </Paper>
            </Box>
            <Dialog open={form.isModalOpen} onClose={form.handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Modifica orario di {form.editingTecnico?.nome}</DialogTitle>
                <DialogContent>{form.tempDettaglioOre && <Box sx={{pt: 2}}><OreLavoroSingoloTecnico datiOre={form.tempDettaglioOre} onUpdate={form.setTempDettaglioOre} isReadOnly={form.isReadOnly} /></Box>}</DialogContent>
                <DialogActions><Button onClick={form.handleCloseModal}>Annulla</Button><Button onClick={form.handleSaveFromModal} variant="contained">Salva Orario</Button></DialogActions>
            </Dialog>
            <SignatureDialog
                open={form.isSignatureModalOpen}
                onClose={() => form.setIsSignatureModalOpen(false)}
                onSave={form.handleSaveSignature}
            />
            <PdfPreviewDialog
                open={form.isPdfPreviewOpen}
                onClose={() => form.setIsPdfPreviewOpen(false)}
                onShare={form.handleFinalShare}
                pdfDataUrl={form.pdfUrl}
                isGenerating={form.isGeneratingPdf}
                fileName={`Rapportino_${format(form.dataInizio || new Date(), 'dd-MM-yyyy')}.pdf`}
            />
            <ConfirmationDialog
                open={form.isConfirmSaveDialogOpen}
                onClose={form.handleCancelConfirmSave}
                onConfirm={form.handleConfirmSave}
                title="Conferma Salvataggio Firma"
                description="Sei sicuro di voler salvare? La firma non potrà più essere modificata dopo il primo salvataggio."
            />
        </LocalizationProvider>
    );
};

export default ReportFormPage;
```

---

## 3. Struttura Dati del Documento `rapportino` in Firestore

Quando un rapportino viene salvato, viene creato un documento nella collezione `rapportini` con la seguente struttura. È **fondamentale** che l'App Master faccia riferimento a questi campi per leggere e interpretare i dati correttamente.

```json
{
  // OBBLIGATORIO: Timestamp della data di inizio dell'intervento.
  "dataInizio": "<Timestamp>",

  // OPZIONALE: Timestamp della data di fine (solo per rapportini multi-giorno).
  "dataFine": "<Timestamp>",

  // OBBLIGATORIO: ID del tecnico che ha compilato il rapportino (corrisponde all'uid dell'utente autenticato).
  "tecnicoId": "<string>",

  // OBBLIGATORIO: Array con gli ID di tutti i tecnici che hanno partecipato, incluso chi compila.
  // Usato per le regole di sicurezza per permettere la lettura a tutti i partecipanti.
  "presenze": [
    "<string: tecnicoId_1>",
    "<string: tecnicoId_2>"
  ],

  // OBBLIGATORIO: ID del tipo di giornata (es. Lavoro, Ferie, Malattia). Fa riferimento a un documento nella collezione `tipiGiornata`.
  "tipoGiornataId": "<string>",

  // OPZIONALE: ID del tipo di trasferta, se `includeTrasferta` è true.
  "trasfertaId": "<string>",

  // OBBLIGATORIO: Booleano che indica se è stata inclusa una trasferta.
  "includeTrasferta": true,

  // OPZIONALE: ID della nave. Fa riferimento a un documento nella collezione `navi`.
  "naveId": "<string>",

  // OPZIONALE: ID del luogo. Fa riferimento a un documento nella collezione `luoghi`.
  "luogoId": "<string>",

  // OPZIONALE: ID del veicolo. Fa riferimento a un documento nella collezione `veicoli`.
  "veicoloId": "<string>",

  // OBBLIGATORIO: Descrizione del lavoro eseguito. Può essere vuoto per giornate non lavorative.
  "lavoroEseguito": "<string>",
  
  // OPZIONALE: Descrizione breve.
  "descrizioneBreve": "<string>",

  // OPZIONALE: Materiali impiegati.
  "materialiImpiegati": "<string>",

  // OPZIONALE: Ordine di lavoro (numero/codice).
  "ordineLavoro": "<string>",

  // OBBLIGATORIO: Array di oggetti che dettaglia le ore per ogni tecnico.
  // Per giornate non lavorative, contiene solo il tecnico principale con 8 ore.
  "dettaglioOre": [
    {
      "tecnicoId": "<string>",
      "nome": "<string>", // Nome e cognome per comodità di visualizzazione
      "oraInizio": "<string>", // Formato "HH:mm"
      "oraFine": "<string>",   // Formato "HH:mm"
      "ore": 8.5,              // Numero di ore calcolate
      "isManual": false        // `true` se le ore sono state inserite manualmente invece che con l'orario
    }
  ],

  // OPZIONALE: Nome e cognome di chi ha firmato per il cliente.
  "firmaFirmatarioNome": "<string>",

  // OPZIONALE: Società del firmatario.
  "firmaFirmatarioSocieta": "<string>",

  // OPZIONALE: Immagine della firma in formato Data URL (base64). Viene salvata solo al primo salvataggio e non è più modificabile.
  "firmaVettoriale": "data:image/svg+xml;base64, ...",

  // --- METADATI GESTITI DAL SISTEMA ---

  // OBBLIGATORIO: Timestamp di creazione del documento.
  "createdAt": "<Timestamp>",

  // OBBLIGATORIO: ID del tecnico che ha creato il documento.
  "createdBy": "<string>",

  // OBBLIGATORIO: Timestamp dell'ultimo aggiornamento.
  "updatedAt": "<Timestamp>",

  // OBBLIGATORIO: ID del tecnico che ha effettuato l'ultimo aggiornamento.
  "updatedBy": "<string>",

  // OBBLIGATORIO: Booleano che indica se il rapportino è stato finalizzato e bloccato.
  "isLocked": false,

  // OBBLIGATORIO: Versione del documento, per gestire la sincronizzazione e conflitti.
  "version": 1 
}
```
