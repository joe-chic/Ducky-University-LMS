const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const BASE = process.env.SCHOLAR_BASE_URL || 'http://scholar-microservice:3003';

// ─── Validation helpers ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function missing(...fields) {
  return fields.some(f => f === undefined || f === null || String(f).trim() === '');
}

// ─── Route-level BFF validation ────────────────────────────────────────────

// Students
app.post('/api/students', (req, res, next) => {
  const { first_name, father_lastname, student_email, student_phone, student_status } = req.body || {};
  if (missing(first_name, father_lastname, student_email, student_phone, student_status))
    return res.status(400).json({ error: 'Campos requeridos: first_name, father_lastname, student_email, student_phone, student_status.' });
  if (!EMAIL_RE.test(student_email))
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  if (!PHONE_RE.test(student_phone))
    return res.status(400).json({ error: 'El formato del teléfono no es válido.' });
  next();
});
app.put('/api/students/:id', (req, res, next) => {
  const { first_name, father_lastname, student_email, student_phone, student_status } = req.body || {};
  if (missing(first_name, father_lastname, student_email, student_phone, student_status))
    return res.status(400).json({ error: 'Campos requeridos: first_name, father_lastname, student_email, student_phone, student_status.' });
  if (!EMAIL_RE.test(student_email))
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  if (!PHONE_RE.test(student_phone))
    return res.status(400).json({ error: 'El formato del teléfono no es válido.' });
  next();
});

// Subjects
app.post('/api/subjects', (req, res, next) => {
  const { subject_name, department_id, credits, status, subject_is_elective } = req.body || {};
  if (missing(subject_name, department_id, credits, status, subject_is_elective))
    return res.status(400).json({ error: 'Campos requeridos: subject_name, department_id, credits, status, subject_is_elective.' });
  if (isNaN(Number(credits)) || Number(credits) < 1)
    return res.status(400).json({ error: 'Los créditos deben ser un número positivo.' });
  next();
});
app.put('/api/subjects/:id', (req, res, next) => {
  const { subject_name, department_id, credits, status } = req.body || {};
  if (missing(subject_name, department_id, credits, status))
    return res.status(400).json({ error: 'Campos requeridos: subject_name, department_id, credits, status.' });
  next();
});

// Departments
app.post('/api/departments', (req, res, next) => {
  const { department_name, department_head_id } = req.body || {};
  if (missing(department_name, department_head_id))
    return res.status(400).json({ error: 'Campos requeridos: department_name, department_head_id.' });
  next();
});
app.put('/api/departments/:id', (req, res, next) => {
  const { department_name, department_head_id } = req.body || {};
  if (missing(department_name, department_head_id))
    return res.status(400).json({ error: 'Campos requeridos: department_name, department_head_id.' });
  next();
});

// Locations
app.post('/api/locations', (req, res, next) => {
  const { location_building_name, location_floor, location_room_number } = req.body || {};
  if (missing(location_building_name, location_floor, location_room_number))
    return res.status(400).json({ error: 'Campos requeridos: location_building_name, location_floor, location_room_number.' });
  next();
});
app.put('/api/locations/:id', (req, res, next) => {
  const { location_building_name, location_floor, location_room_number } = req.body || {};
  if (missing(location_building_name, location_floor, location_room_number))
    return res.status(400).json({ error: 'Campos requeridos: location_building_name, location_floor, location_room_number.' });
  next();
});

// Availabilities
app.post('/api/availabilities', (req, res, next) => {
  const { subject_id, location_id, professor_id, availability_status, attendance_mode, class_start_at, class_end_at, subject_start_at, subject_end_at } = req.body || {};
  if (missing(subject_id, location_id, professor_id, availability_status, attendance_mode, class_start_at, class_end_at, subject_start_at, subject_end_at))
    return res.status(400).json({ error: 'Campos requeridos: subject_id, location_id, professor_id, availability_status, attendance_mode, y todas las fechas.' });
  next();
});

// Enrollments
app.post('/api/enrollments', (req, res, next) => {
  const { student_id, availability_id, enrollment_status } = req.body || {};
  if (missing(student_id, availability_id, enrollment_status))
    return res.status(400).json({ error: 'Campos requeridos: student_id, availability_id, enrollment_status.' });
  next();
});

// ─── Success message wrapper for mutations ─────────────────────────────────
const SUCCESS_MESSAGES = {
  'POST /api/students':       'Alumno registrado con éxito.',
  'PUT /api/students':        'Alumno actualizado con éxito.',
  'DELETE /api/students':     'Alumno eliminado con éxito.',
  'POST /api/subjects':       'Materia registrada con éxito.',
  'PUT /api/subjects':        'Materia actualizada con éxito.',
  'DELETE /api/subjects':     'Materia eliminada con éxito.',
  'POST /api/departments':    'Departamento registrado con éxito.',
  'PUT /api/departments':     'Departamento actualizado con éxito.',
  'DELETE /api/departments':  'Departamento eliminado con éxito.',
  'POST /api/locations':      'Aula registrada con éxito.',
  'PUT /api/locations':       'Aula actualizada con éxito.',
  'DELETE /api/locations':    'Aula eliminada con éxito.',
  'POST /api/availabilities': 'Sección de materia registrada con éxito.',
  'PUT /api/availabilities':  'Sección de materia actualizada con éxito.',
  'DELETE /api/availabilities':'Sección de materia eliminada con éxito.',
  'POST /api/enrollments':    'Inscripción registrada con éxito.',
  'PUT /api/enrollments':     'Inscripción actualizada con éxito.',
  'DELETE /api/enrollments':  'Inscripción eliminada con éxito.',
};

function getMessageKey(method, url) {
  // strip IDs from the URL to get a base path, e.g. /api/students/12 -> /api/students
  const base = '/' + url.split('/').slice(1, 3).join('/');
  return `${method} ${base}`;
}

// ─── Generic proxy (all remaining routes, and verified ones after middleware) ─
app.use('/api', async (req, res) => {
  try {
    const url = `${BASE}/api${req.url}`;
    const response = await axios({ method: req.method, url, data: req.body, params: req.query });

    // For mutating methods, wrap the response with a success message
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const key = getMessageKey(method, req.url);
      const message = SUCCESS_MESSAGES[key] || 'Operación completada con éxito.';
      return res.status(response.status).json({ message, data: response.data });
    }

    res.status(response.status).json(response.data);
  } catch (e) {
    const status = e.response?.status || 500;
    res.status(status).json(e.response?.data || { error: e.message });
  }
});

app.listen(PORT, () => console.log(`scholar-bff-service on :${PORT}`));
