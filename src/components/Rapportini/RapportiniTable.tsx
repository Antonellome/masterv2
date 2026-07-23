
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import RapportinoPrint from './RapportinoPrint';
import { 
    Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
    IconButton, Menu, MenuItem, TextField, Box, Typography, Select,
    InputAdornment
} from '@mui/material';
import { 
    MoreVert as MoreVertIcon, 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Search as SearchIcon, 
    ArrowBack as ArrowBackIcon, 
    ArrowForward as ArrowForwardIcon, 
    Email as EmailIcon, 
    Phone as PhoneIcon,
    Print as PrintIcon,
    Share as ShareIcon
} from '@mui/icons-material';

// --- Interfacce --- 
interface Rapportino {
  id: string;
  data: string;
  cliente: string;
  oreLavorate: number;
  descrizione: string;
  operatore: string;
}

interface RapportiniTableProps {
  rapportini: Rapportino[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEmail: (id: string) => void;
  onTel: (id: string) => void;
}

const RapportiniTable: React.FC<RapportiniTableProps> = ({ rapportini, onEdit, onDelete, onEmail, onTel }) => {
  // --- Stati per Paginazione e Filtro ---
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentRapportinoId, setCurrentRapportinoId] = useState<string | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, rapportinoId: string) => {
    setAnchorEl(event.currentTarget);
    setCurrentRapportinoId(rapportinoId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentRapportinoId(null);
  };

  // --- Logica per Stampa Singola (ROBUSTA) ---
  const componentToPrintRef = useRef<HTMLDivElement>(null);
  const [rapportinoSelezionato, setRapportinoSelezionato] = useState<Rapportino | null>(null);

  const handlePrint = useReactToPrint({
      content: () => componentToPrintRef.current,
      documentTitle: `Rapportino-${rapportinoSelezionato?.id || ''}`,
      onAfterPrint: () => setRapportinoSelezionato(null)
  });

  useEffect(() => {
      if (rapportinoSelezionato) {
          handlePrint();
      }
  }, [rapportinoSelezionato, handlePrint]);

  const avviaStampaSingola = useCallback((rapportino: Rapportino) => {
      setRapportinoSelezionato(rapportino);
  }, []);

  // --- Logica per Condivisione ---
  const handleShare = async (rapportino: Rapportino) => {
    const shareData = {
      title: `Rapportino di Intervento: ${rapportino.id}`,
      text: `Dettagli: Cliente ${rapportino.cliente}, Data: ${new Date(rapportino.data).toLocaleDateString()}, Ore: ${rapportino.oreLavorate}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { console.error("Share failed", e); }
    } else {
      navigator.clipboard.writeText(shareData.text);
      alert("Dettagli copiati negli appunti!");
    }
  };

  // --- Filtro e Paginazione Dati ---
  const filteredRapportini = rapportini.filter(r =>
      Object.values(r).some(val => String(val).toLowerCase().includes(filter.toLowerCase()))
  );
  const paginatedRapportini = filteredRapportini.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* Componente nascosto per la stampa singola. */}
      <div style={{ display: 'none' }}>
        {rapportinoSelezionato && <RapportinoPrint ref={componentToPrintRef} rapportinoId={rapportinoSelezionato.id} />}
      </div>

      {/* Barra di ricerca */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <TextField 
          placeholder="Cerca in tabella..." 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          variant="outlined"
          size="small"
          sx={{width: '40%'}}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Tabella */}
      <TableContainer component={Paper}>
        <Table id="tabella-da-stampare">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell><TableCell>Data</TableCell><TableCell>Cliente</TableCell><TableCell align="right">Ore</TableCell><TableCell>Descrizione</TableCell><TableCell>Operatore</TableCell><TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRapportini.map((rapportino) => (
              <TableRow key={rapportino.id}>
                <TableCell>{rapportino.id}</TableCell>
                <TableCell>{new Date(rapportino.data).toLocaleDateString()}</TableCell>
                <TableCell>{rapportino.cliente}</TableCell>
                <TableCell align="right">{rapportino.oreLavorate}</TableCell>
                <TableCell sx={{ whiteSpace: "pre-wrap"}}>{rapportino.descrizione}</TableCell>
                <TableCell>{rapportino.operatore}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton aria-label="Stampa Rapportino" onClick={() => avviaStampaSingola(rapportino)} size="small">
                      <PrintIcon />
                    </IconButton>
                    <IconButton aria-label="Condividi" onClick={() => handleShare(rapportino)} size="small">
                      <ShareIcon />
                    </IconButton>
                    <IconButton
                      aria-label="more"
                      aria-controls="long-menu"
                      aria-haspopup="true"
                      onClick={(e) => handleMenuClick(e, rapportino.id)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { onEdit(currentRapportinoId!); handleMenuClose(); }}>
          <EditIcon sx={{ mr: 1 }} /> Modifica
        </MenuItem>
        <MenuItem onClick={() => { onDelete(currentRapportinoId!); handleMenuClose(); }}>
          <DeleteIcon sx={{ mr: 1 }} /> Elimina
        </MenuItem>
        <MenuItem onClick={() => { onEmail(currentRapportinoId!); handleMenuClose(); }}>
          <EmailIcon sx={{ mr: 1 }} /> Invia Email
        </MenuItem>
        <MenuItem onClick={() => { onTel(currentRapportinoId!); handleMenuClose(); }}>
          <PhoneIcon sx={{ mr: 1 }} /> Chiama
        </MenuItem>
      </Menu>

      {/* Controlli di Paginazione */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
          <Typography sx={{ mr: 2 }}>Righe:</Typography>
          <Select
            native
            value={rowsPerPage}
            onChange={e => setRowsPerPage(Number(e.target.value))}
            inputProps={{ 'aria-label': 'rows per page' }}
            size="small"
            sx={{ mr: 2 }}
          >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
          </Select>
          <Typography sx={{ mr: 2 }}>
            {page * rowsPerPage + 1}-{(page + 1) * rowsPerPage > filteredRapportini.length ? filteredRapportini.length : (page + 1) * rowsPerPage} di {filteredRapportini.length}
          </Typography>
          <IconButton aria-label="Precedente" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
            <ArrowBackIcon />
          </IconButton>
          <IconButton aria-label="Successiva" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * rowsPerPage >= filteredRapportini.length}>
            <ArrowForwardIcon />
          </IconButton>
      </Box>
    </Box>
  );
};

export default RapportiniTable;
