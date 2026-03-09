import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Paper, IconButton, Box, Typography, Chip, Tooltip, Switch
} from '@mui/material';
import { Edit, Delete, Email, Sync, SyncDisabled, VpnKey } from '@mui/icons-material'; // <-- Importata VpnKey
import type { Tecnico, Ditta, CategoriaTecnico } from '@/models/definitions';

interface TecniciListProps {
    tecnici: Tecnico[];
    ditte?: Ditta[];
    categorie?: CategoriaTecnico[];
    onRowClick?: (tecnico: Tecnico) => void; 
    onEdit?: (tecnico: Tecnico) => void; 
    onDelete?: (tecnico: Tecnico) => void;
    onEditEmail?: (tecnico: Tecnico) => void;
    onToggleSincronizzazione?: (tecnico: Tecnico) => void;
    onProvisionUser?: (tecnico: Tecnico) => void; // <-- Nuova prop
}

const getRelationName = (id: string | undefined, list: {id: string, nome: string}[]) => {
    if (!id) return <Typography variant="body2" color="text.secondary">N/A</Typography>;
    const item = list.find(i => i.id === id);
    return item ? item.nome : 'Non trovata';
};

const TecniciList: React.FC<TecniciListProps> = ({ 
    tecnici, ditte, categorie, onRowClick, onEdit, onDelete, onEditEmail, onToggleSincronizzazione, onProvisionUser
}) => {
    if (!tecnici || tecnici.length === 0) {
        return <Typography sx={{ textAlign: 'center', p: 3, mt: 2 }}>Nessun tecnico trovato.</Typography>;
    }

    const handleActionClick = (e: React.MouseEvent, action: (tecnico: Tecnico) => void, tecnico: Tecnico) => {
        e.stopPropagation();
        action(tecnico);
    };

    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>, tecnico: Tecnico) => {
        e.stopPropagation();
        if (onToggleSincronizzazione) {
            onToggleSincronizzazione(tecnico);
        }
    };

    const isAnagraficaMode = !!(onEdit && onDelete && ditte && categorie);

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table aria-label="elenco tecnici">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Cognome e Nome</TableCell>
                        {isAnagraficaMode && <TableCell sx={{ fontWeight: 'bold' }}>Stato</TableCell>}
                        {isAnagraficaMode && <TableCell sx={{ fontWeight: 'bold' }}>Ditta</TableCell>}
                        {isAnagraficaMode && <TableCell sx={{ fontWeight: 'bold' }}>Categoria</TableCell>}
                        {!isAnagraficaMode && <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>}
                        {!isAnagraficaMode && <TableCell sx={{ fontWeight: 'bold' }}>Sincronizzazione</TableCell>}
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Azioni</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tecnici.map((tecnico) => {
                        const canProvision = tecnico.sincronizzazioneAttiva && !!tecnico.email;
                        let provisionTooltip = "Invia email con link di accesso";
                        if (!tecnico.sincronizzazioneAttiva) {
                            provisionTooltip = "Abilita la sincronizzazione per poter inviare l'accesso";
                        } else if (!tecnico.email) {
                            provisionTooltip = "Aggiungi un'email per poter inviare l'accesso";
                        }

                        return (
                            <TableRow key={tecnico.id} hover onClick={() => onRowClick?.(tecnico)} sx={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                                <TableCell component="th" scope="row">
                                    {tecnico.cognome} {tecnico.nome}
                                </TableCell>
                                
                                {isAnagraficaMode ? (
                                    <>
                                        <TableCell>
                                            <Chip 
                                                label={tecnico.attivo ? 'Attivo' : 'Inattivo'}
                                                color={tecnico.attivo ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{getRelationName(tecnico.dittaId, ditte!)}</TableCell>
                                        <TableCell>{getRelationName(tecnico.categoriaId, categorie!)}</TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{tecnico.email || 'N/D'}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                icon={tecnico.sincronizzazioneAttiva ? <Sync/> : <SyncDisabled/>}
                                                label={tecnico.sincronizzazioneAttiva ? 'Attiva' : 'Disattiva'}
                                                color={tecnico.sincronizzazioneAttiva ? 'success' : 'default'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                    </>
                                )}

                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {onEdit && (
                                            <Tooltip title="Modifica Anagrafica">
                                                <IconButton onClick={(e) => handleActionClick(e, onEdit, tecnico)} size="small">
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onDelete && (
                                            <Tooltip title="Elimina Tecnico">
                                                <IconButton onClick={(e) => handleActionClick(e, onDelete, tecnico)} size="small" color="error">
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onEditEmail && (
                                            <Tooltip title="Modifica Email">
                                                <IconButton onClick={(e) => handleActionClick(e, onEditEmail, tecnico)} size="small">
                                                    <Email fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onToggleSincronizzazione && (
                                            <Tooltip title={tecnico.sincronizzazioneAttiva ? 'Disattiva Sincronizzazione' : 'Attiva Sincronizzazione'}>
                                                <Switch
                                                    checked={tecnico.sincronizzazioneAttiva || false}
                                                    onChange={(e) => handleToggle(e, tecnico)}
                                                    size="small"
                                                />
                                            </Tooltip>
                                        )}
                                        {onProvisionUser && (
                                            <Tooltip title={provisionTooltip}>
                                                <span>
                                                    <IconButton 
                                                        onClick={(e) => handleActionClick(e, onProvisionUser, tecnico)} 
                                                        size="small" 
                                                        disabled={!canProvision}
                                                    >
                                                        <VpnKey fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default TecniciList;
