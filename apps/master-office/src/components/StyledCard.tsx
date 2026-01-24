import { Paper, styled } from '@mui/material';

/**
 * A reusable card component that adapts its style to the current theme (light or dark).
 */
const StyledCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,

    // Applica stili diversi in base alla modalità del tema
    ...(theme.palette.mode === 'dark' ? {
        // Stili per la DARK MODE (mantiene l'aspetto personalizzato)
        color: '#ffffff',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        border: `2px solid ${theme.palette.primary.light}`,
        boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.2)',
        '& .MuiTypography-root': {
            color: '#ffffff',
        },
        '& .MuiSvgIcon-root': {
            color: 'rgba(255, 255, 255, 0.9)',
        }
    } : {
        // Stili per la LIGHT MODE (usa i valori predefiniti del tema)
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[2],
    }),

    // Applica stili specifici per le card nella HomePage in modalità chiara
    '.home-page & ': {
        ...(theme.palette.mode === 'light' && {
            '& .MuiTypography-root': {
                color: theme.palette.primary.main,
            },
            '& .MuiSvgIcon-root': {
                color: theme.palette.primary.main,
            }
        })
    }
}));

export default StyledCard;
