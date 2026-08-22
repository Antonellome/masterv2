
import React, { useState, useEffect, useMemo } from 'react';
import {
    DialogContent, DialogTitle, DialogActions, Autocomplete, Button, CircularProgress, Grid, Alert, 
    Divider, Box, Chip, TextField
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { Timestamp } from 'firebase/firestore';
import type { Rapportino, TipoGiornata, Tecnico, Nave, Luogo, Veicolo, DettaglioOreTecnici } from '@/models/definitions';
import { rapportinoCloudService } from '@/services/rapportinoCloudService';
import { useRapportiniStore } from '@/store/useRapportiniStore';
import { parseToDayjs } from '@/utils/dateUtils';
import GestoreOrariTecnico from './GestoreOrariTecnico';

dayjs.locale('it');

interface RapportinoFormProps {
    onClose: () => void;
    rapportino: Rapportino | null;
    initialDate?: dayjs.Dayjs;
}

const RapportinoForm: React.FC<RapportinoFormProps> = ({ onClose, rapportino, initialDate }) => {
    
    const { tecnici, navi, luoghi, veicoli, tipiGiornata, tipiGiornataMap } = useRapportiniStore(state => ({
        tecnici: state.tecnici,
        navi: state.navi,
        luoghi: state.luoghi,
        veicoli: state.veicoli,
        tipiGiornata: state.tipiGiornata,
        tipiGiornataMap: state.tipiGiornataMap
    }));

    const loadingMasterData = !tecnici.length || !tipiGiornata.length;

    const [data, setData] = useState<Dayjs | null>(null);
    const [tecnicoId, setTecnicoId] = useState<string>('');
    const [tipoGiornataId, setTipoGiornataId] = useState<string>('');
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [veicoloId, setVeicoloId] = useState<string | null>(null);
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [dettaglioOreTecnici, setDettaglioOreTecnici] = useState<DettaglioOreTecnici[]>([]);
    const [presenze, setPresenze] = useState<string[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const tecniciMap = useMemo(() => new Map(tecnici.map(t => [t.id, t])), [tecnici]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);

    useEffect(() => {
        if (rapportino) {
            setData(parseToDayjs(rapportino.data));
            setTecnicoId(rapportino.tecnicoId || '');
            setTipoGiornataId(rapportino.tipoGiornataId || '');
            setNaveId(rapportino.naveId || null);
            setLuogoId(rapportino.luogoId || null);
            setVeicoloId(rapportino.veicoloId || null);
            setLavoroEseguito(rapportino.lavoroEseguito || '');
            setMaterialiImpiegati(rapportino.materialiImpiegati || '');
            setDettaglioOreTecnici(rapportino.dettaglioOreTecnici || []);
            setPresenze(rapportino.presenze || []);
        } else {
            setData(initialDate || dayjs());
            if (tecnici[0]) setTecnicoId(tecnici[0].id);
        }
    }, [rapportino, initialDate, tecnici]);
    
    useEffect(() => {
        const ids = dettaglioOreTecnici.map(d => d.tecnicoId);
        setPresenze([...new Set([tecnicoId, ...ids].filter(Boolean))]);
    }, [dettaglioOreTecnici, tecnicoId]);


    const handleSubmit = async () => {
        if (!tecnicoId || !tipoGiornataId || !data) {
            setFormError("Compilare i campi obbligatori: Tecnico, Data e Tipo Giornata.");
            return;
        }
        setFormError(null);
        setIsSaving(true);

        try {
            const dataToSave: Partial<Rapportino> = {
                data: Timestamp.fromDate(data.toDate()),
                tecnicoId,
                tipoGiornataId,
                naveId,
                luogoId,
                veicoloId,
                lavoroEseguito,
                materialiImpiegati,
                dettaglioOreTecnici,
                presenze,
                version: (rapportino?.version || 0) + 1,
            };
            
            if (rapportino && rapportino.id) {
                await rapportinoCloudService.update(rapportino.id, dataToSave);
            } else {
                await rapportinoCloudService.create(dataToSave);
            }
            onClose();
        } catch (e: any) {
            setFormError(`Errore durante il salvataggio: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingMasterData) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    const selectedTecnico = tecniciMap.get(tecnicoId) || null;
    const selectedTipoGiornata = tipiGiornataMap.get(tipoGiornataId) || null;
    const selectedNave = navi.find(n => n.id === naveId) || null;
    const selectedLuogo = luoghi.find(l => l.id === luogoId) || null;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <DialogTitle>{rapportino ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {formError && <Grid size={12}><Alert severity="error">{formError}</Alert></Grid>}
                    
                    <Grid
                        size={{
                            xs: 12,
                            md: 8
                        }}>
                        <Autocomplete
                            value={selectedTecnico}
                            onChange={(_, v) => setTecnicoId(v?.id || '')}
                            options={sortedTecnici}
                            getOptionLabel={(o) => `${o.cognome} ${o.nome}`}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(p) => <TextField {...p} label="Tecnico Responsabile" />}
                        />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 4
                        }}>
                        <DatePicker label="Data" value={data} onChange={setData} sx={{ width: '100%' }} />
                    </Grid>
                    <Grid size={12}>
                        <Autocomplete
                            value={selectedTipoGiornata}
                            onChange={(_, v) => setTipoGiornataId(v?.id || '')}
                            options={[...tipiGiornata]}
                            getOptionLabel={(o) => o.nome}
                            renderInput={(p) => <TextField {...p} label="Tipo Giornata" />}
                        />
                    </Grid>

                    <Grid size={12}><Divider sx={{ my: 1 }}><Chip label="Dettagli e Descrizione" /></Divider></Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 6
                        }}>
                        <Autocomplete value={selectedNave} onChange={(_,v) => setNaveId(v?.id || null)} options={navi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Nave" />} />
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            md: 6
                        }}>
                        <Autocomplete value={selectedLuogo} onChange={(_,v) => setLuogoId(v?.id || null)} options={luoghi} getOptionLabel={(o) => o.nome} isOptionEqualToValue={(o,v) => o.id === v.id} renderInput={(p) => <TextField {...p} label="Luogo" />} />
                    </Grid>
                    <Grid size={12}><TextField label="Lavoro Eseguito" value={lavoroEseguito} onChange={e => setLavoroEseguito(e.target.value)} fullWidth multiline rows={4} /></Grid>
                    <Grid size={12}><TextField label="Materiali Impiegati" value={materialiImpiegati} onChange={e => setMaterialiImpiegati(e.target.value)} fullWidth multiline rows={2} /></Grid>

                    <Grid size={12}><Divider sx={{ my: 1 }}><Chip label="Tecnici e Ore" /></Divider></Grid>
                    <Grid size={12}>
                       <GestoreOrariTecnico
                           dettaglioOreTecnici={dettaglioOreTecnici}
                           setDettaglioOreTecnici={setDettaglioOreTecnici}
                           tecniciDisponibili={sortedTecnici}
                           isReadOnly={false}
                       />
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Annulla</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={isSaving || loadingMasterData}>{isSaving ? <CircularProgress size={24} /> : 'Salva'}</Button>
            </DialogActions>
        </LocalizationProvider>
    );
};

export default RapportinoForm;
