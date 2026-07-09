
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Typography, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
    Autocomplete, Button, CircularProgress, Grid, Alert, Divider, Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, TextField, Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import { db } from '@/firebase';
import { doc, Timestamp, writeBatch } from 'firebase/firestore';
import { useData } from '@/hooks/useData.tsx';
import type { Rapportino, TipoGiornata, Tecnico } from '@/models/definitions';
import { rapportiniCollection, saveRapportino } from '@/services/rapportiniService';
import { v4 as uuidv4 } from 'uuid';
import { RapportinoSchema } from '@/models/rapportino.schema';

dayjs.locale('it');

interface DettaglioOreData {
    tecnicoId: string;
    nome: string;
    isManual: boolean;
    oraInizio: string | null;
    oraFine: string | null;
    pausa: number | null;
    ore: number | null;
}

const NON_LAVORATIVO_KEYWORDS = ['ferie', 'malattia', 'permesso', 'legge 104'];
const isGiornataLavorativa = (tipo: TipoGiornata | undefined): boolean => {
    if (!tipo || !tipo.nome) return true;
    return !NON_LAVORATIVO_KEYWORDS.some(keyword => tipo.nome.toLowerCase().includes(keyword));
};

const SEPARATORE_NOTE = '\n\n---\n\n';

const RapportinoForm: React.FC<{ onClose: () => void; rapportino?: Rapportino | null, initialDate?: Dayjs }> = ({ onClose, rapportino: initialRapportino, initialDate }) => {
    const isEditMode = Boolean(initialRapportino?.id);
    const { tipiGiornata, tecnici, navi, luoghi, loading } = useData();

    const [tecnicoScriventeId, setTecnicoScriventeId] = useState<string>('');
    const [data, setData] = useState<Dayjs | null>(initialDate || dayjs());
    const [tipoGiornataId, setTipoGiornataId] = useState('');
    const [isLavorativo, setIsLavorativo] = useState(true);
    const [naveId, setNaveId] = useState<string | null>(null);
    const [luogoId, setLuogoId] = useState<string | null>(null);
    const [descrizioneBreve, setDescrizioneBreve] = useState('');
    const [lavoroEseguito, setLavoroEseguito] = useState('');
    const [materialiImpiegati, setMaterialiImpiegati] = useState('');
    const [dettaglioOre, setDettaglioOre] = useState<DettaglioOreData[]>([]);
    const [isPeriodo, setIsPeriodo] = useState(false);
    const [dataInizio, setDataInizio] = useState<Dayjs | null>(dayjs());
    const [dataFine, setDataFine] = useState<Dayjs | null>(dayjs());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [firma, setFirma] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTecnico, setEditingTecnico] = useState<DettaglioOreData | null>(null);
    const [tempDettaglioOre, setTempDettaglioOre] = useState<DettaglioOreData | null>(null);

    const sortedTipiGiornata = useMemo(() => [...tipiGiornata].sort((a, b) => a.nome.localeCompare(b.nome)), [tipiGiornata]);
    const sortedTecnici = useMemo(() => [...tecnici].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`)), [tecnici]);
    const sortedNavi = useMemo(() => [...navi].sort((a, b) => a.nome.localeCompare(b.nome)), [navi]);
    const sortedLuoghi = useMemo(() => [...luoghi].sort((a, b) => a.nome.localeCompare(b.nome)), [luoghi]);

    useEffect(() => {
        if (isEditMode && initialRapportino && !loading) {
            const rapportino = initialRapportino;
            setData(rapportino.data && typeof rapportino.data.toDate === 'function' ? dayjs(rapportino.data.toDate()) : dayjs());
            setTecnicoScriventeId(rapportino.tecnicoId);
            setTipoGiornataId(rapportino.tipoGiornataId || '');
            const tipo = tipiGiornata.find(t => t.id === rapportino.tipoGiornataId);
            setIsLavorativo(isGiornataLavorativa(tipo));
            setNaveId(rapportino.naveId || null);
            setLuogoId(rapportino.luogoId || null);
            setDescrizioneBreve(rapportino.descrizioneBreve || '');

            const notes = rapportino.note || '';
            const [lavoro, ...materiali] = notes.split(SEPARATORE_NOTE);
            setLavoroEseguito(lavoro || '');
            setMaterialiImpiegati(materiali.join(SEPARATORE_NOTE) || '');

            setFirma(rapportino.firmaVettoriale || null);

            const allTecnicoIds = Array.from(new Set(rapportino.presenze || [rapportino.tecnicoId]));
            if (allTecnicoIds.length > 0 && tecnici.length > 0) {
                const dettagliCaricati: DettaglioOreData[] = allTecnicoIds.map(id => {
                    const tecnico = tecnici.find(t => t.id === id);
                    if (!tecnico) return null;
                    const dettaglioSalvato = rapportino.dettaglioOreTecnici?.find(d => d.tecnicoId === id);
                    return { /* ... */ };
                }).filter(Boolean as any);
                setDettaglioOre(dettagliCaricati);
            }
        } else if (!isEditMode && initialDate) {
            setData(initialDate);
        }
    }, [isEditMode, initialRapportino, loading, tipiGiornata, tecnici, initialDate]);

    const buildRapportinoDoc = useCallback((currentDate: Dayjs): RapportinoSchema => {
        const dettaglioOreTecniciToSave = dettaglioOre.map(d => ({
            tecnicoId: d.tecnicoId,
            nome: d.nome,
            ore: d.ore ?? 0,
            oraInizio: d.oraInizio ?? null,
            oraFine: d.oraFine ?? null,
            pausa: d.pausa ?? 0,
            isManual: d.isManual,
        }));

        const noteToSave = [lavoroEseguito, materialiImpiegati].filter(Boolean).join(SEPARATORE_NOTE);

        const doc: RapportinoSchema = {
            id: isEditMode ? initialRapportino!.id : uuidv4(),
            data: Timestamp.fromDate(currentDate.toDate()),
            tecnicoId: tecnicoScriventeId,
            tipoGiornataId: tipoGiornataId,
            naveId: naveId || null,
            luogoId: luogoId || null,
            descrizioneBreve: descrizioneBreve || '',
            note: noteToSave,
            isFirmaClienteRichiesta: false,
            nomeCliente: '',
            emailCliente: '',
            firmaVettoriale: firma || null,
            presenze: dettaglioOre.map(d => d.tecnicoId),
            dettaglioOreTecnici: dettaglioOreTecniciToSave,
        };
        return doc;
    }, [
        isEditMode, initialRapportino, tecnicoScriventeId, tipoGiornataId, naveId, luogoId, descrizioneBreve,
        lavoroEseguito, materialiImpiegati, firma, dettaglioOre
    ]);

    const handleSubmit = useCallback(async () => {
        // ... (validazione iniziale invariata)
        setError(null);
        setIsSaving(true);

        try {
            if (isPeriodo && !isEditMode) {
                // ... (gestione periodo invariata, usa già il converter)
            } else {
                const docData = buildRapportinoDoc(data!);
                await saveRapportino(docData);
            }
            onClose();
        } catch (e: any) {
            console.error("Errore salvataggio: ", e);
            setError(`Errore imprevisto durante il salvataggio: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    }, [
        data, tipoGiornataId, tecnicoScriventeId, dettaglioOre.length,
        buildRapportinoDoc, isEditMode, onClose,
        isPeriodo, dataInizio, dataFine
    ]);

    // ... (resto del componente invariato)

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="it">
            <DialogTitle>{isEditMode ? 'Modifica Rapportino' : 'Nuovo Rapportino'}</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                    {/* ... (JSX del form invariato) ... */}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
                 <Button onClick={onClose}>Annulla</Button>
                 <Box>
                     {/* ... (bottoni invariati) ... */}
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} /> : 'Salva'}
                    </Button>
                 </Box>
            </DialogActions>

            {/* ... (modale invariata) ... */}
        </LocalizationProvider>
    );
};

export default RapportinoForm;
