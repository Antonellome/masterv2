
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const drawerWidth = 240;

const SideNav: React.FC = () => {
  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Nuovo Rapportino', icon: <AddCircleIcon />, path: '/rapportino/new' },
    { text: 'Report Mensili', icon: <AssessmentIcon />, path: '/report-mensili' },
    { text: 'Anagrafiche', icon: <PeopleIcon />, path: '/anagrafiche' },
  ];

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <Toolbar />
      <List>
        {menuItems.map((item, index) => (
          <ListItem button component={RouterLink} to={item.path} key={item.text}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default SideNav;
