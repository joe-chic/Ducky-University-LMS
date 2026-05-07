const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PGHOST     || 'db-registry',
  port:     Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'service_registry_db',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3009;

// ─── Helper ────────────────────────────────────────────────────────────────
function handleError(res, e) {
  if (e.code === '23505') {
    return res.status(409).json({ error: 'El afiliado ya está registrado con ese correo o campus_id.' });
  }
  if (e.code === '23503') {
    return res.status(400).json({ error: 'El service_id o campus_id referenciado no existe.' });
  }
  console.error('[registry-microservice]', e.message);
  res.status(500).json({ error: e.message });
}

// ─── GET /api/health ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'registry-microservice' }));

// ─── GET /api/services ─────────────────────────────────────────────────────
// List all known services in the registry
app.get('/api/services', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM services ORDER BY service_id');
    res.json(r.rows);
  } catch (e) { handleError(res, e); }
});

// ─── GET /api/affiliates ────────────────────────────────────────────────────
// List all registered affiliates with their service associations
app.get('/api/affiliates', async (req, res) => {
  const page  = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const totalRes = await pool.query('SELECT COUNT(*) FROM university_affiliates');
    const dataRes  = await pool.query(
      `SELECT ua.campus_id, ua.campus_email, ua.created_at,
              json_agg(json_build_object(
                'service_id',     afs.service_id,
                'service_name',   s.service_name,
                'service_status', s.service_status,
                'is_operational', afs.is_operational
              ) ORDER BY afs.service_id) AS services
       FROM university_affiliates ua
       LEFT JOIN affiliates_services afs ON afs.campus_id = ua.campus_id
       LEFT JOIN services s ON s.service_id = afs.service_id
       GROUP BY ua.campus_id
       ORDER BY ua.campus_id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = parseInt(totalRes.rows[0].count);
    res.json({ items: dataRes.rows, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { handleError(res, e); }
});

// ─── GET /api/affiliates/:campus_id ─────────────────────────────────────────
// Look up a specific affiliate and their service associations
app.get('/api/affiliates/:campus_id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ua.campus_id, ua.campus_email, ua.created_at,
              json_agg(json_build_object(
                'service_id',     afs.service_id,
                'service_name',   s.service_name,
                'service_status', s.service_status,
                'is_operational', afs.is_operational
              ) ORDER BY afs.service_id) AS services
       FROM university_affiliates ua
       LEFT JOIN affiliates_services afs ON afs.campus_id = ua.campus_id
       LEFT JOIN services s ON s.service_id = afs.service_id
       WHERE ua.campus_id = $1
       GROUP BY ua.campus_id`,
      [req.params.campus_id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Afiliado no encontrado.' });
    res.json(r.rows[0]);
  } catch (e) { handleError(res, e); }
});

// ─── POST /api/register ─────────────────────────────────────────────────────
// Primary endpoint: called by other microservices after creating a new entity.
// Registers the entity as a university affiliate and associates it with a service.
//
// Body:
//   campus_email  {string}  — the entity's email (used as the global identifier)
//   service_id    {number}  — the service that owns this entity (e.g. 4 = ducky-scholar)
//   campus_id?    {number}  — optional: provide a specific campus_id (or let it auto-generate)
//
// Response:
//   { message, affiliate, association }
app.post('/api/register', async (req, res) => {
  const { campus_email, service_id, campus_id } = req.body || {};

  if (!campus_email || !service_id) {
    return res.status(400).json({ error: 'Se requiere campus_email y service_id.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix sequence before insert if campus_id is auto
    if (!campus_id) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('university_affiliates','campus_id'),
                       COALESCE((SELECT MAX(campus_id) FROM university_affiliates), 1))`
      );
    }

    // 1. Insert the affiliate (or do nothing if the email already exists — idempotent)
    const insertAffiliate = campus_id
      ? await client.query(
          `INSERT INTO university_affiliates(campus_id, campus_email, created_at)
           VALUES($1, $2, NOW())
           ON CONFLICT(campus_email) DO UPDATE SET campus_id = university_affiliates.campus_id
           RETURNING *`,
          [campus_id, campus_email]
        )
      : await client.query(
          `INSERT INTO university_affiliates(campus_email, created_at)
           VALUES($1, NOW())
           ON CONFLICT(campus_email) DO UPDATE SET campus_email = EXCLUDED.campus_email
           RETURNING *`,
          [campus_email]
        );

    const affiliate = insertAffiliate.rows[0];

    // 2. Associate affiliate → service (idempotent via ON CONFLICT)
    const insertAssoc = await client.query(
      `INSERT INTO affiliates_services(campus_id, service_id, is_operational)
       VALUES($1, $2, TRUE)
       ON CONFLICT(campus_id, service_id) DO UPDATE SET is_operational = TRUE
       RETURNING *`,
      [affiliate.campus_id, service_id]
    );

    await client.query('COMMIT');

    console.log(`[registry] Registered campus_id=${affiliate.campus_id} → service_id=${service_id}`);
    res.status(201).json({
      message: `Afiliado registrado con éxito en el servicio ${service_id}.`,
      affiliate,
      association: insertAssoc.rows[0],
    });
  } catch (e) {
    await client.query('ROLLBACK');
    handleError(res, e);
  } finally {
    client.release();
  }
});

// ─── POST /api/deregister ────────────────────────────────────────────────────
// Called by microservices when an entity is deactivated/disabled.
// Sets is_operational = FALSE for the affiliate ↔ service association.
// The affiliate record itself is kept — it is never deleted.
//
// Body:
//   campus_email  {string}  — identifies the affiliate
//   service_id    {number}  — which service is marking them as inactive
app.post('/api/deregister', async (req, res) => {
  const { campus_email, service_id } = req.body || {};
  if (!campus_email || !service_id) {
    return res.status(400).json({ error: 'Se requiere campus_email y service_id.' });
  }
  try {
    // Look up the affiliate by email
    const look = await pool.query(
      'SELECT campus_id FROM university_affiliates WHERE campus_email = $1',
      [campus_email]
    );
    if (!look.rows.length) {
      return res.status(404).json({ error: `No se encontró ningún afiliado con el correo: ${campus_email}` });
    }
    const campus_id = look.rows[0].campus_id;

    // Mark the association as no longer operational
    const upd = await pool.query(
      `UPDATE affiliates_services
       SET is_operational = FALSE
       WHERE campus_id = $1 AND service_id = $2
       RETURNING *`,
      [campus_id, service_id]
    );
    if (!upd.rows.length) {
      return res.status(404).json({ error: `No existe asociación entre campus_id=${campus_id} y service_id=${service_id}.` });
    }
    console.log(`[registry] Deregistered campus_id=${campus_id} from service_id=${service_id}`);
    res.json({
      message: `Asociación desactivada con éxito (campus_id=${campus_id}, service_id=${service_id}).`,
      association: upd.rows[0],
    });
  } catch (e) { handleError(res, e); }
});

// ─── DELETE /api/affiliates/:campus_id ──────────────────────────────────────
app.delete('/api/affiliates/:campus_id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM affiliates_services WHERE campus_id=$1', [req.params.campus_id]);
    await client.query('DELETE FROM university_affiliates WHERE campus_id=$1', [req.params.campus_id]);
    await client.query('COMMIT');
    res.json({ message: 'Afiliado eliminado del registro.', ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    handleError(res, e);
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`registry-microservice on :${PORT}`));
