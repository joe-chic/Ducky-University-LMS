const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const USERS_BASE_URL = process.env.USERS_BASE_URL || "http://users-microservice:3001";
const LIBRARY_BASE_URL = process.env.LIBRARY_BASE_URL || "http://library-microservice:3002";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Auth passthrough
app.post("/api/auth/login", async (req, res) => {
  try {
    const response = await axios.post(`${USERS_BASE_URL}/auth/login`, req.body, {
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Auth failed" });
  }
});

// Users
app.get("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.get(`${USERS_BASE_URL}/users`, {
      params: req.query,
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to fetch users" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.post(`${USERS_BASE_URL}/users`, req.body, {
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to create user" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.put(`${USERS_BASE_URL}/users/${req.params.id}`, req.body, {
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to update user" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.delete(`${USERS_BASE_URL}/users/${req.params.id}`, {
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data || { ok: true });
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to disable user" });
  }
});


// -------------------------------------------------------------
// RESOURCES
// -------------------------------------------------------------
const proxyResource = async (req, res, path) => {
  try {
    const token = req.headers.authorization;
    const method = req.method.toLowerCase();
    const config = {
      method,
      url: `${LIBRARY_BASE_URL}${path}`,
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    };
    if (method === 'get') {
        config.params = req.query;
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
        config.data = req.body;
    }

    const response = await axios(config);
    res.json(response.data || { ok: true });
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || `Failed to proxy ${path}` });
  }
}

app.get("/api/resources", (req, res) => proxyResource(req, res, "/resources"));
app.get("/api/resources/:id", (req, res) => proxyResource(req, res, `/resources/${req.params.id}`));
app.post("/api/resources", (req, res) => proxyResource(req, res, "/resources"));
app.put("/api/resources/:id", (req, res) => proxyResource(req, res, `/resources/${req.params.id}`));
app.delete("/api/resources/:id", (req, res) => proxyResource(req, res, `/resources/${req.params.id}`));

// PHYSICAL EXAMPLES
app.get("/api/resources/:id/examples", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples`));
app.post("/api/resources/:id/examples", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples`));
app.put("/api/resources/:id/examples/:barcode", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples/${req.params.barcode}`));
app.delete("/api/resources/:id/examples/:barcode", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples/${req.params.barcode}`));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on :${PORT}`);
});
