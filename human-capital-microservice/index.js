const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host:     process.env.PGHOST     || 'db-human-capital',
  port:     Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'ducky_human_capital_db',
  user:     process.env.PGUSER     || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

// Registry microservice base URL — injected via env in docker-compose
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://registry-microservice:3009';
// service_id for ducky-humancapital in the registry (matches seed data)
const HC_SERVICE_ID = 1;

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3005;

// ─── Helpers ───────────────────────────────────────────────────────────────
const paginate = async (res, countSql, dataSql, params, page) => {
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const [totalRes, dataRes] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, [...params, limit, offset]),
    ]);
    res.json({ items: dataRes.rows, total: parseInt(totalRes.rows[0].count), page, pages: Math.ceil(parseInt(totalRes.rows[0].count) / limit) });
  } catch (e) { handleError(res, e); }
};

function handleError(res, e) {
  if (e.code === '23505') {
    return res.status(400).json({ error: 'Acción no permitida: ' + (e.detail || 'Ya existe un registro con ese valor único.') });
  }
  if (e.code === '23503') {
    return res.status(400).json({ error: 'Acción no permitida: la referencia a un registro relacionado no existe (foreign key).' });
  }
  console.error('[human-capital-microservice]', e.message);
  res.status(500).json({ error: e.message });
}

function ok(res, row, message) {
  res.json({ message, data: row });
}

// ─── Registry notification helpers (fire-and-forward, non-blocking) ────────
function registryCall(path, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    try {
      const url = new URL(`${REGISTRY_URL}${path}`);
      const options = {
        hostname: url.hostname,
        port:     url.port || 80,
        path:     url.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[hc → registry] ${path} status=${res.statusCode} body=${data}`);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.warn(`[hc → registry] ${path} unreachable: ${err.message}`);
        resolve();
      });
      req.write(body);
      req.end();
    } catch (err) {
      console.warn(`[hc → registry] ${path} unexpected: ${err.message}`);
      resolve();
    }
  });
}

const notifyRegistry    = (campus_email) => registryCall('/api/register',     { campus_email, service_id: HC_SERVICE_ID });
const notifyDeregister  = (campus_email) => registryCall('/api/deregister',   { campus_email, service_id: HC_SERVICE_ID });
const notifyEmailUpdate = (old_email, new_email) => registryCall('/api/update-email', { old_email, new_email });

// ─── EMPLOYEES ──────────────────────────────────────────────────────────────
app.get('/api/employees', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res, 'SELECT COUNT(*) FROM employees',
    'SELECT * FROM employees ORDER BY employee_id LIMIT $1 OFFSET $2', [], page);
});

app.post('/api/employees', async (req, res) => {
  const { first_name, middle_name, father_lastname, mother_lastname, employee_email, employee_phone, employee_status, RFC, CLABE, hire_date, base_salary } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO employees(first_name,middle_name,father_lastname,mother_lastname,employee_email,employee_phone,employee_status,"RFC","CLABE",hire_date,base_salary)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [first_name, middle_name || null, father_lastname, mother_lastname || null, employee_email || null, employee_phone || null, employee_status, RFC, CLABE, hire_date, base_salary]);

    const employee = r.rows[0];

    // Notify registry: register the new employee affiliated with Human Capital
    if (employee_email) notifyRegistry(employee_email).catch(() => {});

    ok(res, employee, 'Empleado registrado con éxito.');
  } catch (e) { handleError(res, e); }
});

app.put('/api/employees/:id', async (req, res) => {
  const { first_name, middle_name, father_lastname, mother_lastname, employee_email, employee_phone, employee_status, RFC, CLABE, hire_date, base_salary } = req.body;
  try {
    // Fetch current email BEFORE updating to detect a change
    const before = await pool.query('SELECT employee_email FROM employees WHERE employee_id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ error: 'Empleado no encontrado.' });
    const old_email = before.rows[0].employee_email;

    const r = await pool.query(
      `UPDATE employees SET first_name=$1,middle_name=$2,father_lastname=$3,mother_lastname=$4,employee_email=$5,employee_phone=$6,employee_status=$7,"RFC"=$8,"CLABE"=$9,hire_date=$10,base_salary=$11 WHERE employee_id=$12 RETURNING *`,
      [first_name, middle_name || null, father_lastname, mother_lastname || null, employee_email || null, employee_phone || null, employee_status, RFC, CLABE, hire_date, base_salary, req.params.id]);

    // If the email changed, sync it in the registry
    if (old_email && employee_email && old_email !== employee_email) {
      notifyEmailUpdate(old_email, employee_email).catch(() => {});
    }

    ok(res, r.rows[0], 'Empleado actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    // Soft-delete: fetch current email for registry deregister call
    const lookup = await pool.query('SELECT employee_email FROM employees WHERE employee_id=$1', [req.params.id]);
    if (!lookup.rows.length) return res.status(404).json({ error: 'Empleado no encontrado.' });
    const { employee_email } = lookup.rows[0];

    // Set status to inactive — record is preserved
    const r = await pool.query(
      `UPDATE employees SET employee_status='inactive' WHERE employee_id=$1 RETURNING *`,
      [req.params.id]);

    // Notify registry: mark HC ↔ affiliate association as no longer operational
    if (employee_email) notifyDeregister(employee_email).catch(() => {});

    ok(res, r.rows[0], 'Empleado desactivado con éxito. El registro se conserva en la base de datos.');
  } catch (e) { handleError(res, e); }
});

// ─── OFFICE LOCATIONS ───────────────────────────────────────────────────────
app.get('/api/office-locations', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res, 'SELECT COUNT(*) FROM office_locations',
    'SELECT * FROM office_locations ORDER BY location_id LIMIT $1 OFFSET $2', [], page);
});
app.post('/api/office-locations', async (req, res) => {
  const { location_building_name, location_floor, location_room_number, location_capacity } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO office_locations(location_building_name,location_floor,location_room_number,location_capacity) VALUES($1,$2,$3,$4) RETURNING *',
      [location_building_name, location_floor, location_room_number, location_capacity]);
    ok(res, r.rows[0], 'Ubicación de oficina registrada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/office-locations/:id', async (req, res) => {
  const { location_building_name, location_floor, location_room_number, location_capacity } = req.body;
  try {
    const r = await pool.query(
      'UPDATE office_locations SET location_building_name=$1,location_floor=$2,location_room_number=$3,location_capacity=$4 WHERE location_id=$5 RETURNING *',
      [location_building_name, location_floor, location_room_number, location_capacity, req.params.id]);
    ok(res, r.rows[0], 'Ubicación de oficina actualizada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/office-locations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM office_locations WHERE location_id=$1', [req.params.id]);
    res.json({ message: 'Ubicación de oficina eliminada con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── DEPARTMENTS ────────────────────────────────────────────────────────────
app.get('/api/departments', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res, 'SELECT COUNT(*) FROM departments',
    'SELECT * FROM departments ORDER BY departmen_id LIMIT $1 OFFSET $2', [], page);
});
app.post('/api/departments', async (req, res) => {
  const { department_name, department_head_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO departments(department_name,department_head_id) VALUES($1,$2) RETURNING *',
      [department_name, department_head_id]);
    ok(res, r.rows[0], 'Departamento registrado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/departments/:id', async (req, res) => {
  const { department_name, department_head_id } = req.body;
  try {
    const r = await pool.query(
      'UPDATE departments SET department_name=$1,department_head_id=$2 WHERE departmen_id=$3 RETURNING *',
      [department_name, department_head_id, req.params.id]);
    ok(res, r.rows[0], 'Departamento actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/departments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE departmen_id=$1', [req.params.id]);
    res.json({ message: 'Departamento eliminado con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── COLLABORATORS ──────────────────────────────────────────────────────────
app.get('/api/collaborators', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res, 'SELECT COUNT(*) FROM collaborator',
    `SELECT c.*, e.first_name||' '||e.father_lastname AS employee_name
     FROM collaborator c LEFT JOIN employees e ON e.employee_id=c.collaborator_id
     ORDER BY c.collaborator_id LIMIT $1 OFFSET $2`, [], page);
});
app.post('/api/collaborators', async (req, res) => {
  const { collaborator_id, job_title, supervisor_id, shift_type, collaborator_status } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO collaborator(collaborator_id,job_title,supervisor_id,shift_type,collaborator_status) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [collaborator_id, job_title, supervisor_id, shift_type, collaborator_status]);
    ok(res, r.rows[0], 'Colaborador registrado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/collaborators/:id', async (req, res) => {
  const { job_title, supervisor_id, shift_type, collaborator_status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE collaborator SET job_title=$1,supervisor_id=$2,shift_type=$3,collaborator_status=$4 WHERE collaborator_id=$5 RETURNING *',
      [job_title, supervisor_id, shift_type, collaborator_status, req.params.id]);
    ok(res, r.rows[0], 'Colaborador actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/collaborators/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM collaborator WHERE collaborator_id=$1', [req.params.id]);
    res.json({ message: 'Colaborador eliminado con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── PROFESSORS ─────────────────────────────────────────────────────────────
app.get('/api/professors', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res, 'SELECT COUNT(*) FROM professors',
    `SELECT p.*, e.first_name||' '||e.father_lastname AS employee_name, d.department_name
     FROM professors p
     LEFT JOIN employees e ON e.employee_id=p.professor_id
     LEFT JOIN departments d ON d.departmen_id=p.department_id
     ORDER BY p.professor_id LIMIT $1 OFFSET $2`, [], page);
});
app.post('/api/professors', async (req, res) => {
  const { professor_id, department_id, academic_title, research_area, hire_date, office_location_id, professor_status } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO professors(professor_id,department_id,academic_title,research_area,hire_date,office_location_id,professor_status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [professor_id, department_id, academic_title, research_area || null, hire_date, office_location_id || null, professor_status]);
    ok(res, r.rows[0], 'Profesor registrado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/professors/:id', async (req, res) => {
  const { department_id, academic_title, research_area, hire_date, office_location_id, professor_status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE professors SET department_id=$1,academic_title=$2,research_area=$3,hire_date=$4,office_location_id=$5,professor_status=$6 WHERE professor_id=$7 RETURNING *',
      [department_id, academic_title, research_area || null, hire_date, office_location_id || null, professor_status, req.params.id]);
    ok(res, r.rows[0], 'Profesor actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/professors/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM professors WHERE professor_id=$1', [req.params.id]);
    res.json({ message: 'Profesor eliminado con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`human-capital-microservice on :${PORT}`));
