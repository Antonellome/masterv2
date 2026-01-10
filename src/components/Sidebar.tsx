import { List } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SyncIcon from '@mui/icons-material/Sync';
import StyledNavLink from './StyledNavLink';

const Sidebar = () => {
  const menuItems = [
    { to: '/', icon: <HomeIcon />, text: 'Home' },
    { to: '/dashboard', icon: <DashboardIcon />, text: 'Dashboard' },
    { to: '/anagrafiche', icon: <PeopleIcon />, text: 'Anagrafiche' },
    { to: '/documenti', icon: <DescriptionIcon />, text: 'Documenti' },
    { to: '/presenze', icon: <PlaylistAddCheckIcon />, text: 'Presenze' },
    { to: '/reportistica', icon: <AssessmentIcon />, text: 'Reportistica' },
    { to: '/scadenze', icon: <EventNoteIcon />, text: 'Scadenze' },
    { to: '/sincronizzazione', icon: <SyncIcon />, text: 'Sincronizzazione' },
    { to: '/notifications', icon: <NotificationsIcon />, text: 'Notifiche' },
    { to: '/settings', icon: <SettingsIcon />, text: 'Impostazioni' },
  ];

  return (
    <List sx={{ p: 1 }}>
      {menuItems.map((item) => (
        <StyledNavLink
          key={item.to}
          to={item.to}
          icon={item.icon}
          text={item.text}
        />
      ))}
    </List>
  );
};

export default Sidebar;
