
import { zodResolver } from "@hookform/resolvers/zod";
import { Add, Delete, Edit, Replay } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useLiveQuery } from "dexie-react-hooks";
import { Controller, useForm, useWatch, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { db } from "@/db/database";
import { Anagrafica, TipoGiornata, Nave, Luogo, Veicolo } from "@/models/definitions";
import { useEffect, useMemo, useRef, useState } from "react";
import it from "date-fns/locale/it";
import SignatureCanvas from "react-signature-canvas";
import OreLavoroSingoloTecnico from "@/components/Rapportini/OreLavoroSingoloTecnico";

const dettaglioOreSchema = z.object({
    tecnicoId: z.string(),
    nome: z.string(),
    isManual: z.boolean().default(false),
    oraInizio: z.string().optional(),
    oraFine: z.string().optional(),
    pausa: z.number().optional(),
    ore: z.number().default(8),
});

// Zod schema based on report.md and user instructions
const rapportinoSchema = z.object({
    isMultiDay: z.boolean().default(false),
    data: z.date({ required_error: "La data è obbligatoria" }),
    dataFine: z.date().optional(),
    tecnicoScriventeId: z.string().min(1, "Il tecnico responsabile è obbligatorio"),
    ordineLavoro: z.string().optional(),
    tipoGiornataId: z.string().min(1, "Il tipo di giornata è obbligatorio"),
    includeTrasferta: z.boolean().default(false),
    trasfertaId: z.string().optional(),

    dettaglioOreTecnici: z.array(dettaglioOreSchema).default([]),
    
    naveId: z.string().optional(),
    luogoId: z.string().optional(),
    veicoloId: z.string().optional(),
    lavoroEseguito: z.string().optional(),
    materialiImpiegati: z.string().optional(),
    descrizioneBreve: z.string().optional(),

    firmaVettoriale: z.string().optional(),
    firmaFirmatarioNome: z.string().optional(),
    firmaFirmatarioSocieta: z.string().optional(),
}).refine(data => {
    // Conditional validation logic here if needed
    return true;
});

type RapportinoFormData = z.infer<typeof rapportinoSchema>;

const RapportinoForm = ({ initialData }: { initialData?: Partial<RapportinoFormData> }) => {
    const sigCanvas = useRef<SignatureCanvas | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        getValues
    } = useForm<RapportinoFormData>({
        resolver: zodResolver(rapportinoSchema),
        defaultValues: initialData || {
            isMultiDay: false,
            includeTrasferta: false,
            dettaglioOreTecnici: [],
        },
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "dettaglioOreTecnici",
    });

    const [selectedTecnico, setSelectedTecnico] = useState<Anagrafica | null>(null);

    const isMultiDay = useWatch({ control, name: "isMultiDay" });
    const tipoGiornataId = useWatch({ control, name: "tipoGiornataId" });
    const includeTrasferta = useWatch({ control, name: "includeTrasferta" });
    const tecnicoScriventeId = useWatch({ control, name: "tecnicoScriventeId" });
    const firmaVettoriale = useWatch({ control, name: "firmaVettoriale"});

    const tecnici = useLiveQuery(() => db.tecnici.toArray(), []) as (Anagrafica[] | undefined);
    const tipiGiornataRaw = useLiveQuery(() => db.tipiGiornata.toArray(), []) as (TipoGiornata[] | undefined);
    const navi = useLiveQuery(() => db.navi.toArray(), []) as (Nave[] | undefined);
    const luoghi = useLiveQuery(() => db.luoghi.toArray(), []) as (Luogo[] | undefined);
    const veicoli = useLiveQuery(() => db.veicoli.toArray(), []) as (Veicolo[] | undefined);

    const { tipiGiornata, trasferte } = useMemo(() => {
        if (!tipiGiornataRaw) return { tipiGiornata: [], trasferte: [] };
        const trasferteFiltered = tipiGiornataRaw.filter(
            (item) => item.categoria === 'trasferta' || item.nome.toLowerCase().includes('trasferta')
        );
        const tipiGiornataFiltered = tipiGiornataRaw.filter(
            (item) => !trasferteFiltered.some(t => t.id === item.id)
        );
        return { tipiGiornata: tipiGiornataFiltered, trasferte: trasferteFiltered };
    }, [tipiGiornataRaw]);
    
    const isGiornataLavorativa = tipoGiornataId && !/ferie|malattia/i.test(tipiGiornata.find(t => t.id === tipoGiornataId)?.nome || '');
    const showDettagliIntervento = isGiornataLavorativa && !isMultiDay;

    useEffect(() => {
        const scrivente = tecnici?.find(t => t.id === tecnicoScriventeId);
        if (scrivente && fields.length === 0) {
             append({ 
                tecnicoId: scrivente.id!,
                nome: scrivente.nome,
                isManual: !isGiornataLavorativa,
                oraInizio: '07:30',
                oraFine: '16:30',
                pausa: 60,
                ore: 8,
            }, { shouldFocus: false });
        }
    }, [tecnicoScriventeId, tecnici, append, fields.length, isGiornataLavorativa]);


    const handleAddTecnico = () => {
        if (selectedTecnico && !fields.some(f => f.tecnicoId === selectedTecnico.id)) {
            const scriventeDati = fields[0]; // Main technician is always the first
            append({
                tecnicoId: selectedTecnico.id!,
                nome: selectedTecnico.nome,
                ...(scriventeDati || {}),
            });
            setSelectedTecnico(null);
        }
    };
    
    const handleSaveSignature = () => {
        if (sigCanvas.current) {
            // Get SVG data with black pen color (for visibility)
            let svg = sigCanvas.current.toDataURL("image/svg+xml");
            // As per report.md, change pen color to white for PDF generation
            svg = svg.replace('stroke="#000000"', 'stroke="#FFFFFF"');
            setValue("firmaVettoriale", svg);
        }
    };

    const handleClearSignature = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
        setValue("firmaVettoriale", undefined);
    };

    const onSubmit = (data: RapportinoFormData) => {
        console.log("Rapportino salvato:", JSON.stringify(data, null, 2));
        alert("Dati del rapportino salvati in console.");
    };

    useEffect(() => {
        if (!includeTrasferta) {
            setValue("trasfertaId", undefined);
        }
    }, [includeTrasferta, setValue]);

    if (!tecnici || !tipiGiornataRaw || !navi || !luoghi || !veicoli) {
        return <CircularProgress />
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <Paper elevation={3} sx={{ p: 4, m: 2 }}>
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Typography variant="h4" component="h1" fontWeight="bold" align="center">Tecnologie Industriali Navali</Typography>
                    <Typography variant="h6" component="h2" align="center" gutterBottom>Report Intervento</Typography>
                    <Divider sx={{ my: 2, borderColor: "primary.main", borderWidth: 1 }} />

                    <Typography variant="h6" gutterBottom>Dati Principali</Typography>
                    <Grid container spacing={2}>
                        {/* Fields */}
                         <Grid size={12}><Controller name="isMultiDay" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Crea per più giorni (solo Ferie/Malattia)" />} /></Grid>
                        <Grid
                            size={{
                                xs: 12,
                                sm: isMultiDay ? 6 : 12
                            }}><Controller name="data" control={control} render={({ field }) => <DatePicker label={isMultiDay ? "Dal" : "Data"} value={field.value || null} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, error: !!errors.data, helperText: errors.data?.message } }} />} /></Grid>
                        {isMultiDay && <Grid
                            size={{
                                xs: 12,
                                sm: 6
                            }}><Controller name="dataFine" control={control} render={({ field }) => <DatePicker label="Al" value={field.value || null} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, error: !!errors.dataFine, helperText: errors.dataFine?.message } }} />} /></Grid>}
                        <Grid size={12}><FormControl fullWidth error={!!errors.tecnicoScriventeId}><InputLabel id="tecnico-responsabile-label">Tecnico Responsabile</InputLabel><Controller name="tecnicoScriventeId" control={control} render={({ field }) => <Select labelId="tecnico-responsabile-label" label="Tecnico Responsabile" {...field}>{tecnici?.map((tecnico) => <MenuItem key={tecnico.id} value={tecnico.id}>{tecnico.nome}</MenuItem>)}</Select>} /></FormControl></Grid>
                        <Grid size={12}><Controller name="ordineLavoro" control={control} render={({ field }) => <TextField {...field} label="Ordine di Lavoro" fullWidth />} /></Grid>
                        <Grid size={12}><FormControl fullWidth error={!!errors.tipoGiornataId}><InputLabel id="tipo-giornata-label">Tipo Giornata</InputLabel><Controller name="tipoGiornataId" control={control} render={({ field }) => <Select labelId="tipo-giornata-label" label="Tipo Giornata" {...field}>{tipiGiornata?.map((tipo) => <MenuItem key={tipo.id} value={tipo.id}>{tipo.nome}</MenuItem>)}</Select>} /></FormControl></Grid>
                        <Grid size={12}><Controller name="includeTrasferta" control={control} render={({ field }) => <FormControlLabel control={<Switch {...field} checked={field.value} />} label="Aggiungi Trasferta" />} /></Grid>
                        {includeTrasferta && <Grid size={12}><FormControl fullWidth error={!!errors.trasfertaId}><InputLabel id="tipo-trasferta-label">Tipo di Trasferta</InputLabel><Controller name="trasfertaId" control={control} render={({ field }) => <Select labelId="tipo-trasferta-label" label="Tipo di Trasferta" {...field}>{trasferte?.map((trasferta) => <MenuItem key={trasferta.id} value={trasferta.id}>{trasferta.nome}</MenuItem>)}</Select>} /></FormControl></Grid>}
                    </Grid>
                    
                    {showDettagliIntervento && (
                        <>
                            <Divider sx={{ my: 3 }} />
                            <Typography variant="h6" gutterBottom>Tecnici Coinvolti</Typography>
                            
                            {fields.map((field, index) => (
                                <Box key={field.id} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1}}>
                                    <Typography variant="subtitle1">{field.nome} {field.tecnicoId === tecnicoScriventeId && "(Responsabile)"}</Typography>
                                    <OreLavoroSingoloTecnico 
                                       datiOre={getValues(`dettaglioOreTecnici.${index}`)}
                                       onUpdate={(newData) => update(index, newData)}
                                       isReadOnly={false}
                                    />
                                    {field.tecnicoId !== tecnicoScriventeId && <Button onClick={() => remove(index)} size="small" color="error" sx={{mt: 1}}>Rimuovi</Button>}
                                </Box>
                            ))}

                            <Grid container spacing={2} alignItems="center" sx={{mt: 2}}>
                                <Grid size={8}>
                                     <Autocomplete
                                        options={tecnici?.filter(t => !fields.some(f => f.tecnicoId === t.id)) || []}
                                        getOptionLabel={(option) => option.nome}
                                        value={selectedTecnico}
                                        onChange={(_, newValue) => setSelectedTecnico(newValue)}
                                        renderInput={(params) => <TextField {...params} label="Aggiungi Tecnico" />}
                                     />
                                </Grid>
                                <Grid size={4}>
                                    <Button variant="outlined" onClick={handleAddTecnico} startIcon={<Add />}>Aggiungi</Button>
                                </Grid>
                            </Grid>
                            
                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" gutterBottom>Dettagli Intervento</Typography>
                             <Grid container spacing={2}>
                                {/* Dettagli fields */}
                                <Grid
                                    size={{
                                        xs: 12,
                                        sm: 6
                                    }}><FormControl fullWidth error={!!errors.naveId}><InputLabel id="nave-label">Nave</InputLabel><Controller name="naveId" control={control} render={({field}) => <Select labelId="nave-label" label="Nave" {...field}>{navi?.map(n => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}</Select>} /></FormControl></Grid>
                                 <Grid
                                     size={{
                                         xs: 12,
                                         sm: 6
                                     }}><FormControl fullWidth error={!!errors.luogoId}><InputLabel id="luogo-label">Luogo</InputLabel><Controller name="luogoId" control={control} render={({field}) => <Select labelId="luogo-label" label="Luogo" {...field}>{luoghi?.map(l => <MenuItem key={l.id} value={l.id}>{l.nome}</MenuItem>)}</Select>} /></FormControl></Grid>
                                <Grid size={12}><FormControl fullWidth error={!!errors.veicoloId}><InputLabel id="veicolo-label">Veicolo</InputLabel><Controller name="veicoloId" control={control} render={({field}) => <Select labelId="veicolo-label" label="Veicolo" {...field}>{veicoli?.map(v => <MenuItem key={v.id} value={v.id}>{v.nome}</MenuItem>)}</Select>} /></FormControl></Grid>
                                <Grid size={12}><Controller name="lavoroEseguito" control={control} render={({field}) => <TextField {...field} label="Lavoro Eseguito" multiline rows={4} fullWidth />} /></Grid>
                            </Grid>
                        </>
                    )}

                    {showDettagliIntervento && (
                        <>
                             <Divider sx={{ my: 3 }} />
                             <Typography variant="h6" gutterBottom>Firma Cliente</Typography>
                            {firmaVettoriale ? (
                                <Box>
                                    <Typography gutterBottom>Firma apposta e non modificabile.</Typography>
                                    <img src={firmaVettoriale.replace('stroke="#FFFFFF"', 'stroke="#000000"')} alt="Firma" style={{ border: '1px solid black', maxWidth: 300, maxHeight: 150, backgroundColor: 'white' }}/>
                                </Box>
                            ) : (
                                <Paper variant="outlined" sx={{p: 2}}>
                                     <Grid container spacing={2} sx={{mb: 2}}>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}><Controller name="firmaFirmatarioNome" control={control} render={({field}) => <TextField {...field} label="Nome Firmatario" fullWidth />}/></Grid>
                                        <Grid
                                            size={{
                                                xs: 12,
                                                sm: 6
                                            }}><Controller name="firmaFirmatarioSocieta" control={control} render={({field}) => <TextField {...field} label="Società Firmatario" fullWidth />}/></Grid>
                                    </Grid>
                                    <Box sx={{ border: '1px dashed grey', borderRadius: 1}}>
                                        <SignatureCanvas ref={sigCanvas} penColor='black' canvasProps={{ style: { width: '100%', height: 200 } }} />
                                    </Box>
                                    <Box sx={{mt: 1, display: 'flex', gap: 1}}>
                                        <Button onClick={handleSaveSignature} variant="contained">Salva Firma</Button>
                                        <Button onClick={() => sigCanvas.current?.clear()} variant="outlined" startIcon={<Replay/>}>Pulisci</Button>
                                    </Box>
                                </Paper>
                             )}
                        </>
                     )}

                    <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
                        <Button type="submit" variant="contained" size="large">Salva Report</Button>
                    </Box>
                </Box>
            </Paper>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
