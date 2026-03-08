import { ListItemButton, ListItemIcon, ListItemText, useTheme } from '@mui/material';
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
        <ListItemButton
            component={NavLink}
            to={to}
            selected={isActive}
            sx={{
                margin: theme.spacing(0.5, 1.5),
                borderRadius: theme.shape.borderRadius,
                '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                        color: theme.palette.primary.contrastText,
                    },
                    '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                    },
                },
                '&:not(.Mui-selected)': {
                    color: theme.palette.text.secondary,
                     '& .MuiListItemIcon-root': {
                        color: theme.palette.text.secondary,
                    },
                    '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                    }
                }
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
