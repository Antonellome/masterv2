import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';

interface SectionLayoutProps {
  title: string;
  children: React.ReactNode;
}

const SectionLayout: React.FC<SectionLayoutProps> = ({ title, children }) => {
  const theme = useTheme();

  return (
    <Paper 
      elevation={3}
      sx={{
        width: '100%',
        overflow: 'hidden', // Ensures the inner elements respect the border radius
        border: `1px solid ${theme.palette.primary.main}`,
        borderRadius: theme.shape.borderRadius,
      }}
    >
      {/* Riga del titolo scura */}
      <Box 
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? '#272727' : theme.palette.grey[800],
          padding: theme.spacing(1, 2),
        }}
      >
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Box>

      {/* Contenuto con sfondo grigio scuro */}
      <Box 
        sx={{
          padding: theme.spacing(2),
          backgroundColor: theme.palette.background.paper, // #1e1e1e in dark mode
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default SectionLayout;
