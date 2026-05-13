export const formatOreLavoro = (ore: number | string | null | undefined): string => {
    if (ore === null || ore === undefined) {
        return '--';
    }

    let oreNumeriche: number;

    // Gestisce in modo sicuro sia numeri che stringhe (es. "8+8" o vecchi dati)
    if (typeof ore === 'string') {
        oreNumeriche = ore.includes('+')
            ? ore.split('+').reduce((acc, curr) => acc + parseFloat(curr || '0'), 0)
            : parseFloat(ore);
    } else {
        oreNumeriche = ore;
    }

    if (isNaN(oreNumeriche)) {
        return 'Err'; // Indica un valore non valido o corrotto
    }

    // Formattazione semplice: mostra i decimali (es. .5) solo se presenti.
    if (oreNumeriche % 1 !== 0) {
        return `${oreNumeriche.toFixed(1)}h`.replace('.0', ''); // Es: 8.5h
    }
    
    return `${oreNumeriche}h`; // Es: 8h, 16h
};
