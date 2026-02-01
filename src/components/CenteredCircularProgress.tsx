import { Box, CircularProgress } from '@mui/material';

export const CenteredCircularProgress = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100%',
      }}
    >
      <CircularProgress />
    </Box>
  );
};
