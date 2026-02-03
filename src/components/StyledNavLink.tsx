import { NavLink as RouterNavLink } from 'react-router-dom';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';

interface StyledNavLinkProps {
  to: string;
  icon: React.ReactNode;
  text: string;
}

const StyledNavLink = ({ to, icon, text }: StyledNavLinkProps) => {
  return (
    <ListItem disablePadding>
      <RouterNavLink
        to={to}
        style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}
      >
        {({ isActive }) => (
          <ListItemButton selected={isActive}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={text} />
          </ListItemButton>
        )}
      </RouterNavLink>
    </ListItem>
  );
};

export default StyledNavLink;
