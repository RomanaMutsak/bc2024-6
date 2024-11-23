const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Command } = require('commander');
const app = express();
const upload = multer();

const program = new Command();
program
    .requiredOption('-h, --host <host>', 'server host')
    .requiredOption('-p, --port <port>', 'server port')
    .requiredOption('-c, --cache <cache>', 'cache directory path');

program.parse(process.argv);
const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) {
    fs.mkdirSync(cache, { recursive: true });
}

app.use(express.urlencoded({ extended: true }));

// GET /UploadForm.html
app.get('/UploadForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'UploadForm.html'));
});

// GET /notes/:name
app.get('/notes/:name', (req, res) => {
    const notePath = path.join(cache, req.params.name + '.txt');
    if (fs.existsSync(notePath)) {
        const noteContent = fs.readFileSync(notePath, 'utf-8');
        res.status(200).send(noteContent);
    } else {
        res.status(404).send('Note not found');
    }
});

// PUT /notes/:name
app.put('/notes/:name', (req, res, next) => {
    if (req.is('application/json')) {
        express.json()(req, res, next);
    } else if (req.is('text/plain')) {
        express.text()(req, res, next);
    } else {
        res.status(415).send('Unsupported Media Type');
    }
}, (req, res) => {
    const notePath = path.join(cache, req.params.name + '.txt');

    if (fs.existsSync(notePath)) {
        const noteContent = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
        fs.writeFileSync(notePath, noteContent, 'utf-8');
        res.status(200).send('Note updated');
    } else {
        res.status(404).send('Note not found');
    }
});

// DELETE /notes/:name
app.delete('/notes/:name', (req, res) => {
    const notePath = path.join(cache, req.params.name + '.txt');
    if (fs.existsSync(notePath)) {
        fs.unlinkSync(notePath);
        res.status(200).send('Note deleted');
    } else {
        res.status(404).send('Note not found');
    }
});

// GET /notes
app.get('/notes', (req, res) => {
    const notes = fs.readdirSync(cache).map(file => {
        const noteContent = fs.readFileSync(path.join(cache, file), 'utf-8');
        return {
            name: path.basename(file, '.txt'),
            text: noteContent
        };
    });
    res.status(200).json(notes);
});

// POST /write
app.post('/write', upload.none(), (req, res) => {
    console.log(req.body);
    const noteName = req.body.note_name;
    const noteText = req.body.note;

    if (!noteName || !noteText) {
        return res.status(400).send('Note name and text are required');
    }

    const notePath = path.join(cache, `${noteName}.txt`);

    if (fs.existsSync(notePath)) {
        return res.status(400).send('Note with this name already exists');
    }

    fs.writeFileSync(notePath, noteText, 'utf-8');
    res.status(201).send('Note created');
});

app.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port}`);
});
