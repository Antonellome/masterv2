#!/bin/bash

# Script per aggiornare l'applicazione alla versione più recente

echo "==> 1/4: Recupero le informazioni dal repository remoto..."
# Recupera le ultime informazioni dal remoto
git fetch

# Controlla se il branch locale è allineato con il remoto
if [[ $(git rev-parse HEAD) == $(git rev-parse @{u}) ]]; then
    echo "L'applicazione è già aggiornata. Nessun aggiornamento necessario."
    exit 0
fi

echo "==> 2/4: Nuova versione disponibile. Scarico le modifiche..."
# Scarica le ultime modifiche dal branch main (modifica se il tuo branch principale è diverso)
git pull origin main
if [ $? -ne 0 ]; then
    echo "Errore: Impossibile scaricare le modifiche da Git. Risolvi eventuali conflitti e riprova."
    exit 1
fi

echo "==> 3/4: Installazione/aggiornamento delle dipendenze..."
# Installa o aggiorna le dipendenze
npm install
if [ $? -ne 0 ]; then
    echo "Errore: Impossibile installare le dipendenze con npm. Controlla gli errori."
    exit 1
fi

echo "==> 4/4: Compilazione dell'applicazione..."
# Compila l'applicazione per la produzione
npm run build
if [ $? -ne 0 ]; then
    echo "Errore: Impossibile compilare l'applicazione. Controlla i log di compilazione."
    exit 1
fi

echo ""
echo "✅ Aggiornamento completato!"
echo "L'applicazione è stata compilata con successo."
echo "Per rendere effettive le modifiche, effettua nuovamente il deploy della cartella 'dist' sul tuo servizio di hosting."
