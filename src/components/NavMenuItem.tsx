
import { ListItemButton, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavMenuItemProps {
    to: string;
    text: string;
    icon: ReactNode;
}

const NavMenuItem = ({ to, text, icon }: NavMenuItemProps) => {
    const theme = useTheme();

    return (
        <ListItemButton
            component={NavLink}
            to={to}
            // `NavLink` gestirà automaticamente lo stato "attivo".
            // Non è necessario usare `selected` o calcolare `isActive` manualmente.
            sx={{
                margin: theme.spacing(0.5, 1.5),
                borderRadius: theme.shape.borderRadius,
                color: theme.palette.text.secondary,
                '& .MuiListItemIcon-root': {
                    color: theme.palette.text.secondary,
                },
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
                // Stile per il link attivo (quando la classe .active è presente)
                '&.active': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                        color: theme.palette.primary.contrastText,
                    },
                    '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                    },
                },
            }}
        >
            <ListItemIcon>
                {icon}
            </ListItemIcon>
            <ListItemText primary={text} />
        </ListItemButton>
    );
};

export default NavMenuItem;
