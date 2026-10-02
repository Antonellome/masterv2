
import { CheckinGiornaliero } from "@/models/definitions";
import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import dayjs from "dayjs";

interface CheckinListProps {
    checkins: CheckinGiornaliero[];
    onPrint: () => void;
    onShare: () => void;
}

export const CheckinList = ({ checkins, onPrint, onShare }: CheckinListProps) => {
    
    const formatTipo = (tipo: string) => {
        return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return (
        <Paper>
            <Button onClick={onPrint}>Stampa PDF</Button>
            <Button onClick={onShare}>Condividi</Button>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Data</TableCell>
                            <TableCell>Tecnico</TableCell>
                            <TableCell>Tipo Evento</TableCell>
                            <TableCell>Ora Impostata</TableCell>
                            <TableCell>Ora Reale</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {checkins.map((checkin) => (
                            <TableRow key={checkin.id}>
                                <TableCell>{dayjs(checkin.data).format('DD/MM/YYYY')}</TableCell>
                                <TableCell>{checkin.tecnicoName}</TableCell>
                                <TableCell>{formatTipo(checkin.tipo)}</TableCell>
                                <TableCell>{dayjs(checkin.timestampImpostato).format('HH:mm')}</TableCell>
                                <TableCell>{dayjs(checkin.timestampReale).format('HH:mm:ss')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};
