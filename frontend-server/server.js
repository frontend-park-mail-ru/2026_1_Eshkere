const path = require('path');
const express = require('express');

const app = express();
const publicDir = path.join(__dirname, '..');

app.use(express.static(publicDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Frontend server is running on http://localhost:${PORT}`);
});