
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import { anagraficheConfig } from '@/config/anagrafiche.config';
import type { Anagrafica } from '@/models/definitions';
import { useData } from '@/hooks/useData';

// Funzione di utility per convertire kebab-case in camelCase
const toCamelCase = (str: string) => {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
};

const AnagraficaDetailPage = () => {
  const { anagraficaType: anagraficaTypeKebab } = useParams<{ anagraficaType: string }>();
  const { clienti } = useData();

  const clientiMap = useMemo(() => {
    if (!clienti) return new Map();
    return new Map(clienti.map(c => [c.id, c.nome]));
  }, [clienti]);

  if (!anagraficaTypeKebab) {
    return <Alert severity="error">Tipo di anagrafica non specificato nell'URL.</Alert>;
  }

  const anagraficaType = toCamelCase(anagraficaTypeKebab);
  const config = anagraficheConfig[anagraficaType];

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Errore
        </Typography>
        <Typography>
          La configurazione per l'anagrafica di tipo "{anagraficaTypeKebab}" non è stata trovata.
        </Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Assicurati che un oggetto di configurazione per "{anagraficaType}" esista in `src/config/anagrafiche.config.ts`.
        </Alert>
      </Box>
    );
  }

  // Preparo le mappe di lookup in modo più generico
  const lookupMaps: { [key: string]: Map<string, string> } = {};
  if (anagraficaType === 'navi' || anagraficaType === 'luoghi') {
    lookupMaps.clienteId = clientiMap;
  }

  return (
    <GestioneAnagrafica<Anagrafica>
      collectionName={config.collectionName}
      title={config.title}
      fields={config.fields}
      columns={config.columns}
      anagraficaType={config.anagraficaType}
      lookupMaps={lookupMaps}
    />
  );
};

export default AnagraficaDetailPage;
