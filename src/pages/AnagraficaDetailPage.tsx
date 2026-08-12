
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Alert } from '@mui/material';
import GestioneAnagrafica from '@/components/Anagrafiche/GestioneAnagrafica';
import { anagraficheConfig } from '@/config/anagrafiche.config.tsx';
import type { Anagrafica } from '@/models/definitions';
import { useGlobalStore } from '@/stores/globalStore';

const toCamelCase = (str: string) => {
  return str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
};

const AnagraficaDetailPage = () => {
  const { anagraficaType: anagraficaTypeKebab } = useParams<{ anagraficaType: string }>();
  const { clientiMap } = useGlobalStore(state => ({ clientiMap: state.clientiMap }));

  if (!anagraficaTypeKebab) {
    return <Alert severity="error">Tipo di anagrafica non specificato.</Alert>;
  }

  const anagraficaType = toCamelCase(anagraficaTypeKebab);
  const config = anagraficheConfig[anagraficaType];

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">Errore Configurazione</Typography>
        <Typography>Configurazione per "{anagraficaTypeKebab}" non trovata.</Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Verifica che "{anagraficaType}" esista in `anagrafiche.config.tsx`.
        </Alert>
      </Box>
    );
  }

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
