const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3006;
app.use(express.static(path.join(__dirname)));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`human-capital-frontend on :${PORT}`));
