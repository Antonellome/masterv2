import { useState } from "react";
import { Box, Tabs, Tab, CircularProgress, Typography } from "@mui/material";
import ScadenzeList from "@/components/Scadenze/ScadenzeList";
import { useScadenze } from "@/hooks/useScadenze";

const ScadenzePage = () => {
  const [filter, setFilter] = useState<"all" | "personali" | "veicoli" | "documenti">("all");
  
  // Use the corrected hook, which draws data from the central store.
  const { activeScadenze, silencedScadenze, loading, error } = useScadenze();

  // The useEffect for fetching is no longer needed, as DataHydrator handles it globally.

  const handleChange = (event: React.SyntheticEvent, newValue: "all" | "personali" | "veicoli" | "documenti") => {
    setFilter(newValue);
  };

  // Combine all scadenze to be passed to the list component, which will handle the display logic.
  const allScadenze = [...activeScadenze, ...silencedScadenze];

  return (
    <Box sx={{ p: 3 }}>
      <Tabs
        value={filter}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="inherit"
        variant="scrollable"
        scrollButtons="auto"
        aria-label="scadenze filters"
        sx={{ mb: 3 }}
      >
        <Tab label="Tutte" value="all" />
        <Tab label="Personali" value="personali" />
        <Tab label="Veicoli" value="veicoli" />
        <Tab label="Documenti Aziendali" value="documenti" />
      </Tabs>

      {loading && <CircularProgress />}
      {error && <Typography color="error">Errore nel caricamento: {error}</Typography>}
      {!loading && !error && <ScadenzeList scadenze={allScadenze} filter={filter} />}

    </Box>
  );
};

export default ScadenzePage;
