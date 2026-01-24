import StyledCard from '@/components/StyledCard';
import Presenze from '@/components/Presenze'; 
import { Box } from '@mui/material';

const PresenzePage = () => {
  return (
    <Box sx={{ p: 3 }}>
        <StyledCard>
            <Presenze />
        </StyledCard>
    </Box>
  );
};

export default PresenzePage;
