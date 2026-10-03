
import { useState, useEffect } from "react";
import { collection, doc, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { logger } from "@/utils/logger";
import type { NotificationTarget } from "@/models/definitions";

interface InviaNotificaDialogProps {
  open: boolean;
  onClose: () => void;
  target: NotificationTarget | null;
}

const InviaNotificaDialog = ({ open, onClose, target }: InviaNotificaDialogProps) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(""); // Rinominato da 'message' a 'body' per coerenza
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setError(null);
      setSuccess(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title || !body) {
      setError("Titolo e messaggio sono obbligatori.");
      return;
    }
    if (!target) {
      setError("Nessun destinatario valido specificato.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const notificheCollection = collection(db, "notifiche");

      // Costruisci il documento di notifica secondo le specifiche di notifiche.md
      const notificaData: any = {
        title: title,
        body: body,
        createdAt: Timestamp.now(),
        isRead: false,
        letta: false, // Campo legacy come da specifiche
      };

      // Aggiungi il campo di targeting corretto
      switch (target.type) {
        case 'user':
          notificaData.tecnicoId = target.id;
          break;
        case 'all':
          notificaData.target = 'all';
          break;
        case 'category':
          notificaData.categoriaId = target.id;
          break;
        default:
          throw new Error("Tipo di target non valido.");
      }

      logger.log("[DialogNotifica] Creazione documento notifica...", notificaData);

      // Aggiungi il singolo documento a Firestore
      await addDoc(notificheCollection, notificaData);

      logger.log("[DialogNotifica] Documento di notifica creato con successo.");
      setSuccess(`Notifica per "${target.name}" creata e pronta per essere processata dal sistema.`);
      
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (e: any) {
      logger.error("[DialogNotifica] Errore durante la creazione della notifica:", e);
      setError(`Errore critico: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Crea Notifica</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Typography sx={{ mb: 2 }}>
          Destinatario: <Typography component="span" sx={{ fontWeight: 'bold' }}>{target?.name || 'N/D'}</Typography>
        </Typography>

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
          id="body"
          label="Messaggio"
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSubmitting}
        />
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} disabled={isSubmitting}>Annulla</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Crea e Invia"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviaNotificaDialog;
