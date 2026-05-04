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
const TREASURY_BASE_URL = process.env.TREASURY_BASE_URL || "http://treasury-microservice:3003";

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
app.get("/api/library-metadata", (req, res) => proxyResource(req, res, "/library-metadata"));

// PHYSICAL EXAMPLES
app.get("/api/resources/:id/examples", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples`));
app.post("/api/resources/:id/examples", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples`));
app.put("/api/resources/:id/examples/:barcode", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples/${req.params.barcode}`));
app.delete("/api/resources/:id/examples/:barcode", (req, res) => proxyResource(req, res, `/resources/${req.params.id}/examples/${req.params.barcode}`));


// LOANS
app.get("/api/loans", (req, res) => proxyResource(req, res, "/loans"));
app.post("/api/loans", async (req, res) => {
  try {
    const { campus_id } = req.body;
    if (!campus_id) return res.status(400).json({ message: "campus_id es requerido" });

    // 1. Verificar que el usuario existe y está activo
    const token = req.headers.authorization;
    const userRes = await axios.get(`${USERS_BASE_URL}/users/${campus_id}/by-campus`, {
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    }).catch(err => {
      const status = err?.response?.status;
      if (status === 404) throw new Error("El usuario no existe en el sistema.");
      throw new Error("No se pudo verificar el usuario.");
    });

    const user = userRes.data;
    if (user.user_state !== "active") {
      return res.status(403).json({ message: `El usuario está ${user.user_state === "blocked" ? "bloqueado" : "deshabilitado"} y no puede solicitar préstamos.` });
    }

    // 2. Verificar que no tenga multas sin pagar
    const finesRes = await axios.get(`${TREASURY_BASE_URL}/fines`, {
      params: { campus_id, status: "unpaid" },
      timeout: 10_000,
    }).catch(() => ({ data: [] }));

    const unpaidFines = Array.isArray(finesRes.data) ? finesRes.data : [];
    if (unpaidFines.length > 0) {
      return res.status(403).json({ message: `El usuario tiene ${unpaidFines.length} multa(s) sin pagar. Debe liquidarlas antes de solicitar un préstamo.` });
    }

    // 3. Crear el préstamo
    const loanRes = await axios.post(`${LIBRARY_BASE_URL}/loans`, req.body, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    res.json(loanRes.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.message || err?.response?.data?.message || "Error al crear el préstamo" });
  }
});
app.put("/api/loans/:id/return", (req, res) => proxyResource(req, res, `/loans/${req.params.id}/return`));


// TREASURY proxy
async function proxyTreasury(req, res, path, method) {
  try {
    const m = method || req.method;
    const opts = {
      method: m,
      headers: { "Content-Type": "application/json", ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      timeout: 10_000,
    };
    if (["POST", "PUT"].includes(m)) opts.data = req.body;

    const url = `${TREASURY_BASE_URL}${path}`;
    const response = m === "GET"
      ? await axios.get(url, { params: req.query, headers: opts.headers, timeout: opts.timeout })
      : m === "POST"
      ? await axios.post(url, req.body, { headers: opts.headers, timeout: opts.timeout })
      : await axios.put(url, req.body, { headers: opts.headers, timeout: opts.timeout });

    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Treasury service error" });
  }
}

app.get("/api/fines", (req, res) => proxyTreasury(req, res, "/fines", "GET"));
app.post("/api/fines", (req, res) => proxyTreasury(req, res, "/fines", "POST"));
app.put("/api/fines/:id", (req, res) => proxyTreasury(req, res, `/fines/${req.params.id}`, "PUT"));
app.post("/api/fines/:id/pay", (req, res) => proxyTreasury(req, res, `/fines/${req.params.id}/pay`, "POST"));
app.get("/api/daily-fine", (req, res) => proxyTreasury(req, res, "/daily-fine", "GET"));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on :${PORT}`);
});