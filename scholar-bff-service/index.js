const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4001;
const BASE = process.env.SCHOLAR_BASE_URL || 'http://scholar-microservice:3003';

app.use('/api', async (req, res) => {
  try {
    const url = `${BASE}/api${req.url}`;
    const response = await axios({ method: req.method, url, data: req.body, params: req.query });
    res.status(response.status).json(response.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { error: e.message });
  }
});

app.listen(PORT, () => console.log(`scholar-bff-service on :${PORT}`));
