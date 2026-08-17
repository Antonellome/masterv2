
import { Outlet } from 'react-router-dom';
import SideNav from '@/components/SideNav';
import { Box } from '@mui/material';

const MainLayout: React.FC = () => {
  return (
    // QUI L'ERRORE. DEVE ESSERE 100% PER EREDITARE, NON 100vh.
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <SideNav />
      <Box 
        component="main" 
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%', 
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
