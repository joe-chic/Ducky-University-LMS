const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3004;
app.use(express.static(path.join(__dirname)));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`scholar-frontend on :${PORT}`));
