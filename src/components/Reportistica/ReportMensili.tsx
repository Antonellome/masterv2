
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';

const ReportMensili = () => {
  const [tecnici, setTecnici] = useState([]);
  const [selectedTecnico, setSelectedTecnico] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTecnici = async () => {
      setLoading(true);
      try {
        const tecniciCollection = collection(db, 'tecnici');
        const tecniciSnapshot = await getDocs(tecniciCollection);
        const tecniciList = tecniciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTecnici(tecniciList);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTecnici();
  }, []);

  const handleSearch = () => {
    // Logic to handle search
    console.log("Searching for reports for technician:", selectedTecnico);
  };

  return (
    <div>
      <h2>Report Mensili</h2>
      <FormControl fullWidth>
        <InputLabel id="select-tecnico-label">Seleziona Tecnico</InputLabel>
        <Select
          labelId="select-tecnico-label"
          id="select-tecnico"
          value={selectedTecnico}
          onChange={(e) => setSelectedTecnico(e.target.value)}
          disabled={loading}
        >
          <MenuItem value="">
            <em>Tutti i tecnici</em>
          </MenuItem>
          {tecnici.map((tecnico) => (
            <MenuItem key={tecnico.id} value={tecnico.id}>
              {`${tecnico.nome} ${tecnico.cognome}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="contained" color="primary" onClick={handleSearch} style={{ marginTop: '20px' }}>
        Cerca
      </Button>
      {loading && <CircularProgress style={{ marginLeft: '10px' }} />}
    </div>
  );
};

export default ReportMensili;
