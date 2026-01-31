import { Box, Typography, useTheme } from '@mui/material';
import './Logo.css';

const Logo = () => {
    const theme = useTheme();

    return (
        <Box className='ripple-container' sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 2 }}>
            {/* Line 1 */}
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: theme.palette.common.white, lineHeight: 1.2 }}>
                R.I.S.O.
            </Typography>
            
            {/* Line 2 */}
            <Typography variant="subtitle1" component="span" sx={{ color: theme.palette.common.white, mt: 0.5 }}>
                Master Office
            </Typography>
            
            {/* Line 3 */}
            <Typography variant="caption" component="span" sx={{ color: theme.palette.primary.light, fontStyle: 'italic', mt: 0.5 }}>
                Report Individuali Sincronizzati Online
            </Typography>
        </Box>
    );
};

export default Logo;
