require("dotenv").config();

const express = require("express");
const cors = require("cors");

const jwt = require("jsonwebtoken");
const { query } = require("./db");
const { signToken, verifyToken, verifyPassword, hashPassword } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }
  const token = auth.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.auth = payload;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function buildUserFullName(row) {
  const middle = row.middle_name ? ` ${row.middle_name}` : "";
  const mother = row.mother_lastname ? ` ${row.mother_lastname}` : "";
  return `${row.first_name}${middle} ${row.father_lastname}${mother}`.replace(/\s+/g, " ").trim();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });

    const result = await query(
      `SELECT u.user_id, u.user_email, u.user_phone, u.user_state, u.user_password,
              u.first_name, u.middle_name, u.father_lastname, u.mother_lastname,
              r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_email = $1
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) return res.status(401).json({ message: "Invalid credentials" });
    const row = result.rows[0];

    const ok = await verifyPassword(password, row.user_password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({
      userId: row.user_id,
      role: row.role_name,
      email: row.user_email,
    });

    res.json({
      token,
      user: {
        id: row.user_id,
        nombre: buildUserFullName(row),
        rol: row.role_name,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// GET /users?search=&page=&pageSize=
app.get("/users", authMiddleware, async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];
    if (search) {
      where.push(
        `(LOWER(u.first_name) LIKE LOWER($1) OR LOWER(u.father_lastname) LIKE LOWER($1) OR LOWER(u.user_email) LIKE LOWER($1) OR LOWER(r.role_name) LIKE LOWER($1))`
      );
      params.push(`%${search}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ${whereSql}`,
      params
    );
    const total = totalRes.rows[0]?.total || 0;

    const result = await query(
      `SELECT u.user_id,
              u.user_email,
              u.user_phone,
              u.user_state,
              u.first_name,
              u.middle_name,
              u.father_lastname,
              u.mother_lastname,
              r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ${whereSql}
       ORDER BY u.user_id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const items = result.rows.map((u) => ({
      id: u.user_id,
      nombre: buildUserFullName(u),
      rol: u.role_name,
      correo: u.user_email,
      telefono: u.user_phone,
      activo: u.user_state === "active",
      foto: null,
    }));

    res.json({ items, total, page, pageSize });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /users
app.post("/users", authMiddleware, async (req, res) => {
  try {
    const {
      nombre,
      rol,
      correo,
      telefono,
      contrasena,
      activo,
      foto,
    } = req.body || {};

    if (!nombre || !rol || !correo || !contrasena) {
      return res.status(400).json({ message: "nombre, rol, correo, contrasena are required" });
    }

    const roleRes = await query(`SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1`, [rol]);
    if (roleRes.rows.length === 0) return res.status(400).json({ message: "Invalid role" });
    const role_id = roleRes.rows[0].role_id;

    // Very simple parsing: first token = first_name, last token = father_lastname.
    const parts = String(nombre).trim().split(/\s+/);
    const first_name = parts[0];
    const father_lastname = parts.length > 1 ? parts[parts.length - 1] : "Unknown";
    const middle_name = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;

    const user_state = activo === false ? "disabled" : "active";
    const password_hash = await hashPassword(String(contrasena));

    const created_by = req.auth.userId || 1;
    const latest_modified_by = req.auth.userId || 1;

    // Fix sequences broken by seed data explicitly setting IDs
    await query(`SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1))`);
    await query(`SELECT setval('users_campus_id_seq', COALESCE((SELECT MAX(campus_id) FROM users), 1000))`);

    const insertRes = await query(
      `INSERT INTO users(
        campus_id,
        first_name,
        middle_name,
        father_lastname,
        mother_lastname,
        user_email,
        user_phone,
        role_id,
        user_password,
        user_state,
        last_login,
        created_by,
        latest_modified_by
      )
      VALUES (
        DEFAULT,
        $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,$11
      )
      RETURNING user_id, user_email, user_phone, user_state, role_id, first_name, middle_name, father_lastname, mother_lastname`,
      [
        first_name,
        middle_name,
        father_lastname,
        null,
        correo,
        telefono || null,
        role_id,
        password_hash,
        user_state,
        created_by,
        latest_modified_by,
      ]
    );

    const newUser = insertRes.rows[0];
    const roleNameRes = await query(`SELECT role_name FROM roles WHERE role_id=$1`, [newUser.role_id]);
    const role_name = roleNameRes.rows[0]?.role_name || rol;

    return res.json({
      id: newUser.user_id,
      nombre: buildUserFullName({
        first_name: newUser.first_name,
        middle_name: newUser.middle_name,
        father_lastname: newUser.father_lastname,
        mother_lastname: newUser.mother_lastname,
      }),
      rol: role_name,
      correo: newUser.user_email,
      telefono: newUser.user_phone,
      activo: newUser.user_state === "active",
      foto: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// PUT /users/:id
app.put("/users/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const existingRes = await query(
      `SELECT user_state
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [id]
    );
    if (existingRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const existing = existingRes.rows[0];

    const { nombre, rol, correo, telefono, contrasena, activo } = req.body || {};
    if (!nombre || !rol || !correo) {
      return res.status(400).json({ message: "nombre, rol, correo are required" });
    }

    const roleRes = await query(`SELECT role_id FROM roles WHERE role_name = $1 LIMIT 1`, [rol]);
    if (roleRes.rows.length === 0) return res.status(400).json({ message: "Invalid role" });
    const role_id = roleRes.rows[0].role_id;

    const parts = String(nombre).trim().split(/\s+/);
    const first_name = parts[0];
    const father_lastname = parts.length > 1 ? parts[parts.length - 1] : "Unknown";
    const middle_name = parts.length > 2 ? parts.slice(1, -1).join(" ") : null;

    const user_state = activo === undefined ? existing.user_state : activo === false ? "disabled" : "active";
    const latest_modified_by = req.auth.userId || 1;

    const passwordProvided = typeof contrasena === "string" && contrasena.trim().length > 0;
    let password_hash = null;
    if (passwordProvided) {
      password_hash = await hashPassword(String(contrasena));
    }

    if (passwordProvided) {
      const updateRes = await query(
        `UPDATE users
         SET first_name=$1,
             middle_name=$2,
             father_lastname=$3,
             mother_lastname=$4,
             user_email=$5,
             user_phone=$6,
             role_id=$7,
             user_password=$8,
             user_state=$9,
             latest_modified_at=NOW(),
             latest_modified_by=$10
         WHERE user_id=$11
         RETURNING user_id, user_email, user_phone, user_state, role_id, first_name, middle_name, father_lastname, mother_lastname`,
        [
          first_name,
          middle_name,
          father_lastname,
          null,
          correo,
          telefono || null,
          role_id,
          password_hash,
          user_state,
          latest_modified_by,
          id,
        ]
      );

      const roleNameRes = await query(`SELECT role_name FROM roles WHERE role_id=$1`, [updateRes.rows[0].role_id]);
      const role_name = roleNameRes.rows[0]?.role_name || rol;
      const updated = updateRes.rows[0];
      return res.json({
        id: updated.user_id,
        nombre: buildUserFullName(updated),
        rol: role_name,
        correo: updated.user_email,
        telefono: updated.user_phone,
        activo: updated.user_state === "active",
        foto: null,
      });
    }

    const updateRes = await query(
      `UPDATE users
       SET first_name=$1,
           middle_name=$2,
           father_lastname=$3,
           mother_lastname=$4,
           user_email=$5,
           user_phone=$6,
           role_id=$7,
           user_state=$8,
           latest_modified_at=NOW(),
           latest_modified_by=$9
       WHERE user_id=$10
       RETURNING user_id, user_email, user_phone, user_state, role_id, first_name, middle_name, father_lastname, mother_lastname`,
      [first_name, middle_name, father_lastname, null, correo, telefono || null, role_id, user_state, latest_modified_by, id]
    );

    const roleNameRes = await query(`SELECT role_name FROM roles WHERE role_id=$1`, [updateRes.rows[0].role_id]);
    const role_name = roleNameRes.rows[0]?.role_name || rol;
    const updated = updateRes.rows[0];
    return res.json({
      id: updated.user_id,
      nombre: buildUserFullName(updated),
      rol: role_name,
      correo: updated.user_email,
      telefono: updated.user_phone,
      activo: updated.user_state === "active",
      foto: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// DELETE /users/:id (disable)
app.delete("/users/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const latest_modified_by = req.auth.userId || 1;
    await query(
      `UPDATE users
       SET user_state='disabled',
           latest_modified_at=NOW(),
           latest_modified_by=$1
       WHERE user_id=$2`,
      [latest_modified_by, id]
    );

    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to disable user" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`users-microservice listening on :${PORT}`);
});

