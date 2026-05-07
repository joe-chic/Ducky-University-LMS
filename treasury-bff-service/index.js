const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const TREASURY_BASE_URL = process.env.TREASURY_BASE_URL || 'http://treasury-microservice:3007';

app.use('/api', async (req, res) => {
  try {
    const url = `${TREASURY_BASE_URL}/api${req.url}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: req.query
    });
    res.json(response.data);
  } catch(e) { 
    const status = e?.response?.status || 500;
    res.status(status).json({error: e?.response?.data?.error || e.message}); 
  }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`Treasury BFF on port ${PORT}`));
