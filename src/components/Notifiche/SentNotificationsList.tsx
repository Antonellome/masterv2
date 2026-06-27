
import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit, doc, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import {
    Typography,
    Box,
    CircularProgress,
    Alert,
    Divider,
    Chip,
    IconButton,
    Collapse,
    Tooltip
} from '@mui/material';
import { format, isValid } from 'date-fns';
import it from 'date-fns/locale/it';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import type { NotificaInviata } from '@/models/definitions';

const SentNotificationsList = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const notificationsQuery = query(
        collection(db, 'notifications'), 
        orderBy('createdAt', 'desc'),
        limit(100)
    );

    const [notificationsSnapshot, loading, error] = useCollection(notificationsQuery);

    const handleToggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleDelete = async (id: string, batchId?: string) => {
        try {
            if (batchId) {
                const batch = writeBatch(db);
                const recipientsQuery = query(collection(db, 'notifications'), where('batchId', '==', batchId));
                const recipientsSnapshot = await getDocs(recipientsQuery);
                recipientsSnapshot.forEach((recipientDoc) => batch.delete(recipientDoc.ref));
                batch.delete(doc(db, 'notificheInviate', id));
                await batch.commit();
            } else {
                await deleteDoc(doc(db, 'notifications', id));
            }
            alert('NOTIFICA ELIMINATA.');
        } catch (err: any) {
            console.error("ERRORE DI CANCELLAZIONE:", err);
            alert(`Cancellazione fallita. Causa: ${err.message}`);
        }
    };

    const renderTargetChip = (notification: NotificaInviata) => {
        const { target } = notification;
        if (!target || !target.type) return null;
        const chipProps = { size: "small", variant: "outlined", sx: { ml: 1 } };
        switch (target.type) {
            case 'user': return <Chip label={`👤 ${target.name}`} color="primary" {...chipProps} />;
            case 'category': return <Chip label={`🏷️ ${target.name}`} color="secondary" {...chipProps} />;
            case 'all': return <Chip label="📢 Tutti" color="warning" {...chipProps} />;
            default: return <Chip label="Sconosciuto" {...chipProps} />;
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>Errore: {error.message}</Alert>;
    if (!notificationsSnapshot || notificationsSnapshot.docs.length === 0) return <Alert severity="info" sx={{ m: 2 }}>Nessuna notifica.</Alert>;

    return (
        <Box sx={{ p: 0 }}> {/* --- SOSTITUITO <List> CON <Box> --- */}
            {notificationsSnapshot.docs.map((doc, index) => {
                const notification = { id: doc.id, ...doc.data() } as NotificaInviata;
                const isExpanded = expandedId === doc.id;
                const createdAtDate = notification.createdAt?.toDate ? notification.createdAt.toDate() : null;
                const formattedDate = isValid(createdAtDate) ? format(createdAtDate, "PPP 'alle' HH:mm", { locale: it }) : 'Data non disponibile';

                return (
                    // --- SOSTITUITO <ListItem> CON <Box> E <Divider> --- 
                    <React.Fragment key={doc.id}>
                        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                                    {notification.recipientsCount > 0 ? (
                                        <Tooltip title={`Inviata a ${notification.recipientsCount} destinatari`}>
                                            <DoneAllIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Inviato">
                                            <CheckIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </Tooltip>
                                    )}
                                </Box>
                                <IconButton size="small" onClick={() => handleToggleExpand(doc.id)}>
                                    <ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                </IconButton>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 0.5 }}>
                                <Typography variant="body1" component="div" fontWeight="bold">{notification.title}</Typography>
                                {renderTargetChip(notification)}
                                    <Chip label={`${notification.recipientsCount} destinatari`} size="small" sx={{ ml: 1 }} />
                            </Box>

                            <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ width: '100%', mt: 1 }}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ py: 1, whiteSpace: 'pre-wrap' }}>
                                    {notification.body}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', pt: 1 }}>
                                    <IconButton size="small" onClick={() => handleDelete(doc.id, notification.batchId)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Collapse>
                        </Box>
                        {index < notificationsSnapshot.docs.length - 1 && <Divider />}
                    </React.Fragment>
                );
            })}
        </Box>
    );
};

export default SentNotificationsList;
