
import { Rapportino } from "@/models/definitions";

export const calculateTotalHours = (rapportino: Rapportino | null | undefined): number => {
    if (!rapportino) {
        return 0;
    }

    if (rapportino.dettaglioOreTecnici && rapportino.dettaglioOreTecnici.length > 0) {
        // I dati sono già stati "sanificati", quindi possiamo sommare direttamente
        return rapportino.dettaglioOreTecnici.reduce((total, tecnico) => total + tecnico.ore, 0);
    }

    // Fallback per vecchi rapportini
    return rapportino.oreLavoro || 0;
};
