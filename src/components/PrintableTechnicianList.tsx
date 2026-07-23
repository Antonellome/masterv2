
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { AnagraficaField } from '@/config/anagrafiche.config';

interface PrintableTechnicianListProps {
  data: any[];
  fields: AnagraficaField[];
}

const PrintableTechnicianList: React.FC<PrintableTechnicianListProps> = ({ data, fields }) => {

  const getFieldValue = (item: any, fieldName: string) => {
    // Simple property access
    return item[fieldName] || '';
  };

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Elenco Tecnici Selezionati
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            {fields.filter(f => f.inTable).map(field => (
              <TableCell key={field.field} sx={{ fontWeight: 'bold' }}>
                {field.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(item => (
            <TableRow key={item.id}>
              {fields.filter(f => f.inTable).map(field => (
                <TableCell key={field.field}>
                  {getFieldValue(item, field.field)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PrintableTechnicianList;
