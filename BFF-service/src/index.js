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


// Helper: add N business days
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

// LOANS
app.get("/api/loans", (req, res) => proxyResource(req, res, "/loans"));
app.get("/api/loans/receipt/:id", (req, res) => proxyResource(req, res, `/loans/receipt/${req.params.id}`));

// POST /api/loans  — Full validated loan creation
app.post("/api/loans", async (req, res) => {
  try {
    const { campus_id, barcode } = req.body;
    if (!campus_id || !barcode)
      return res.status(400).json({ message: "campus_id y barcode son requeridos." });

    const token = req.headers.authorization;
    const headers = token ? { Authorization: token } : {};

    // ── Step 1: Verify user exists and is active ──
    const userRes = await axios.get(`${USERS_BASE_URL}/users/${campus_id}/by-campus`, {
      headers, timeout: 10_000,
    }).catch(err => {
      const s = err?.response?.status;
      if (s === 404) throw new Error("El usuario no existe en el sistema.");
      throw new Error("No se pudo verificar el usuario.");
    });
    const user = userRes.data;
    if (user.user_state !== "active") {
      return res.status(403).json({
        message: `Tu cuenta está ${user.user_state === "blocked" ? "bloqueada" : "deshabilitada"} y no puede solicitar préstamos.`
      });
    }

    // ── Step 2: Verify no unpaid fines in treasury ──
    const finesRes = await axios.get(`${TREASURY_BASE_URL}/fines`, {
      params: { campus_id, status: "unpaid" }, timeout: 10_000,
    }).catch(() => ({ data: [] }));
    const unpaidFines = Array.isArray(finesRes.data) ? finesRes.data : [];
    if (unpaidFines.length > 0) {
      return res.status(403).json({
        message: `Tienes ${unpaidFines.length} multa(s) sin pagar (total: $${unpaidFines.reduce((s, f) => s + parseFloat(f.price), 0).toFixed(2)} MXN). Deberás liquidarlas antes de solicitar un préstamo.`
      });
    }

    // ── Step 3: Verify ≤2 active physical loans ──
    const activeRes = await axios.get(`${LIBRARY_BASE_URL}/loans`, {
      params: { campus_id, state: "active" }, timeout: 10_000,
    }).catch(() => ({ data: [] }));
    const activeLoans = Array.isArray(activeRes.data) ? activeRes.data : [];
    if (activeLoans.length >= 2) {
      return res.status(403).json({
        message: `Ya tienes ${activeLoans.length} préstamo(s) activo(s). El máximo permitido es 2. Devólvelos antes de solicitar otro.`
      });
    }

    // ── Step 4: Verify the specific exemplar is available ──
    // (the library microservice checks this atomically inside its transaction)

    // ── Step 5: Create the loan ──
    const loanRes = await axios.post(`${LIBRARY_BASE_URL}/loans`,
      { barcode, campus_id },
      { headers: { "Content-Type": "application/json" }, timeout: 10_000 }
    ).catch(err => {
      const bodyMsg = err?.response?.data?.message || err?.response?.data?.error;
      const s = err?.response?.status;
      if (s === 404) throw Object.assign(new Error(bodyMsg || `El código de barras '${barcode}' no existe en el catálogo.`), { statusCode: 404 });
      if (s === 409) throw Object.assign(new Error(bodyMsg || `El ejemplar '${barcode}' ya no está disponible (está en préstamo o reservado).`), { statusCode: 409 });
      throw Object.assign(new Error(bodyMsg || "Error al registrar el préstamo en biblioteca."), { statusCode: s || 500 });
    });
    const { loan_id } = loanRes.data;

    // ── Step 6: Fetch full receipt ──
    const receiptRes = await axios.get(`${LIBRARY_BASE_URL}/loans/receipt/${loan_id}`, {
      timeout: 10_000,
    }).catch(() => ({ data: null }));
    const receipt = receiptRes.data;

    // ── Step 7: Build due_date ──
    const lentAt  = receipt ? new Date(receipt.initial_lent_at) : new Date();
    const dueDate = addBusinessDays(lentAt, 5);

    res.status(201).json({
      ok: true,
      loan_id,
      message: "\u2713 Pr\u00e9stamo registrado con \u00e9xito.",
      boleta: {
        loan_id,
        campus_id,
        titulo:        receipt?.titulo    || "(recurso)",
        autor:         receipt?.autor     || "",
        barcode:       receipt?.barcode   || barcode,
        ubicacion:     receipt?.ubicacion || "",
        initial_lent_at: lentAt,
        due_date:      dueDate,
        loan_state:    "active",
        instrucciones: "Devólvelo en biblioteca en un máximo de 5 d\u00edas h\u00e1biles. Despu\u00e9s de esa fecha se aplica una multa de $5.00 MXN por d\u00eda h\u00e1bil.",
      },
    });
  } catch (err) {
    // Always prefer a descriptive message — never leak raw axios error strings like "Request failed with status code 404"
    const status = err?.statusCode || err?.response?.status || 500;
    const message = err?.message || err?.response?.data?.message || err?.response?.data?.error || "Error al crear el préstamo.";
    res.status(status).json({ message });
  }
});

// PUT /api/loans/:id/return  — return loan + auto-create fine if overdue
app.put("/api/loans/:id/return", async (req, res) => {
  try {
    const returnRes = await axios.put(`${LIBRARY_BASE_URL}/loans/${req.params.id}/return`, {}, {
      timeout: 10_000,
    });
    const data = returnRes.data;

    // If overdue: register a fine in treasury (fire-and-keep-response)
    if (data.fine_amount > 0) {
      axios.post(`${TREASURY_BASE_URL}/fines`, {
        price:                data.fine_amount,
        reason_code_id:      1,   // LR-001 late_return
        source_system:       "library",
        source_transaction_id: `loan-${data.loan_id}`,
        offender_id:         data.campus_id,
        offender_type:       "student",
      }, { timeout: 10_000 }).catch(e =>
        console.warn("[bff] treasury fine registration failed:", e.message)
      );

      return res.json({
        ...data,
        message: `Se registró una multa de $${data.fine_amount} MXN por ${data.overdue_days} día(s) de retraso. Paga en tesoría antes de tu próximo préstamo.`,
      });
    }

    res.json({ ...data, message: "Libro devuelto correctamente. ¡Gracias!" });
  } catch (err) {
    const status = err?.response?.status || 500;
    res.status(status).json({ message: err?.response?.data?.message || "Error al registrar la devolución." });
  }
});


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

// ── Combined physical + digital loans ────────────────────────────────────────
app.get("/api/all-loans", async (req, res) => {
  try {
    const { campus_id, state, loan_type } = req.query;
    const opts = { timeout: 10000 };
    const physParams  = {};
    const digitalParams = {};
    if (campus_id) { physParams.campus_id  = campus_id; digitalParams.campus_id  = campus_id; }
    // Map unified state filter to per-type state values
    if (state) {
      physParams.state  = state === "active" ? "active"    : state === "overdue" ? "overdue"   : state;
      digitalParams.state = state === "active" ? "active"  : state === "completed" ? "completed" : state;
    }

    const [physRes, digRes] = await Promise.allSettled([
      loan_type !== "digital"  ? axios.get(`${LIBRARY_BASE_URL}/loans`,         { ...opts, params: physParams    }) : Promise.resolve({ data: [] }),
      loan_type !== "physical" ? axios.get(`${LIBRARY_BASE_URL}/digital-loans`,  { ...opts, params: digitalParams }) : Promise.resolve({ data: { items: [] } }),
    ]);

    const physical = (physRes.status === "fulfilled"
      ? (Array.isArray(physRes.value.data) ? physRes.value.data : [])
      : []);

    const digital = (digRes.status === "fulfilled"
      ? (Array.isArray(digRes.value.data?.items) ? digRes.value.data.items : [])
      : []);

    // Fetch users for mapping
    const token = req.headers.authorization;
    const usersRes = await axios.get(`${USERS_BASE_URL}/users`, {
        params: { pageSize: 10000 },
        headers: token ? { Authorization: token } : {},
        timeout: 10000
    }).catch(() => ({ data: { items: [] } }));
    
    const usersList = Array.isArray(usersRes.data?.items) ? usersRes.data.items : [];
    const usersMap = {};
    usersList.forEach(u => {
        if (u.campus_id) usersMap[u.campus_id] = { name: u.nombre, email: u.correo };
    });

    // Normalise to unified shape
    const normPhysical = physical.map(l => ({
      loan_id:         l.loan_id,
      loan_type:       "physical",
      state:           l.loan_state,
      campus_id:       l.campus_id,
      user_name:       usersMap[l.campus_id]?.name || "Desconocido",
      user_email:      usersMap[l.campus_id]?.email || "Sin correo",
      titulo:          l.titulo,
      tipo:            "physical_book",
      barcode:         l.barcode,
      ubicacion:       l.ubicacion,
      initial_lent_at: l.initial_lent_at,
      returned_at:     l.returned_at,
    }));

    const normDigital = digital.map(l => ({
      loan_id:         l.digital_loan_id,
      loan_type:       "digital",
      state:           l.digital_loan_state,
      campus_id:       l.campus_id,
      user_name:       usersMap[l.campus_id]?.name || "Desconocido",
      user_email:      usersMap[l.campus_id]?.email || "Sin correo",
      titulo:          l.titulo,
      tipo:            l.tipo,
      barcode:         null,
      ubicacion:       null,
      initial_lent_at: l.initial_lent_at,
      returned_at:     l.digital_loan_state === "completed" ? l.returned_at : null,
      renewal_count:   l.renewal_count,
      journal_title:   l.journal_title,
      journal_issn:    l.journal_issn,
    }));

    const merged = [...normPhysical, ...normDigital]
      .sort((a, b) => new Date(b.initial_lent_at) - new Date(a.initial_lent_at));

    res.json({ items: merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener préstamos combinados" });
  }
});

// ── Physical loan renewal & damage details ───────────────────────────────────
app.post("/api/loans/:id/renew", async (req, res) => {
  try {
    const r = await axios.post(`${LIBRARY_BASE_URL}/loans/${req.params.id}/renew`, {}, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al renovar préstamo" });
  }
});

app.get("/api/examples/:barcode/damage-details", async (req, res) => {
  try {
    const r = await axios.get(`${LIBRARY_BASE_URL}/examples/${req.params.barcode}/damage-details`, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al obtener detalles del ejemplar" });
  }
});

app.put("/api/examples/:barcode/damage-details", async (req, res) => {
  try {
    const r = await axios.put(`${LIBRARY_BASE_URL}/examples/${req.params.barcode}/damage-details`, req.body, {
      headers: { "Content-Type": "application/json" }, timeout: 8000,
    });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al actualizar detalles del ejemplar" });
  }
});

// ── Digital resource endpoints ────────────────────────────────────────────────
app.get("/api/resources/:id/digital-metadata", async (req, res) => {
  try {
    const r = await axios.get(`${LIBRARY_BASE_URL}/resources/${req.params.id}/digital-metadata`, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al obtener metadatos digitales" });
  }
});

app.put("/api/resources/:id/digital-metadata", async (req, res) => {
  try {
    const r = await axios.put(`${LIBRARY_BASE_URL}/resources/${req.params.id}/digital-metadata`, req.body, {
      headers: { "Content-Type": "application/json" }, timeout: 8000,
    });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al actualizar metadatos digitales" });
  }
});

// ── Periodical resource endpoints ─────────────────────────────────────────────
app.get("/api/resources/:id/periodical-metadata", async (req, res) => {
  try {
    const r = await axios.get(`${LIBRARY_BASE_URL}/resources/${req.params.id}/periodical-metadata`, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al obtener metadatos de publicación periódica" });
  }
});

app.put("/api/resources/:id/periodical-metadata", async (req, res) => {
  try {
    const r = await axios.put(`${LIBRARY_BASE_URL}/resources/${req.params.id}/periodical-metadata`, req.body, {
      headers: { "Content-Type": "application/json" }, timeout: 8000,
    });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al actualizar metadatos de publicación periódica" });
  }
});

app.get("/api/resources/:id/digital-status", async (req, res) => {
  try {
    const r = await axios.get(`${LIBRARY_BASE_URL}/resources/${req.params.id}/digital-status`, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al obtener estado digital" });
  }
});

app.get("/api/digital-loans", async (req, res) => {
  try {
    const r = await axios.get(`${LIBRARY_BASE_URL}/digital-loans`, { params: req.query, timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al obtener préstamos digitales" });
  }
});

app.post("/api/digital-loans", async (req, res) => {
  try {
    const { campus_id, resource_id } = req.body;
    if (!campus_id || !resource_id)
      return res.status(400).json({ message: "campus_id y resource_id son requeridos." });

    const token = req.headers.authorization;
    const headers = token ? { Authorization: token } : {};

    // ── Step 1: Verify user exists and is active ──
    const userRes = await axios.get(`${USERS_BASE_URL}/users/${campus_id}/by-campus`, {
      headers, timeout: 10_000,
    }).catch(err => {
      const s = err?.response?.status;
      if (s === 404) throw new Error("El usuario no existe en el sistema.");
      throw new Error("No se pudo verificar el usuario.");
    });
    const user = userRes.data;
    if (user.user_state !== "active") {
      return res.status(403).json({
        message: `Tu cuenta está ${user.user_state === "blocked" ? "bloqueada" : "deshabilitada"} y no puede solicitar préstamos digitales.`
      });
    }

    // ── Step 2: Verify no unpaid fines ──
    const finesRes = await axios.get(`${TREASURY_BASE_URL}/fines`, {
      params: { campus_id, status: "unpaid" }, timeout: 10_000,
    }).catch(() => ({ data: [] }));
    const unpaidFines = Array.isArray(finesRes.data) ? finesRes.data : [];
    if (unpaidFines.length > 0) {
      return res.status(403).json({
        message: `Tienes multas pendientes. Deberás liquidarlas antes de solicitar un préstamo digital.`
      });
    }

    // ── Step 3: Verify ≤3 active digital loans ──
    const activeRes = await axios.get(`${LIBRARY_BASE_URL}/digital-loans`, {
      params: { campus_id, state: "active" }, timeout: 10_000,
    }).catch(() => ({ data: { items: [] } }));
    const activeLoans = Array.isArray(activeRes.data?.items) ? activeRes.data.items : [];
    if (activeLoans.length >= 3) {
      return res.status(403).json({
        message: `Ya tienes ${activeLoans.length} préstamo(s) digital(es) activo(s). El máximo permitido es 3. Libera accesos antes de solicitar otro.`
      });
    }

    // ── Step 4: Create the digital loan ──
    const r = await axios.post(`${LIBRARY_BASE_URL}/digital-loans`, req.body, {
      headers: { "Content-Type": "application/json" }, timeout: 8000,
    });
    res.status(r.status).json(r.data);
  } catch (err) {
    const bodyMsg = err?.response?.data?.message || err?.response?.data?.error || err.message;
    res.status(err?.response?.status || err.statusCode || 500).json({ message: bodyMsg || "Error al registrar acceso digital" });
  }
});

app.put("/api/digital-loans/:id/return", async (req, res) => {
  try {
    const r = await axios.put(`${LIBRARY_BASE_URL}/digital-loans/${req.params.id}/return`, {}, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al devolver acceso digital" });
  }
});

app.put("/api/digital-loans/:id/renew", async (req, res) => {
  try {
    const r = await axios.put(`${LIBRARY_BASE_URL}/digital-loans/${req.params.id}/renew`, {}, { timeout: 8000 });
    res.json(r.data);
  } catch (err) {
    res.status(err?.response?.status || 500).json({ message: err?.response?.data?.message || "Error al renovar acceso digital" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on :${PORT}`);
});