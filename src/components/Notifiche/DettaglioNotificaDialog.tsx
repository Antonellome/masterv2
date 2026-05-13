
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip
} from '@mui/material';
import { doc, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase'; 
import type { NotificaInviata } from '../../models/definitions'; // Aggiornato per usare il tipo corretto
import PeopleIcon from '@mui/icons-material/People';
import dayjs from 'dayjs';

interface DettaglioNotificaDialogProps {
    open: boolean;
    onClose: () => void;
    notifica: NotificaInviata | null; // Usiamo il tipo NotificaInviata
}

interface ReaderDetail {
    nome: string;
    readAt: Timestamp | null;
}

const DettaglioNotificaDialog: React.FC<DettaglioNotificaDialogProps> = ({ open, onClose, notifica }) => {
    const [readers, setReaders] = useState<ReaderDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!open || !notifica?.id) {
            setReaders([]);
            return;
        }

        setLoading(true);
        // FIX: Ascolta la collezione `notificheInviate` invece di `notificheRichieste`
        const unsubscribe = onSnapshot(doc(db, 'notificheInviate', notifica.id), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                const readByMap = data.readBy && typeof data.readBy === 'object' ? data.readBy : {};
                const readerUids = Object.keys(readByMap);

                if (readerUids.length > 0) {
                    try {
                        const readerPromises = readerUids.map(uid => getDoc(doc(db, 'tecnici', uid)));
                        const readerDocs = await Promise.all(readerPromises);

                        const detailedReaders = readerUids.map((uid, index) => {
                            const readerDoc = readerDocs[index];
                            let nome = 'Utente Sconosciuto';
                            if (readerDoc.exists()) {
                                const tecnicoData = readerDoc.data();
                                nome = `${tecnicoData.nome || ''} ${tecnicoData.cognome || ''}`.trim() || 'Nome non disponibile';
                            }
                            return {
                                nome: nome,
                                readAt: readByMap[uid]?.readAt || null 
                            };
                        });

                        detailedReaders.sort((a, b) => {
                            const timeA = a.readAt?.toMillis() || 0;
                            const timeB = b.readAt?.toMillis() || 0;
                            return timeB - timeA;
                        });

                        setReaders(detailedReaders);

                    } catch (error) {
                        console.error("Errore nel recuperare i dettagli dei lettori:", error);
                        setReaders([]);
                    }
                } else {
                    setReaders([]);
                }

            } else {
                // Questo può accadere se la notifica viene eliminata mentre il dialogo è aperto
                console.log("Il documento della notifica non è stato trovato in 'notificheInviate'.");
                setReaders([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Errore listener dettaglio notifica:", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [notifica, open]);

    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return 'Data non disponibile';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return dayjs(date).format('DD/MM/YYYY HH:mm');
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Dettagli Notifica
                {!loading && readers.length > 0 && (
                    <Chip 
                        icon={<PeopleIcon />} 
                        label={`Letto da ${readers.length} ${readers.length > 1 ? 'tecnici' : 'tecnico'}`}
                        color="success" 
                    />
                )}
            </DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {notifica && (
                             <Box mb={2}>
                                <Typography variant="h6" gutterBottom>{notifica.title}</Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{notifica.body}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                    Inviata il: {formatTimestamp(notifica.sentAt)} {/* FIX: usa sentAt */}
                                </Typography>
                             </Box>
                        )}
                        <Divider sx={{ my: 2 }}/>
                        <Typography variant="h6" gutterBottom>Elenco Letture</Typography>
                        {readers.length > 0 ? (
                            <List dense>
                                {readers.map((reader, index) => (
                                    <ListItem key={index} sx={{ py: 0, pl: 1 }}>
                                        <ListItemText 
                                            primary={reader.nome || 'Nome non disponibile'} 
                                            primaryTypographyProps={{ variant: 'body2' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">Nessuna lettura registrata.</Typography>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Chiudi</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DettaglioNotificaDialog;
