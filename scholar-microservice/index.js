const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host: process.env.PGHOST || 'db-scholar',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'ducky_scholar_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

// Registry microservice base URL — injected via env in docker-compose
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://registry-microservice:3009';
// service_id for ducky-scholar in the registry (matches seed data)
const SCHOLAR_SERVICE_ID = 4;

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3003;

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
  } catch (e) {
    handleError(res, e);
  }
};

function handleError(res, e) {
  if (e.code === '23505') {
    return res.status(400).json({ error: 'Acción no permitida: ' + (e.detail || 'Ya existe un registro con ese valor único.') });
  }
  if (e.code === '23503') {
    return res.status(400).json({ error: 'Acción no permitida: la referencia a un registro relacionado no existe (foreign key).' });
  }
  res.status(500).json({ error: e.message });
}

function ok(res, row, message) {
  res.json({ message, data: row });
}

// ─── Registry notification ──────────────────────────────────────────────────
// Fire-and-forward: sends the new entity to the registry microservice.
// Does NOT block or fail the scholar response if the registry is unavailable.
async function notifyRegistry(campus_email) {
  const payload = JSON.stringify({ campus_email, service_id: SCHOLAR_SERVICE_ID });
  return new Promise((resolve) => {
    try {
      const url = new URL(`${REGISTRY_URL}/api/register`);
      const options = {
        hostname: url.hostname,
        port:     url.port || 80,
        path:     url.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`[scholar → registry] status=${res.statusCode} body=${body}`);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.warn(`[scholar → registry] Could not reach registry: ${err.message}`);
        resolve(); // resolve anyway — registry failure must not break scholar flow
      });
      req.write(payload);
      req.end();
    } catch (err) {
      console.warn(`[scholar → registry] Unexpected error: ${err.message}`);
      resolve();
    }
  });
}

// Fire-and-forward: tells the registry to mark the scholar ↔ affiliate
// association as is_operational=FALSE when a student is disabled.
async function notifyDeregister(campus_email) {
  const payload = JSON.stringify({ campus_email, service_id: SCHOLAR_SERVICE_ID });
  return new Promise((resolve) => {
    try {
      const url = new URL(`${REGISTRY_URL}/api/deregister`);
      const options = {
        hostname: url.hostname,
        port:     url.port || 80,
        path:     url.pathname,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`[scholar → registry] deregister status=${res.statusCode} body=${body}`);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.warn(`[scholar → registry] deregister unreachable: ${err.message}`);
        resolve();
      });
      req.write(payload);
      req.end();
    } catch (err) {
      console.warn(`[scholar → registry] deregister unexpected: ${err.message}`);
      resolve();
    }
  });
}

// ─── DEPARTMENTS ────────────────────────────────────────────────────────────
app.get('/api/departments', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM departments',
    'SELECT * FROM departments ORDER BY department_id LIMIT $1 OFFSET $2',
    [], page);
});
app.post('/api/departments', async (req, res) => {
  const { department_name, department_head_id } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO departments(department_name, department_head_id) VALUES($1,$2) RETURNING *',
      [department_name, department_head_id]);
    ok(res, r.rows[0], 'Departamento registrado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/departments/:id', async (req, res) => {
  const { department_name, department_head_id } = req.body;
  try {
    const r = await pool.query(
      'UPDATE departments SET department_name=$1, department_head_id=$2 WHERE department_id=$3 RETURNING *',
      [department_name, department_head_id, req.params.id]);
    ok(res, r.rows[0], 'Departamento actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/departments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE department_id=$1', [req.params.id]);
    res.json({ message: 'Departamento eliminado con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── STUDENTS ───────────────────────────────────────────────────────────────
app.get('/api/students', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM students',
    'SELECT * FROM students ORDER BY student_id LIMIT $1 OFFSET $2',
    [], page);
});
app.post('/api/students', async (req, res) => {
  const { student_status, student_email, student_phone, first_name, middle_name, father_lastname, mother_lastname } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO students(student_status,student_email,student_phone,first_name,middle_name,father_lastname,mother_lastname,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [student_status, student_email, student_phone, first_name, middle_name || null, father_lastname, mother_lastname || null]);

    const student = r.rows[0];

    // ── Notify registry (fire-and-forward, non-blocking) ──
    // The scholar microservice reports the new student to the central registry
    // so the university has a global record of who is affiliated to which service.
    notifyRegistry(student_email).catch(() => {}); // errors already logged inside

    ok(res, student, 'Alumno registrado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/students/:id', async (req, res) => {
  const { student_status, student_email, student_phone, first_name, middle_name, father_lastname, mother_lastname } = req.body;
  try {
    const r = await pool.query(
      `UPDATE students SET student_status=$1,student_email=$2,student_phone=$3,first_name=$4,middle_name=$5,father_lastname=$6,mother_lastname=$7 WHERE student_id=$8 RETURNING *`,
      [student_status, student_email, student_phone, first_name, middle_name || null, father_lastname, mother_lastname || null, req.params.id]);
    ok(res, r.rows[0], 'Alumno actualizado con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/students/:id', async (req, res) => {
  try {
    // Soft-delete: fetch the student first to get their email for the registry call
    const lookup = await pool.query('SELECT student_email FROM students WHERE student_id=$1', [req.params.id]);
    if (!lookup.rows.length) return res.status(404).json({ error: 'Alumno no encontrado.' });
    const { student_email } = lookup.rows[0];

    // Set status to inactive instead of deleting the record
    const r = await pool.query(
      `UPDATE students SET student_status='inactive' WHERE student_id=$1 RETURNING *`,
      [req.params.id]
    );

    // Notify registry: mark scholar ↔ affiliate association as no longer operational
    notifyDeregister(student_email).catch(() => {});

    ok(res, r.rows[0], 'Alumno desactivado con éxito. El registro se conserva en la base de datos.');
  } catch (e) { handleError(res, e); }
});

// ─── SUBJECTS ───────────────────────────────────────────────────────────────
app.get('/api/subjects', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM subjects',
    'SELECT s.*, d.department_name FROM subjects s LEFT JOIN departments d ON d.department_id=s.department_id ORDER BY s.subject_id LIMIT $1 OFFSET $2',
    [], page);
});
app.post('/api/subjects', async (req, res) => {
  const { department_id, subject_name, subject_description, status, credits, subject_is_elective } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO subjects(department_id,subject_name,subject_description,status,credits,subject_is_elective) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [department_id, subject_name, subject_description, status, credits, subject_is_elective]);
    ok(res, r.rows[0], 'Materia registrada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/subjects/:id', async (req, res) => {
  const { department_id, subject_name, subject_description, status, credits, subject_is_elective } = req.body;
  try {
    const r = await pool.query(
      'UPDATE subjects SET department_id=$1,subject_name=$2,subject_description=$3,status=$4,credits=$5,subject_is_elective=$6 WHERE subject_id=$7 RETURNING *',
      [department_id, subject_name, subject_description, status, credits, subject_is_elective, req.params.id]);
    ok(res, r.rows[0], 'Materia actualizada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE subject_id=$1', [req.params.id]);
    res.json({ message: 'Materia eliminada con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── CLASSROOM LOCATIONS ────────────────────────────────────────────────────
app.get('/api/locations', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM classroom_locations',
    'SELECT * FROM classroom_locations ORDER BY location_id LIMIT $1 OFFSET $2',
    [], page);
});
app.post('/api/locations', async (req, res) => {
  const { location_building_name, location_floor, location_room_number } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO classroom_locations(location_building_name,location_floor,location_room_number) VALUES($1,$2,$3) RETURNING *',
      [location_building_name, location_floor, location_room_number]);
    ok(res, r.rows[0], 'Aula registrada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/locations/:id', async (req, res) => {
  const { location_building_name, location_floor, location_room_number } = req.body;
  try {
    const r = await pool.query(
      'UPDATE classroom_locations SET location_building_name=$1,location_floor=$2,location_room_number=$3 WHERE location_id=$4 RETURNING *',
      [location_building_name, location_floor, location_room_number, req.params.id]);
    ok(res, r.rows[0], 'Aula actualizada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/locations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM classroom_locations WHERE location_id=$1', [req.params.id]);
    res.json({ message: 'Aula eliminada con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── SUBJECT AVAILABILITIES ─────────────────────────────────────────────────
app.get('/api/availabilities', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM subject_availabilities',
    `SELECT sa.*, s.subject_name, cl.location_building_name
     FROM subject_availabilities sa
     LEFT JOIN subjects s ON s.subject_id=sa.subject_id
     LEFT JOIN classroom_locations cl ON cl.location_id=sa.location_id
     ORDER BY sa.availability_id LIMIT $1 OFFSET $2`,
    [], page);
});
app.post('/api/availabilities', async (req, res) => {
  const { subject_id, location_id, professor_id, availability_status, attendance_mode, current_enrollment, class_start_at, class_end_at, subject_start_at, subject_end_at } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO subject_availabilities(subject_id,location_id,professor_id,availability_status,attendance_mode,current_enrollment,class_start_at,class_end_at,subject_start_at,subject_end_at,created_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [subject_id, location_id, professor_id, availability_status, attendance_mode, current_enrollment, class_start_at, class_end_at, subject_start_at, subject_end_at]);
    ok(res, r.rows[0], 'Sección de materia registrada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/availabilities/:id', async (req, res) => {
  const { subject_id, location_id, professor_id, availability_status, attendance_mode, current_enrollment, class_start_at, class_end_at, subject_start_at, subject_end_at } = req.body;
  try {
    const r = await pool.query(
      `UPDATE subject_availabilities SET subject_id=$1,location_id=$2,professor_id=$3,availability_status=$4,attendance_mode=$5,current_enrollment=$6,class_start_at=$7,class_end_at=$8,subject_start_at=$9,subject_end_at=$10 WHERE availability_id=$11 RETURNING *`,
      [subject_id, location_id, professor_id, availability_status, attendance_mode, current_enrollment, class_start_at, class_end_at, subject_start_at, subject_end_at, req.params.id]);
    ok(res, r.rows[0], 'Sección de materia actualizada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/availabilities/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM subject_availabilities WHERE availability_id=$1', [req.params.id]);
    res.json({ message: 'Sección de materia eliminada con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

// ─── ENROLLMENTS ────────────────────────────────────────────────────────────
app.get('/api/enrollments', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  await paginate(res,
    'SELECT COUNT(*) FROM students_availabilities',
    `SELECT sa.*, s.first_name||' '||s.father_lastname AS student_name, sub.subject_name
     FROM students_availabilities sa
     LEFT JOIN students s ON s.student_id=sa.student_id
     LEFT JOIN subject_availabilities av ON av.availability_id=sa.availability_id
     LEFT JOIN subjects sub ON sub.subject_id=av.subject_id
     ORDER BY sa.student_id LIMIT $1 OFFSET $2`,
    [], page);
});
app.post('/api/enrollments', async (req, res) => {
  const { student_id, availability_id, enrollment_status, subject_final_score } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO students_availabilities(student_id,availability_id,enrollment_status,subject_final_score) VALUES($1,$2,$3,$4) RETURNING *',
      [student_id, availability_id, enrollment_status, subject_final_score || null]);
    ok(res, r.rows[0], 'Inscripción registrada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.put('/api/enrollments/:sid/:aid', async (req, res) => {
  const { enrollment_status, subject_final_score, partial_final_score, partial_second_score, partial_third_score } = req.body;
  try {
    const r = await pool.query(
      'UPDATE students_availabilities SET enrollment_status=$1,subject_final_score=$2,partial_final_score=$3,partial_second_score=$4,partial_third_score=$5 WHERE student_id=$6 AND availability_id=$7 RETURNING *',
      [enrollment_status, subject_final_score || null, partial_final_score || null, partial_second_score || null, partial_third_score || null, req.params.sid, req.params.aid]);
    ok(res, r.rows[0], 'Inscripción actualizada con éxito.');
  } catch (e) { handleError(res, e); }
});
app.delete('/api/enrollments/:sid/:aid', async (req, res) => {
  try {
    await pool.query('DELETE FROM students_availabilities WHERE student_id=$1 AND availability_id=$2', [req.params.sid, req.params.aid]);
    res.json({ message: 'Inscripción eliminada con éxito.', ok: true });
  } catch (e) { handleError(res, e); }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.listen(PORT, () => console.log(`scholar-microservice on :${PORT}`));
