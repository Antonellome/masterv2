import React from 'react';
import { Card, CardContent, Typography, Switch, Box } from '@mui/material';
import { useThemeContext } from '@/hooks/useThemeContext';
import { WbSunny, Brightness2 } from '@mui/icons-material';

const ThemeSwitcher = () => {
  const { mode, toggleTheme } = useThemeContext();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            {mode === 'light' ? (
              <WbSunny color="action" sx={{ mr: 2 }} />
            ) : (
              <Brightness2 color="action" sx={{ mr: 2 }} />
            )}
            <Typography variant="h6" component="div">
              Modalità Tema
            </Typography>
          </Box>
          <Switch
            checked={mode === 'dark'}
            onChange={toggleTheme}
            name="themeSwitch"
            color="primary"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Passa dalla modalità chiara a quella scura per adattare l&apos;interfaccia alle tue preferenze.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ThemeSwitcher;
