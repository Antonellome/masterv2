import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Box } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { Categoria } from '@/models/definitions';

interface CategoriaFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (values: Categoria) => void;
    categoria: Categoria | null;
}

const validationSchema = Yup.object({
    nome: Yup.string().required('Il nome è obbligatorio').min(2, 'Il nome deve avere almeno 2 caratteri'),
});

const CategoriaForm = ({ open, onClose, onSave, categoria }: CategoriaFormProps) => {
    
    const formik = useFormik<Categoria>({
        initialValues: {
            id: categoria?.id || '',
            nome: categoria?.nome || '',
        },
        validationSchema: validationSchema,
        onSubmit: (values) => {
            onSave(values);
            onClose();
        },
        enableReinitialize: true,
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{categoria ? 'Modifica Categoria' : 'Nuova Categoria'}</DialogTitle>
            <form onSubmit={formik.handleSubmit}>
                <DialogContent>
                    <Box sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            id="nome"
                            name="nome"
                            label="Nome Categoria"
                            value={formik.values.nome}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.nome && Boolean(formik.errors.nome)}
                            helperText={formik.touched.nome && formik.errors.nome}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Annulla</Button>
                    <Button color="primary" variant="contained" type="submit">
                        Salva
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default CategoriaForm;
