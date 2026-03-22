import React from 'react';
import { DataGrid as MuiDataGrid, type DataGridProps } from '@mui/x-data-grid';

// Re-esportiamo tutto da @mui/x-data-grid per mantenere la compatibilità degli import
// (es. import { DataGrid, GridColDef } from ...)
export * from '@mui/x-data-grid';

// Definiamo il nostro wrapper "sicuro"
const SafeDataGrid: React.FC<DataGridProps> = (props) => {
  // Intercettiamo la prop `rows`. Se è undefined, la sostituiamo con un array vuoto.
  const { rows, ...rest } = props;
  return <MuiDataGrid rows={rows || []} {...rest} />;
};

// Esportiamo il nostro wrapper con il nome `DataGrid` per sostituire l'originale
export { SafeDataGrid as DataGrid };
