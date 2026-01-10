import { Button } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';

interface PrintButtonProps {
    onClick: () => void;
}

const PrintButton = ({ onClick }: PrintButtonProps) => {
    return (
        <Button
            color="primary"
            startIcon={<PrintIcon />}
            onClick={onClick}
        >
            Stampa
        </Button>
    );
};

export default PrintButton;
