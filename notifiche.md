# Guida all'Implementazione dell'Invio Notifiche

Questo documento descrive come creare una pagina o un componente React per inviare notifiche ai tecnici. Questa funzionalità è pensata per un'applicazione "Admin" o "Master".

---

## 1. Obiettivo

Creare un'interfaccia che permetta a un amministratore di scrivere e inviare una notifica a un tecnico specifico. La notifica verrà salvata nella collezione `notifiche` su Firestore, e sarà poi visibile al tecnico nella sua app.

---

## 2. Modello Dati (Firestore)

L'invio di una notifica consiste nel creare un nuovo documento nella collezione `notifiche` con la seguente struttura.

| Campo       | Tipo      | Descrizione                                                  |
|-------------|-----------|--------------------------------------------------------------|
| `tecnicoId` | `string`  | L'**UID** del tecnico a cui è destinata la notifica.         |
| `title`     | `string`  | Il titolo della notifica.                                    |
| `body`      | `string`  | Il corpo del messaggio.                                      |
| `createdAt` | `Timestamp` | La data e l'ora di creazione della notifica.                 |
| `isRead`    | `boolean` | Stato di lettura (impostato a `false` alla creazione).       |
| `link`      | `string`  | (Opzionale) Un link per reindirizzare l'utente a una pagina. |

---

## 3. Implementazione App Master (Invio Notifiche)

Di seguito sono riportati esempi per un componente React e la funzione di servizio necessaria per l'app Master.

### a) Servizio di Invio (`notificationAdminService.ts`)

Creare un nuovo file di servizio per gestire la logica di creazione del documento su Firestore.

```typescript
import { collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db as firestoreDb } from '@/firebase'; // Assicurarsi che il percorso sia corretto

// Interfaccia per rappresentare un tecnico (semplificata)
export interface Tecnico {
  id: string; // Corrisponde all'UID
  nome: string;
  cognome: string;
}

/**
 * Recupera una lista di tutti i tecnici per la select.
 * @returns Una lista di tecnici.
 */
export const getAllTecnici = async (): Promise<Tecnico[]> => {
  const tecniciCollection = collection(firestoreDb, 'tecnici');
  const snapshot = await getDocs(tecniciCollection);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({
    id: doc.id,
    nome: doc.data().nome || '',
    cognome: doc.data().cognome || '',
  }));
};

/**
 * Invia una notifica a un tecnico specifico.
 * @param tecnicoId L'UID del tecnico.
 * @param title Il titolo della notifica.
 * @param body Il corpo del messaggio.
 * @returns L'ID della notifica creata.
 */
export const inviaNotifica = async (tecnicoId: string, title: string, body: string): Promise<string> => {
  if (!tecnicoId || !title || !body) {
    throw new Error('Tutti i campi sono obbligatori.');
  }

  try {
    const notificheCollection = collection(firestoreDb, 'notifiche');
    const nuovoDoc = await addDoc(notificheCollection, {
      tecnicoId: tecnicoId,
      title: title,
      body: body,
      createdAt: Timestamp.now(),
      isRead: false,
    });
    console.log(`Notifica inviata con successo con ID: ${nuovoDoc.id}`);
    return nuovoDoc.id;
  } catch (error) {
    console.error("Errore durante l'invio della notifica:", error);
    throw new Error("Impossibile inviare la notifica.");
  }
};
```

### b) Componente React (`InviaNotifichePage.tsx`)

Questo componente fornisce il form per l'invio.

```typescript
import React, { useState, useEffect } from 'react';
import { 
    Container, 
    Typography, 
    TextField, 
    Button, 
    CircularProgress, 
    Alert, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel 
} from '@mui/material';
import { inviaNotifica, getAllTecnici, Tecnico } from './notificationAdminService'; // Assicurarsi che il percorso sia corretto

const InviaNotifichePage: React.FC = () => {
    const [tecnici, setTecnici] = useState<Tecnico[]>([]);
    const [selectedTecnico, setSelectedTecnico] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchTecnici = async () => {
            try {
                const listaTecnici = await getAllTecnici();
                setTecnici(listaTecnici);
            } catch (err) {
                setError('Impossibile caricare la lista dei tecnici.');
            }
        };
        fetchTecnici();
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await inviaNotifica(selectedTecnico, title, body);
            setSuccess(`Notifica inviata con successo a ${tecnici.find(t => t.id === selectedTecnico)?.nome}!`);
            // Reset form
            setSelectedTecnico('');
            setTitle('');
            setBody('');
        } catch (err: any) {
            setError(err.message || 'Si è verificato un errore.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>Invia Notifica</Typography>
            <form onSubmit={handleSubmit}>
                <FormControl fullWidth margin="normal">
                    <InputLabel id="tecnico-select-label">Tecnico</InputLabel>
                    <Select
                        labelId="tecnico-select-label"
                        value={selectedTecnico}
                        label="Tecnico"
                        onChange={(e) => setSelectedTecnico(e.target.value)}
                        required
                    >
                        {tecnici.map((tecnico) => (
                            <MenuItem key={tecnico.id} value={tecnico.id}>
                                {`${tecnico.nome} ${tecnico.cognome}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    label="Titolo"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <TextField
                    label="Corpo del messaggio"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    multiline
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                />
                <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ mt: 2 }}>
                    {loading ? <CircularProgress size={24} /> : 'Invia Notifica'}
                </Button>
            </form>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        </Container>
    );
};

export default InviaNotifichePage;
```