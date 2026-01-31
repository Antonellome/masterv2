import { useState, useEffect } from "react";
import { Box, Tabs, Tab, CircularProgress, Typography } from "@mui/material";
import ScadenzeList from "@/components/Scadenze/ScadenzeList";
import { useScadenzeStore } from "@/store/useScadenzeStore";

const ScadenzePage = () => {
  const [filter, setFilter] = useState<"all" | "personali" | "veicoli" | "documenti">("all");
  const { scadenze, loading, error, fetchScadenze } = useScadenzeStore();

  useEffect(() => {
    fetchScadenze();
  }, [fetchScadenze]);

  const handleChange = (event: React.SyntheticEvent, newValue: "all" | "personali" | "veicoli" | "documenti") => {
    setFilter(newValue);
  };

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
      {!loading && !error && <ScadenzeList scadenze={scadenze} filter={filter} />}

    </Box>
  );
};

export default ScadenzePage;
