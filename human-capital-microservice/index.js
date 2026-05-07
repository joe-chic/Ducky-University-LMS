const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'db-human-capital',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'ducky_human_capital_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3005;

const paginate = async (res, countSql, dataSql, params, page) => {
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const [totalRes, dataRes] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, [...params, limit, offset]),
    ]);
    res.json({ items: dataRes.rows, total: parseInt(totalRes.rows[0].count), page, pages: Math.ceil(parseInt(totalRes.rows[0].count) / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

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
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/employees/:id', async (req, res) => {
  const { first_name, middle_name, father_lastname, mother_lastname, employee_email, employee_phone, employee_status, RFC, CLABE, hire_date, base_salary } = req.body;
  try {
    const r = await pool.query(
      `UPDATE employees SET first_name=$1,middle_name=$2,father_lastname=$3,mother_lastname=$4,employee_email=$5,employee_phone=$6,employee_status=$7,"RFC"=$8,"CLABE"=$9,hire_date=$10,base_salary=$11 WHERE employee_id=$12 RETURNING *`,
      [first_name, middle_name || null, father_lastname, mother_lastname || null, employee_email || null, employee_phone || null, employee_status, RFC, CLABE, hire_date, base_salary, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/employees/:id', async (req, res) => {
  try { await pool.query('DELETE FROM employees WHERE employee_id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/office-locations/:id', async (req, res) => {
  const { location_building_name, location_floor, location_room_number, location_capacity } = req.body;
  try {
    const r = await pool.query(
      'UPDATE office_locations SET location_building_name=$1,location_floor=$2,location_room_number=$3,location_capacity=$4 WHERE location_id=$5 RETURNING *',
      [location_building_name, location_floor, location_room_number, location_capacity, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/office-locations/:id', async (req, res) => {
  try { await pool.query('DELETE FROM office_locations WHERE location_id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/departments/:id', async (req, res) => {
  const { department_name, department_head_id } = req.body;
  try {
    const r = await pool.query(
      'UPDATE departments SET department_name=$1,department_head_id=$2 WHERE departmen_id=$3 RETURNING *',
      [department_name, department_head_id, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/departments/:id', async (req, res) => {
  try { await pool.query('DELETE FROM departments WHERE departmen_id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/collaborators/:id', async (req, res) => {
  const { job_title, supervisor_id, shift_type, collaborator_status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE collaborator SET job_title=$1,supervisor_id=$2,shift_type=$3,collaborator_status=$4 WHERE collaborator_id=$5 RETURNING *',
      [job_title, supervisor_id, shift_type, collaborator_status, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/collaborators/:id', async (req, res) => {
  try { await pool.query('DELETE FROM collaborator WHERE collaborator_id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/professors/:id', async (req, res) => {
  const { department_id, academic_title, research_area, hire_date, office_location_id, professor_status } = req.body;
  try {
    const r = await pool.query(
      'UPDATE professors SET department_id=$1,academic_title=$2,research_area=$3,hire_date=$4,office_location_id=$5,professor_status=$6 WHERE professor_id=$7 RETURNING *',
      [department_id, academic_title, research_area || null, hire_date, office_location_id || null, professor_status, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/professors/:id', async (req, res) => {
  try { await pool.query('DELETE FROM professors WHERE professor_id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`human-capital-microservice on :${PORT}`));
