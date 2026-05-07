const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 4002;
const BASE = process.env.HC_BASE_URL || 'http://human-capital-microservice:3005';

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

app.listen(PORT, () => console.log(`human-capital-bff-service on :${PORT}`));
