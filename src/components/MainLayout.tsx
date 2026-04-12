
import { useState } from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    List,
    Toolbar,
    Typography,
    useMediaQuery,
    Avatar,
    Menu,
    MenuItem,
    Badge,
    Tooltip,
    useTheme,
    CircularProgress,
    keyframes,
    ListItemIcon
} from '@mui/material';
import {
    Menu as MenuIcon, People, EventNote, Notifications, EventBusy, 
    LocalShipping, Description, ExitToApp, Home as HomeIcon, 
    Settings as SettingsIcon, Archive as ArchiveIcon, Refresh as RefreshIcon, Dns,
    SentimentSatisfiedAltOutlined as SentimentSatisfiedAltOutlinedIcon
} from '@mui/icons-material';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAuth } from '@/contexts/AuthProvider';
import { useScadenze } from '@/hooks/useScadenze';
import { useRefresh } from '@/contexts/RefreshContext';
import Logo from '@/components/Logo';
import NavMenuItem from './NavMenuItem';

const drawerWidth = 260;
const appBarHeight = '80px';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 0, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
`;

const wink = keyframes`
  0%, 100% { transform: scale(1, 1); }
  50% { transform: scale(1, 0.1); }
`;

const menuItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' }, 
    { text: 'Reportistica', icon: <ArchiveIcon />, path: '/reportistica' },
    { text: 'Tecnici', icon: <People />, path: '/tecnici' },
    { text: 'Presenze', icon: <EventNote />, path: '/presenze' },
    { text: 'Anagrafiche', icon: <Dns />, path: '/anagrafiche' },
    { text: 'Documenti', icon: <Description />, path: '/documenti' },
    { text: 'Scadenze', icon: <EventBusy />, path: '/scadenze' },
    { text: 'Notifiche', icon: <Notifications />, path: '/notifications' },
];

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard', 
    '/reportistica': 'Reportistica',
    '/tecnici': 'Tecnici',
    '/presenze': 'Presenze', 
    '/anagrafiche': 'Anagrafiche',
    '/documenti': 'Documenti',
    '/scadenze': 'Scadenze',
    '/notifications': 'Notifiche',
    '/settings': 'Impostazioni',
};

const MainLayout = () => { 
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { user, loading } = useAuth();
    const { activeScadenzeCount, overallStatus } = useScadenze();
    const { triggerRefresh } = useRefresh();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const location = useLocation();

    const getPageTitle = (path: string) => {
        const anagraficheSubPages: { [key: string]: string } = {
            '/anagrafiche/clienti': 'Clienti',
            '/anagrafiche/navi': 'Navi',
            '/anagrafiche/luoghi': 'Luoghi',
            '/anagrafiche/ditte': 'Ditte',
            '/anagrafiche/categorie': 'Categorie',
            '/anagrafiche/tipi-giornata': 'Tipi Giornata',
        };

        if (anagraficheSubPages[path]) {
            return `Anagrafiche - ${anagraficheSubPages[path]}`;
        }

        return pageTitles[path] || '';
    };

    const currentPageTitle = getPageTitle(location.pathname);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    const drawerContent = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar sx={{ height: appBarHeight }} />
            <Box sx={{ 
                overflowY: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',  
                scrollbarWidth: 'none',  
            }}>
                <List>
                    {menuItems.map((item) => (
                        <NavMenuItem 
                            key={item.text} 
                            to={item.path} 
                            text={item.text} 
                            icon={item.icon} 
                        />
                    ))}
                </List>
            </Box>
        </Box>
    );

    const getScadenzeIconStyle = () => {
        switch (overallStatus) {
            case 'scaduto':
                return { animation: `${pulse} 2s infinite`, color: 'red', borderRadius: '50%' };
            case 'imminente':
                return { color: 'yellow' };
            default:
                return { color: 'inherit' };
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <CssBaseline />
            <AppBar component="header" className="no-print" position="fixed" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, height: appBarHeight, justifyContent: 'center' }}>
                <Toolbar sx={{ position: 'relative', height: '100%' }}>
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}><MenuIcon /></IconButton>
                    
                    <Box sx={{ 
                        width: { xs: 'auto', md: drawerWidth }, 
                        height: appBarHeight, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        position: { md: 'absolute' },
                        left: { md: 0 },
                        top: { md: 0 },
                        bgcolor: { md: 'background.paper' },
                         }}> 
                        <Logo />
                    </Box>
                    
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', pl: { xs: 0, md: `${drawerWidth}px` } }}>
                        <Typography variant="h5" component="h1" noWrap sx={{ fontWeight: '600' }}>{currentPageTitle}</Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />
                    
                    <Tooltip title="Aggiorna Dati"><IconButton color="inherit" onClick={triggerRefresh}><RefreshIcon /></IconButton></Tooltip>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Scadenze">
                             <IconButton 
                                 color="inherit" 
                                 onClick={() => navigate('/scadenze')}
                             >
                                 <Badge badgeContent={activeScadenzeCount} color="error">
                                     <EventBusy sx={getScadenzeIconStyle()} />
                                 </Badge>
                             </IconButton>
                        </Tooltip>

                        <Tooltip title="Notifiche">
                             <IconButton color="inherit" component={NavLink} to="/notifications">
                                 <Badge badgeContent={0} color="error">
                                     <Notifications />
                                 </Badge>
                             </IconButton>
                        </Tooltip>

                        <Tooltip title="Impostazioni">
                            <IconButton color="inherit" component={NavLink} to="/settings">
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Box sx={{ mr: 2 }}>
                        <Tooltip title="Logout">
                            <IconButton size="large" aria-label="account of current user" aria-haspopup="true" onClick={handleMenu} color="inherit">
                                <Avatar sx={{ bgcolor: 'primary.main', color: 'common.white'}} src={user?.photoURL || undefined} alt={user?.displayName || ''} />
                            </IconButton>
                        </Tooltip>
                        <Menu id="menu-appbar" anchorEl={anchorEl} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} keepMounted transformOrigin={{ vertical: 'top', horizontal: 'right' }} open={Boolean(anchorEl)} onClose={handleClose}>
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><ExitToApp fontSize='small' /></ListItemIcon>
                                Logout
                            </MenuItem>
                        </Menu>
                    </Box>
                    
                    <Tooltip 
                        componentsProps={{
                            tooltip: {
                                sx: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    backdropFilter: 'blur(4px)',
                                },
                            },
                        }}
                        title={
                            <SentimentSatisfiedAltOutlinedIcon sx={{ fontSize: '2rem', color: '#007FFF', animation: `${wink} 2s ease-in-out infinite` }} />
                        }
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 16,
                                cursor: 'default'
                            }}
                        >
                            <Typography 
                                variant="caption" 
                                sx={{
                                    fontFamily: 'Dancing Script, cursive',
                                    fontStyle: 'italic',
                                    color: '#007FFF', // Blu Elettrico
                                    fontSize: '1rem',
                                }}
                            >
                                by AS
                            </Typography>
                        </Box>
                    </Tooltip>
                </Toolbar>
            </AppBar>
            
            <Box component='nav' className="no-print" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                <Drawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? mobileOpen : true} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }}>
                    {drawerContent}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Toolbar sx={{ minHeight: `${appBarHeight} !important` }} />
                <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default MainLayout;
