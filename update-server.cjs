
const express = require('express');
const { spawn, exec } = require('child_process');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());

// Endpoint per verificare la presenza di aggiornamenti
app.get('/check-for-update', (req, res) => {
    console.log('Received check-for-update request.');

    // 1. Fetch a secco per aggiornare i riferimenti remoti senza modificare i file locali
    exec('git fetch', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error fetching from git: ${stderr}`);
            return res.status(500).json({ error: 'Failed to fetch from repository.' });
        }

        // 2. Ottieni l'hash del commit locale (HEAD)
        exec('git rev-parse HEAD', (err, localHash, stderr) => {
            if (err) {
                console.error(`Error getting local HEAD: ${stderr}`);
                return res.status(500).json({ error: 'Failed to read local repository state.' });
            }

            // 3. Ottieni l'hash del commit remoto (del branch principale, es. 'origin/main')
            // Assicurati che 'main' sia il nome del tuo branch principale, altrimenti cambialo.
            exec('git rev-parse origin/main', (err, remoteHash, stderr) => {
                if (err) {
                    console.error(`Error getting remote HEAD: ${stderr}`);
                    return res.status(500).json({ error: 'Failed to read remote repository state.' });
                }

                console.log(`Local hash: ${localHash.trim()}`);
                console.log(`Remote hash: ${remoteHash.trim()}`);

                // 4. Confronta gli hash. Se sono diversi, c'è un aggiornamento.
                if (localHash.trim() !== remoteHash.trim()) {
                    console.log('Update available.');
                    res.json({ updateAvailable: true });
                } else {
                    console.log('No update available.');
                    res.json({ updateAvailable: false });
                }
            });
        });
    });
});


// Endpoint per eseguire l'aggiornamento
app.post('/update', (req, res) => {
    console.log('Received update request. Starting update script...');

    const updateProcess = spawn('bash', ['update.sh']);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    updateProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        res.write(`data: ${data.toString()}\n\n`);
    });

    updateProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        res.write(`data: ERROR: ${data.toString()}\n\n`);
    });

    updateProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code === 0) {
            res.write('data: Update completed successfully!\n\n');
        } else {
            res.write(`data: Update failed with exit code ${code}.\n\n`);
        }
        res.end();
    });

    updateProcess.on('error', (err) => {
        console.error('Failed to start subprocess.', err);
        res.status(500).send('Failed to start update process.');
    });
});

app.listen(port, () => {
    console.log(`Update server listening at http://localhost:${port}`);
});
