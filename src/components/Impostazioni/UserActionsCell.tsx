
import React from 'react';
import { Switch, IconButton, Tooltip, CircularProgress, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { AuthUser } from './GestioneUtenti';

interface UserActionsCellProps {
    user: AuthUser;
    onToggleStatus: (uid: string, currentStatus: boolean) => void;
    onDelete: (uid: string) => void;
    isLoading: boolean;
}

const UserActionsCell: React.FC<UserActionsCellProps> = ({ user, onToggleStatus, onDelete, isLoading }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            {isLoading ? (
                <CircularProgress size={24} />
            ) : (
                <>
                    <Tooltip title={user.disabled ? 'Abilita utente' : 'Disabilita utente'}>
                        <Switch
                            checked={!user.disabled}
                            onChange={() => onToggleStatus(user.uid, user.disabled)}
                            color="success"
                        />
                    </Tooltip>
                    <Tooltip title="Elimina utente">
                        <IconButton onClick={() => onDelete(user.uid)} color="error">
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </>
            )}
        </Box>
    );
};

export default UserActionsCell;
