export const formatOreLavoro = (ore: number | null | undefined): string => {
    if (ore === null || ore === undefined) {
        return '--';
    }

    if (ore <= 8) {
        // Mostra il numero con una o due cifre decimali solo se necessario
        if (ore % 1 !== 0) {
            return `${ore.toFixed(2).replace('.50', '.5').replace('.00', '')}h`;
        }
        return `${ore}h`;
    }

    const oreBase = 8;
    const straordinario = ore - oreBase;
    const oreStraordinario = Math.floor(straordinario);
    const minutiStraordinario = Math.round((straordinario - oreStraordinario) * 60);

    let straordinarioFormatted = '';
    if (oreStraordinario > 0) {
        straordinarioFormatted += `${oreStraordinario}`;
    }

    if (minutiStraordinario > 0) {
        if (oreStraordinario > 0) {
             straordinarioFormatted += `:${minutiStraordinario.toString().padStart(2, '0')}`;
        } else {
            // Gestisce il caso di 0.5 ore di straordinario (es. 8.5 totali) -> 0:30
            straordinarioFormatted += `0:${minutiStraordinario.toString().padStart(2, '0')}`;
        }
    }

    return `${oreBase} + ${straordinarioFormatted}h`;
};
