import { Typography, Box } from '@mui/material';

interface PageTitleProps {
    title: string;
    subtitle?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle }) => {
    return (
        <Box mb={4}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="subtitle1" color="text.secondary">
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
};

export default PageTitle;
