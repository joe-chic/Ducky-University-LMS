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

// Books
app.get("/api/books", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.get(`${LIBRARY_BASE_URL}/books`, {
      params: req.query,
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to fetch books" });
  }
});

app.get("/api/books/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const response = await axios.get(`${LIBRARY_BASE_URL}/books/${req.params.id}`, {
      headers: token ? { Authorization: token } : undefined,
      timeout: 10_000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Failed to fetch book" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on :${PORT}`);
});

