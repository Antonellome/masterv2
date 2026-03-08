import { useState, ReactNode } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
    AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemButton,
    ListItemIcon, ListItemText, Toolbar, Typography, Collapse
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SyncIcon from '@mui/icons-material/Sync';
import EngineeringIcon from '@mui/icons-material/Engineering';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 280;

const navItems = [
    { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { text: 'Scadenze', path: '/scadenze', icon: <EventNoteIcon /> },
    { 
        text: 'Anagrafiche', 
        icon: <PeopleAltIcon />,
        subItems: [
            { text: 'Clienti', path: '/anagrafiche' },
            { text: 'Tecnici', path: '/tecnici', icon: <EngineeringIcon /> },
            { text: 'Veicoli', path: '/veicoli', icon: <DirectionsCarIcon /> },
        ]
    },
    { text: 'Documenti', path: '/documenti', icon: <FolderSharedIcon /> },
    { text: 'Presenze', path: '/presenze', icon: <CoPresentIcon /> },
    { text: 'Reportistica', path: '/reportistica', icon: <AssessmentIcon /> },
    { text: 'Sincronizzazione', path: '/sincronizzazione', icon: <SyncIcon /> },
    { text: 'Impostazioni', path: '/settings', icon: <SettingsIcon /> },
    { text: 'Notifiche', path: '/notifications', icon: <NotificationsIcon /> },
];

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>('Anagrafiche'); // Default open
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleSubMenuClick = (text: string) => {
        setOpenSubMenu(openSubMenu === text ? null : text);
    };
    
    const getPageTitle = () => {
        for (const item of navItems) {
            if (item.path === location.pathname) {
                return item.text;
            }
            if (item.subItems) {
                for (const subItem of item.subItems) {
                    if (subItem.path === location.pathname) {
                        return subItem.text;
                    }
                }
            }
        }
        return 'Dashboard';
    }

    const drawer = (
        <div>
            <Toolbar />
            <List component="nav">
                {navItems.map((item) => {
                    if (item.subItems) {
                        return (
                            <div key={item.text}>
                                <ListItemButton onClick={() => handleSubMenuClick(item.text)}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                    {openSubMenu === item.text ? <ExpandLess /> : <ExpandMore />}
                                </ListItemButton>
                                <Collapse in={openSubMenu === item.text} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {item.subItems.map(subItem => (
                                            <ListItemButton 
                                                key={subItem.text} 
                                                component={NavLink}
                                                to={subItem.path}
                                                sx={{ pl: 4 }} 
                                            >
                                                <ListItemIcon>{subItem.icon}</ListItemIcon>
                                                <ListItemText primary={subItem.text} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Collapse>
                            </div>
                        )
                    }
                    return (
                        <ListItemButton 
                            key={item.text} 
                            component={NavLink}
                            to={item.path!}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    )
                })}
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        {getPageTitle()}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="navigation"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
