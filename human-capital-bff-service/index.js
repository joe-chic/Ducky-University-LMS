const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const BASE = process.env.HC_BASE_URL || 'http://human-capital-microservice:3005';

// ─── Validation helpers ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function missing(...fields) {
  return fields.some(f => f === undefined || f === null || String(f).trim() === '');
}

// ─── Route-level BFF validation ────────────────────────────────────────────

// Employees
app.post('/api/employees', (req, res, next) => {
  const { first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary } = req.body || {};
  if (missing(first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary))
    return res.status(400).json({ error: 'Campos requeridos: first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary.' });
  if (req.body.employee_email && !EMAIL_RE.test(req.body.employee_email))
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  if (req.body.employee_phone && !PHONE_RE.test(req.body.employee_phone))
    return res.status(400).json({ error: 'El formato del teléfono no es válido.' });
  next();
});
app.put('/api/employees/:id', (req, res, next) => {
  const { first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary } = req.body || {};
  if (missing(first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary))
    return res.status(400).json({ error: 'Campos requeridos: first_name, father_lastname, employee_status, RFC, CLABE, hire_date, base_salary.' });
  if (req.body.employee_email && !EMAIL_RE.test(req.body.employee_email))
    return res.status(400).json({ error: 'El formato del correo electrónico no es válido.' });
  if (req.body.employee_phone && !PHONE_RE.test(req.body.employee_phone))
    return res.status(400).json({ error: 'El formato del teléfono no es válido.' });
  next();
});

// Office Locations
app.post('/api/office-locations', (req, res, next) => {
  const { location_building_name, location_floor, location_room_number } = req.body || {};
  if (missing(location_building_name, location_floor, location_room_number))
    return res.status(400).json({ error: 'Campos requeridos: location_building_name, location_floor, location_room_number.' });
  next();
});

// Departments
app.post('/api/departments', (req, res, next) => {
  const { department_name, department_head_id } = req.body || {};
  if (missing(department_name, department_head_id))
    return res.status(400).json({ error: 'Campos requeridos: department_name, department_head_id.' });
  next();
});

// Collaborators
app.post('/api/collaborators', (req, res, next) => {
  const { collaborator_id, job_title, collaborator_status } = req.body || {};
  if (missing(collaborator_id, job_title, collaborator_status))
    return res.status(400).json({ error: 'Campos requeridos: collaborator_id, job_title, collaborator_status.' });
  next();
});

// Professors
app.post('/api/professors', (req, res, next) => {
  const { professor_id, department_id, academic_title, hire_date, professor_status } = req.body || {};
  if (missing(professor_id, department_id, academic_title, hire_date, professor_status))
    return res.status(400).json({ error: 'Campos requeridos: professor_id, department_id, academic_title, hire_date, professor_status.' });
  next();
});

// ─── Success message mapping ───────────────────────────────────────────────
const SUCCESS_MESSAGES = {
  'POST /api/employees':        'Empleado registrado con éxito.',
  'PUT /api/employees':         'Empleado actualizado con éxito.',
  'DELETE /api/employees':      'Empleado desactivado con éxito.',
  'POST /api/office-locations': 'Ubicación registrada con éxito.',
  'PUT /api/office-locations':  'Ubicación actualizada con éxito.',
  'DELETE /api/office-locations':'Ubicación eliminada con éxito.',
  'POST /api/departments':      'Departamento registrado con éxito.',
  'PUT /api/departments':       'Departamento actualizado con éxito.',
  'DELETE /api/departments':    'Departamento eliminado con éxito.',
  'POST /api/collaborators':    'Colaborador registrado con éxito.',
  'PUT /api/collaborators':     'Colaborador actualizado con éxito.',
  'DELETE /api/collaborators':  'Colaborador eliminado con éxito.',
  'POST /api/professors':       'Profesor registrado con éxito.',
  'PUT /api/professors':        'Profesor actualizado con éxito.',
  'DELETE /api/professors':     'Profesor eliminado con éxito.',
};

function getMessageKey(method, url) {
  const base = '/' + url.split('/').slice(1, 3).join('/');
  return `${method} ${base}`;
}

// ─── Generic proxy ─────────────────────────────────────────────────────────
app.use('/api', async (req, res) => {
  try {
    const url = `${BASE}/api${req.url}`;
    const response = await axios({ method: req.method, url, data: req.body, params: req.query });

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

app.listen(PORT, () => console.log(`human-capital-bff-service on :${PORT}`));
