import React from 'react';
import { CardActionArea, Typography, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import StyledCard from '@/components/StyledCard';

interface ActionCardProps {
  title: string;
  subtitle?: string;
  to: string;
  icon: React.ReactElement;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, to, icon }) => {
  return (
    <StyledCard sx={{ height: '100%', minHeight: '150px', p: 0 }}> 
      <CardActionArea 
        component={RouterLink} 
        to={to}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          p: 2,
        }}
      >
        <Box sx={{ 
          color: 'primary.main', 
          fontSize: 32, 
          mr: 1.5,
          display: 'flex',
          alignItems: 'center'
        }}>
          {React.cloneElement(icon, { style: { fontSize: 'inherit' } })}
        </Box>
        <Box>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </StyledCard>
  );
};

export default ActionCard;
