
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors()); // Enable CORS for all routes

app.post('/update', (req, res) => {
    console.log('Received update request. Starting update script...');

    const updateProcess = spawn('bash', ['update.sh']);

    // Send headers for streaming
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
