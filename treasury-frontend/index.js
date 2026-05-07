const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`Treasury frontend serving on port ${PORT}`);
});
