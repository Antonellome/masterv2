
import { useState, useEffect } from "react";
import { collection, doc, writeBatch, Timestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebase"; // CORRECTED IMPORT PATH
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  CircularProgress, 
  Alert
} from "@mui/material";
import { useRapportiniStore } from "@/store/useRapportiniStore";
import { logger } from "@/utils/logger";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

interface InviaNotificaDialogProps {
  open: boolean;
  onClose: () => void;
}

const InviaNotificaDialog = ({ open, onClose }: InviaNotificaDialogProps) => {
  const [targetType, setTargetType] = useState("all");
  const [selectedTecnici, setSelectedTecnici] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tecnici = useRapportiniStore((state) => state.tecnici);

  useEffect(() => {
    if (open) {
      // Reset state on open
      setTargetType("all");
      setSelectedTecnici([]);
      setTitle("");
      setMessage("");
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleTecniciChange = (event: any) => {
    const { target: { value } } = event;
    setSelectedTecnici(typeof value === "string" ? value.split(",") : value);
  };

  const handleSubmit = async () => {
    if (!title || !message) {
        setError("Titolo e messaggio sono obbligatori.");
        return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
        const batch = writeBatch(db);
        const notificheCollection = collection(db, "notifiche");

        let targetUids: string[] = [];

        if (targetType === "all") {
            targetUids = tecnici.map(t => t.id);
        } else if (targetType === "specific" && selectedTecnici.length > 0) {
            targetUids = selectedTecnici;
        }

        if (targetUids.length === 0) {
            setError("Nessun destinatario selezionato.");
            setIsSubmitting(false);
            return;
        }
        
        // Create notification documents in batch
        targetUids.forEach(uid => {
            const newNotificaRef = doc(notificheCollection);
            batch.set(newNotificaRef, {
                userId: uid,
                title,
                message,
                isRead: false,
                createdAt: Timestamp.now(),
                type: 'info' // O un altro tipo se necessario
            });
        });

        await batch.commit();

        logger.log(`Notifiche inviate con successo a ${targetUids.length} utenti.`);
        setSuccess(`Notifica inviata con successo a ${targetUids.length} destinatari.`);
        setTimeout(() => {
           onClose();
        }, 2000);

    } catch (e: any) {
        logger.error("Errore durante l'invio delle notifiche:", e);
        setError(`Errore: ${e.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Invia Nuova Notifica</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <TextField
          autoFocus
          margin="dense"
          id="title"
          label="Titolo"
          type="text"
          fullWidth
          variant="outlined"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
        <TextField
          margin="dense"
          id="message"
          label="Messaggio"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
        />
        <FormControl fullWidth margin="dense" disabled={isSubmitting}>
          <InputLabel id="target-type-label">Destinatari</InputLabel>
          <Select
            labelId="target-type-label"
            id="target-type"
            value={targetType}
            label="Destinatari"
            onChange={(e) => setTargetType(e.target.value)}
          >
            <MenuItem value="all">Tutti i Tecnici</MenuItem>
            <MenuItem value="specific">Seleziona Tecnici</MenuItem>
          </Select>
        </FormControl>

        {targetType === "specific" && (
          <FormControl fullWidth margin="dense" disabled={isSubmitting}>
            <InputLabel id="tecnici-select-label">Tecnici</InputLabel>
            <Select
              labelId="tecnici-select-label"
              id="tecnici-select"
              multiple
              value={selectedTecnici}
              onChange={handleTecniciChange}
              input={<OutlinedInput label="Tecnici" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((id) => {
                      const tecnico = tecnici.find(t => t.id === id);
                      return <span key={id}>{tecnico ? `${tecnico.cognome} ${tecnico.nome}` : id}</span>;
                  }).join(', ')}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {tecnici.map((tecnico) => (
                <MenuItem key={tecnico.id} value={tecnico.id}>
                  <Checkbox checked={selectedTecnici.indexOf(tecnico.id) > -1} />
                  <ListItemText primary={`${tecnico.cognome} ${tecnico.nome}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Annulla</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : "Invia"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviaNotificaDialog;
