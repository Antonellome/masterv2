import { NavLink as RouterLink, NavLinkProps as RouterLinkProps } from 'react-router-dom';
import { ListItemButton, ListItemIcon, ListItemText, useTheme } from '@mui/material';
import { forwardRef } from 'react';

interface StyledNavLinkProps extends Omit<RouterLinkProps, 'style'> {
  to: string;
  icon: React.ReactElement;
  text: string;
}

const StyledNavLink = forwardRef<HTMLAnchorElement, StyledNavLinkProps>(({ to, icon, text, ...otherProps }, ref) => {
  const theme = useTheme();

  const getNavItemStyle = (isActive: boolean) => {
    const activeColor = theme.palette.primary.main;
    const inactiveColor = theme.palette.text.secondary;

    return {
      '& .MuiListItemText-primary, & .MuiListItemIcon-root': {
        color: isActive ? activeColor : inactiveColor,
        transition: 'color 0.2s ease-in-out',
      },
      backgroundColor: isActive ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
      borderRadius: theme.shape.borderRadius,
      marginBottom: '4px',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
      },
    };
  };

  return (
    <RouterLink to={to} ref={ref} {...otherProps} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <ListItemButton sx={getNavItemStyle(isActive)}>
          <ListItemIcon>{icon}</ListItemIcon>
          <ListItemText primary={text} />
        </ListItemButton>
      )}
    </RouterLink>
  );
});

StyledNavLink.displayName = 'StyledNavLink';

export default StyledNavLink;
