import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Tecnico } from '@/models/definitions';
import { Typography, Paper } from '@mui/material';
import TecniciList from '@/components/Anagrafiche/TecniciList';
import EmailEditDialog from './EmailEditDialog'; // Assumiamo che questo componente esista

interface GestioneSincronizzazioneProps {
    tecnici: Tecnico[];
    refresh: () => void;
}

const GestioneSincronizzazione: React.FC<GestioneSincronizzazioneProps> = ({ tecnici, refresh }) => {
    const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);

    const handleToggleSincronizzazione = async (tecnico: Tecnico) => {
        const tecnicoRef = doc(db, 'tecnici', tecnico.id);
        try {
            await updateDoc(tecnicoRef, { 
                sincronizzazioneAttiva: !tecnico.sincronizzazioneAttiva 
            });
            refresh(); // Aggiorna la lista
        } catch (error) {
            console.error("Errore durante l'aggiornamento: ", error);
        }
    };

    const handleOpenEditEmail = (tecnico: Tecnico) => {
        setEditingTecnico(tecnico);
    };

    const handleCloseEditEmail = () => {
        setEditingTecnico(null);
    };

    const handleSaveEmail = async (email: string) => {
        if (!editingTecnico) return;
        const tecnicoRef = doc(db, 'tecnici', editingTecnico.id);
        try {
            await updateDoc(tecnicoRef, { email });
            refresh();
        } catch (error) {
            console.error("Errore durante il salvataggio dell'email: ", error);
        } finally {
            handleCloseEditEmail();
        }
    };

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Sincronizzazione Tecnici</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Abilita o disabilita la sincronizzazione per i tecnici e modifica le loro email.
            </Typography>
            
            <TecniciList 
                tecnici={tecnici}
                onEditEmail={handleOpenEditEmail}
                onToggleSincronizzazione={handleToggleSincronizzazione}
            />

            {editingTecnico && (
                <EmailEditDialog
                    open={!!editingTecnico}
                    onClose={handleCloseEditEmail}
                    onSave={handleSaveEmail}
                    email={editingTecnico.email || ''}
                />
            )}
        </Paper>
    );
};

export default GestioneSincronizzazione;
