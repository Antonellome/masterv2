import { ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface NavMenuItemProps {
    to: string;
    text: string;
    icon: ReactNode;
}

const NavMenuItem = ({ to, text, icon }: NavMenuItemProps) => {
    const theme = useTheme();
    const location = useLocation();

    const isActive = location.pathname.startsWith(to) && (to !== '/dashboard' || location.pathname === '/dashboard');

    return (
        <ListItem
            component={NavLink}
            to={to}
            sx={{
                margin: theme.spacing(0.5, 1.5),
                borderRadius: theme.shape.borderRadius,
                color: theme.palette.text.secondary,
                ...(isActive && {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.common.white, // Colore di fallback per ereditarietà
                    fontWeight: 'bold',
                    // FORZA IL COLORE BIANCO SU ICONA E TESTO QUANDO ATTIVO
                    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                        color: theme.palette.common.white,
                    }
                }),
                ...(!isActive && {
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                    }
                })
            }}
        >
            <ListItemIcon>
                {icon}
            </ListItemIcon>
            <ListItemText primary={text} />
        </ListItem>
    );
};

export default NavMenuItem;
