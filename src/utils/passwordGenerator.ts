/**
 * Genera una password casuale e robusta.
 * @param length La lunghezza desiderata della password. Il default è 12.
 * @returns Una stringa di password generata casualmente.
 */
export const passwordGenerator = (length: number = 12): string => {
    // Caratteri volutamente semplici per evitare problemi di encoding o trascrizione
    const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
    const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const specialChars = "!@#$%^&*-=_+";

    const allChars = lowerCaseChars + upperCaseChars + numberChars + specialChars;
    
    let password = '';
    // Garantisce almeno un carattere per tipo per robustezza
    password += lowerCaseChars.charAt(Math.floor(Math.random() * lowerCaseChars.length));
    password += upperCaseChars.charAt(Math.floor(Math.random() * upperCaseChars.length));
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    // Riempie il resto della password con caratteri casuali
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mischia i caratteri per non avere sempre lo stesso pattern iniziale (es. aA1!...). 
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};
